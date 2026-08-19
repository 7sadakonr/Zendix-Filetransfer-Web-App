const adjectives = [
    'cosmic', 'solar', 'lunar', 'astro', 'hyper', 'orbit', 'star', 'warped', 'sonic', 'cyber',
    'neon', 'flux', 'quantum', 'void', 'laser', 'echo', 'misty', 'swift', 'dark', 'light'
];

const nouns = [
    'apollo', 'rover', 'comet', 'beacon', 'pilot', 'craft', 'node', 'spark', 'pulse', 'link',
    'atlas', 'titan', 'falcon', 'eagle', 'rocket', 'blast', 'ray', 'beam', 'signal', 'wave'
];

export const generatePeerId = () => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0'); // 0000-9999

    return `${adj}-${noun}-${num}`;
};
