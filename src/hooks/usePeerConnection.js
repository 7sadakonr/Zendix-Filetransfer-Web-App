import { useEffect, useCallback } from 'react';
import Peer from 'peerjs';
import { generatePeerId } from '../utils/nameGenerator';
import useAppStore from '../stores/useAppStore';
import { handleFileProtocol } from '../utils/fileReceiver';

// SINGLETON: Keep peer instance outside of React lifecycle
let peerInstance = null;
let reconnectInterval = null;
let isInitialized = false;

const initializePeer = () => {
    if (peerInstance && !peerInstance.destroyed) {
        return peerInstance;
    }

    const store = useAppStore.getState();
    const id = store.myPeerId || generatePeerId();

    console.log('[Peer] Creating new instance with ID:', id);

    // Config for Global Connection (STUN/TURN)
    // Using OpenRelay (Free Tier) or similar is required for over-the-internet
    const peerConfig = {
        debug: 1,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }, // Google STUN (Free)
                { urls: 'stun:global.stun.twilio.com:3478' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        }
    };

    // Note: STUN/TURN servers are now enabled for global (non-LAN) connections.

    peerInstance = new Peer(id, peerConfig);

    peerInstance.on('open', (id) => {
        console.log('[Peer] Opened with ID:', id);
        useAppStore.getState().setMyPeerId(id);
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    });

    peerInstance.on('connection', (conn) => {
        console.log('[Peer] Incoming connection from:', conn.peer);
        setupConnectionHandlers(conn);
    });

    peerInstance.on('disconnected', () => {
        console.log('[Peer] Disconnected from signaling server');
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                if (peerInstance && !peerInstance.destroyed) {
                    console.log('[Peer] Attempting reconnect...');
                    peerInstance.reconnect();
                }
            }, 5000);
        }
    });

    peerInstance.on('close', () => {
        console.log('[Peer] Destroyed');
        useAppStore.getState().setMyPeerId(null);
        useAppStore.getState().setConnectionStatus('disconnected');
        peerInstance = null;
        isInitialized = false;
    });

    peerInstance.on('error', (err) => {
        console.error('[Peer] Error:', err);
        const store = useAppStore.getState();
        
        if (err.type === 'peer-unavailable') {
            // Note: In multi-device, if one peer is unavailable, we shouldn't force local logout.
            // We just let the connection fail gracefully.
            console.warn('[Peer] A remote peer is unavailable.');
        } else if (err.type === 'unavailable-id') {
            // This happens if the user reloads the page before the signaling server realizes 
            // they disconnected. In this case, their "saved" myPeerId from localStorage is 
            // rejected. Force clear to get a brand new ID on reload.
            console.warn('[Peer] Requested ID is taken or stale. Clearing and reloading.');
            store.clearPersistedData();
            if (peerInstance) {
                peerInstance.destroy();
                peerInstance = null;
                isInitialized = false;
            }
            window.location.href = '/';
        } else {
            // For other generic errors, ensure the UI isn't stuck "connecting" forever
            if (store.connectionStatus === 'connecting') {
                store.setConnectionStatus('disconnected');
            }
        }
    });

    return peerInstance;
};

const MAX_PEERS = 3;

const setupConnectionHandlers = (conn, timeoutRef) => {
    const store = useAppStore.getState();

    conn.on('open', () => {
        if (timeoutRef?.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        const currentStore = useAppStore.getState();
        
        // --- Limit Check ---
        if (currentStore.activeConnections.length >= MAX_PEERS) {
            console.log('[Conn] Room is full. Rejecting peer:', conn.peer);
            conn.send({ type: 'SYSTEM', payload: { action: 'REJECT_FULL' } });
            setTimeout(() => {
                try { conn.close(); } catch (e) { }
            }, 500);
            return;
        }

        console.log('[Conn] Opened with:', conn.peer);
        useAppStore.getState().addConnection(conn);

        // --- Full Mesh: Broadcast Peer List ---
        // Need fresh state after addConnection
        const newStore = useAppStore.getState();
        const activeConns = newStore.activeConnections;
        const allPeerIds = [newStore.myPeerId, ...activeConns.map(c => c.peer)];
        const uniquePeerIds = [...new Set(allPeerIds)];

        activeConns.forEach(c => {
            if (c.open) {
                c.send({ type: 'SYSTEM', payload: { action: 'SYNC_PEERS', peers: uniquePeerIds } });
            }
        });
    });

    conn.on('data', (data) => {
        handleIncomingData(data);
    });

    conn.on('close', () => {
        console.log('[Conn] Closed:', conn.peer);
        useAppStore.getState().removeConnection(conn.peer);
    });

    conn.on('error', (err) => {
        console.error('[Conn] Error:', err);
    });
};

const handleIncomingData = (data) => {
    console.log('[Data] Received:', data);
    if (!data || !data.type) return;

    const store = useAppStore.getState();

    switch (data.type) {
        case 'CLIPBOARD':
            const newItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                text: data.payload.text,
                timestamp: data.payload.timestamp,
                fromDevice: data.payload.fromDevice
            };
            store.addClipboardItem(newItem);
            store.setLastReceivedClipboard(newItem);
            break;
        case 'FILE':
            handleFileProtocol(data.payload);
            break;
        case 'SYSTEM':
            if (data.payload?.action === 'LOGOUT') {
                console.log('[System] Remote peer logged out. Clearing local state.');
                if (peerInstance) {
                    peerInstance.destroy();
                    peerInstance = null;
                }
                store.clearPersistedData();
                isInitialized = false;
                setTimeout(() => {
                    isInitialized = true;
                    initializePeer();
                }, 100);
            } else if (data.payload?.action === 'REJECT_FULL') {
                console.warn('[System] Connection rejected: Room is full.');
                alert('ห้องเต็มแล้ว (จำกัดการส่งเป็นกลุ่มสูงสุด 3 เครื่อง) ❌');
                store.removeConnection(data.payload.peer || "unknown");
            } else if (data.payload?.action === 'SYNC_PEERS') {
                const receivedPeers = data.payload?.peers || [];
                const localId = store.myPeerId;

                receivedPeers.forEach(targetId => {
                    // Do not connect to self
                    if (targetId === localId) return;

                    // Do not connect if already connected
                    if (useAppStore.getState().activeConnections.some(c => c.peer === targetId)) return;

                    // To prevent duplicate connections simultaneously
                    // only the peer with the lexicographically smaller ID initiates
                    if (localId < targetId) {
                        console.log('[Mesh] Discovered new peer via SYNC, initiating connection:', targetId);
                        
                        // Check limit locally too
                        if (peerInstance && !peerInstance.destroyed) {
                            if (useAppStore.getState().activeConnections.length < MAX_PEERS) {
                                const newConn = peerInstance.connect(targetId, { reliable: true });
                                setupConnectionHandlers(newConn, { current: null });
                            }
                        }
                    }
                });
            }
            break;
        default:
            console.warn('Unknown data type:', data.type);
    }
};

