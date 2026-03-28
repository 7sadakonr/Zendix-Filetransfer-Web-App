import { useState, useCallback, useEffect, useRef } from 'react';
import { usePeerConnection } from './usePeerConnection';
import { chunkFile, assembleFile } from '../utils/fileChunker';
import useAppStore from '../stores/useAppStore';

export const useFileTransfer = () => {
    const { sendData, activeConnection } = usePeerConnection();
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

    // Send File
    const sendFile = useCallback(async (file) => {
        console.log('[File] Selected:', file.name, 'Size:', file.size, 'Type:', file.type);

        if (!activeConnection) {
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

        // 3. Chunk & Send
        try {
            let sentBytes = 0;
            // Limit chunk rate to avoid buffer overflow? PeerJS handles it reasonably well usually.
            await chunkFile(file, async (chunkData, offset) => {
                const chunkIndex = offset; // simplifed

                // Backpressure / Flow Control
                if (activeConnection?.dataChannel) {
                    // Buffer up to 4MB to maximize throughput on good connections
                    // Check every 1ms for minimal latency
                    const MAX_BUFFER = 4 * 1024 * 1024; // 4MB

                    while (activeConnection.dataChannel.bufferedAmount > MAX_BUFFER) {
                        await new Promise(r => setTimeout(r, 1));
                    }
                }
                // Removed fallback delay - let chunks flow as fast as possible

                sendData('FILE', {
                    type: 'CHUNK',
                    transferId,
                    data: chunkData, // ArrayBuffer
                    offset
                });

                sentBytes += chunkData.byteLength;
                const progress = Math.min(100, Math.round((sentBytes / file.size) * 100));

                updateFileTransfer(transferId, { progress });
            });

            // 4. Send Complete
            sendData('FILE', {
                type: 'COMPLETE',
                transferId
            });

            updateFileTransfer(transferId, { status: 'completed', progress: 100 });
            console.log(`[File] Transfer complete: ${file.name}`);

        } catch (err) {
            console.error("File transfer failed", err);
            updateFileTransfer(transferId, { status: 'error' });
        }

    }, [activeConnection, sendData, addFileTransfer, updateFileTransfer]);


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
