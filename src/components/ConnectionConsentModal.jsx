import { useEffect, useState } from 'react';
import { UserCheck, UserX, Shield, Clock } from 'lucide-react';
import clsx from 'clsx';

const CONSENT_TIMEOUT = 30; // seconds

const ConnectionConsentModal = ({ pending, onAccept, onReject }) => {
    const [timeLeft, setTimeLeft] = useState(CONSENT_TIMEOUT);

    useEffect(() => {
        if (!pending) return;

        setTimeLeft(CONSENT_TIMEOUT);

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onReject();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [pending, onReject]);

    if (!pending) return null;

    const progressPercent = (timeLeft / CONSENT_TIMEOUT) * 100;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
            <div
                className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#202020]/95 p-6 shadow-2xl animate-in"
                style={{
                    animation: 'consentSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Shield Icon */}
                <div className="flex justify-center mb-4">
                    <div className="relative p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Shield size={32} className="text-amber-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-pulse" />
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white text-center mb-1">
                    Incoming Connection
                </h3>
                <p className="text-sm text-zinc-400 text-center mb-5">
                    A device wants to connect to you
                </p>

                {/* Peer Info */}
                <div className="bg-white/5 rounded-2xl border border-white/[0.08] p-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <span className="text-cyan-400 text-sm font-bold">
                                {(pending.peerId || '?')[0].toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {pending.deviceName || pending.peerId}
                            </p>
                            {pending.peerId !== pending.deviceName && (
                                <p className="text-xs text-zinc-500 font-mono truncate">
                                    {pending.peerId}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Timeout Progress */}
                <div className="flex items-center gap-2 mb-5">
                    <Clock size={12} className="text-zinc-500 shrink-0" />
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={clsx(
                                "h-full rounded-full transition-all duration-1000 ease-linear",
                                timeLeft > 10 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className={clsx(
                        "text-xs font-mono tabular-nums",
                        timeLeft > 10 ? "text-zinc-500" : "text-red-400"
                    )}>
                        {timeLeft}s
                    </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onReject}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-sm font-medium"
                    >
                        <UserX size={16} />
                        Reject
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-all text-sm font-semibold"
                        style={{
                            boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                        }}
                    >
                        <UserCheck size={16} />
                        Accept
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes consentSlideIn {
                    0% {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
};

export default ConnectionConsentModal;
