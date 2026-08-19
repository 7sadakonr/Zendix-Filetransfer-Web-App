import { useEffect, useCallback } from 'react';
import Peer from 'peerjs';
import { generatePeerId } from '../utils/nameGenerator';
import useAppStore from '../stores/useAppStore';
import { handleFileProtocol } from '../utils/fileReceiver';

// SINGLETON: Keep peer instance outside of React lifecycle
let peerInstance = null;
let reconnectInterval = null;
let isInitialized = false;
let unavailableIdRetries = 0;
const MAX_UNAVAILABLE_ID_RETRIES = 20;

// Auto-retry with exponential backoff
let retryAttempt = 0;
const MAX_RETRY_ATTEMPTS = 8;
const getRetryDelay = (attempt) => Math.min(10000, Math.pow(2, attempt) * 1000); // 1s, 2s, 4s, 8s, max 10s

// Track user-initiated name changes to handle unavailable-id differently
let isUserNameChange = false;
let previousPeerId = null;
let previousDeviceName = null;

const schedulePeerReinitialize = (delayMs = 100) => {
    setTimeout(() => {
        isInitialized = true;
        initializePeer();
    }, delayMs);
};

/**
 * Detect the connection type (LAN vs Relay) from WebRTC stats.
 * PeerJS exposes the underlying RTCPeerConnection via conn.peerConnection.
 */
const detectConnectionType = async (conn) => {
    try {
        const pc = conn.peerConnection;
        if (!pc) return 'unknown';

        const stats = await pc.getStats();
        let activeCandidatePairId = null;

        // Find the active candidate pair
        stats.forEach((report) => {
            if (report.type === 'transport' && report.selectedCandidatePairId) {
                activeCandidatePairId = report.selectedCandidatePairId;
            }
        });

        // Fallback: find the nominated/selected candidate pair
        if (!activeCandidatePairId) {
            stats.forEach((report) => {
                if (report.type === 'candidate-pair' && (report.selected || report.nominated)) {
                    activeCandidatePairId = report.id;
                }
            });
        }

        if (!activeCandidatePairId) return 'unknown';

        const pair = stats.get(activeCandidatePairId);
        if (!pair) return 'unknown';

        // Check the local candidate type
        const localCandidate = stats.get(pair.localCandidateId);
        const remoteCandidate = stats.get(pair.remoteCandidateId);

        const localType = localCandidate?.candidateType;
        const remoteType = remoteCandidate?.candidateType;

        console.log(`[ICE] Local: ${localType}, Remote: ${remoteType}`);

        if (localType === 'relay' || remoteType === 'relay') {
            return 'relay';
        }
        if (localType === 'host' && remoteType === 'host') {
            return 'lan';
        }
        // srflx means STUN was used (same internet, not LAN)
        return 'relay';
    } catch (err) {
        console.warn('[ICE] Failed to detect connection type:', err);
        return 'unknown';
    }
};

