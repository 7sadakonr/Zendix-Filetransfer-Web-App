import { useState, useCallback, useEffect, useRef } from 'react';
import { usePeerConnection } from './usePeerConnection';
import { chunkFile, assembleFile } from '../utils/fileChunker';
import useAppStore from '../stores/useAppStore';
import { playTransferStartSound, playTransferCompleteSound, getTransferCompletionDelay } from '../utils/playSound';

export const useFileTransfer = () => {
    const { sendData, activeConnections } = usePeerConnection();
    const { addFileTransfer, updateFileTransfer, fileTransfers } = useAppStore();

    // In-memory buffer for receiving files (Map<transferId, Array<chunks>>)
    const incomingChunks = useRef(new Map());
    const abortControllers = useRef(new Map());

    const cancelTransfer = useCallback((transferId) => {
        // 1. Abort local operation (stops chunking)
        if (abortControllers.current.has(transferId)) {
            abortControllers.current.get(transferId).abort();
            abortControllers.current.delete(transferId);
        }

        // 2. Notify peer
        sendData('FILE', { type: 'CANCEL', transferId });

        // 3. Update local state
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

    // Send File
    const sendFile = useCallback(async (file) => {
        console.log('[File] Selected:', file.name, 'Size:', file.size, 'Type:', file.type);

        if (!activeConnections || activeConnections.length === 0) {
            console.warn('[File] No active connection, cannot send');
            return;
        }

        // Validate file - Android sometimes returns 0-byte files for invalid URIs
        if (!file || file.size === 0) {
            console.error('[File] Invalid file: empty or 0 bytes');
            return;
        }

        const transferId = Date.now().toString();

        // 1. Register Transfer locally
        addFileTransfer({
            id: transferId,
            fileName: file.name,
            fileSize: file.size,
            progress: 0,
            direction: 'outgoing', // outgoing | incoming
            status: 'pending' // pending | transferring | completed | error
        });

        // 2. Send Metadata
        console.log(`[File] Starting transfer: ${file.name} (${file.size} bytes)`);
        sendData('FILE', {
            type: 'METADATA',
            transferId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });

        updateFileTransfer(transferId, { status: 'transferring' });
        playTransferStartSound(transferId);

        // 3. Chunk & Send
        try {
            let sentBytes = 0;
            let lastProgress = 0;
            // Limit chunk rate to avoid buffer overflow? PeerJS handles it reasonably well usually.
            await chunkFile(file, async (chunkData, offset) => {
                const chunkIndex = offset; // simplifed

                // Backpressure / Flow Control
                if (activeConnections && activeConnections.length > 0) {
                    // Buffer up to 1MB to prevent SCTP buffer overflow on some browsers
                    const MAX_BUFFER = 1 * 1024 * 1024; // 1MB
                    let isReady = false;

                    while (!isReady) {
                        isReady = true;
                        for (const conn of activeConnections) {
                            if (conn.dataChannel && conn.dataChannel.bufferedAmount > MAX_BUFFER) {
                                isReady = false;
                                break;
                            }
                        }
                        if (!isReady) {
                            await new Promise(r => setTimeout(r, 10)); // wait slightly longer to let buffer drain
                        }
                    }
                }
                // Yield occasionally to prevent UI freezes
                if (offset % (16 * 1024 * 10) === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }

                sendData('FILE', {
                    type: 'CHUNK',
                    transferId,
                    data: chunkData, // ArrayBuffer
                    offset
                });

                sentBytes += chunkData.byteLength;
                lastProgress = Math.min(99, Math.round((sentBytes / file.size) * 100));

                updateFileTransfer(transferId, { progress: lastProgress });
            });

            // 4. Send Complete signal immediately (peer gets it right away)
            sendData('FILE', {
                type: 'COMPLETE',
                transferId
            });

            // 5. Delay UI completion to sync with sounds
            const delay = getTransferCompletionDelay(transferId);

            if (delay > 0) {
                console.log(`[File] Delaying completion UI by ${delay}ms for sound sync`);
                // Animate progress bar to 100% during the delay
                await animateProgressToComplete(transferId, delay, lastProgress);
            }

            // 6. Now show completed state + play sound together
            updateFileTransfer(transferId, { status: 'completed', progress: 100 });
            playTransferCompleteSound();
            console.log(`[File] Transfer complete: ${file.name}`);

        } catch (err) {
            console.error("File transfer failed", err);
            updateFileTransfer(transferId, { status: 'error' });
        }

    }, [activeConnections, sendData, addFileTransfer, updateFileTransfer]);


    // Receive Logic is tricky because `usePeerConnection` handles the listeners.
    // We need to either:
    // A) Move Data handling here? (But `usePeerConnection` is the single connection owner)
    // B) Expose a way to register listeners?
    // C) Just use the Store? 

    // Let's modify `usePeerConnection` to pass FILE data to a global handler or store, 
    // OR just handle file logic inside `useFileTransfer` by subscribing to store changes if we put received data there? 
    // Data is too big for Zustand store (arrays of chunks).

    // Better approach: `usePeerConnection` emits events or we pass a callback.
    // Since `usePeerConnection` is already written, let's look at it.
    // It logs "File data received (Not implemented yet)".

    // I will export a helper `handleIncomingFileSignal` that `usePeerConnection` can call
    // OR I will update `usePeerConnection` to import this logic. 
    // Circular dependency risk.

    // Simplest: `usePeerConnection` handles distinct types. 
    // I will refactor `usePeerConnection` to delegate FILE handling to a separate utility or hook?
    // No, I'll update `usePeerConnection` to just dispatch a CustomEvent or similar?
    // React way: Context?

    // Let's go with: Update `usePeerConnection` to check for a registered handler?
    // Actually, I can just use a singleton/service pattern for the File Logic since state is global.

    return {
        sendFile,
        cancelTransfer,
        fileTransfers
    };
};

/* 
   We need a way to process incoming chunks. 
   Since `usePeerConnection` is the listener, I will modify IT to import `fileReceiver` logic.
*/
