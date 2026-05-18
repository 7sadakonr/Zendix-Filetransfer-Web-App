import { describe, it, expect } from 'vitest';
import { generatePeerId } from '../src/utils/nameGenerator';

describe('nameGenerator', () => {
    it('should generate a string in format adjective-XX', () => {
        const id = generatePeerId();
        expect(id).toMatch(/^[a-z]+-\d{2}$/);
    });

    it('should generate a number between 00 and 99', () => {
        const id = generatePeerId();
        const num = parseInt(id.split('-')[1], 10);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(99);
    });

    it('should generate different IDs on multiple calls (probabilistic)', () => {
        const ids = new Set();
        for (let i = 0; i < 20; i++) {
            ids.add(generatePeerId());
        }
        // With 20*20*100 = 40000 combinations, 20 calls should produce at least 5 unique IDs
        expect(ids.size).toBeGreaterThanOrEqual(5);
    });

    it('should always contain a hyphen', () => {
        for (let i = 0; i < 10; i++) {
            expect(generatePeerId()).toContain('-');
        }
    });

    it('should have only lowercase letters before the hyphen', () => {
        for (let i = 0; i < 10; i++) {
            const id = generatePeerId();
            const adjective = id.split('-')[0];
            expect(adjective).toMatch(/^[a-z]+$/);
        }
    });
});
