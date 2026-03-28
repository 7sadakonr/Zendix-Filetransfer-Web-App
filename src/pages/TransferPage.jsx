import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';
import { useClipboardSync } from '../hooks/useClipboardSync';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { getDeviceName } from '../utils/platform';
import ClipboardToast from '../components/ClipboardToast';
import { Clipboard, FileText, Copy, Check, Send, Lock, Upload, File, X, LogOut } from 'lucide-react';
import clsx from 'clsx';

const TransferPage = () => {
    const navigate = useNavigate();
    const { sendData, disconnectPeer } = usePeerConnection();
    const { connectionStatus, remotePeerId, clipboardHistory, myPeerId } = useAppStore();
    const { pendingClipboardItem, confirmPendingCopy, clearPending, copySuccess } = useClipboardSync();
    const { sendFile, fileTransfers } = useFileTransfer();

    const [activeTab, setActiveTab] = useState('clipboard');
    const [textInput, setTextInput] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const textareaRef = useRef(null);

    // Redirect if not connected
    useEffect(() => {
        if (connectionStatus === 'disconnected') {
            navigate('/');
        }
    }, [connectionStatus, navigate]);

    // Generate friendly device name
    const getFriendlyName = (peerId) => {
        if (!peerId) return 'Unknown';
        const parts = peerId.split('-');
        return parts.length > 1 ? `${parts[0]}-${parts[parts.length - 1]}` : peerId;
    };

    const handleSendText = () => {
        if (!textInput.trim()) return;

        useAppStore.getState().addClipboardItem({
            id: Date.now().toString(),
            text: textInput,
            timestamp: Date.now(),
            fromDevice: 'THIS DEVICE'
        });

        sendData('CLIPBOARD', {
            text: textInput,
            timestamp: Date.now(),
            fromDevice: getDeviceName()
        });

        setTextInput('');
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setTextInput(prev => prev + text);
            }
        } catch (err) {
            console.error('Failed to paste:', err);
        }
    };

    const handleLogout = () => {
        disconnectPeer();
        navigate('/');
    };

    const handleCopyItem = async (item) => {
        try {
            await navigator.clipboard.writeText(item.text || item.fileName);
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                sendFile(files[i]);
            }
        }
    };

    // Combine clipboard history and file transfers
    const allActivity = [
        ...clipboardHistory.map(item => ({ ...item, type: 'clipboard' })),
        ...fileTransfers.map(item => ({ ...item, type: 'file' }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <main aria-label="Fliq - Transfer files and clipboard" className="fixed inset-0 flex flex-col md:flex-row md:items-center md:justify-center p-3 sm:p-4 lg:p-8 font-['Inter'] overflow-hidden bg-[#1a1a1a]">
            {/* SEO: Hidden h1 for search engines */}
            <h1 className="sr-only">Fliq — Peer-to-Peer File Transfer and Clipboard Sync</h1>
            {/* Ambient glow background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-6 w-full max-w-[560px] lg:max-w-[900px] h-full md:h-[600px] lg:h-[650px] justify-center items-stretch mx-auto">

                {/* Left Panel - Input */}
                <div className="relative group rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-6 w-full md:w-[320px] lg:w-[400px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}>

                    {/* Header with Pill Tabs and Logout */}
                    <div className="relative flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleLogout}
                            aria-label="Disconnect and return to home"
                            className="p-2.5 rounded-full bg-[#2a2a2a] border border-white/[0.08] text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                            title="Disconnect"
                        >
                            <LogOut size={16} />
                        </button>
                        <div className="flex-1 flex bg-[#2a2a2a] rounded-full p-1 border border-white/[0.08]">
                            <button
                                onClick={() => setActiveTab('clipboard')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-medium transition-all duration-300",
                                    activeTab === 'clipboard'
                                        ? "bg-[#3a3a3a] text-white shadow-lg"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                <Clipboard size={16} />
                                <span>Clipboard</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('file')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-medium transition-all duration-300",
                                    activeTab === 'file'
                                        ? "bg-[#3a3a3a] text-white shadow-lg"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                <FileText size={16} />
                                <span>File</span>
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col mt-4 min-h-0">
                        {activeTab === 'clipboard' ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                <textarea
                                    ref={textareaRef}
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="Type or paste content..."
                                    className="flex-1 w-full bg-transparent text-neutral-200 text-base sm:text-lg placeholder:text-zinc-600 resize-none outline-none min-h-[120px] sm:min-h-[200px]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                            handleSendText();
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                                <label className={clsx(
                                    "relative flex flex-col items-center justify-center w-full h-full min-h-[150px] rounded-2xl border-2 border-dashed transition-all cursor-pointer group/drop",
                                    connectionStatus === 'connected'
                                        ? "border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/5"
                                        : "border-white/10 opacity-50 cursor-not-allowed"
                                )}>
                                    <Upload size={40} className="text-zinc-500 mb-3 group-hover/drop:text-cyan-400 transition-colors" />
                                    <p className="text-zinc-400 text-sm font-medium mb-1">
                                        {connectionStatus === 'connected' ? "Click or drag files here" : "Connect to send files"}
                                    </p>
                                    <p className="text-zinc-600 text-xs">Max size: 100MB</p>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        disabled={connectionStatus !== 'connected'}
                                        multiple
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Footer - Only show on Clipboard tab */}
                    {activeTab === 'clipboard' && (
                        <div className="relative flex items-center justify-between mt-4 pt-4 shrink-0 border-t border-white/[0.08]">
                            <p className="text-zinc-600 text-[10px] sm:text-xs max-w-[180px] sm:max-w-[200px] leading-tight">
                                Secure P2P connection established. Your data is end-to-end encrypted and never touches the cloud.
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePaste}
                                    className="px-4 py-2 rounded-full text-sm font-medium text-zinc-400 border border-zinc-600 hover:border-zinc-500 hover:text-zinc-300 transition-all flex items-center gap-1.5"
                                >
                                    <Clipboard size={14} />
                                    Paste
                                </button>
                                <button
                                    onClick={handleSendText}
                                    disabled={!textInput.trim()}
                                    className="p-3 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{
                                        boxShadow: textInput.trim() ? '0 0 20px rgba(0, 200, 255, 0.4)' : 'none'
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    )}


                </div>

                {/* Right Panel - Recent Activity */}
                <div className="relative group rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-6 w-full md:w-[320px] lg:w-[440px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}>

                    {/* Header */}
                    <div className="flex items-center justify-between shrink-0 mb-4">
                        <h2 className="text-neutral-200 text-xl sm:text-2xl font-semibold" id="activity-heading">Recent Activity</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-zinc-400 text-sm">{getFriendlyName(remotePeerId)}</span>
                        </div>
                    </div>

                    {/* Activity List */}
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 custom-scrollbar">
                        {allActivity.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                                No activity yet
                            </div>
                        ) : (
                            allActivity.map((item) => (
                                <div
                                    key={item.id}
                                    className="relative bg-[#2a2a2a] rounded-xl p-4 border border-white/[0.05] hover:border-white/[0.1] transition-all"
                                >
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                                                item.fromDevice === 'THIS DEVICE'
                                                    ? "bg-zinc-700 text-zinc-300"
                                                    : "bg-cyan-500/20 text-cyan-400"
                                            )}>
                                                {item.fromDevice === 'THIS DEVICE' ? 'THIS DEVICE' : 'PEER'}
                                            </span>
                                            <span className="text-zinc-600 text-xs">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopyItem(item)}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                        </button>
                                    </div>

                                    {/* Content */}
                                    {item.type === 'clipboard' ? (
                                        <p className="text-zinc-300 text-sm leading-relaxed break-all line-clamp-4">
                                            {item.text}
                                        </p>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <File size={14} className="text-zinc-400" />
                                                    <span className="text-zinc-300 text-sm truncate max-w-[200px]">{item.fileName}</span>
                                                </div>
                                                <span className={clsx(
                                                    "text-xs font-semibold uppercase",
                                                    item.status === 'completed' ? "text-cyan-400" :
                                                        item.status === 'error' ? "text-red-400" :
                                                            item.status === 'cancelled' ? "text-zinc-500" : "text-blue-400"
                                                )}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden mb-1">
                                                <div
                                                    className={clsx(
                                                        "h-full rounded-full transition-all duration-300",
                                                        item.status === 'completed' ? "bg-gradient-to-r from-cyan-500 to-cyan-400" :
                                                            item.status === 'error' ? "bg-red-500" : "bg-blue-500"
                                                    )}
                                                    style={{ width: `${item.progress || 0}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-zinc-600">
                                                <span>{((item.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</span>
                                                <span>{item.direction === 'outgoing' ? 'Sent' : 'Received'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Toasts */}
            <ClipboardToast
                pendingItem={pendingClipboardItem}
                onConfirm={confirmPendingCopy}
                onCancel={clearPending}
            />

            {copySuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-full shadow-xl z-50">
                    Sent Successfully!
                </div>
            )}

            {/* Custom scrollbar styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </main>
    );
};

export default TransferPage;
