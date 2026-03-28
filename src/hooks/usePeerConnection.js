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
            // If we already have a remotePeerId saved, it means we were trying an auto-reconnect 
            // after being disconnected (e.g. waking up from background). 
            // If the peer is unavailable now, they likely clicked Logout while we were asleep.
            // We must destroy our session so we don't get stuck in 'Reconnecting...' forever.
            if (store.remotePeerId) {
                console.log('[Peer] Stored remote peer not found. They logged out. Forcing local logout.');
                if (peerInstance) {
                    peerInstance.destroy();
                    peerInstance = null;
                    isInitialized = false;
                }
                store.clearPersistedData();
            }
        }
    });

    return peerInstance;
};

const setupConnectionHandlers = (conn) => {
    const store = useAppStore.getState();

    conn.on('open', () => {
        console.log('[Conn] Opened with:', conn.peer);
        useAppStore.getState().setConnectionStatus('connected');
        useAppStore.getState().setActiveConnection(conn);
        useAppStore.getState().setRemotePeerId(conn.peer);
    });

    conn.on('data', (data) => {
        handleIncomingData(data);
    });

    conn.on('close', () => {
        console.log('[Conn] Closed:', conn.peer);
        const currentConn = useAppStore.getState().activeConnection;
        if (currentConn?.peer === conn.peer) {
            useAppStore.getState().setConnectionStatus('disconnected');
            useAppStore.getState().setActiveConnection(null);
            // We DO NOT clear remotePeerId here, so the UI knows we *were* connected and can auto-reconnect
        }
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
                    isInitialized = false;
                }
                store.clearPersistedData();
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
        activeConnection,
        setConnectionStatus
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

        const currentStatus = useAppStore.getState().connectionStatus;
        if (currentStatus === 'connected') {
            console.warn('[Conn] Already connected');
            return;
        }

        console.log('[Conn] Initiating connection to:', peerId);
        useAppStore.getState().setConnectionStatus('connecting');

        const conn = peerInstance.connect(peerId, { reliable: true });
        setupConnectionHandlers(conn);
    }, []);

    const sendData = useCallback((type, payload) => {
        const conn = useAppStore.getState().activeConnection;
        if (conn && conn.open) {
            conn.send({ type, payload });
        } else {
            console.warn('[Conn] Cannot send, not connected');
        }
    }, []);

    const manualDisconnect = useCallback(async () => {
        const conn = useAppStore.getState().activeConnection;
        if (conn && conn.open) {
            console.log('[Conn] Sending logout signal and disconnecting manually');
            conn.send({ type: 'SYSTEM', payload: { action: 'LOGOUT' } });
            
            // Give WebRTC a tiny bit of time to flush the buffer before destroying everything
            await new Promise(r => setTimeout(r, 100));
            conn.close();
        }
        if (peerInstance) {
            peerInstance.destroy();
            peerInstance = null;
            isInitialized = false;
        }
        useAppStore.getState().clearPersistedData();
    }, []);

    return {
        connectionStatus,
        myPeerId,
        activeConnection,
        connectToPeer,
        disconnectPeer: manualDisconnect,
        sendData
    };
};
