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
            remotePeerId: null,
            activeConnection: null, // PeerJS connection object
            setConnectionStatus: (status) => set({ connectionStatus: status }),
            setRemotePeerId: (id) => set({ remotePeerId: id }),
            setActiveConnection: (conn) => set({ activeConnection: conn }),

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
            clearPersistedData: () => set({
                myPeerId: null,
                remotePeerId: null,
                clipboardHistory: [],
                fileTransfers: [],
                connectionStatus: 'disconnected',
                activeTab: 'clipboard',
                lastReceivedClipboard: null
            })
        }),
        {
            name: 'blap-storage', // key in localStorage
            partialize: (state) => ({
                myPeerId: state.myPeerId,
                remotePeerId: state.remotePeerId,
                clipboardHistory: state.clipboardHistory,
                fileTransfers: state.fileTransfers,
            }), // Only save these fields
        }
    )
);

export default useAppStore;
