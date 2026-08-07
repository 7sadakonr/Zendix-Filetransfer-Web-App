import { isIOS, isSafari } from './platform';

export const safeWriteText = async (text) => {
    try {
        if (!navigator.clipboard) {
            throw new Error("Clipboard API not available");
        }
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error("Failed to write to clipboard:", err);
        return false;
    }
};

export const safeReadText = async () => {
    // iOS doesn't allow programmatic reading without a very specific context, 
    // and often not at all. We should rely on manual paste for iOS.
    if (isIOS()) {
        throw new Error("IOS_RESTRICTION");
    }

    try {
        if (!navigator.clipboard) {
            throw new Error("Clipboard API not available");
        }
        const text = await navigator.clipboard.readText();
        return text;
    } catch (err) {
        console.error("Failed to read from clipboard:", err);
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
            throw new Error("PERMISSION_DENIED");
        }
        throw err;
    }
};
