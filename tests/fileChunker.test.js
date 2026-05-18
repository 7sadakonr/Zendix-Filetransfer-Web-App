/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { chunkFile, assembleFile } from '../src/utils/fileChunker';

// Helper to create a mock File
const createMockFile = (sizeBytes, name = 'test.bin') => {
    const buffer = new ArrayBuffer(sizeBytes);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < sizeBytes; i++) {
        view[i] = i % 256;
    }
    return new File([buffer], name, { type: 'application/octet-stream' });
};

describe('fileChunker', () => {
    describe('chunkFile', () => {
        it('should call onChunk for each chunk of a file', async () => {
            const file = createMockFile(32 * 1024); // 32KB = 2 chunks at 16KB each
            const chunks = [];

            await chunkFile(file, (data, offset) => {
                chunks.push({ data, offset });
            });

            expect(chunks.length).toBe(2);
            expect(chunks[0].offset).toBe(0);
            expect(chunks[0].data.byteLength).toBe(16 * 1024);
            expect(chunks[1].offset).toBe(16 * 1024);
            expect(chunks[1].data.byteLength).toBe(16 * 1024);
        });

        it('should handle files smaller than chunk size', async () => {
            const file = createMockFile(1000); // 1KB
            const chunks = [];

            await chunkFile(file, (data, offset) => {
                chunks.push({ data, offset });
            });

            expect(chunks.length).toBe(1);
            expect(chunks[0].offset).toBe(0);
            expect(chunks[0].data.byteLength).toBe(1000);
        });

        it('should handle exact chunk size boundary', async () => {
            const file = createMockFile(16 * 1024); // Exactly 1 chunk
            const chunks = [];

            await chunkFile(file, (data, offset) => {
                chunks.push({ data, offset });
            });

            expect(chunks.length).toBe(1);
            expect(chunks[0].data.byteLength).toBe(16 * 1024);
        });

        it('should handle non-exact chunk size (3 chunks with remainder)', async () => {
            const size = 16 * 1024 * 2 + 5000; // 2 full chunks + 5000 bytes
            const file = createMockFile(size);
            const chunks = [];

            await chunkFile(file, (data, offset) => {
                chunks.push({ data, offset });
            });

            expect(chunks.length).toBe(3);
            expect(chunks[2].data.byteLength).toBe(5000);
        });

        it('should reject when abort signal is already aborted', async () => {
            const file = createMockFile(32 * 1024);
            const controller = new AbortController();
            controller.abort();

            await expect(
                chunkFile(file, () => {}, controller.signal)
            ).rejects.toThrow('Transfer cancelled');
        });

        it('should support async onChunk callbacks', async () => {
            const file = createMockFile(32 * 1024);
            const chunks = [];

            await chunkFile(file, async (data, offset) => {
                await new Promise(resolve => setTimeout(resolve, 1));
                chunks.push({ data, offset });
            });

            expect(chunks.length).toBe(2);
        });
    });

    describe('assembleFile', () => {
        it('should assemble chunks into a Blob', () => {
            const chunk1 = new ArrayBuffer(100);
            const chunk2 = new ArrayBuffer(200);
            const blob = assembleFile([chunk1, chunk2]);

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.size).toBe(300);
        });

        it('should handle empty chunks array', () => {
            const blob = assembleFile([]);
            expect(blob.size).toBe(0);
        });
    });
});
