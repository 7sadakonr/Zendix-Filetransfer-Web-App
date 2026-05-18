import useAppStore from '../stores/useAppStore';
import { isMobile } from './platform';
import { playTransferCompleteSound, getTransferCompletionDelay, markTransferStart } from './playSound';

// In-memory buffer: Map<transferId, { chunks: [], receivedBytes: 0, metadata: {}, startTime: number, lastUpdate: number }>
const transfers = new Map();

/**
 * Animate progress from current value to 100% over a duration.
 */
const animateProgress = (transferId, duration, currentProgress) => {
    return new Promise((resolve) => {
        const startProgress = currentProgress || 90;
        const startTime = Date.now();
        const remaining = 100 - startProgress;

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const ratio = Math.min(1, elapsed / duration);
            // Ease-out curve for natural feel
            const eased = 1 - Math.pow(1 - ratio, 2);
            const progress = Math.round(startProgress + remaining * eased);

            useAppStore.getState().updateFileTransfer(transferId, { progress });

            if (ratio < 1) {
                requestAnimationFrame(tick);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(tick);
    });
};

/**
 * Finalize a completed transfer: update UI, play sound, trigger download/preview.
 */
const finalizeTransfer = (transferId, transfer) => {
    const store = useAppStore.getState();

    const blob = new Blob(transfer.chunks, { type: transfer.metadata.fileType });
    const url = URL.createObjectURL(blob);

    // Mark as completed + play sound + Save url
    store.updateFileTransfer(transferId, {
        status: 'completed',
        progress: 100,
        blobUrl: url,
        previewUrl: url,
        downloadFileName: transfer.metadata.fileName,
        speed: 0,
        eta: 0
    });
    playTransferCompleteSound();

    // Optional Auto-Preview for Mobile Images (Since saving images natively on iOS often requires long-press)
    if (isMobile() && transfer.metadata.fileType.startsWith('image/')) {
        console.log(`[FileReceiver] Image received on mobile, opening preview: ${transfer.metadata.fileName}`);
        store.setPreviewImage({ url, name: transfer.metadata.fileName });
    } else {
        console.log(`[FileReceiver] File received: ${transfer.metadata.fileName}. Waiting for user manual download.`);
        // Removed auto-download. User must click the download button on the file UI to save it.
    }

    // Cleanup
    transfers.delete(transferId);
};

export const handleFileProtocol = (payload) => {
    const { type, transferId } = payload;
    const store = useAppStore.getState();

    if (type === 'METADATA') {
        const { fileName, displayName, fileSize, relativePath } = payload;
        const resolvedDisplayName = displayName || relativePath || fileName;
        const now = Date.now();

        console.log(`[FileReceiver] New file: ${resolvedDisplayName}`);
        transfers.set(transferId, {
            metadata: payload,
            chunks: [],
            receivedBytes: 0,
            startTime: now,
            lastUpdate: now
        });

        store.addFileTransfer({
            id: transferId,
            fileName: resolvedDisplayName,
            fileSize,
            progress: 0,
            direction: 'incoming',
            status: 'transferring',
            timestamp: now,
            relativePath,
            fileType: payload.fileType
        });
        markTransferStart(transferId);
    }
    else if (type === 'CHUNK') {
        const transfer = transfers.get(transferId);
        if (!transfer) return;

        const { data } = payload;
        transfer.chunks.push(data);
        transfer.receivedBytes += data.byteLength;

        const now = Date.now();
        // Throttle updates to every 500ms or when complete
        if (now - transfer.lastUpdate > 500 || transfer.receivedBytes === transfer.metadata.fileSize) {
            const elapsed = (now - transfer.startTime) / 1000;
            const speed = elapsed > 0 ? transfer.receivedBytes / elapsed : 0;
            const remaining = transfer.metadata.fileSize - transfer.receivedBytes;
            const eta = speed > 0 ? Math.ceil(remaining / speed) : 0;

            // Cap at 99% during transfer — 100% only on finalize
            const progress = Math.min(99, Math.round((transfer.receivedBytes / transfer.metadata.fileSize) * 100));
            store.updateFileTransfer(transferId, { 
                progress,
                speed,
                eta
            });
            transfer.lastUpdate = now;
        }
    }
    else if (type === 'COMPLETE') {
        const transfer = transfers.get(transferId);
        if (!transfer) return;

        console.log(`[FileReceiver] Complete: ${transfer.metadata.fileName}`);

        // Calculate delay to sync with start sound
        const delay = getTransferCompletionDelay(transferId);
        const currentProgress = Math.min(99, Math.round((transfer.receivedBytes / transfer.metadata.fileSize) * 100));

        if (delay > 0) {
            console.log(`[FileReceiver] Delaying completion by ${delay}ms for sound sync`);
            // Animate progress bar to 100% during delay, then finalize
            animateProgress(transferId, delay, currentProgress).then(() => {
                finalizeTransfer(transferId, transfer);
            });
        } else {
            // Enough time has passed — finalize immediately
            finalizeTransfer(transferId, transfer);
        }
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
