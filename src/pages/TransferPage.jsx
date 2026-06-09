import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] }
    }
};
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';
import { useClipboardSync } from '../hooks/useClipboardSync';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { getDeviceName } from '../utils/platform';
import { getFilesFromDataTransfer, getFilesFromFileList } from '../utils/fileCollection';
import ClipboardToast from '../components/ClipboardToast';
import ConnectionConsentModal from '../components/ConnectionConsentModal';
import { Clipboard, FileText, Copy, Check, Send, Upload, File, X, LogOut, Download, Image, Wifi, Globe } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import clsx from 'clsx';

const TransferPage = () => {
    const navigate = useNavigate();
    const { sendData, disconnectPeer, connectToPeer, connectionType, peerDeviceNames, retryCount, acceptIncomingConnection, rejectIncomingConnection, pendingIncomingConnection } = usePeerConnection();
    const { connectionStatus, remotePeerIds, clipboardHistory, myPeerId, previewImage, setPreviewImage, deviceName } = useAppStore();
    const { pendingClipboardItem, confirmPendingCopy, clearPending, copySuccess } = useClipboardSync();
    const { sendFile, sendFiles, fileTransfers } = useFileTransfer();

    const [activeTab, setActiveTab] = useState('clipboard');
    const [textInput, setTextInput] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [expandedItems, setExpandedItems] = useState({});
    const [showConnectInfo, setShowConnectInfo] = useState(false);
    const [peerIdCopied, setPeerIdCopied] = useState(false);
    const textareaRef = useRef(null);
    const touchStartY = useRef(null);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    useEffect(() => {
        const folderInput = folderInputRef.current;
        if (!folderInput) return;

        // Some browsers only honor directory picking when the attribute
        // exists on the live DOM node, not just in JSX props.
        folderInput.setAttribute('webkitdirectory', '');
        folderInput.setAttribute('directory', '');
        folderInput.setAttribute('mozdirectory', '');
    }, []);

    useEffect(() => {
        const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
        if (!isMobileViewport) return;

        document.documentElement.classList.add('transfer-page-lock');
        document.body.classList.add('transfer-page-lock');

        return () => {
            document.documentElement.classList.remove('transfer-page-lock');
            document.body.classList.remove('transfer-page-lock');
        };
    }, []);

    const toggleExpand = (id) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Auto-reconnect or Redirect
    useEffect(() => {
        if (connectionStatus === 'disconnected') {
            if (remotePeerIds && remotePeerIds.length > 0) {
                console.log('[TransferPage] Attempting auto-reconnect to:', remotePeerIds);
                const timer = setTimeout(() => {
                    // Check if we are still disconnected before attempting to reconnect
                    if (useAppStore.getState().connectionStatus !== 'disconnected') return;
                    
                    useAppStore.getState().setConnectionStatus('connecting');
                    // Auto-reconnect to the primary (first) peer for simplicity on reload
                    remotePeerIds.forEach(peerId => connectToPeer(peerId));
                }, 5000);
                return () => clearTimeout(timer);
            } else {
                navigate('/');
            }
        }
    }, [connectionStatus, remotePeerIds, navigate, connectToPeer]);

    // Get friendly name — use device names from peer info exchange
    const getFriendlyName = () => {
        if (!remotePeerIds || remotePeerIds.length === 0) return 'Unknown';
        if (remotePeerIds.length > 1) return `${remotePeerIds.length} peers connected`;
        const peerId = remotePeerIds[0];
        return peerDeviceNames[peerId] || peerId;
    };

    // Connection type badge text
    const getConnectionBadge = () => {
        if (connectionType === 'lan') return { label: 'LAN', icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
        if (connectionType === 'relay') return { label: 'Relay', icon: Globe, color: 'text-amber-400', bg: 'bg-amber-400/10' };
        return null;
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
                alert("เธญเธธเธเธเธฃเธ“เนเธเธญเธเธเธธเธ“เธ–เธนเธเธเธณเธเธฑเธ”เธชเธดเธ—เธเธดเนเธเธฒเธฃเธงเธฒเธเนเธเธฅเนเธเธฒเธเธเธธเนเธก (เธ•เนเธญเธเนเธเนเธเธฒเธเธเนเธฒเธ HTTPS เธฅเธดเธเธเน) เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธเนเธงเธดเธเธตเธเธ”เธเนเธฒเธเธ—เธตเนเธเนเธญเธเธเธดเธกเธเนเนเธฅเนเธงเน€เธฅเธทเธญเธ Paste เธซเธฃเธทเธญเนเธเธ—เธตเนเนเธ—เนเธ File เนเธ—เธเธเธฃเธฑเธ");
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

    const handlePreviewFile = (item) => {
        if (!item?.previewUrl || !item?.fileType?.startsWith('image/')) return;
        setPreviewImage({ url: item.previewUrl, name: item.fileName });
    };

    const handleCopyPeerId = async () => {
        if (!myPeerId) return;

        try {
            await navigator.clipboard.writeText(myPeerId);
            setPeerIdCopied(true);
            setTimeout(() => setPeerIdCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy peer ID:', err);
        }
    };

    const handleFileSelect = (e) => {
        sendFiles(getFilesFromFileList(e.target.files));
        e.target.value = '';
    };

    const handleFolderSelect = (e) => {
        sendFiles(getFilesFromFileList(e.target.files));
        e.target.value = '';
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

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (connectionStatus !== 'connected') return;

        const files = await getFilesFromDataTransfer(e.dataTransfer);
        sendFiles(files);
    };

    // Combine clipboard history and file transfers
    const allActivity = [
        ...clipboardHistory.map(item => ({ ...item, type: 'clipboard' })),
        ...fileTransfers.map(item => ({ ...item, type: 'file' }))
    ].sort((a, b) => b.timestamp - a.timestamp);
    const connectQrUrl = myPeerId
        ? `${window.location.protocol}//${window.location.host}/?connect=${myPeerId}`
        : '';

    return (
        <main aria-label="Zendix - Transfer files and clipboard" className="relative min-h-[100dvh] w-full flex flex-col px-4 sm:px-6 lg:px-8 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pt-[calc(2rem+env(safe-area-inset-top))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pt-[calc(2.5rem+env(safe-area-inset-top))] lg:pb-[calc(2.5rem+env(safe-area-inset-bottom))] font-['Inter'] overflow-x-hidden">
            {/* Safe Area Top Mask to guarantee solid status bar color */}
            <div className="fixed top-0 left-0 w-full h-[env(safe-area-inset-top)] bg-[#1a1a1a] z-50 pointer-events-none"></div>
            {/* SEO: Hidden h1 for search engines */}
            <h1 className="sr-only">Zendix - Peer-to-Peer File Transfer and Clipboard Sync</h1>
            {/* Ambient glow background */}
            <div className="fixed top-0 left-0 w-full h-[100vh] overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)' }} />
                <div className="absolute top-[60%] right-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)' }} />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-6 w-full max-w-[560px] lg:max-w-[900px] flex-1 md:flex-none md:h-[600px] lg:h-[650px] md:max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-8rem)] justify-center items-stretch mx-auto md:m-auto"
            >

                {/* Left Panel - Input */}
                <motion.div
                    variants={itemVariants}
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
                                            sendFiles(getFilesFromFileList(files));
                                            hasFile = true;
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
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget && connectionStatus === 'connected') {
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    className={clsx(
                                        "relative flex flex-col items-center justify-center w-full h-full min-h-[150px] rounded-2xl border-2 transition-all cursor-pointer group/drop px-6",
                                        connectionStatus === 'connected'
                                            ? isDraggingOver
                                                ? "border-cyan-400 bg-cyan-500/20 border-solid shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                                                : "border-cyan-500/30 border-dashed hover:border-cyan-500/50 hover:bg-cyan-500/5"
                                            : "border-white/10 border-dashed opacity-50 cursor-not-allowed"
                                    )}>
                                    <Upload size={40} className={clsx("mb-3 transition-colors", isDraggingOver ? "text-cyan-400 scale-110" : "text-zinc-500 group-hover/drop:text-cyan-400")} />
                                    <p className={clsx("text-sm font-medium mb-1 text-center", isDraggingOver ? "text-cyan-300" : "text-zinc-400")}>
                                        {connectionStatus === 'connected' ? (isDraggingOver ? "Drop files or folders now!" : "Click, drag files, or drop a folder here") : "Reconnecting to send files..."}
                                    </p>
                                    <p className="text-zinc-600 text-xs text-center">Files are sent one by one automatically. Folder contents keep their relative path labels.</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        disabled={connectionStatus !== 'connected'}
                                        multiple
                                    />
                                    <input
                                        ref={folderInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFolderSelect}
                                        disabled={connectionStatus !== 'connected'}
                                        webkitdirectory=""
                                        directory=""
                                        multiple
                                    />
                                </div>
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


                </motion.div>

                {/* Right Panel - Recent Activity */}
                <motion.div variants={itemVariants} className="relative group rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-6 w-full md:w-[320px] lg:w-[440px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}>

                    {/* Header */}
                    <div className="flex items-center justify-between shrink-0 mb-4">
                        <div>
                            <h2 className="text-neutral-200 text-xl sm:text-2xl font-semibold" id="activity-heading">
                                {connectionStatus === 'connecting'
                                    ? retryCount > 0
                                        ? `Retrying... (${retryCount})`
                                        : 'Reconnecting...'
                                    : 'Recent Activity'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* LAN/Relay Badge */}
                            {connectionStatus === 'connected' && (() => {
                                const badge = getConnectionBadge();
                                if (!badge) return null;
                                const BadgeIcon = badge.icon;
                                return (
                                    <span className={clsx(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                        badge.color, badge.bg
                                    )}>
                                        <BadgeIcon size={10} />
                                        {badge.label}
                                    </span>
                                );
                            })()}
                            <div className={clsx(
                                "w-2 h-2 rounded-full",
                                connectionStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"
                            )} />
                            <button
                                type="button"
                                onClick={() => setShowConnectInfo(true)}
                                className={clsx(
                                    "text-sm transition-colors",
                                    connectionStatus === 'connected'
                                        ? "text-zinc-400 hover:text-white"
                                        : "text-amber-500/80 hover:text-amber-300"
                                )}
                                title="Show connection QR and ID"
                            >
                                {connectionStatus === 'connected' ? getFriendlyName() : 'Waiting'}
                            </button>
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
                                    onClick={() => {
                                        if (item.type === 'file') {
                                            handlePreviewFile(item);
                                        }
                                    }}
                                    className={clsx(
                                        "relative bg-[#2a2a2a] rounded-xl p-4 border border-white/[0.05] transition-all",
                                        item.type === 'file' && item.previewUrl && item.fileType?.startsWith('image/')
                                            ? "cursor-pointer hover:border-cyan-400/40"
                                            : "hover:border-white/[0.1]"
                                    )}
                                >
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                                                (item.fromDevice === 'THIS DEVICE' || item.direction === 'outgoing')
                                                    ? "bg-zinc-700 text-zinc-300"
                                                    : "bg-cyan-500/20 text-cyan-400"
                                            )}>
                                                {(item.fromDevice === 'THIS DEVICE' || item.direction === 'outgoing') ? 'THIS DEVICE' : 'PEER'}
                                            </span>
                                            <span className="text-zinc-600 text-xs">
                                                {new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                        {item.type === 'clipboard' ? (
                                            <button
                                                onClick={() => handleCopyItem(item)}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            </button>
                                        ) : item.blobUrl ? (
                                            <a
                                                href={item.blobUrl}
                                                download={item.downloadFileName || item.fileName}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                                                title="Save File"
                                            >
                                                <Download size={14} />
                                            </a>
                                        ) : null}
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
                                                    {item.fileType?.startsWith('image/') ? (
                                                        <Image size={14} className="text-cyan-400" />
                                                    ) : (
                                                        <File size={14} className="text-zinc-400" />
                                                    )}
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
                                                <span>{item.previewUrl && item.fileType?.startsWith('image/') ? 'Tap to preview' : item.direction === 'outgoing' ? 'Sent' : 'Received'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Toasts */}
            <ClipboardToast
                pendingItem={pendingClipboardItem}
                onConfirm={confirmPendingCopy}
                onCancel={clearPending}
            />

            {copySuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-full shadow-xl z-50">
                    Copied to this device
                </div>
            )}

            {showConnectInfo && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
                    onClick={() => setShowConnectInfo(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#202020]/95 p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Connect More</p>
                                <h3 className="mt-1 text-lg font-semibold text-white">Share this QR or ID</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowConnectInfo(false)}
                                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:text-white"
                                aria-label="Close connect info"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mt-5 flex justify-center">
                            <div className="inline-flex rounded-[24px] border border-white/10 bg-white p-2 w-[min(78vw,256px)] h-[min(78vw,256px)] box-border">
                                {connectQrUrl ? (
                                    <QRCodeSVG
                                        value={connectQrUrl}
                                        style={{ width: "100%", height: "100%" }}
                                        bgColor="#ffffff"
                                        fgColor="#111111"
                                        level="L"
                                        includeMargin={false}
                                        className="block rounded-[16px]"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-[16px] loading-card-shimmer" />
                                )}
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="min-w-0 flex-1">
                                <div className="mt-2 text-sm font-medium text-white">
                                    {deviceName || myPeerId ? (
                                        <span className="truncate">{deviceName || myPeerId}</span>
                                    ) : (
                                        <div className="h-5 w-24 rounded loading-card-shimmer" />
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyPeerId}
                                className="ml-4 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                                aria-label={peerIdCopied ? 'Device ID copied' : 'Copy device ID'}
                                title={peerIdCopied ? 'Copied!' : 'Copy ID'}
                            >
                                {peerIdCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal (Premium Glassmorphism Design) */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-xl transition-all duration-300"
                    style={{ background: 'radial-gradient(ellipse at center, rgba(30,30,30,0.97) 0%, rgba(10,10,10,0.99) 100%)' }}
                    onTouchStart={(e) => {
                        touchStartY.current = e.touches[0].clientY;
                    }}
                    onTouchMove={(e) => {
                        e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                        if (touchStartY.current === null) return;
                        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
                        if (Math.abs(deltaY) > 80) {
                            setPreviewImage(null);
                        }
                        touchStartY.current = null;
                    }}
                >
                    {/* Ambient glow behind image */}
                    <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                        <div className="absolute top-[20%] left-[10%] w-[50vw] min-w-[250px] aspect-square rounded-full opacity-10 blur-[120px]"
                            style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)' }} />
                        <div className="absolute bottom-[10%] right-[5%] w-[40vw] min-w-[200px] aspect-square rounded-full opacity-10 blur-[100px]"
                            style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)' }} />
                    </div>

                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-3">
                        {/* File Info Pill */}
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-2xl border border-white/[0.1]"
                            style={{ background: 'rgba(42, 42, 42, 0.6)' }}>
                            <Image size={14} className="text-cyan-400 shrink-0" />
                            <span className="text-zinc-200 text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-[250px]">{previewImage.name}</span>
                        </div>
                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setPreviewImage(null);
                            }}
                            className="p-2.5 rounded-full backdrop-blur-2xl border border-white/[0.1] text-zinc-400 hover:text-white hover:border-white/[0.25] hover:bg-white/10 transition-all duration-300 pointer-events-auto"
                            style={{ background: 'rgba(42, 42, 42, 0.6)' }}
                            aria-label="Close Preview"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Image Container */}
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden px-4 sm:px-8 py-20 relative">
                        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl"
                            style={{ boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.05)' }}>
                            <img
                                src={previewImage.url}
                                alt={previewImage.name}
                                className="max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)] max-h-[calc(100vh-12rem)] object-contain pointer-events-auto select-none"
                                style={{ WebkitTouchCallout: 'default' }}
                            />
                        </div>
                    </div>

                    {/* Bottom Info Bar */}
                    <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4">
                        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-2xl border border-white/[0.1]"
                            style={{ background: 'rgba(42, 42, 42, 0.6)' }}>
                            <Download size={13} className="text-zinc-500" />
                            <span className="text-zinc-400 text-[11px] sm:text-xs font-medium tracking-wide">Long press image to save</span>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Connection Consent Modal */}
            <ConnectionConsentModal
                pending={pendingIncomingConnection}
                onAccept={acceptIncomingConnection}
                onReject={rejectIncomingConnection}
            />
        </main>
    );
};

export default TransferPage;


