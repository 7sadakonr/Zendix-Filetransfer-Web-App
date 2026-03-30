import { useCallback, useEffect, useRef } from 'react';
import { usePeerConnection } from './usePeerConnection';
import { chunkFile } from '../utils/fileChunker';
import useAppStore from '../stores/useAppStore';
import { playTransferStartSound, playTransferCompleteSound, getTransferCompletionDelay } from '../utils/playSound';

export const useFileTransfer = () => {
    const { sendData, activeConnections } = usePeerConnection();
    const { addFileTransfer, updateFileTransfer, fileTransfers } = useAppStore();

    const abortControllers = useRef(new Map());
    const queueRef = useRef([]);
    const isProcessingRef = useRef(false);

    const cancelTransfer = useCallback((transferId) => {
        queueRef.current = queueRef.current.filter((queuedItem) => queuedItem.transferId !== transferId);

        if (abortControllers.current.has(transferId)) {
            abortControllers.current.get(transferId).abort();
            abortControllers.current.delete(transferId);
        }

        sendData('FILE', { type: 'CANCEL', transferId });

        updateFileTransfer(transferId, { status: 'cancelled' });
    }, [sendData, updateFileTransfer]);

    // Animate progress from current value to 100% over a duration
    const animateProgressToComplete = useCallback((transferId, duration, currentProgress) => {
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

                updateFileTransfer(transferId, { progress });

                if (ratio < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(tick);
        });
    }, [updateFileTransfer]);

    const sendQueuedFile = useCallback(async ({ transferId, file, relativePath, displayName }) => {
        console.log('[File] Selected:', displayName, 'Size:', file.size, 'Type:', file.type);

        const currentConnections = useAppStore.getState().activeConnections;
        if (!currentConnections || currentConnections.length === 0) {
            throw new Error('No active connection');
        }

        if (!file || file.size === 0) {
            throw new Error('Invalid file: empty or 0 bytes');
        }

        const abortController = new AbortController();
        abortControllers.current.set(transferId, abortController);

        console.log(`[File] Starting transfer: ${displayName} (${file.size} bytes)`);
        sendData('FILE', {
            type: 'METADATA',
            transferId,
            fileName: file.name,
            displayName,
            relativePath,
            fileSize: file.size,
            fileType: file.type
        });

        updateFileTransfer(transferId, { status: 'transferring' });
        playTransferStartSound(transferId);

        try {
            let sentBytes = 0;
            let lastProgress = 0;

            await chunkFile(file, async (chunkData, offset) => {
                const liveConnections = useAppStore.getState().activeConnections;
                if (!liveConnections || liveConnections.length === 0) {
                    throw new Error('Connection lost during transfer');
                }

                const maxBuffer = 1 * 1024 * 1024;
                let isReady = false;

                while (!isReady) {
                    isReady = true;
                    for (const conn of liveConnections) {
                        if (conn.dataChannel && conn.dataChannel.bufferedAmount > maxBuffer) {
                            isReady = false;
                            break;
                        }
                    }

                    if (!isReady) {
                        await new Promise((resolve) => setTimeout(resolve, 10));
                    }
                }

                if (offset % (16 * 1024 * 10) === 0) {
                    await new Promise((resolve) => setTimeout(resolve, 0));
                }

                sendData('FILE', {
                    type: 'CHUNK',
                    transferId,
                    data: chunkData,
                    offset
                });

                sentBytes += chunkData.byteLength;
                lastProgress = Math.min(99, Math.round((sentBytes / file.size) * 100));
                updateFileTransfer(transferId, { progress: lastProgress });
            }, abortController.signal);

            sendData('FILE', {
                type: 'COMPLETE',
                transferId
            });

            const delay = getTransferCompletionDelay(transferId);

            if (delay > 0) {
                console.log(`[File] Delaying completion UI by ${delay}ms for sound sync`);
                await animateProgressToComplete(transferId, delay, lastProgress);
            }

            updateFileTransfer(transferId, { status: 'completed', progress: 100 });
            playTransferCompleteSound();
            console.log(`[File] Transfer complete: ${displayName}`);
        } catch (err) {
            const currentTransfer = useAppStore.getState().fileTransfers.find((item) => item.id === transferId);
            const wasCancelled = abortController.signal.aborted || currentTransfer?.status === 'cancelled';

            if (!wasCancelled) {
                console.error('File transfer failed', err);
                updateFileTransfer(transferId, { status: 'error' });
            }
        } finally {
            abortControllers.current.delete(transferId);
        }
    }, [sendData, updateFileTransfer, animateProgressToComplete]);

    const processQueue = useCallback(async () => {
        if (isProcessingRef.current) return;

        const currentConnections = useAppStore.getState().activeConnections;
        if (!currentConnections || currentConnections.length === 0) return;

        const nextTransfer = queueRef.current.shift();
        if (!nextTransfer) return;

        isProcessingRef.current = true;

        try {
            await sendQueuedFile(nextTransfer);
        } finally {
            isProcessingRef.current = false;

            if (queueRef.current.length > 0) {
                processQueue();
            }
        }
    }, [sendQueuedFile]);

    const sendFiles = useCallback((items) => {
        const filesToQueue = (Array.isArray(items) ? items : Array.from(items || []))
            .map((item) => {
                if (item?.file) {
                    const relativePath = item.relativePath || item.file.webkitRelativePath || '';
                    return {
                        file: item.file,
                        relativePath,
                        displayName: relativePath || item.file.name
                    };
                }

                if (item instanceof File) {
                    return {
                        file: item,
                        relativePath: item.webkitRelativePath || '',
                        displayName: item.webkitRelativePath || item.name
                    };
                }

                return null;
            })
            .filter(Boolean);

        if (filesToQueue.length === 0) return;

        const now = Date.now();

        filesToQueue.forEach((item, index) => {
            const transferId = `${now}-${index}-${Math.random().toString(36).slice(2, 8)}`;
            const isPreviewableImage = item.file.type?.startsWith('image/');
            const previewUrl = isPreviewableImage ? URL.createObjectURL(item.file) : null;

            addFileTransfer({
                id: transferId,
                fileName: item.displayName,
                fileSize: item.file.size,
                progress: 0,
                direction: 'outgoing',
                status: 'pending',
                timestamp: now + index,
                relativePath: item.relativePath,
                downloadFileName: item.file.name,
                fileType: item.file.type,
                previewUrl
            });

            queueRef.current.push({
                transferId,
                file: item.file,
                relativePath: item.relativePath,
                displayName: item.displayName
            });
        });

        processQueue();
    }, [addFileTransfer, processQueue]);

    const sendFile = useCallback((file) => {
        sendFiles([file]);
    }, [sendFiles]);

    useEffect(() => {
        if (activeConnections && activeConnections.length > 0) {
            processQueue();
        }
    }, [activeConnections, processQueue]);

    return {
        sendFile,
        sendFiles,
        cancelTransfer,
        fileTransfers
    };
};
