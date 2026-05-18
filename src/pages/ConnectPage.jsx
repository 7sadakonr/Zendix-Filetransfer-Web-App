import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';
import ConnectModal from '../components/ConnectModal';
import ConnectionConsentModal from '../components/ConnectionConsentModal';
import { Camera, Copy, Check, Pencil } from 'lucide-react';
import AnimatedQRCode from '../components/AnimatedQRCode';
const logoSrc = '/logo.svg';

const ConnectPage = () => {
    const navigate = useNavigate();
    const { connectToPeer, regeneratePeerId, changePeerId, acceptIncomingConnection, rejectIncomingConnection, pendingIncomingConnection } = usePeerConnection();
    const { myPeerId, connectionStatus, remotePeerIds, deviceName, setDeviceName } = useAppStore();

    const [showScanner, setShowScanner] = useState(false);
    const [remoteIdInput, setRemoteIdInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(deviceName || myPeerId || '');
    const nameInputRef = useRef(null);

    // Sync nameInput when deviceName or myPeerId changes
    useEffect(() => {
        setNameInput(deviceName || myPeerId || '');
    }, [deviceName, myPeerId]);

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

        if (targetPeerId) {
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
            navigator.clipboard.writeText(myPeerId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleConnect = () => {
        if (!remoteIdInput.trim()) return;

        // Auto-format: Remove whitespaces, make lowercase, and insert hyphen if missing
        let formattedId = remoteIdInput.trim().toLowerCase().replace(/\s+/g, '');
        if (!formattedId.includes('-')) {
            const match = formattedId.match(/^([a-z]+)(\d+)$/);
            if (match) {
                formattedId = `${match[1]}-${match[2]}`;
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
        <main aria-label="Zendix - Connect to a peer device" className="fixed inset-0 flex flex-col md:flex-row md:items-center md:justify-center px-4 sm:px-6 lg:px-8 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-[calc(2rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-[max(2rem,env(safe-area-inset-bottom))] font-['Inter'] overflow-hidden">
            {/* Safe Area Top Mask to guarantee solid status bar color */}
            <div className="fixed top-0 left-0 w-full h-[env(safe-area-inset-top)] bg-[#1a1a1a] z-50 pointer-events-none"></div>
            {/* SEO: Hidden h1 for search engines */}
            <h1 className="sr-only">Zendix - Fast Peer-to-Peer File and Clipboard Transfer</h1>
            {/* Subtle ambient glow for background */}
            <div className="fixed top-0 left-0 w-full h-[100vh] overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)' }} />
                <div className="absolute top-[60%] right-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-8 w-full max-w-[560px] lg:max-w-[800px] h-full md:h-auto justify-center items-stretch mx-auto">

                {/* Your Identity Card */}
                <div className="relative group rounded-[18px] sm:rounded-[24px] lg:rounded-[32px] p-3.5 sm:p-5 lg:p-8 w-full md:w-[280px] lg:w-[380px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.4s ease',
                    }}>

                    {/* Header */}
                    <div className="relative flex justify-between items-center shrink-0">
                        <h2 className="text-neutral-200 text-base sm:text-xl font-semibold" id="identity-heading">Your Identity</h2>
                        <button
                            type="button"
                            onClick={copyMyId}
                            className="group/logo inline-flex w-fit h-fit items-center justify-center shrink-0 p-0 leading-none transition-transform duration-300 hover:scale-105"
                            title="Copy device ID"
                            aria-label="Copy device ID"
                        >
                            <img src={logoSrc} alt="Zendix" className="block h-3.5 sm:h-5 w-auto opacity-70 transition-opacity duration-300 ease-out invert group-hover/logo:opacity-100" />
                        </button>
                    </div>

                    {/* Divider under header */}
                    <div className="relative w-full h-px my-2.5 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                    {/* QR Code in Rounded Square */}
                    <div className="relative flex-1 flex flex-col items-center justify-center min-h-0">
                        <button
                            type="button"
                            onClick={copyMyId}
                            className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-white rounded-[28px] sm:rounded-[32px] flex items-center justify-center shrink-0 p-2"
                            title="Copy device ID"
                            aria-label="Copy device ID"
                            style={{
                                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.03)';
                                e.currentTarget.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'scale(0.98)';
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.transform = 'scale(1.03)';
                            }}
                        >
                            {qrUrl ? (
                                <AnimatedQRCode
                                    value={qrUrl}
                                    bgColor="#ffffff"
                                    fgColor="#1a1a1a"
                                    level="L"
                                    includeMargin={false}
                                    className="w-full h-full rounded-[20px] sm:rounded-[24px]"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-200 rounded-[20px] sm:rounded-[24px] animate-pulse" />
                            )}
                        </button>

                        {/* Device Name (Editable) */}
                        <div className="flex items-center justify-center gap-2 mt-2.5 sm:mt-4 shrink-0">
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
                                    className="bg-transparent text-neutral-200 text-base sm:text-xl lg:text-2xl font-semibold text-center outline-none border-b-2 border-cyan-500/50 max-w-[200px]"
                                    maxLength={24}
                                />
                            ) : (
                                <>
                                    <span className="text-neutral-200 text-base sm:text-xl lg:text-2xl font-semibold text-center">
                                        {deviceName || myPeerId || 'Initializing...'}
                                    </span>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="p-1 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-white/5 transition-all"
                                        title="Edit device name"
                                        aria-label="Edit device name"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative w-full h-px my-2.5 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                    {/* Device ID Section */}
                    <div className="relative flex justify-between items-center shrink-0">
                        <button
                            type="button"
                            onClick={copyMyId}
                            className="min-w-0 flex-1 text-left rounded-lg transition-colors hover:bg-white/5 -ml-1.5 sm:-ml-2 px-1.5 sm:px-2 py-1"
                            title="Copy device ID"
                            aria-label="Copy device ID"
                        >
                            <div className="text-zinc-500 text-[9px] sm:text-xs font-medium tracking-[0.2em] sm:tracking-widest uppercase mb-1">
                                DEVICE ID
                            </div>
                            <div className="text-neutral-200 text-[15px] sm:text-base font-medium truncate">
                                {deviceName || myPeerId || 'Generating...'}
                            </div>
                            {deviceName && myPeerId && (
                                <div className="text-zinc-600 text-[10px] sm:text-xs font-mono mt-0.5 truncate">
                                    {myPeerId}
                                </div>
                            )}
                        </button>
                        <button
                            onClick={copyMyId}
                            aria-label={copied ? 'Device ID copied' : 'Copy device ID to clipboard'}
                            className="p-1.5 sm:p-2 rounded-lg shrink-0"
                            style={{
                                color: copied ? '#34d399' : 'rgba(163, 163, 163, 1)',
                                background: copied ? 'rgba(52, 211, 153, 0.1)' : 'transparent',
                                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                            }}
                            onMouseEnter={(e) => {
                                if (!copied) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.color = '#ffffff';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!copied) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'rgba(163, 163, 163, 1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                            title={copied ? 'Copied!' : 'Copy ID'}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Connect to Peer Card */}
                <div className="relative group rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-8 w-full md:w-[280px] lg:w-[380px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.4s ease',
                    }}>

                    {/* Header */}
                    <h2 className="relative text-neutral-200 text-lg sm:text-xl font-semibold shrink-0" id="connect-heading">Connect to Peer</h2>

                    {/* Divider */}
                    <div className="relative w-full h-px my-3 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                    {/* Peer ID Input */}
                    <div className="relative mb-2 sm:mb-3 shrink-0">
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
                            className="w-full bg-white rounded-lg px-3 py-2.5 text-sm sm:text-base text-neutral-700 font-medium outline-none placeholder:text-neutral-400"
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
                        className="w-full bg-white text-zinc-800 rounded-lg py-2.5 text-sm sm:text-base font-semibold mb-3 sm:mb-4 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                        onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onMouseDown={(e) => {
                            if (!e.currentTarget.disabled) {
                                e.currentTarget.style.transform = 'scale(0.98)';
                            }
                        }}
                        onMouseUp={(e) => {
                            if (!e.currentTarget.disabled) {
                                e.currentTarget.style.transform = 'scale(1.02)';
                            }
                        }}
                    >
                        Connect
                    </button>

                    {/* OR Divider */}
                    <div className="relative flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 shrink-0">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-zinc-500 text-xs font-medium">OR</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Scan Button */}
                    <button
                        onClick={() => setShowScanner(true)}
                        aria-label="Scan QR code to connect"
                        className="w-full bg-[#3a3a3a] text-white rounded-lg py-2.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2 shrink-0"
                        style={{
                            transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#444444';
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#3a3a3a';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onMouseDown={(e) => {
                            e.currentTarget.style.transform = 'scale(0.98)';
                        }}
                        onMouseUp={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                    >
                        <Camera size={14} />
                        Scan
                    </button>

                    <div className="relative mt-auto shrink-0">
                        <div className="w-full h-px my-3 sm:my-4"
                            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                        {/* Hint Text */}
                        <div className="px-2 py-1.5 min-h-[48px] flex flex-col items-center justify-start">
                            <div className="text-[10px] sm:text-xs font-medium tracking-widest uppercase mb-1 opacity-0 select-none">
                                DEVICE ID
                            </div>
                            <p className="text-zinc-500 text-sm sm:text-base font-medium text-center w-full leading-none">
                                Enter peer ID or scan QR to connect
                            </p>
                        </div>
                    </div>

                    {/* Connecting State */}
                    {connectionStatus === 'connecting' && (
                        <div className="relative mt-2 flex items-center justify-center gap-2 py-2 shrink-0 rounded-xl border border-amber-500/30"
                            style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-amber-400 text-xs font-medium">Connecting...</span>
                        </div>
                    )}
                </div>
            </div>

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
        </main>
    );
};

export default ConnectPage;