const initializePeer = () => {
    if (peerInstance && !peerInstance.destroyed) {
        return peerInstance;
    }

    const store = useAppStore.getState();
    
    // Repair state from old bug: if deviceName is set, it MUST be the preferredPeerId
    if (store.deviceName && store.preferredPeerId !== store.deviceName) {
        console.log('[Peer] Repairing corrupted state: syncing peerId with deviceName');
        store.setPreferredPeerId(store.deviceName);
        store.setMyPeerId(store.deviceName);
    }
    
    const id = store.preferredPeerId || store.myPeerId || generatePeerId();

    if (!store.preferredPeerId) {
        store.setPreferredPeerId(id);
    }

    if (!store.myPeerId) {
        store.setMyPeerId(id);
    }

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
        peerInstance._isReady = true;
        useAppStore.getState().setMyPeerId(id);
        useAppStore.getState().setPreferredPeerId(id);
        unavailableIdRetries = 0;
        retryAttempt = 0;
        isUserNameChange = false;
        previousPeerId = null;
        useAppStore.getState().setRetryCount(0);
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    });

    peerInstance.on('connection', (conn) => {
        console.log('[Peer] Incoming connection from:', conn.peer);
        
        const store = useAppStore.getState();

        // Check room limit before queuing consent
        if (store.activeConnections.length >= MAX_PEERS) {
            console.log('[Conn] Room is full. Auto-rejecting incoming peer:', conn.peer);
            try {
                if (conn.open) {
                    conn.send({ type: 'SYSTEM', payload: { action: 'REJECT_FULL' } });
                }
                setTimeout(() => { try { conn.close(); } catch (e) { } }, 500);
            } catch (e) {
                console.error('Error auto-rejecting full room:', e);
            }
            return;
        }

        // Auto-clear consent modal if sender disconnects or closes before accept/reject
        conn.on('close', () => {
            const currentPending = useAppStore.getState().pendingIncomingConnection;
            // CRITICAL FIX: Must check currentPending.conn === conn to avoid race condition with duplicate/stale connections
            if (currentPending && currentPending.conn === conn) {
                console.log('[Consent] Sender disconnected while waiting for consent:', conn.peer);
                useAppStore.getState().clearPendingIncomingConnection();
            }
        });

        // Listen for data BEFORE user accepts, to capture DEVICE_INFO
        conn.on('data', function earlyDataHandler(data) {
            if (data?.type === 'SYSTEM' && data?.payload?.action === 'DEVICE_INFO') {
                console.log('[Consent] Received early DEVICE_INFO from:', conn.peer);
                const currentStore = useAppStore.getState();
                currentStore.setPeerDeviceName(conn.peer, data.payload.deviceName);
                currentStore.addTrustedDevice(conn.peer, data.payload.deviceName);
                
                const pending = currentStore.pendingIncomingConnection;
                if (pending && pending.peerId === conn.peer) {
                    currentStore.setPendingIncomingConnection({
                        ...pending,
                        deviceName: data.payload.deviceName
                    });
                }
            }
        });

        // Connection Consent: Queue the connection for user approval
        store.setPendingIncomingConnection({
            conn,
            peerId: conn.peer,
            deviceName: null, // Will be updated if earlyDataHandler catches it
            timestamp: Date.now()
        });
    });

    peerInstance.on('disconnected', () => {
        console.log('[Peer] Disconnected from signaling server');
        handleAutoRetry();
    });

    peerInstance.on('close', () => {
        console.log('[Peer] Destroyed');
        useAppStore.getState().setConnectionStatus('disconnected');
        peerInstance = null;
        isInitialized = false;
    });

    peerInstance.on('error', (err) => {
        console.error('[Peer] Error:', err);
        const store = useAppStore.getState();
        
        if (err.type === 'peer-unavailable') {
            console.warn('[Peer] A remote peer is unavailable.');
            
            // Try to extract the dead peer ID from the error message
            const match = err.message?.match(/Could not connect to peer (.+)/);
            if (match && match[1]) {
                store.removeConnection(match[1], false); // Completely remove this dead peer
            }

            if (store.connectionStatus === 'connecting_peer' || store.connectionStatus === 'awaiting_accept') {
                store.setConnectionStatus('disconnected');
            }
        } else if (err.type === 'unavailable-id') {
            if (peerInstance) {
                peerInstance.destroy();
                peerInstance = null;
                isInitialized = false;
            }

            // If this was a user-initiated name change, revert and show error
            if (isUserNameChange && previousPeerId) {
                console.warn('[Peer] User-chosen name is taken. Reverting to:', previousPeerId);
                store.setNameChangeError('ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่น');
                store.setPreferredPeerId(previousPeerId);
                store.setMyPeerId(previousPeerId);
                store.setDeviceName(previousDeviceName);
                isUserNameChange = false;
                previousPeerId = null;
                previousDeviceName = null;
                unavailableIdRetries = 0;
                schedulePeerReinitialize(250);
                // Auto-clear error after 4 seconds
                setTimeout(() => {
                    useAppStore.getState().setNameChangeError(null);
                }, 4000);
            } else {
                // Normal unavailable-id retry (e.g. on app startup)
                unavailableIdRetries += 1;
                const retryDelay = Math.min(5000, unavailableIdRetries * 1500);

                const maxRetries = store.deviceName ? 999999 : MAX_UNAVAILABLE_ID_RETRIES;

                if (unavailableIdRetries <= maxRetries) {
                    console.warn(`[Peer] Requested ID is unavailable. Retrying in ${retryDelay}ms (attempt ${unavailableIdRetries}/${maxRetries === 999999 ? 'infinite' : maxRetries}).`);
                    schedulePeerReinitialize(retryDelay);
                } else {
                    const newId = generatePeerId();
                    console.warn('[Peer] Existing ID stayed unavailable. Falling back to a new generated ID:', newId);
                    store.setPreferredPeerId(newId);
                    store.setMyPeerId(newId);
                    unavailableIdRetries = 0;
                    schedulePeerReinitialize(250);
                }
            }
        } else {
            // For other generic errors, ensure the UI isn't stuck "connecting" forever
            if (store.connectionStatus === 'connecting_peer' || store.connectionStatus === 'awaiting_accept') {
                store.setConnectionStatus('disconnected');
            }
        }
    });

    return peerInstance;
};

