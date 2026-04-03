import { X, Scan, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRScanner from './QRScanner';
import AnimatedQRCode from './AnimatedQRCode';

const ConnectModal = ({ onClose, myPeerId, onScanConnect }) => {
    const [qrUrl, setQrUrl] = useState('');
    const [showMyQR, setShowMyQR] = useState(false);

    useEffect(() => {
        const url = `${window.location.protocol}//${window.location.host}/?connect=${myPeerId}`;
        setQrUrl(url);
    }, [myPeerId]);

    // Get device name from peer ID
    const getDeviceName = (peerId) => {
        if (!peerId) return 'Loading...';
        return peerId;
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a] font-['Inter'] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/[0.15]"
                        style={{ background: 'rgba(42, 42, 42, 0.7)' }}>
                        <Scan size={18} className="text-neutral-200" />
                    </div>
                    <div>
                        <h1 className="text-neutral-200 text-lg font-semibold">Scan QR Code</h1>
                        <p className="text-zinc-500 text-xs">Point camera at a QR to connect</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 backdrop-blur-xl border border-white/[0.15]"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(60, 60, 60, 0.8)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(42, 42, 42, 0.7)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.color = '';
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 relative bg-black overflow-hidden mx-4 mb-4 rounded-3xl">
                <QRScanner
                    onScan={(decodedText) => {
                        console.log("Scanned:", decodedText);
                        try {
                            const url = new URL(decodedText);
                            const connectId = url.searchParams.get('connect');
                            if (connectId) {
                                onScanConnect(connectId);
                                onClose();
                            }
                        } catch (e) {
                            if (decodedText.length > 5 && !decodedText.includes('http')) {
                                onScanConnect(decodedText);
                                onClose();
                            }
                        }
                    }}
                />

                {/* Corner brackets only - no circular overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 sm:w-64 sm:h-64 relative">
                        {/* Top Left corner */}
                        <svg className="absolute top-0 left-0 w-14 h-14 text-white" viewBox="0 0 56 56" fill="none">
                            <path d="M4 56V16C4 9.37258 9.37258 4 16 4H56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        {/* Top Right corner */}
                        <svg className="absolute top-0 right-0 w-14 h-14 text-white" viewBox="0 0 56 56" fill="none">
                            <path d="M0 4H40C46.6274 4 52 9.37258 52 16V56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        {/* Bottom Left corner */}
                        <svg className="absolute bottom-0 left-0 w-14 h-14 text-white" viewBox="0 0 56 56" fill="none">
                            <path d="M56 52H16C9.37258 52 4 46.6274 4 40V0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        {/* Bottom Right corner */}
                        <svg className="absolute bottom-0 right-0 w-14 h-14 text-white" viewBox="0 0 56 56" fill="none">
                            <path d="M0 52H40C46.6274 52 52 46.6274 52 40V0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>

                        {/* Scanning line */}
                        <div className="absolute left-4 right-4 h-0.5 bg-white animate-scan rounded-full" />
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="p-4 shrink-0">
                {/* Toggle Button */}
                <button
                    onClick={() => setShowMyQR(!showMyQR)}
                    className="w-full rounded-2xl p-4 backdrop-blur-xl border border-white/[0.15] flex items-center gap-4"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(50, 50, 50, 0.8)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(42, 42, 42, 0.7)';
                        e.currentTarget.style.borderColor = '';
                    }}
                >
                    {/* QR Preview or Icon */}
                    <div className="w-14 h-14 bg-white rounded-[12px] flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
                        {showMyQR && qrUrl ? (
                            <AnimatedQRCode
                                value={qrUrl}
                                bgColor="#ffffff"
                                fgColor="#1a1a1a"
                                className="w-12 h-12 rounded-[8px]"
                            />
                        ) : (
                            <QrCode size={24} className="text-neutral-400" />
                        )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 text-left">
                        <p className="text-neutral-200 text-base font-semibold">
                            {showMyQR ? getDeviceName(myPeerId) : 'Show My QR Code'}
                        </p>
                        <p className="text-zinc-500 text-sm">
                            {showMyQR ? 'Tap to hide' : 'Let others scan to connect'}
                        </p>
                    </div>

                    {/* Expand indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${showMyQR ? 'rotate-180' : ''}`}
                        style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-neutral-400">
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </button>

                {/* Expanded QR Section */}
                <div className={`overflow-hidden transition-all duration-300 ease-out ${showMyQR ? 'max-h-[26rem] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="rounded-2xl p-6 backdrop-blur-xl border border-white/[0.15] flex flex-col items-center"
                        style={{ background: 'rgba(42, 42, 42, 0.7)' }}>
                        <div className="w-52 h-52 sm:w-56 sm:h-56 bg-white rounded-[28px] sm:rounded-[32px] p-2 mb-4"
                            style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)' }}>
                            {qrUrl ? (
                                <AnimatedQRCode
                                    value={qrUrl}
                                    bgColor="#ffffff"
                                    fgColor="#1a1a1a"
                                    className="w-full h-full rounded-[20px] sm:rounded-[24px]"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-200 rounded-[20px] sm:rounded-[24px] animate-pulse" />
                            )}
                        </div>
                        <p className="text-neutral-200 text-lg font-semibold">{getDeviceName(myPeerId)}</p>
                        <p className="text-zinc-500 text-sm mt-1">Scan this code to connect</p>
                    </div>
                </div>
            </div>

            {/* Scanning animation keyframes */}
            <style>{`
                @keyframes scan {
                    0%, 100% { top: 16px; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: calc(100% - 16px); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default ConnectModal;
