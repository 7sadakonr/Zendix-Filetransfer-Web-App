import { X, Loader2 } from 'lucide-react';

const ConnectionWaitingModal = ({ status, onCancel, peerId }) => {
    if (status !== 'connecting_peer' && status !== 'awaiting_accept' && status !== 'connecting') return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
            <div
                className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#202020]/95 p-6 shadow-2xl flex flex-col items-center"
                style={{
                    animation: 'consentSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Spinner */}
                <div className="relative p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
                    <Loader2 size={32} className="text-cyan-400 animate-spin" />
                    <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping opacity-20" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white text-center mb-1">
                    {status === 'connecting_peer' ? 'Connecting' : 'Waiting for Peer'}
                </h3>
                <p className="text-sm text-zinc-400 text-center mb-6">
                    {status === 'connecting_peer' ? (
                        <>Establishing connection to {peerId ? <span className="text-white font-mono">{peerId}</span> : 'peer'}...</>
                    ) : (
                        <>Waiting for {peerId ? <span className="text-white font-mono">{peerId}</span> : 'peer'} to accept connection...</>
                    )}
                </p>

                {/* Cancel Button */}
                <button
                    onClick={onCancel}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all text-sm font-medium duration-[250ms] ease-out-quint"
                >
                    <X size={16} />
                    Cancel
                </button>
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

export default ConnectionWaitingModal;