/**
 * Handle auto-retry with exponential backoff
 */
const handleAutoRetry = () => {
    if (reconnectInterval) return; // Already retrying

    const store = useAppStore.getState();
    if (store.activeConnections.length > 0) {
        // Still have other connections, just try to reconnect to signaling
        if (peerInstance && !peerInstance.destroyed) {
            peerInstance.reconnect();
        }
        return;
    }

    const attemptReconnect = () => {
        if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
            console.warn('[Retry] Max retry attempts reached. Stopping.');
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            return;
        }

        retryAttempt++;
        useAppStore.getState().setRetryCount(retryAttempt);
        const delay = getRetryDelay(retryAttempt);
        console.log(`[Retry] Attempt ${retryAttempt}/${MAX_RETRY_ATTEMPTS} (next in ${delay}ms)`);

        if (peerInstance && !peerInstance.destroyed) {
            peerInstance.reconnect();
        }
    };

    // Start with immediate attempt, then use interval
    reconnectInterval = setInterval(() => {
        attemptReconnect();
    }, 5000);

    // First retry immediately
    attemptReconnect();
};

const MAX_PEERS = 3;

const setupConnectionHandlers = (conn, timeoutRef, isIncoming = false) => {
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
        
        const currentLocalStore = useAppStore.getState();
        const deviceName = currentLocalStore.deviceName || currentLocalStore.myPeerId;

        if (isIncoming) {
            // We accepted an incoming connection
            useAppStore.getState().addConnection(conn);
            retryAttempt = 0;
            useAppStore.getState().setRetryCount(0);
            conn.send({ type: 'SYSTEM', payload: { action: 'ACCEPT_CONNECTION', deviceName } });
        } else {
            // Outgoing connection, waiting for peer to accept
            useAppStore.getState().setConnectionStatus('awaiting_accept');
            conn.send({ type: 'SYSTEM', payload: { action: 'DEVICE_INFO', deviceName } });
            
            // Set ACCEPT_TIMEOUT
            if (timeoutRef) {
                timeoutRef.current = setTimeout(() => {
                    if (useAppStore.getState().connectionStatus !== 'connected') {
                        console.warn('[Conn] Accept timed out after 35 seconds. Forcing disconnect.');
                        try { conn.close(); } catch(e) {}
                        useAppStore.getState().setConnectionStatus('disconnected');
                        useAppStore.getState().clearPendingOutgoingConnection();
                        useAppStore.getState().setToastMessage('อีกฝ่ายไม่ตอบรับการเชื่อมต่อ ❌');
                    }
                }, 35000);
            }
            // We do NOT addConnection here. We wait for ACCEPT_CONNECTION via data channel.
            return;
        }

        // Detect LAN vs Relay connection type (with delay for ICE to stabilize)
        setTimeout(async () => {
            const connType = await detectConnectionType(conn);
            console.log(`[Conn] Connection type detected: ${connType}`);
            useAppStore.getState().setConnectionType(connType);
        }, 2000);

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
        if (data?.type === 'SYSTEM' && data?.payload?.action === 'ACCEPT_CONNECTION') {
            console.log('[Consent] Peer accepted connection:', conn.peer);
            if (data.payload?.deviceName && conn.peer) {
                useAppStore.getState().setPeerDeviceName(conn.peer, data.payload.deviceName);
                useAppStore.getState().addTrustedDevice(conn.peer, data.payload.deviceName);
            }
            useAppStore.getState().addConnection(conn);
            useAppStore.getState().clearPendingOutgoingConnection();
            
            if (timeoutRef?.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Detect LAN vs Relay
            setTimeout(async () => {
                const connType = await detectConnectionType(conn);
                useAppStore.getState().setConnectionType(connType);
            }, 2000);

            // Sync mesh peers to ALL connected peers
            const newStore = useAppStore.getState();
            const allPeerIds = [newStore.myPeerId, ...newStore.activeConnections.map(c => c.peer)];
            const uniquePeerIds = [...new Set(allPeerIds)];
            newStore.activeConnections.forEach(c => {
                if (c.open) {
                    c.send({ type: 'SYSTEM', payload: { action: 'SYNC_PEERS', peers: uniquePeerIds } });
                }
            });
        }
        
        handleIncomingData(data, conn.peer);
    });

    conn.on('close', () => {
        console.log('[Conn] Closed:', conn.peer);
        if (timeoutRef?.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        useAppStore.getState().removeConnection(conn.peer, true);
    });

    conn.on('error', (err) => {
        console.error('[Conn] Error:', err);
        if (timeoutRef?.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    });

    // If the connection is already open (e.g. from consent flow where open fired before handlers were set up),
    // manually trigger the open logic now.
    if (conn.open) {
        console.log('[Conn] Connection already open, triggering open logic for:', conn.peer);
        const currentStore = useAppStore.getState();

        if (currentStore.activeConnections.length >= MAX_PEERS) {
            console.log('[Conn] Room is full. Rejecting peer:', conn.peer);
            conn.send({ type: 'SYSTEM', payload: { action: 'REJECT_FULL' } });
            setTimeout(() => { try { conn.close(); } catch (e) { } }, 500);
            return;
        }

        const deviceName = currentStore.deviceName || currentStore.myPeerId;
        
        if (isIncoming) {
            useAppStore.getState().addConnection(conn);
            retryAttempt = 0;
            useAppStore.getState().setRetryCount(0);
            conn.send({ type: 'SYSTEM', payload: { action: 'ACCEPT_CONNECTION', deviceName } });
        } else {
            useAppStore.getState().setConnectionStatus('awaiting_accept');
            conn.send({ type: 'SYSTEM', payload: { action: 'DEVICE_INFO', deviceName } });
            if (timeoutRef) {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    if (useAppStore.getState().connectionStatus !== 'connected') {
                        console.warn('[Conn] Accept timed out after 35 seconds. Forcing disconnect.');
                        try { conn.close(); } catch(e) {}
                        useAppStore.getState().setConnectionStatus('disconnected');
                        useAppStore.getState().clearPendingOutgoingConnection();
                        useAppStore.getState().setToastMessage('อีกฝ่ายไม่ตอบรับการเชื่อมต่อ ❌');
                    }
                }, 35000);
            }
            return; // Wait for ACCEPT_CONNECTION
        }

        setTimeout(async () => {
            const connType = await detectConnectionType(conn);
            console.log(`[Conn] Connection type detected: ${connType}`);
            useAppStore.getState().setConnectionType(connType);
        }, 2000);

        const newStore = useAppStore.getState();
        const activeConns = newStore.activeConnections;
        const allPeerIds = [newStore.myPeerId, ...activeConns.map(c => c.peer)];
        const uniquePeerIds = [...new Set(allPeerIds)];
        activeConns.forEach(c => {
            if (c.open) {
                c.send({ type: 'SYSTEM', payload: { action: 'SYNC_PEERS', peers: uniquePeerIds } });
            }
        });
    }
};

