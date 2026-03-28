import { Upload, File, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useCallback } from 'react';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { usePeerConnection } from '../hooks/usePeerConnection';
import clsx from 'clsx';

const FileTransferPanel = () => {
    const { sendFile, cancelTransfer, fileTransfers } = useFileTransfer();
    const { connectionStatus } = usePeerConnection();

    const handleFileSelect = useCallback((e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                sendFile(files[i]);
            }
        }
    }, [sendFile]);

    return (
        <div className="flex-1 flex flex-col items-center gap-6 w-full">
            {/* Drop Zone */}
            <label className={clsx(
                "relative flex flex-col items-center justify-center w-full aspect-[2/1] max-h-48 rounded-2xl border-2 border-dashed transition-all cursor-pointer group",
                connectionStatus === 'connected'
                    ? "border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20"
                    : "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
            )}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload size={32} className={clsx("mb-3 transition-colors", connectionStatus === 'connected' ? "text-blue-400 group-hover:text-blue-300" : "text-stone-500")} />
                    <p className="mb-2 text-sm text-stone-300 font-semibold">
                        {connectionStatus === 'connected' ? "Click or drag files here" : "Connect to send files"}
                    </p>
                    <p className="text-xs text-stone-500">Max size suggestion: 100MB</p>
                </div>
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                    onClick={(e) => { e.target.value = null; }}
                    disabled={connectionStatus !== 'connected'}
                    accept="*/*"
                    multiple
                />
            </label>

            {/* Transfer List */}
            <div className="w-full space-y-3">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest pl-1">Transfers</h3>

                {fileTransfers.length === 0 && (
                    <div className="text-center py-6 text-stone-700 text-sm italic">
                        No active transfers
                    </div>
                )}

                {fileTransfers.map((ft) => (
                    <div key={ft.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                        <div className="bg-stone-800 p-2 rounded-lg">
                            <File size={20} className="text-stone-300" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-sm font-medium text-white truncate">{ft.fileName}</p>
                                <span className={clsx("text-xs font-bold uppercase",
                                    ft.status === 'completed' ? "text-green-400" :
                                        ft.status === 'error' ? "text-red-400" :
                                            ft.status === 'cancelled' ? "text-stone-500" : "text-blue-400"
                                )}>
                                    {ft.status}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-stone-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={clsx("h-1.5 rounded-full transition-all duration-300",
                                        ft.status === 'error' ? "bg-red-500" :
                                            ft.status === 'cancelled' ? "bg-stone-500" : "bg-blue-500"
                                    )}
                                    style={{ width: `${ft.progress}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between mt-1 text-[10px] text-stone-500">
                                <span>{(ft.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                <span>{ft.direction === 'outgoing' ? 'Sent' : 'Received'}</span>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        {(ft.status === 'transferring' || ft.status === 'pending') && (
                            <button
                                onClick={() => cancelTransfer(ft.id)}
                                className="p-2 bg-stone-700/50 hover:bg-red-500/20 text-stone-400 hover:text-red-400 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FileTransferPanel;
