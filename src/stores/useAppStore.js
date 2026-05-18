import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'zendix-storage';
const LEGACY_STORAGE_KEYS = ['b' + 'lap-storage'];

if (typeof window !== 'undefined' && !window.localStorage.getItem(STORAGE_KEY)) {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyValue = window.localStorage.getItem(legacyKey);
        if (legacyValue) {
            window.localStorage.setItem(STORAGE_KEY, legacyValue);
            break;
        }
    }
}

const useAppStore = create(
    persist(
        (set, get) => ({
            // Identity
            myPeerId: null,
            preferredPeerId: null,
            deviceName: null, // Friendly device name (persisted, editable) — null = show peer ID
            setMyPeerId: (id) => set({ myPeerId: id }),
            setPreferredPeerId: (id) => set({ preferredPeerId: id }),
            setDeviceName: (name) => set({ deviceName: name }),

            // Connection
            connectionStatus: 'disconnected', // disconnected, connecting, connected
            remotePeerIds: [],
            activeConnections: [], // list of active PeerJS connection objects
            connectionType: 'unknown', // 'lan' | 'relay' | 'unknown'
            peerDeviceNames: {}, // Map<peerId, deviceName>
            retryCount: 0, // Current retry attempt count
            nameChangeError: null, // Error message when name change fails (e.g. 'taken')
            setConnectionStatus: (status) => set({ connectionStatus: status }),
            setConnectionType: (type) => set({ connectionType: type }),
            setRetryCount: (count) => set({ retryCount: count }),
            setNameChangeError: (error) => set({ nameChangeError: error }),
            setPeerDeviceName: (peerId, name) => set((state) => ({
                peerDeviceNames: { ...state.peerDeviceNames, [peerId]: name }
            })),
            addConnection: (conn) => set((state) => ({
                activeConnections: [...state.activeConnections.filter(c => c.peer !== conn.peer), conn],
                remotePeerIds: [...new Set([...state.remotePeerIds, conn.peer])],
                connectionStatus: 'connected',
                retryCount: 0
            })),
            resetConnectionSession: () => set({
                remotePeerIds: [],
                activeConnections: [],
                connectionStatus: 'disconnected',
                connectionType: 'unknown',
                peerDeviceNames: {},
                retryCount: 0
            }),
            removeConnection: (peerId, keepSession = false) => set((state) => {
                const newConnections = state.activeConnections.filter(c => c.peer !== peerId);
                const newPeerIds = keepSession ? state.remotePeerIds : state.remotePeerIds.filter(id => id !== peerId);
                const newPeerDeviceNames = { ...state.peerDeviceNames };
                if (!keepSession) {
                    delete newPeerDeviceNames[peerId];
                }
                return {
                    activeConnections: newConnections,
                    remotePeerIds: newPeerIds,
                    peerDeviceNames: newPeerDeviceNames,
                    connectionStatus: newConnections.length > 0 ? 'connected' : 'disconnected'
                };
            }),

            // Connection Consent
            pendingIncomingConnection: null, // { conn, peerId, deviceName, timestamp }
            setPendingIncomingConnection: (pending) => set({ pendingIncomingConnection: pending }),
            clearPendingIncomingConnection: () => set({ pendingIncomingConnection: null }),

            // Clipboard
            clipboardHistory: [],
            lastReceivedClipboard: null, // Trigger for auto-write attempts
            addClipboardItem: (item) => set((state) => ({
                clipboardHistory: [item, ...state.clipboardHistory].slice(0, 50)
            })),
            setLastReceivedClipboard: (item) => set({ lastReceivedClipboard: item }),

            // File Transfer
            fileTransfers: [],
            addFileTransfer: (transfer) => set((state) => ({
                fileTransfers: [transfer, ...state.fileTransfers]
            })),
            updateFileTransfer: (id, updates) => set((state) => ({
                fileTransfers: state.fileTransfers.map(ft => ft.id === id ? { ...ft, ...updates } : ft)
            })),

            // UI State
            activeTab: 'clipboard', // clipboard, files
            setActiveTab: (tab) => set({ activeTab: tab }),
            previewImage: null, // { url: string, name: string } || null
            setPreviewImage: (preview) => set({ previewImage: preview }),

            // Logout / Clear state
            clearPersistedData: () => set((state) => {
                // Free memory for downloaded files
                state.fileTransfers.forEach(ft => {
                    if (ft.blobUrl) {
                        URL.revokeObjectURL(ft.blobUrl);
                    }
                    if (ft.previewUrl && ft.previewUrl !== ft.blobUrl) {
                        URL.revokeObjectURL(ft.previewUrl);
                    }
                });
                return {
                    myPeerId: state.myPeerId,
                    preferredPeerId: state.preferredPeerId,
                    deviceName: state.deviceName,
                    remotePeerIds: [],
                    activeConnections: [],
                    clipboardHistory: [],
                    fileTransfers: [],
                    connectionStatus: 'disconnected',
                    connectionType: 'unknown',
                    peerDeviceNames: {},
                    retryCount: 0,
                    activeTab: 'clipboard',
                    lastReceivedClipboard: null,
                    pendingIncomingConnection: null
                };
            }),
        }),
        {
            name: STORAGE_KEY,
            partialize: (state) => ({
                myPeerId: state.myPeerId,
                preferredPeerId: state.preferredPeerId,
                deviceName: state.deviceName,
                remotePeerIds: state.remotePeerIds || (state.remotePeerId ? [state.remotePeerId] : []),
                clipboardHistory: state.clipboardHistory,
            }), // Only save these fields
        }
    )
);

export default useAppStore;
