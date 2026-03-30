import startSoundUrl from '../assets/sound/start.mp3';
import completeSoundUrl from '../assets/sound/end.mp3';

// Uses bundled audio assets so updated files get fresh hashed URLs.
// Web Audio API keeps playback more reliable on mobile.

const SOUNDS = {
    start: startSoundUrl,
    complete: completeSoundUrl,
};

// Minimum gap (ms) between start and complete sounds/UI
export const MIN_TRANSFER_DURATION_MS = 1500;

let audioContext = null;
let soundBuffers = {};
let unlocked = false;

// Per-transfer start timestamps: Map<transferId, number>
const transferStartTimes = new Map();

/**
 * Get or create the shared AudioContext.
 */
const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

/**
 * Fetch and decode an MP3 into an AudioBuffer (cached by key).
 */
const loadSoundBuffer = async (key) => {
    if (soundBuffers[key]) return soundBuffers[key];

    const url = SOUNDS[key];
    if (!url) return null;

    try {
        const ctx = getAudioContext();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        soundBuffers[key] = await ctx.decodeAudioData(arrayBuffer);
        console.log(`[Sound] ✅ "${key}" buffer loaded`);
        return soundBuffers[key];
    } catch (err) {
        console.warn(`[Sound] Failed to load "${key}":`, err.message);
        return null;
    }
};

/**
 * "Unlock" the AudioContext on mobile.
 */
const unlockAudio = () => {
    if (unlocked) return;
    unlocked = true;

    try {
        const ctx = getAudioContext();

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const silentBuffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(ctx.destination);
        source.start(0);

        loadSoundBuffer('start');
        loadSoundBuffer('complete');

        console.log('[Sound] ✅ Audio unlocked for mobile playback');
    } catch (err) {
        console.warn('[Sound] Unlock failed:', err.message);
    }
};

if (typeof window !== 'undefined') {
    const events = ['click', 'touchstart', 'touchend', 'keydown'];
    const handleInteraction = () => {
        unlockAudio();
        events.forEach(e => window.removeEventListener(e, handleInteraction, true));
    };
    events.forEach(e => window.addEventListener(e, handleInteraction, { once: true, capture: true }));
}

/**
 * Play a sound by key using Web Audio API.
 */
const playSoundNow = async (key) => {
    try {
        const ctx = getAudioContext();

        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const buffer = await loadSoundBuffer(key);
        if (!buffer) return;

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);

        console.log(`[Sound] ✅ Playing "${key}" sound`);
    } catch (err) {
        console.warn(`[Sound] ❌ "${key}" playback failed:`, err.message);

        try {
            const audio = new Audio(SOUNDS[key]);
            audio.volume = 1.0;
            await audio.play();
        } catch (fallbackErr) {
            console.warn(`[Sound] ❌ Fallback also failed:`, fallbackErr.message);
        }
    }
};

/**
 * Record start time for a transfer and play the start sound.
 * @param {string} transferId
 */
export const playTransferStartSound = (transferId) => {
    transferStartTimes.set(transferId, Date.now());
    playSoundNow('start');
};

/**
 * Record start time only (no sound). Used by receiver to track timing.
 * @param {string} transferId
 */
export const markTransferStart = (transferId) => {
    transferStartTimes.set(transferId, Date.now());
};

/**
 * Play the complete sound (no delay — caller handles timing).
 */
export const playTransferCompleteSound = () => {
    playSoundNow('complete');
};

/**
 * Calculate how much delay (ms) is needed before showing "completed" UI.
 * Returns 0 if enough time has passed since start sound.
 * @param {string} transferId
 * @returns {number} delay in ms
 */
export const getTransferCompletionDelay = (transferId) => {
    const startTime = transferStartTimes.get(transferId);
    if (!startTime) return 0;

    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, MIN_TRANSFER_DURATION_MS - elapsed);

    // Cleanup
    transferStartTimes.delete(transferId);

    return delay;
};
