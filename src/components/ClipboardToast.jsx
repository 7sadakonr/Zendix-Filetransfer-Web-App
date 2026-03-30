import { Check, ClipboardCopy, Sparkles, X } from 'lucide-react';

const ClipboardToast = ({ pendingItem, onConfirm, onCancel }) => {
    if (!pendingItem) return null;

    return (
        <div className="fixed inset-x-0 bottom-4 sm:bottom-6 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
            <div
                className="pointer-events-auto toast-card-enter w-full max-w-md rounded-[26px] border border-white/[0.14] p-4 sm:p-5 backdrop-blur-2xl overflow-hidden"
                style={{
                    background: 'rgba(42, 42, 42, 0.82)',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
            >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-300/75">
                            <Sparkles size={12} />
                            Clipboard Window
                        </div>
                        <h4 className="mt-2 flex items-center gap-2 text-base font-semibold text-white">
                            <ClipboardCopy size={16} className="text-cyan-300" />
                            Ready to copy
                        </h4>
                        <p className="mt-1 text-xs text-zinc-400">
                            From {pendingItem.fromDevice}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-zinc-500 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                        aria-label="Close clipboard popup"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="rounded-[22px] border border-white/[0.08] bg-[#202020]/90 p-3 sm:p-4">
                    <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                        Preview
                    </div>
                    <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-6 text-zinc-200 custom-scrollbar">
                        {pendingItem.text}
                    </p>
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <button
                        onClick={onConfirm}
                        className="flex-1 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_30px_rgba(255,255,255,0.14)] active:scale-[0.99]"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Check size={16} />
                            Copy to this device
                        </span>
                    </button>
                    <button
                        onClick={onCancel}
                        className="rounded-[18px] border border-white/[0.12] px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-white/[0.2] hover:text-zinc-200"
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClipboardToast;
