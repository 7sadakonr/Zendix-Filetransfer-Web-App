import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStore = create(
    persist(
        (set, get) => ({
            // Identity
            myPeerId: null,
            setMyPeerId: (id) => set({ myPeerId: id }),

            // Connection
            connectionStatus: 'disconnected', // disconnected, connecting, connected
            remotePeerIds: [],
            activeConnections: [], // list of active PeerJS connection objects
            setConnectionStatus: (status) => set({ connectionStatus: status }),
            addConnection: (conn) => set((state) => ({
                activeConnections: [...state.activeConnections.filter(c => c.peer !== conn.peer), conn],
                remotePeerIds: [...new Set([...state.remotePeerIds, conn.peer])],
                connectionStatus: 'connected'
            })),
            removeConnection: (peerId) => set((state) => {
                const newConnections = state.activeConnections.filter(c => c.peer !== peerId);
                const newPeerIds = state.remotePeerIds.filter(id => id !== peerId);
                return {
                    activeConnections: newConnections,
                    remotePeerIds: newPeerIds,
                    connectionStatus: newConnections.length > 0 ? 'connected' : 'disconnected'
                };
            }),

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
                });
                return {
                    myPeerId: null,
                    remotePeerIds: [],
                    activeConnections: [],
                    clipboardHistory: [],
                    fileTransfers: [],
                    connectionStatus: 'disconnected',
                    activeTab: 'clipboard',
                    lastReceivedClipboard: null
                };
            }),
        }),
        {
            name: 'blap-storage', // key in localStorage
            partialize: (state) => ({
                myPeerId: state.myPeerId,
                remotePeerIds: state.remotePeerIds || (state.remotePeerId ? [state.remotePeerId] : []),
                clipboardHistory: state.clipboardHistory,
                fileTransfers: state.fileTransfers,
            }), // Only save these fields
        }
    )
);

export default useAppStore;
