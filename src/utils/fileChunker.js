const CHUNK_SIZE = 16 * 1024; // 16KB is the safest WebRTC fragmentation size

export const chunkFile = (file, onChunk, signal) => {
    return new Promise((resolve, reject) => {
        let offset = 0;
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                if (signal?.aborted) {
                    reject(new Error('Transfer cancelled'));
                    return;
                }

                const result = onChunk(e.target.result, offset);
                if (result instanceof Promise) {
                    await result;
                }

                // Double check after async operation
                if (signal?.aborted) {
                    reject(new Error('Transfer cancelled'));
                    return;
                }

                offset += e.target.result.byteLength;

                if (offset < file.size) {
                    readNextChunk();
                } else {
                    resolve();
                }
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);

        // Listen for abort event to stop immediately if reading is slow (though FileReader is usually fast)
        if (signal) {
            signal.addEventListener('abort', () => {
                if (reader.readyState === FileReader.LOADING) {
                    reader.abort();
                }
                reject(new Error('Transfer cancelled'));
            });
        }

        const readNextChunk = () => {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
        };

        readNextChunk();
    });
};

export const assembleFile = (chunks) => {
    return new Blob(chunks);
};
