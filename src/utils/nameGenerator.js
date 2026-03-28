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
    const num = Math.floor(Math.random() * 10000); // 0-9999 to maintain enough randomness

    return `${adj}-${num}`;
};
