import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';
import ConnectModal from '../components/ConnectModal';
import ConnectionConsentModal from '../components/ConnectionConsentModal';
import ConnectionWaitingModal from '../components/ConnectionWaitingModal';
import { Camera, Copy, Check, Pencil, QrCode, ArrowRightLeft } from 'lucide-react';
import AnimatedQRCode from '../components/AnimatedQRCode';
const logoSrc = '/logo.svg';

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

const ConnectPage = () => {
    const navigate = useNavigate();
    const { connectToPeer, regeneratePeerId, changePeerId, acceptIncomingConnection, rejectIncomingConnection, pendingIncomingConnection } = usePeerConnection();
    const { myPeerId, connectionStatus, remotePeerIds, deviceName, setDeviceName } = useAppStore();

    const [mobileTab, setMobileTab] = useState('identity');
    const [showScanner, setShowScanner] = useState(false);
    const [remoteIdInput, setRemoteIdInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(deviceName || myPeerId || '');
    const nameInputRef = useRef(null);
    const hasAutoConnectedRef = useRef(false);

    // Sync nameInput when deviceName or myPeerId changes (only if not actively editing)
    useEffect(() => {
        if (!isEditingName) {
            setNameInput(deviceName || myPeerId || '');
        }
    }, [deviceName, myPeerId, isEditingName]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const handleNameSave = () => {
        const trimmed = nameInput.trim();
        if (trimmed) {
            const result = changePeerId(trimmed);
            if (!result) {
                // Invalid name, revert
                setNameInput(deviceName || myPeerId || '');
            } else {
                setNameInput(result.name);
            }
        } else {
            setNameInput(deviceName || myPeerId || '');
        }
        setIsEditingName(false);
    };

    // Auto-Connect from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const targetPeerId = params.get('connect');

        if (targetPeerId && !hasAutoConnectedRef.current) {
            hasAutoConnectedRef.current = true;
            connectToPeer(targetPeerId);
            const url = new URL(window.location);
            url.searchParams.delete('connect');
            window.history.replaceState({}, '', url);
        }
    }, [connectToPeer]);

    // Navigate to transfer when connected or if session restored
    useEffect(() => {
        if (connectionStatus === 'connected') {
            navigate('/transfer');
        } else if (remotePeerIds && remotePeerIds.length > 0) {
            // Auto redirect to transfer page to attempt reconnection
            navigate('/transfer');
        }
    }, [connectionStatus, remotePeerIds, navigate]);

    const copyMyId = () => {
        if (myPeerId) {
            const shareUrl = `${window.location.protocol}//${window.location.host}/?connect=${myPeerId}`;
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleConnect = () => {
        const trimmedInput = remoteIdInput.trim();
        if (!trimmedInput) return;

        let formattedId = trimmedInput;

        // Check if user pasted a full share link
        try {
            const url = new URL(trimmedInput);
            const connectId = url.searchParams.get('connect');
            if (connectId) {
                formattedId = connectId;
            }
        } catch (e) {
            // Not a URL, continue normal flow
        }

        // Auto-format default generated IDs (e.g. "astro77" -> "astro-77")
        if (!formattedId.includes('-') && !formattedId.includes(' ') && !formattedId.includes('http')) {
            const match = formattedId.match(/^([a-zA-Z]+)(\d+)$/);
            if (match) {
                formattedId = `${match[1].toLowerCase()}-${match[2]}`;
            }
        }

        connectToPeer(formattedId);
    };

    const handleLogoClick = () => {
        regeneratePeerId();
        setCopied(false);
    };

    const qrUrl = myPeerId
        ? `${window.location.protocol}//${window.location.host}/?connect=${myPeerId}`
        : '';

    return (
        <main aria-label="Zendix - Connect to a peer device" className="relative h-full w-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pt-[calc(2rem+env(safe-area-inset-top))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))] font-['Inter'] overflow-hidden">
            {/* Safe Area Top Mask to guarantee solid status bar color */}
            <div className="fixed top-0 left-0 w-full h-[env(safe-area-inset-top)] bg-[#1a1a1a] z-50 pointer-events-none"></div>
            {/* SEO: Hidden h1 for search engines */}
            <h1 className="sr-only">Zendix - Fast Peer-to-Peer File and Clipboard Transfer</h1>
            {/* Subtle ambient glow for background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)' }} />
                <div className="absolute top-[60%] right-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)' }} />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 flex flex-col items-center justify-center w-full max-h-full my-auto"
            >
                {/* Mobile Segmented Tab Switcher */}
                <div className="flex md:hidden w-full max-w-[350px] bg-[#2a2a2a]/90 backdrop-blur-xl p-1 rounded-2xl border border-white/[0.12] mb-3 shrink-0 shadow-lg">
                    <button
                        type="button"
                        onClick={() => setMobileTab('identity')}
                        className={clsx(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5",
                            mobileTab === 'identity'
                                ? "bg-white text-zinc-900 shadow-md scale-[1.01]"
                                : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        <QrCode size={14} />
                        <span>My Identity</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('connect')}
                        className={clsx(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5",
                            mobileTab === 'connect'
                                ? "bg-white text-zinc-900 shadow-md scale-[1.01]"
                                : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        <ArrowRightLeft size={14} />
                        <span>Connect Peer</span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-8 w-full max-w-[350px] md:max-w-[740px] lg:max-w-[820px] justify-center items-stretch">
                    {/* Your Identity Card */}
                    <motion.div
                        variants={itemVariants}
                        className={clsx(
                            "relative group rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] p-5 sm:p-6 lg:p-8 w-full md:w-[350px] lg:w-[380px] h-[430px] sm:h-[460px] md:h-[490px] lg:h-[510px] flex-col backdrop-blur-2xl border border-white/[0.15] overflow-hidden shadow-2xl shrink-0",
                            mobileTab === 'identity' ? "flex" : "hidden md:flex"
                        )}
                        style={{
                            background: 'rgba(42, 42, 42, 0.7)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.4s ease',
                        }}
                    >
                        {/* Header */}
                        <div className="relative flex justify-between items-center shrink-0">
                            <h2 className="text-neutral-200 text-lg sm:text-xl font-semibold" id="identity-heading">Your Identity</h2>
                            <button
                                type="button"
                                onClick={handleLogoClick}
                                className="group/logo inline-flex w-fit h-fit items-center justify-center shrink-0 p-0 leading-none transition-transform duration-300 hover:scale-105"
                                title="Generate new ID"
                                aria-label="Generate new ID"
                            >
                                <img src={logoSrc} alt="Zendix" className="block h-4 sm:h-5 w-auto opacity-70 transition-opacity duration-300 ease-out invert group-hover/logo:opacity-100" />
                            </button>
                        </div>

                        {/* Divider under header */}
                        <div className="relative w-full h-px my-3 sm:my-4 shrink-0"
                            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                        {/* QR Code in Rounded Square */}
                        <div className="relative flex-1 flex flex-col items-center justify-center min-h-0">
                            <button
                                type="button"
                                onClick={copyMyId}
                                className="relative w-36 h-36 sm:w-40 sm:h-40 lg:w-44 lg:h-44 bg-white rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] flex items-center justify-center shrink-0 p-2 sm:p-2.5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_10px_28px_rgba(0,0,0,0.3)] active:scale-[0.98]"
                                title="Copy share link"
                                aria-label="Copy share link"
                                style={{
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                                }}
                            >
                                {qrUrl ? (
                                    <AnimatedQRCode
                                        value={qrUrl}
                                        bgColor="#ffffff"
                                        fgColor="#1a1a1a"
                                        level="L"
                                        includeMargin={false}
                                        className="w-full h-full rounded-[18px] sm:rounded-[22px]"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-[18px] sm:rounded-[22px] loading-card-shimmer" />
                                )}
                            </button>

                            {/* Device Name (Editable) */}
                            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 shrink-0">
                                {isEditingName ? (
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        onBlur={handleNameSave}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleNameSave();
                                            if (e.key === 'Escape') {
                                                setNameInput(deviceName);
                                                setIsEditingName(false);
                                            }
                                        }}
                                        className="bg-transparent text-neutral-200 text-base sm:text-lg lg:text-xl font-semibold text-center outline-none border-b-2 border-cyan-500/50 max-w-[200px]"
                                        maxLength={24}
                                    />
                                ) : (
                                    <>
                                        <span className="text-neutral-200 text-base sm:text-lg lg:text-xl font-semibold text-center truncate max-w-[200px]">
                                            {deviceName || myPeerId ? (
                                                deviceName || myPeerId
                                            ) : (
                                                <div className="h-6 sm:h-7 w-28 sm:w-32 rounded-md loading-card-shimmer inline-block align-middle" />
                                            )}
                                        </span>
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="p-1 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-white/5 transition-all"
                                            title="Edit device name"
                                            aria-label="Edit device name"
                                        >
                                            <Pencil size={13} className="sm:w-3.5 sm:h-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="relative mt-auto shrink-0">
                            {/* Divider */}
                            <div className="w-full h-px my-3 sm:my-4 shrink-0"
                                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                            {/* Device ID Section */}
                            <button
                                type="button"
                                onClick={copyMyId}
                                className="group relative flex justify-between items-center w-full text-left shrink-0 min-h-[56px] sm:min-h-[64px] px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 hover:bg-white/5"
                                title="Copy share link"
                                aria-label="Copy share link"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="text-zinc-500 text-[10px] sm:text-xs font-medium tracking-widest uppercase mb-1">
                                        SHARE LINK
                                    </div>
                                    <div className="text-neutral-200 text-sm sm:text-base font-medium truncate group-hover:text-white transition-colors">
                                        {deviceName || myPeerId ? (
                                            deviceName || myPeerId
                                        ) : (
                                            <div className="h-5 w-24 rounded loading-card-shimmer mt-0.5" />
                                        )}
                                    </div>
                                </div>
                                <div className={`shrink-0 ml-3 sm:ml-4 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 text-neutral-400 opacity-50 group-hover:text-white group-hover:opacity-100 ${copied ? '!text-[#34d399] !bg-[rgba(52,211,153,0.1)] !opacity-100' : ''}`}>
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </div>
                            </button>
                        </div>
                    </motion.div>

                    {/* Connect to Peer Card */}
                    <motion.div
                        variants={itemVariants}
                        className={clsx(
                            "relative group rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] p-5 sm:p-6 lg:p-8 w-full md:w-[350px] lg:w-[380px] h-[430px] sm:h-[460px] md:h-[490px] lg:h-[510px] flex-col backdrop-blur-2xl border border-white/[0.15] overflow-hidden shadow-2xl shrink-0",
                            mobileTab === 'connect' ? "flex" : "hidden md:flex"
                        )}
                        style={{
                            background: 'rgba(42, 42, 42, 0.7)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.4s ease',
                        }}
                    >
                        {/* Header */}
                        <h2 className="relative text-neutral-200 text-lg sm:text-xl font-semibold shrink-0" id="connect-heading">Connect to Peer</h2>

                        {/* Divider */}
                        <div className="relative w-full h-px my-3 sm:my-4 shrink-0"
                            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                        {/* Peer ID Input */}
                        <div className="relative mb-2.5 sm:mb-3 shrink-0">
                            <div className="text-zinc-500 text-[10px] sm:text-xs font-medium tracking-widest uppercase mb-1.5">
                                PEER ID
                            </div>
                            <input
                                type="text"
                                id="peer-id-input"
                                aria-label="Enter remote peer ID"
                                value={remoteIdInput}
                                onChange={(e) => setRemoteIdInput(e.target.value)}
                                placeholder="astro-77"
                                className="w-full bg-white rounded-xl px-3.5 py-2.5 sm:py-3 text-sm sm:text-base text-neutral-800 font-medium outline-none placeholder:text-neutral-400"
                                style={{
                                    transition: 'box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s ease',
                                    boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(255, 255, 255, 0)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            />
                        </div>

                        {/* Connect Button */}
                        <button
                            onClick={handleConnect}
                            disabled={!remoteIdInput.trim()}
                            aria-label="Connect to peer device"
                            className="w-full bg-white text-zinc-900 rounded-xl py-2.5 sm:py-3 text-sm sm:text-base font-semibold mb-3 sm:mb-4 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-[250ms] ease-out hover:enabled:scale-[1.02] hover:enabled:shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:enabled:scale-[0.98]"
                        >
                            Connect
                        </button>

                        {/* OR Divider */}
                        <div className="relative flex items-center gap-2 sm:gap-3 mb-3 shrink-0">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-zinc-500 text-xs font-medium">OR</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Scan Button */}
                        <button
                            onClick={() => setShowScanner(true)}
                            aria-label="Scan QR code to connect"
                            className="w-full bg-[#3a3a3a] text-white rounded-xl py-2.5 sm:py-3 text-sm sm:text-base font-medium flex items-center justify-center gap-2 shrink-0 transition-all duration-[250ms] ease-out hover:bg-[#444444] hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Camera size={15} />
                            Scan QR Code
                        </button>

                        <div className="relative mt-auto shrink-0">
                            <div className="w-full h-px my-3 sm:my-4 shrink-0"
                                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                            {/* Hint Text */}
                            <div className="px-3 py-2 min-h-[56px] sm:min-h-[64px] flex flex-col items-center justify-center">
                                <p className="text-zinc-400 text-xs sm:text-sm font-medium text-center w-full leading-relaxed">
                                    Enter peer ID or scan QR code to connect
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Scanner Modal */}
            {showScanner && (
                <ConnectModal
                    myPeerId={myPeerId}
                    onClose={() => setShowScanner(false)}
                    onScanConnect={(id) => {
                        connectToPeer(id);
                        setShowScanner(false);
                    }}
                />
            )}

            {/* Connection Consent Modal */}
            <ConnectionConsentModal
                pending={pendingIncomingConnection}
                onAccept={acceptIncomingConnection}
                onReject={rejectIncomingConnection}
            />

            {/* Connection Waiting Modal */}
            <ConnectionWaitingModal
                isConnecting={connectionStatus === 'connecting'}
                peerId={remoteIdInput}
                onCancel={() => {
                    useAppStore.getState().setConnectionStatus('disconnected');
                }}
            />
        </main>
    );
};

export default ConnectPage;


