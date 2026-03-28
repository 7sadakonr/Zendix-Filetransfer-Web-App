import useAppStore from '../stores/useAppStore';
import { isMobile } from './platform';

// In-memory buffer: Map<transferId, { chunks: [], receivedBytes: 0, metadata: {} }>
const transfers = new Map();

export const handleFileProtocol = (payload) => {
    const { type, transferId } = payload;
    const store = useAppStore.getState();

    if (type === 'METADATA') {
        const { fileName, fileSize, fileType } = payload;

        console.log(`[FileReceiver] New file: ${fileName}`);
        transfers.set(transferId, {
            metadata: payload,
            chunks: [],
            receivedBytes: 0
        });

        store.addFileTransfer({
            id: transferId,
            fileName,
            fileSize,
            progress: 0,
            direction: 'incoming',
            status: 'transferring'
        });
    }
    else if (type === 'CHUNK') {
        const transfer = transfers.get(transferId);
        if (!transfer) return;

        const { data, offset } = payload; // data is ArrayBuffer
        transfer.chunks.push(data); // Inefficient for huge files (seeking), but fine for sequential small/med files
        // Ideally we sort by offset, but PeerJS data channel usually usually ordered (reliable: true)

        transfer.receivedBytes += data.byteLength;

        // Optimize: Update UI only every 5%?
        const progress = Math.min(100, Math.round((transfer.receivedBytes / transfer.metadata.fileSize) * 100));
        store.updateFileTransfer(transferId, { progress });
    }
    else if (type === 'COMPLETE') {
        const transfer = transfers.get(transferId);
        if (!transfer) return;

        console.log(`[FileReceiver] Complete: ${transfer.metadata.fileName}`);
        store.updateFileTransfer(transferId, { status: 'completed', progress: 100 });

        // Auto-download or Preview
        const blob = new Blob(transfer.chunks, { type: transfer.metadata.fileType });
        const url = URL.createObjectURL(blob);

        if (isMobile() && transfer.metadata.fileType.startsWith('image/')) {
            console.log(`[FileReceiver] Image received on mobile, opening preview: ${transfer.metadata.fileName}`);
            store.setPreviewImage({ url, name: transfer.metadata.fileName });
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = transfer.metadata.fileName;
            a.click();
            URL.revokeObjectURL(url);
        }

        // Cleanup
        transfers.delete(transferId);
    }
    else if (type === 'CANCEL') {
        const transfer = transfers.get(transferId);
        if (transfer) {
            console.log(`[FileReceiver] Cancelled by peer: ${transfer.metadata.fileName}`);
            store.updateFileTransfer(transferId, { status: 'cancelled' });
            transfers.delete(transferId);
        }
    }
};
