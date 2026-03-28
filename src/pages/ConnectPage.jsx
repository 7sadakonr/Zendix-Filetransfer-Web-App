import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';
import ConnectModal from '../components/ConnectModal';
import { Camera, Copy, ArrowRight, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Logo from '../assets/img/Frame 2 (1).svg';

const ConnectPage = () => {
    const navigate = useNavigate();
    const { connectToPeer } = usePeerConnection();
    const { myPeerId, connectionStatus, remotePeerId } = useAppStore();

    const [showScanner, setShowScanner] = useState(false);
    const [remoteIdInput, setRemoteIdInput] = useState('');
    const [copied, setCopied] = useState(false);

    // Generate a friendly device name from peer ID
    const getDeviceName = (peerId) => {
        if (!peerId) return 'Initializing...';
        const parts = peerId.split('-');
        return parts.length > 1 ? `${parts[0]}-${parts[parts.length - 1]}` : peerId;
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

    // Navigate to transfer when connected
    useEffect(() => {
        if (connectionStatus === 'connected') {
            setTimeout(() => navigate('/transfer'), 1000);
        }
    }, [connectionStatus, navigate]);

    const copyMyId = () => {
        if (myPeerId) {
            navigator.clipboard.writeText(myPeerId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleConnect = () => {
        if (remoteIdInput.trim()) {
            connectToPeer(remoteIdInput.trim());
        }
    };

    const qrUrl = myPeerId
        ? `${window.location.protocol}//${window.location.host}/?connect=${myPeerId}`
        : '';

    return (
        <main aria-label="Fliq - Connect to a peer device" className="fixed inset-0 flex flex-col md:flex-row md:items-center md:justify-center p-3 sm:p-4 lg:p-8 font-['Inter'] overflow-hidden bg-[#1a1a1a]">
            {/* SEO: Hidden h1 for search engines */}
            <h1 className="sr-only">Fliq — Fast Peer-to-Peer File and Clipboard Transfer</h1>
            {/* Subtle ambient glow for background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-[100px]"
                    style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-8 w-full max-w-[560px] lg:max-w-[800px] h-full md:h-auto justify-center items-stretch mx-auto">

                {/* Your Identity Card */}
                <div className="relative group rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-8 w-full md:w-[280px] lg:w-[380px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.4s ease',
                    }}>

                    {/* Header */}
                    <div className="relative flex justify-between items-center shrink-0">
                        <h2 className="text-neutral-200 text-lg sm:text-xl font-semibold" id="identity-heading">Your Identity</h2>
                        <img src={Logo} alt="FLIO" className="h-4 sm:h-5 w-auto opacity-70 transition-opacity duration-300 ease-out group-hover:opacity-100" />
                    </div>

                    {/* Divider under header */}
                    <div className="relative w-full h-px my-3 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                    {/* QR Code in Rounded Square */}
                    <div className="relative flex-1 flex flex-col items-center justify-center min-h-0">
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 bg-white rounded-2xl sm:rounded-3xl flex items-center justify-center shrink-0 p-3 sm:p-4"
                            style={{
                                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                            }}>
                            {qrUrl ? (
                                <QRCodeSVG
                                    value={qrUrl}
                                    size={200}
                                    bgColor="#ffffff"
                                    fgColor="#1a1a1a"
                                    level="L"
                                    includeMargin={false}
                                    className="w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-200 rounded-xl animate-pulse" />
                            )}
                        </div>

                        {/* Device Name */}
                        <div className="text-neutral-200 text-lg sm:text-xl lg:text-2xl font-semibold text-center mt-3 sm:mt-4 shrink-0">
                            {getDeviceName(myPeerId)}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative w-full h-px my-3 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }} />

                    {/* Device ID Section */}
                    <div className="relative flex justify-between items-center shrink-0">
                        <div className="min-w-0 flex-1">
                            <div className="text-zinc-500 text-[10px] sm:text-xs font-medium tracking-widest uppercase mb-1">
                                DEVICE ID
                            </div>
                            <div className="text-neutral-200 text-sm sm:text-base font-medium truncate">
                                {myPeerId || 'Generating...'}
                            </div>
                        </div>
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
                            placeholder="astro-apollo-77"
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
                        className="w-full bg-[#3a3a3a] text-white rounded-lg py-2.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2 mb-3 sm:mb-4 shrink-0"
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

                    {/* Hint Text - flexible space */}
                    <div className="relative flex-1 flex items-end min-h-0">
                        <p className="text-zinc-500 text-xs text-center w-full">
                            Enter peer ID or scan QR to connect
                        </p>
                    </div>

                    {/* Connected State */}
                    {connectionStatus === 'connected' && (
                        <div className="relative mt-2 p-2 sm:p-3 rounded-xl text-center shrink-0 border border-emerald-500/30"
                            style={{ background: 'rgba(16, 185, 129, 0.1)', backdropFilter: 'blur(8px)' }}>
                            <p className="text-emerald-400 font-semibold mb-1 sm:mb-2 flex items-center justify-center gap-1 text-xs">
                                <Check size={12} />
                                Connected to {getDeviceName(remotePeerId)}
                            </p>
                            <button
                                onClick={() => navigate('/transfer')}
                                className="rounded-xl px-4 py-1.5 text-xs font-semibold transition-all duration-300 inline-flex items-center gap-1 text-white"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                                }}
                            >
                                Go to Transfer
                                <ArrowRight size={12} />
                            </button>
                        </div>
                    )}

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
        </main>
    );
};

export default ConnectPage;
