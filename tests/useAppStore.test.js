import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock platform.js before importing the store
vi.mock('../src/utils/platform', () => ({
    getDeviceName: () => 'Test Device',
    isIOS: () => false,
    isSafari: () => false,
    isMobile: () => false
}));

// We need to reset the store module between tests
let useAppStore;

beforeEach(async () => {
    // Clear localStorage mock
    const mockStorage = {};
    vi.stubGlobal('localStorage', {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, value) => { mockStorage[key] = value; }),
        removeItem: vi.fn((key) => { delete mockStorage[key]; }),
    });

    // Re-import fresh store for each test
    vi.resetModules();
    const module = await import('../src/stores/useAppStore.js');
    useAppStore = module.default;
});

describe('useAppStore', () => {
    describe('Identity', () => {
        it('should set myPeerId', () => {
            useAppStore.getState().setMyPeerId('test-42');
            expect(useAppStore.getState().myPeerId).toBe('test-42');
        });

        it('should set preferredPeerId', () => {
            useAppStore.getState().setPreferredPeerId('cosmic-99');
            expect(useAppStore.getState().preferredPeerId).toBe('cosmic-99');
        });

        it('should set deviceName', () => {
            useAppStore.getState().setDeviceName('My MacBook');
            expect(useAppStore.getState().deviceName).toBe('My MacBook');
        });
    });

    describe('Connection', () => {
        it('should start as disconnected', () => {
            expect(useAppStore.getState().connectionStatus).toBe('disconnected');
        });

        it('should add a connection and update status', () => {
            const mockConn = { peer: 'peer-01', open: true };
            useAppStore.getState().addConnection(mockConn);

            const state = useAppStore.getState();
            expect(state.connectionStatus).toBe('connected');
            expect(state.activeConnections).toHaveLength(1);
            expect(state.remotePeerIds).toContain('peer-01');
        });

        it('should not duplicate connections from same peer', () => {
            const mockConn1 = { peer: 'peer-01', open: true };
            const mockConn2 = { peer: 'peer-01', open: true };
            useAppStore.getState().addConnection(mockConn1);
            useAppStore.getState().addConnection(mockConn2);

            expect(useAppStore.getState().activeConnections).toHaveLength(1);
        });

        it('should remove a connection', () => {
            useAppStore.getState().addConnection({ peer: 'peer-01', open: true });
            useAppStore.getState().addConnection({ peer: 'peer-02', open: true });
            useAppStore.getState().removeConnection('peer-01');

            const state = useAppStore.getState();
            expect(state.activeConnections).toHaveLength(1);
            expect(state.connectionStatus).toBe('connected');
        });

        it('should set disconnected when last connection is removed', () => {
            useAppStore.getState().addConnection({ peer: 'peer-01', open: true });
            useAppStore.getState().removeConnection('peer-01');

            expect(useAppStore.getState().connectionStatus).toBe('disconnected');
        });

        it('should reset connection session', () => {
            useAppStore.getState().addConnection({ peer: 'peer-01', open: true });
            useAppStore.getState().setPeerDeviceName('peer-01', 'iPhone');
            useAppStore.getState().setConnectionType('lan');
            useAppStore.getState().resetConnectionSession();

            const state = useAppStore.getState();
            expect(state.activeConnections).toHaveLength(0);
            expect(state.remotePeerIds).toHaveLength(0);
            expect(state.connectionStatus).toBe('disconnected');
            expect(state.connectionType).toBe('unknown');
            expect(state.peerDeviceNames).toEqual({});
        });
    });

    describe('Peer Device Names', () => {
        it('should store peer device name', () => {
            useAppStore.getState().setPeerDeviceName('peer-01', 'Samsung S24');
            expect(useAppStore.getState().peerDeviceNames['peer-01']).toBe('Samsung S24');
        });

        it('should store multiple peer names', () => {
            useAppStore.getState().setPeerDeviceName('peer-01', 'iPhone');
            useAppStore.getState().setPeerDeviceName('peer-02', 'MacBook');

            const names = useAppStore.getState().peerDeviceNames;
            expect(names['peer-01']).toBe('iPhone');
            expect(names['peer-02']).toBe('MacBook');
        });
    });

    describe('Connection Type', () => {
        it('should start as unknown', () => {
            expect(useAppStore.getState().connectionType).toBe('unknown');
        });

        it('should set connection type', () => {
            useAppStore.getState().setConnectionType('lan');
            expect(useAppStore.getState().connectionType).toBe('lan');

            useAppStore.getState().setConnectionType('relay');
            expect(useAppStore.getState().connectionType).toBe('relay');
        });
    });

    describe('Connection Consent', () => {
        it('should set pending incoming connection', () => {
            const pending = { conn: {}, peerId: 'peer-01', deviceName: 'Phone', timestamp: Date.now() };
            useAppStore.getState().setPendingIncomingConnection(pending);
            expect(useAppStore.getState().pendingIncomingConnection).toEqual(pending);
        });

        it('should clear pending incoming connection', () => {
            useAppStore.getState().setPendingIncomingConnection({ peerId: 'peer-01' });
            useAppStore.getState().clearPendingIncomingConnection();
            expect(useAppStore.getState().pendingIncomingConnection).toBeNull();
        });
    });

    describe('File Transfer', () => {
        it('should add a file transfer', () => {
            useAppStore.getState().addFileTransfer({
                id: 'tf-001',
                fileName: 'test.pdf',
                fileSize: 1024,
                progress: 0,
                direction: 'outgoing',
                status: 'pending'
            });

            expect(useAppStore.getState().fileTransfers).toHaveLength(1);
            expect(useAppStore.getState().fileTransfers[0].fileName).toBe('test.pdf');
        });

        it('should update a file transfer', () => {
            useAppStore.getState().addFileTransfer({
                id: 'tf-001',
                status: 'pending',
                progress: 0
            });

            useAppStore.getState().updateFileTransfer('tf-001', {
                status: 'transferring',
                progress: 50
            });

            const ft = useAppStore.getState().fileTransfers[0];
            expect(ft.status).toBe('transferring');
            expect(ft.progress).toBe(50);
        });
    });

    describe('Clipboard', () => {
        it('should add clipboard items', () => {
            useAppStore.getState().addClipboardItem({ id: '1', text: 'hello' });
            useAppStore.getState().addClipboardItem({ id: '2', text: 'world' });

            const history = useAppStore.getState().clipboardHistory;
            expect(history).toHaveLength(2);
            // Most recent first
            expect(history[0].text).toBe('world');
        });

        it('should limit clipboard history to 50 items', () => {
            for (let i = 0; i < 55; i++) {
                useAppStore.getState().addClipboardItem({ id: String(i), text: `item ${i}` });
            }

            expect(useAppStore.getState().clipboardHistory).toHaveLength(50);
        });
    });

    describe('Clear Persisted Data', () => {
        it('should clear all transient state but keep identity', () => {
            useAppStore.getState().setMyPeerId('test-id');
            useAppStore.getState().setDeviceName('My PC');
            useAppStore.getState().addConnection({ peer: 'p1', open: true });
            useAppStore.getState().addClipboardItem({ id: '1', text: 'test' });
            useAppStore.getState().addFileTransfer({ id: 'tf-1', status: 'completed' });

            useAppStore.getState().clearPersistedData();

            const state = useAppStore.getState();
            expect(state.myPeerId).toBe('test-id');
            expect(state.deviceName).toBe('My PC');
            expect(state.activeConnections).toHaveLength(0);
            expect(state.clipboardHistory).toHaveLength(0);
            expect(state.fileTransfers).toHaveLength(0);
            expect(state.connectionStatus).toBe('disconnected');
        });
    });
});
