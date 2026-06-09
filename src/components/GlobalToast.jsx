import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import useAppStore from '../stores/useAppStore';

const GlobalToast = () => {
    const { toastMessage, setToastMessage } = useAppStore();

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage, setToastMessage]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none px-4">
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center gap-3 px-6 py-6 rounded-[28px] bg-[#202020]/95 backdrop-blur-xl border border-red-500/20 shadow-2xl w-full max-w-[280px] pointer-events-auto text-center"
                    >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-1 shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <p className="text-zinc-200 text-sm font-medium w-full">
                            {toastMessage}
                        </p>
                        <button
                            onClick={() => setToastMessage(null)}
                            className="mt-2 w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors shrink-0 text-sm font-medium"
                        >
                            Close
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalToast;