const handleIncomingData = (data, senderPeerId) => {
    console.log('[Data] Received from', senderPeerId, ':', data);
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
                console.log('[System] Remote peer logged out:', senderPeerId);
                store.removeConnection(senderPeerId, false);

            } else if (data.payload?.action === 'REJECT_FULL') {
                console.warn('[System] Connection rejected: Room is full.');
                store.setToastMessage('ห้องเต็มแล้ว (จำกัดการส่งเป็นกลุ่มสูงสุด 3 เครื่อง) ❌');
                store.removeConnection(data.payload.peer || "unknown");
                store.clearPendingOutgoingConnection();
            } else if (data.payload?.action === 'REJECT_USER') {
                console.warn('[System] Connection rejected by user.');
                store.setToastMessage('อีกฝ่ายปฏิเสธการเชื่อมต่อ ❌');
                store.removeConnection(data.payload.peer || "unknown");
                store.clearPendingOutgoingConnection();
            } else if (data.payload?.action === 'DEVICE_INFO') {
                // Store the peer's friendly device name
                const deviceName = data.payload.deviceName;
                if (deviceName && senderPeerId) {
                    store.setPeerDeviceName(senderPeerId, deviceName);
                    store.addTrustedDevice(senderPeerId, deviceName);
                }
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
        remotePeerIds,
        connectionType,
        peerDeviceNames,
        retryCount,
        pendingIncomingConnection,
        nameChangeError
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
        
        // Prevent connecting to self
        if (peerId === store.myPeerId) {
            store.setToastMessage('ไม่สามารถเชื่อมต่อกับตัวเองได้ ❌');
            if (store.connectionStatus === 'connecting_peer' || store.connectionStatus === 'awaiting_accept') {
                store.setConnectionStatus('disconnected');
            }
            return;
        }

        if (store.activeConnections.some(c => c.peer === peerId)) {
            console.warn('[Conn] Already connected to this peer');
            return;
        }

        if (store.activeConnections.length >= MAX_PEERS) {
            store.setToastMessage('ลีมิตถึงจำนวนสูงสุดแล้ว ไม่สามารถเชื่อมต่อเพิ่มได้ (สูงสุด 3 เครื่อง) ❌');
            return;
        }

        console.log('[Conn] Initiating connection to:', peerId);
        if (store.activeConnections.length === 0) {
            useAppStore.getState().setConnectionStatus('connecting_peer');
        }

        const doConnect = () => {
            if (!peerInstance || peerInstance.destroyed || peerInstance.disconnected) {
                console.error('[Conn] Peer lost connection before connecting');
                useAppStore.getState().setConnectionStatus('disconnected');
                return;
            }
            
            const conn = peerInstance.connect(peerId, { reliable: true });
            
            // Add a safety timeout to avoid infinite "Connecting..." state
            const connectionTimeout = { current: null };
            connectionTimeout.current = setTimeout(() => {
                if (useAppStore.getState().connectionStatus !== 'connected') {
                    console.warn('[Conn] Connection timed out after 15 seconds. Forcing disconnect.');
                    try { conn.close(); } catch(e) {}
                    useAppStore.getState().setConnectionStatus('disconnected');
                    useAppStore.getState().clearPendingOutgoingConnection();
                    useAppStore.getState().setToastMessage('การเชื่อมต่อหมดเวลา (Timeout) กรุณาลองใหม่ ❌');
                }
            }, 15000);
            
            useAppStore.getState().setPendingOutgoingConnection({ conn, peerId, timeoutRef: connectionTimeout });

            setupConnectionHandlers(conn, connectionTimeout, false);
        };

        const isReady = peerInstance._isReady || peerInstance.open;
        
        if (isReady) {
            doConnect();
        } else {
            console.log('[Conn] Peer not open yet, waiting for open event...');
            peerInstance.once('open', doConnect);
        }
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

    const cancelOutgoingConnection = useCallback(() => {
        const store = useAppStore.getState();
        const pending = store.pendingOutgoingConnection;
        
        if (pending) {
            console.log('[Conn] Cancelling outgoing connection to:', pending.peerId);
            if (pending.timeoutRef?.current) {
                clearTimeout(pending.timeoutRef.current);
            }
            try {
                if (pending.conn) pending.conn.close();
            } catch (e) {
                console.error('[Conn] Error closing outgoing connection:', e);
            }
            store.clearPendingOutgoingConnection();
        }
        
        if (store.activeConnections.length === 0) {
            store.setConnectionStatus('disconnected');
        }
    }, []);

    const manualDisconnect = useCallback(() => {
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

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
            
            // Give WebRTC enough time to flush the buffer across the internet before closing connections
            setTimeout(() => {
                try {
                    conns.forEach(conn => conn.close());
                } catch (e) { console.error('Error closing connection:', e); }
                
                // Do NOT destroy peerInstance here.
                // Keeping it alive allows for instant reconnects without hitting 'unavailable-id'.
            }, 500);
        }
    }, []);

    const regeneratePeerId = useCallback(() => {
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        const store = useAppStore.getState();
        const newId = generatePeerId();

        console.log('[Peer] Regenerating peer ID:', newId);

        unavailableIdRetries = 0;
        retryAttempt = 0;
        store.resetConnectionSession();
        store.setPreferredPeerId(newId);
        store.setMyPeerId(newId);
        store.setDeviceName(null); // Reset device name so it shows the new peer ID

        if (peerInstance) {
            try {
                peerInstance.destroy();
            } catch (err) {
                console.error('[Peer] Failed to destroy peer while regenerating ID:', err);
            }
            peerInstance = null;
        }

        isInitialized = false;
        schedulePeerReinitialize();

        return newId;
    }, []);

    /**
     * Change peer ID to a user-specified name.
     * Sanitizes the input to be a valid PeerJS ID.
     */
    const changePeerId = useCallback((newName) => {
        const trimmedName = newName.trim();
        if (!trimmedName) return null;

        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        const store = useAppStore.getState();

        // Use the exact name as the Peer ID
        let newPeerId = trimmedName;

        // Don't change if it's the exact same ID and Name
        if (newPeerId === store.myPeerId && trimmedName === store.deviceName) {
            return { peerId: newPeerId, name: trimmedName };
        }

        console.log(`[Peer] Changing peer ID to: ${newPeerId}, device name to: ${trimmedName}`);

        // Track this as user-initiated so we can revert on unavailable-id
        previousPeerId = store.myPeerId;
        previousDeviceName = store.deviceName;
        isUserNameChange = true;

        unavailableIdRetries = 0;
        retryAttempt = 0;
        store.setNameChangeError(null); // Clear any previous error
        store.resetConnectionSession();
        store.setPreferredPeerId(newPeerId);
        store.setMyPeerId(newPeerId);
        store.setDeviceName(trimmedName); // Save the actual name they typed (supports Thai)

        if (peerInstance) {
            try {
                peerInstance.destroy();
            } catch (err) {
                console.error('[Peer] Failed to destroy peer:', err);
            }
            peerInstance = null;
        }

        isInitialized = false;
        schedulePeerReinitialize();

        return { peerId: newPeerId, name: trimmedName };
    }, []);

    /**
     * Accept a pending incoming connection
     */
    const acceptIncomingConnection = useCallback(() => {
        const store = useAppStore.getState();
        const pending = store.pendingIncomingConnection;
        if (!pending) return;

        console.log('[Consent] Accepted connection from:', pending.peerId);
        setupConnectionHandlers(pending.conn, { current: null }, true);
        store.clearPendingIncomingConnection();
    }, []);

    /**
     * Reject a pending incoming connection
     */
    const rejectIncomingConnection = useCallback(() => {
        const store = useAppStore.getState();
        const pending = store.pendingIncomingConnection;
        if (!pending) return;

        console.log('[Consent] Rejected connection from:', pending.peerId);
        try {
            if (pending.conn.open) {
                pending.conn.send({ type: 'SYSTEM', payload: { action: 'REJECT_USER', peer: store.myPeerId } });
            }
            setTimeout(() => {
                try { pending.conn.close(); } catch (e) { }
            }, 300);
        } catch (e) {
            console.error('[Consent] Error rejecting:', e);
        }
        store.clearPendingIncomingConnection();
    }, []);

    return {
        connectionStatus,
        myPeerId,
        activeConnections,
        remotePeerIds,
        connectionType,
        peerDeviceNames,
        retryCount,
        pendingIncomingConnection,
        nameChangeError,
        connectToPeer,
        regeneratePeerId,
        changePeerId,
        disconnectPeer: manualDisconnect,
        sendData,
        acceptIncomingConnection,
        rejectIncomingConnection,
        cancelOutgoingConnection
    };
};
