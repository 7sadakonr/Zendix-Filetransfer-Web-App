const normalizeRelativePath = (relativePath) => {
    if (!relativePath) return '';
    return relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
};

const createDescriptor = (file, relativePath = '') => ({
    file,
    relativePath: normalizeRelativePath(relativePath || file.webkitRelativePath || ''),
});

export const getFilesFromFileList = (fileList) => {
    if (!fileList) return [];

    return Array.from(fileList)
        .filter(Boolean)
        .map((file) => createDescriptor(file));
};

const readAllDirectoryEntries = (directoryReader) => {
    return new Promise((resolve, reject) => {
        const entries = [];

        const readBatch = () => {
            directoryReader.readEntries((batch) => {
                if (!batch.length) {
                    resolve(entries);
                    return;
                }

                entries.push(...batch);
                readBatch();
            }, reject);
        };

        readBatch();
    });
};

const readEntryFiles = async (entry, parentPath = '') => {
    if (!entry) return [];

    const currentPath = normalizeRelativePath(parentPath ? `${parentPath}/${entry.name}` : entry.name);

    if (entry.isFile) {
        return new Promise((resolve, reject) => {
            entry.file(
                (file) => resolve([createDescriptor(file, currentPath)]),
                reject
            );
        });
    }

    if (!entry.isDirectory) return [];

    const directoryEntries = await readAllDirectoryEntries(entry.createReader());
    const nestedFiles = await Promise.all(
        directoryEntries.map((childEntry) => readEntryFiles(childEntry, currentPath))
    );

    return nestedFiles.flat();
};

export const getFilesFromDataTransfer = async (dataTransfer) => {
    if (!dataTransfer) return [];

    const items = Array.from(dataTransfer.items || []);
    const entries = items
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean);

    if (entries.length > 0) {
        const nestedFiles = await Promise.all(entries.map((entry) => readEntryFiles(entry)));
        return nestedFiles.flat();
    }

    return getFilesFromFileList(dataTransfer.files);
};
