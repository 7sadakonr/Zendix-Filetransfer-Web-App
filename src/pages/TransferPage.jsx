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
    const { sendData, disconnectPeer, connectToPeer } = usePeerConnection();
    const { connectionStatus, remotePeerId, clipboardHistory, myPeerId, previewImage, setPreviewImage } = useAppStore();
    const { pendingClipboardItem, confirmPendingCopy, clearPending, copySuccess } = useClipboardSync();
    const { sendFile, fileTransfers } = useFileTransfer();

    const [activeTab, setActiveTab] = useState('clipboard');
    const [textInput, setTextInput] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [expandedItems, setExpandedItems] = useState({});
    const textareaRef = useRef(null);

    const toggleExpand = (id) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Auto-reconnect or Redirect
    useEffect(() => {
        if (connectionStatus === 'disconnected') {
            if (remotePeerId) {
                // If we have a stored partner but are disconnected, try to reconnect
                console.log('[TransferPage] Attempting auto-reconnect to:', remotePeerId);
                // add a small delay to avoid spamming the signaling server immediately on wake
                const timer = setTimeout(() => {
                    useAppStore.getState().setConnectionStatus('connecting'); // optimistic UI update
                    connectToPeer(remotePeerId);
                }, 1500);
                return () => clearTimeout(timer);
            } else {
                // Not connected and no stored session -> go home
                navigate('/');
            }
        }
    }, [connectionStatus, remotePeerId, navigate, connectToPeer]);

    // Get device name from peer ID
    const getFriendlyName = (peerId) => {
        if (!peerId) return 'Unknown';
        return peerId;
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
        if (textareaRef.current) {
            textareaRef.current.innerText = '';
            textareaRef.current.value = ''; // Fallback
        }
    };

    const handlePaste = async () => {
        try {
            // First try reading files from clipboard if supported
            if (navigator.clipboard && navigator.clipboard.read) {
                try {
                    const clipboardItems = await navigator.clipboard.read();
                    let hasFile = false;
                    for (const item of clipboardItems) {
                        for (const type of item.types) {
                            if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('application/')) {
                                const blob = await item.getType(type);
                                const ext = type.split('/')[1] || 'bin';
                                const file = new File([blob], `pasted_item_${Date.now()}.${ext}`, { type });
                                sendFile(file);
                                hasFile = true;
                            }
                        }
                    }
                    if (hasFile) {
                        setActiveTab('file');
                        return; // Exit if we handled file(s)
                    }
                } catch (readErr) {
                    console.log('Failed to read clipboard files (may be text or no permission):', readErr);
                }
            }

            // Fallback to text
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    setTextInput(prev => prev + text);
                    if (textareaRef.current) {
                        textareaRef.current.innerText += text;
                    }
                }
            } else if (!navigator.clipboard) {
                alert("อุปกรณ์ของคุณถูกจำกัดสิทธิ์การวางไฟล์จากปุ่ม (ต้องใช้งานผ่าน HTTPS ลิงก์) กรุณาลองใช้วิธีกดค้างที่ช่องพิมพ์แล้วเลือก Paste หรือไปที่แท็บ File แทนครับ");
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

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (connectionStatus !== 'connected') return;
        if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (connectionStatus !== 'connected') return;

        const files = e.dataTransfer.files;
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
        <main aria-label="Fliq - Transfer files and clipboard" className="fixed inset-0 flex flex-col md:flex-row md:items-center md:justify-center px-4 sm:px-6 lg:px-8 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-[calc(2rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-[max(2rem,env(safe-area-inset-bottom))] font-['Inter'] overflow-hidden">
            {/* Safe Area Top Mask to guarantee solid status bar color */}
            <div className="fixed top-0 left-0 w-full h-[env(safe-area-inset-top)] bg-[#1a1a1a] z-50 pointer-events-none"></div>
            {/* SEO: Hidden h1 for search engines */}
            <h1 className="sr-only">Fliq — Peer-to-Peer File Transfer and Clipboard Sync</h1>
            {/* Ambient glow background */}
            <div className="fixed top-0 left-0 w-full h-[100vh] overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)' }} />
                <div className="absolute top-[60%] right-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-6 w-full max-w-[560px] lg:max-w-[900px] h-full md:h-[600px] lg:h-[650px] justify-center items-stretch mx-auto">

                {/* Left Panel - Input */}
                <div 
                    onDragEnter={(e) => {
                        // Check if it's a file being dragged
                        const types = e.dataTransfer.types;
                        if (types && (Array.from(types).includes('Files') || types.includes?.('application/x-moz-file'))) {
                            if (activeTab !== 'file') {
                                setActiveTab('file');
                            }
                        }
                    }}
                    onDragOver={(e) => {
                        // Prevent default to allow dropping in the entire left panel if needed,
                        // but mainly we want the dropzone to handle the actual drop.
                        e.preventDefault(); 
                    }}
                    className="relative group rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-6 w-full md:w-[320px] lg:w-[400px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden"
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
                                <div
                                    ref={textareaRef}
                                    contentEditable="true"
                                    suppressContentEditableWarning={true}
                                    onInput={(e) => setTextInput(e.currentTarget.innerText)}
                                    className="flex-1 w-full bg-transparent text-neutral-200 text-base sm:text-lg outline-none min-h-[120px] sm:min-h-[200px] overflow-y-auto cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600 block whitespace-pre-wrap break-words custom-scrollbar"
                                    data-placeholder="Type or paste content..."
                                    onPaste={(e) => {
                                        const items = e.clipboardData?.items;
                                        const files = e.clipboardData?.files;
                                        let hasFile = false;

                                        if (files && files.length > 0) {
                                            for (let i = 0; i < files.length; i++) {
                                                sendFile(files[i]);
                                                hasFile = true;
                                            }
                                        } else if (items) {
                                            for (let i = 0; i < items.length; i++) {
                                                const item = items[i];
                                                if (item.kind === 'file') {
                                                    const file = item.getAsFile();
                                                    if (file) {
                                                        sendFile(file);
                                                        hasFile = true;
                                                    }
                                                }
                                            }
                                        }

                                        if (hasFile) {
                                            e.preventDefault();
                                            setActiveTab('file');
                                        } else {
                                            // Handle plain text paste manually to prevent rich HTML injection inside contentEditable
                                            e.preventDefault();
                                            const text = e.clipboardData.getData('text/plain');
                                            document.execCommand('insertText', false, text);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                            e.preventDefault();
                                            handleSendText();
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                                <label 
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={clsx(
                                    "relative flex flex-col items-center justify-center w-full h-full min-h-[150px] rounded-2xl border-2 transition-all cursor-pointer group/drop",
                                    connectionStatus === 'connected'
                                        ? isDraggingOver 
                                            ? "border-cyan-400 bg-cyan-500/20 border-solid shadow-[0_0_15px_rgba(34,211,238,0.3)]" 
                                            : "border-cyan-500/30 border-dashed hover:border-cyan-500/50 hover:bg-cyan-500/5"
                                        : "border-white/10 border-dashed opacity-50 cursor-not-allowed"
                                )}>
                                    <Upload size={40} className={clsx("mb-3 transition-colors", isDraggingOver ? "text-cyan-400 scale-110" : "text-zinc-500 group-hover/drop:text-cyan-400")} />
                                    <p className={clsx("text-sm font-medium mb-1", isDraggingOver ? "text-cyan-300" : "text-zinc-400")}>
                                        {connectionStatus === 'connected' ? (isDraggingOver ? "Drop files now!" : "Click or drag files here") : "Reconnecting to send files..."}
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
                        <h2 className="text-neutral-200 text-xl sm:text-2xl font-semibold" id="activity-heading">
                            {connectionStatus === 'connecting' ? 'Reconnecting...' : 'Recent Activity'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className={clsx(
                                "w-2 h-2 rounded-full",
                                connectionStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"
                            )} />
                            <span className={clsx(
                                "text-sm",
                                connectionStatus === 'connected' ? "text-zinc-400" : "text-amber-500/80"
                            )}>
                                {connectionStatus === 'connected' ? getFriendlyName(remotePeerId) : 'Waiting'}
                            </span>
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
                                    {item.type === 'clipboard' ? (() => {
                                        const isExpanded = expandedItems[item.id];
                                        const needsExpand = item.text.length > 250 || item.text.split('\n').length > 5;
                                        return (
                                            <div className="flex flex-col">
                                                <p className={clsx(
                                                    "text-zinc-300 text-sm leading-relaxed break-words whitespace-pre-wrap",
                                                    !isExpanded && needsExpand ? "line-clamp-4" : ""
                                                )}>
                                                    {item.text}
                                                </p>
                                                {needsExpand && (
                                                    <button
                                                        onClick={() => toggleExpand(item.id)}
                                                        className="self-start text-cyan-400 hover:text-cyan-300 text-xs mt-2 font-medium transition-colors"
                                                    >
                                                        {isExpanded ? "Show less" : "Expand"}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })() : (
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

            {/* Image Preview Modal (Mobile native save experience) */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
                    <button 
                        onClick={() => {
                            URL.revokeObjectURL(previewImage.url);
                            setPreviewImage(null);
                        }}
                        className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-50 pointer-events-auto"
                        aria-label="Close Preview"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-16 relative">
                        <img 
                            src={previewImage.url} 
                            alt={previewImage.name} 
                            className="max-w-full max-h-full object-contain rounded-lg drop-shadow-2xl pointer-events-auto select-none"
                            style={{ WebkitTouchCallout: 'default' }} 
                        />
                    </div>
                    <div className="absolute bottom-6 left-0 w-full px-6 flex flex-col items-center gap-2 pointer-events-none">
                        <p className="text-white text-sm font-medium drop-shadow-md truncate w-full text-center max-w-[250px]">{previewImage.name}</p>
                        <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest text-center">Long press image to save</p>
                    </div>
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