// Hook for components to use
export const usePeerConnection = () => {
    const {
        connectionStatus,
        myPeerId,
        activeConnections,
        remotePeerIds
    } = useAppStore();

    // Initialize peer on first hook usage (once globally)
    useEffect(() => {
        if (!isInitialized) {
            isInitialized = true;
            initializePeer();
        }
    }, []);

    const connectToPeer = useCallback((peerId) => {
        if (!peerInstance || peerInstance.destroyed) {
            console.error('[Conn] Peer not ready');
            return;
        }

        const store = useAppStore.getState();
        if (store.activeConnections.some(c => c.peer === peerId)) {
            console.warn('[Conn] Already connected to this peer');
            return;
        }

        if (store.activeConnections.length >= MAX_PEERS) {
            alert('ลีมิตถึงจำนวนสูงสุดแล้ว ไม่สามารถเชื่อมต่อเพิ่มได้ (สูงสุด 3 เครื่อง) ❌');
            return;
        }

        console.log('[Conn] Initiating connection to:', peerId);
        if (store.activeConnections.length === 0) {
            useAppStore.getState().setConnectionStatus('connecting');
        }

        const conn = peerInstance.connect(peerId, { reliable: true });
        
        // Add a safety timeout to avoid infinite "Waiting..." state
        const connectionTimeout = { current: null };
        connectionTimeout.current = setTimeout(() => {
            if (useAppStore.getState().connectionStatus !== 'connected') {
                console.warn('[Conn] Connection timed out after 10 seconds. Forcing disconnect.');
                conn.close();
                useAppStore.getState().setConnectionStatus('disconnected');
            }
        }, 10000);

        setupConnectionHandlers(conn, connectionTimeout);
    }, []);

    const sendData = useCallback((type, payload) => {
        const conns = useAppStore.getState().activeConnections;
        if (conns.length > 0) {
            conns.forEach(conn => {
                if (conn.open) {
                    conn.send({ type, payload });
                }
            });
        } else {
            console.warn('[Conn] Cannot send, not connected');
        }
    }, []);

    const manualDisconnect = useCallback(() => {
        const store = useAppStore.getState();
        const conns = [...store.activeConnections];

        // Clear local state immediately so UI feels instant
        store.clearPersistedData();

        if (conns.length > 0) {
            console.log('[Conn] Sending logout signal and disconnecting manually');
            conns.forEach(conn => {
                if (conn.open) {
                    conn.send({ type: 'SYSTEM', payload: { action: 'LOGOUT' } });
                }
            });
            
            // Give WebRTC enough time to flush the buffer across the internet before destroying everything
            setTimeout(() => {
                try {
                    conns.forEach(conn => conn.close());
                } catch (e) { console.error('Error closing connection:', e); }
                
                if (peerInstance) {
                    peerInstance.destroy();
                    peerInstance = null;
                }
                isInitialized = false;
                setTimeout(() => {
                    isInitialized = true;
                    initializePeer();
                }, 100);
            }, 500);
        } else {
            if (peerInstance) {
                peerInstance.destroy();
                peerInstance = null;
            }
            isInitialized = false;
            setTimeout(() => {
                isInitialized = true;
                initializePeer();
            }, 100);
        }
    }, []);

    return {
        connectionStatus,
        myPeerId,
        activeConnections,
        remotePeerIds,
        connectToPeer,
        disconnectPeer: manualDisconnect,
        sendData
    };
};
