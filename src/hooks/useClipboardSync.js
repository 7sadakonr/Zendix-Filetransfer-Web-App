import { useState, useEffect, useCallback, useRef } from 'react';
import * as clipboard from 'clipboard-polyfill';
import useAppStore from '../stores/useAppStore';
import { usePeerConnection } from './usePeerConnection';
import { getDeviceName } from '../utils/platform';

export const useClipboardSync = () => {
    const { sendData } = usePeerConnection();
    const { lastReceivedClipboard, setLastReceivedClipboard } = useAppStore();

    // UI State for when auto-write fails (iOS Safari)
    const [pendingClipboardItem, setPendingClipboardItem] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // Track processed clipboard IDs to prevent showing toast on reconnect
    const processedClipboardIds = useRef(new Set());

    // 1. Sending: Read Local -> Peer
    const readAndSendClipboard = useCallback(async () => {
        try {
            // clipboard-polyfill handles some cross-browser issues
            const text = await clipboard.readText();

            if (!text) {
                console.warn("Clipboard was empty");
                return;
            }

            console.log("Read from clipboard:", text);

            sendData('CLIPBOARD', {
                text,
                timestamp: Date.now(),
                fromDevice: getDeviceName()
            });

            // Optionally add to own history? App logic usually handles this via optimistic update or explicit add
            useAppStore.getState().addClipboardItem({
                id: Date.now().toString(),
                text: text,
                timestamp: Date.now(),
                fromDevice: 'Me'
            });

            return true;
        } catch (err) {
            console.error("Failed to read clipboard:", err);
            // Permission denied or not focused
            return false;
        }
    }, [sendData]);

    // 2. Receiving: Peer -> Local prompt before writing
    useEffect(() => {
        if (!lastReceivedClipboard) return;

        // Skip if this clipboard item was already processed (prevents toast on reconnect)
        if (processedClipboardIds.current.has(lastReceivedClipboard.id)) {
            console.log("Clipboard item already processed, skipping:", lastReceivedClipboard.id);
            return;
        }

        const queuePendingCopy = () => {
            const { text, id } = lastReceivedClipboard;
            console.log("New clipboard item received, waiting for confirmation:", text);

            // Mark this ID as processed
            processedClipboardIds.current.add(id);

            // Keep the set from growing too large
            if (processedClipboardIds.current.size > 100) {
                const idsArray = Array.from(processedClipboardIds.current);
                processedClipboardIds.current = new Set(idsArray.slice(-50));
            }

            setPendingClipboardItem(lastReceivedClipboard);
        };

        queuePendingCopy();

        // Reset trigger? No, we just react when it *changes*
        // But if we receive the *same* reference object it won't trigger. 
        // Zustand creates new objects usually.
    }, [lastReceivedClipboard]);

    // 3. Manual Write (Fallback Action)
    const confirmPendingCopy = async () => {
        if (!pendingClipboardItem) return;

        try {
            await clipboard.writeText(pendingClipboardItem.text);
            setPendingClipboardItem(null);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error("Manual write failed:", err);
            alert("Failed to copy. Please copy manually from the history list.");
        }
    };

    const clearPending = () => setPendingClipboardItem(null);

    return {
        readAndSendClipboard, // To be attached to a button
        pendingClipboardItem, // If not null, show "New Clip! Tap to Copy"
        confirmPendingCopy,   // Action for that button
        clearPending,
        copySuccess           // Show "Copied!" toast
    };
};
