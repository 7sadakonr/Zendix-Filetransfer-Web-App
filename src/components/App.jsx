import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';
import GlobalToast from './GlobalToast';

// Lazy Load Pages
const loadConnectPage = () => import('../pages/ConnectPage');
const loadTransferPage = () => import('../pages/TransferPage');
const ConnectPage = lazy(loadConnectPage);
const TransferPage = lazy(loadTransferPage);

// Loading Fallback
// Loading Fallback
const LoadingScreen = ({ isExiting = false }) => (
    <div
        className={`fixed inset-0 z-[100] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pt-[calc(2rem+env(safe-area-inset-top))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))] bg-[#1a1a1a] transition-[opacity,transform,filter] duration-500 ease-out ${isExiting ? 'opacity-0 scale-[1.015] blur-[2px] pointer-events-none' : 'opacity-100 scale-100 blur-0'} overflow-hidden font-['Inter']`}
    >
        <div className="fixed top-0 left-0 w-full h-[env(safe-area-inset-top)] bg-[#1a1a1a] z-50 pointer-events-none" />
        <div className="fixed inset-0 pointer-events-none">
            <div
                className="absolute top-[-10%] left-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                style={{ background: 'radial-gradient(circle, rgba(120, 120, 120, 0.09) 0%, transparent 70%)' }}
            />
            <div
                className="absolute top-[60%] right-[-10%] w-[60vw] min-w-[300px] aspect-square rounded-full opacity-20 blur-[80px] sm:blur-[100px]"
                style={{ background: 'radial-gradient(circle, rgba(96, 96, 96, 0.08) 0%, transparent 70%)' }}
            />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full max-h-full my-auto">
            {/* Mobile Segmented Tab Switcher Skeleton */}
            <div className="flex md:hidden w-full max-w-[350px] bg-[#2a2a2a]/90 backdrop-blur-xl p-1 rounded-2xl border border-white/[0.12] mb-3 shrink-0 shadow-lg items-center">
                <div className="flex-1 py-2 px-3 rounded-xl bg-white/20 h-7 loading-card-shimmer" />
                <div className="w-1.5" />
                <div className="flex-1 py-2 px-3 rounded-xl bg-black/20 h-7 loading-card-shimmer loading-card-shimmer-delay" />
            </div>

            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-8 w-full max-w-[350px] md:max-w-[740px] lg:max-w-[820px] justify-center items-stretch">
                {/* Left Card - Identity */}
                <div
                    className="relative rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] p-5 sm:p-6 lg:p-8 w-full md:w-[350px] lg:w-[380px] h-[430px] sm:h-[460px] md:h-[490px] lg:h-[510px] flex flex-col backdrop-blur-2xl border border-white/[0.15] overflow-hidden shadow-2xl shrink-0"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <div className="relative z-[2] flex flex-col flex-1 min-h-0">
                        {/* Header */}
                        <div className="relative flex justify-between items-center shrink-0">
                            <div className="h-5 sm:h-6 w-28 sm:w-36 rounded-lg bg-black/20 loading-card-shimmer" />
                            <div className="h-4 sm:h-5 w-10 sm:w-14 rounded-full bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                        </div>

                        {/* Divider */}
                        <div
                            className="relative w-full h-px my-3 sm:my-4 shrink-0"
                            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }}
                        />

                        {/* Center QR Box */}
                        <div className="relative flex-1 flex flex-col items-center justify-center min-h-0">
                            <div className="w-36 h-36 sm:w-40 sm:h-40 lg:w-44 lg:h-44 rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] bg-white/10 loading-card-shimmer shrink-0" />
                            <div className="mt-3 sm:mt-4 h-5 sm:h-6 w-28 sm:w-36 rounded-md bg-black/20 loading-card-shimmer loading-card-shimmer-delay shrink-0" />
                        </div>

                        {/* Bottom Section */}
                        <div className="relative mt-auto shrink-0">
                            <div
                                className="w-full h-px my-3 sm:my-4 shrink-0"
                                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }}
                            />
                            <div className="flex justify-between items-center min-h-[56px] sm:min-h-[64px] px-3 sm:px-4 py-2">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 h-2.5 sm:h-3 w-16 sm:w-20 rounded bg-black/20 loading-card-shimmer" />
                                    <div className="h-4 sm:h-5 w-28 sm:w-36 rounded bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                                </div>
                                <div className="h-7 sm:h-8 w-7 sm:w-8 rounded-lg bg-black/20 loading-card-shimmer shrink-0" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Card - Connect (Hidden on Mobile, Visible on Desktop) */}
                <div
                    className="relative rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] p-5 sm:p-6 lg:p-8 w-full md:w-[350px] lg:w-[380px] h-[430px] sm:h-[460px] md:h-[490px] lg:h-[510px] hidden md:flex flex-col backdrop-blur-2xl border border-white/[0.15] overflow-hidden shadow-2xl shrink-0"
                    style={{
                        background: 'rgba(42, 42, 42, 0.7)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <div className="relative z-[2] flex flex-col flex-1 min-h-0">
                        {/* Header */}
                        <div className="relative flex justify-between items-center shrink-0">
                            <div className="h-5 sm:h-6 w-32 sm:w-40 rounded-lg bg-black/20 loading-card-shimmer shrink-0" />
                        </div>

                        {/* Divider */}
                        <div
                            className="relative w-full h-px my-3 sm:my-4 shrink-0"
                            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }}
                        />

                        {/* Input Field */}
                        <div className="relative mb-3 shrink-0">
                            <div className="mb-1.5 h-2.5 sm:h-3 w-16 sm:w-20 rounded bg-black/20 loading-card-shimmer" />
                            <div className="h-[42px] sm:h-[48px] w-full rounded-xl bg-white/10 loading-card-shimmer loading-card-shimmer-delay" />
                        </div>

                        {/* Connect Button */}
                        <div className="mb-3 sm:mb-4 h-[42px] sm:h-[48px] w-full rounded-xl bg-white/20 loading-card-shimmer shrink-0" />

                        {/* OR Divider */}
                        <div className="relative flex items-center gap-2 sm:gap-3 mb-3 shrink-0">
                            <div className="flex-1 h-px bg-white/10" />
                            <div className="h-3 w-6 rounded bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Scan Button */}
                        <div className="h-[42px] sm:h-[48px] w-full rounded-xl bg-[#3a3a3a] loading-card-shimmer shrink-0" />

                        {/* Bottom Hint */}
                        <div className="relative mt-auto shrink-0">
                            <div
                                className="w-full h-px my-3 sm:my-4 shrink-0"
                                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' }}
                            />
                            <div className="px-3 py-2 min-h-[56px] sm:min-h-[64px] flex items-center justify-center">
                                <div className="h-3.5 sm:h-4 w-48 sm:w-56 rounded bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route
                    path="/"
                    element={
                        <motion.div
                            initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                            exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full w-full"
                        >
                            <ConnectPage />
                        </motion.div>
                    }
                />
                <Route
                    path="/transfer"
                    element={
                        <motion.div
                            initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                            exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full w-full"
                        >
                            <TransferPage />
                        </motion.div>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AnimatePresence>
    );
};

function App() {
    const [bootPhase, setBootPhase] = useState('visible');

    // Initialize peer connection at app level
    usePeerConnection();

    useEffect(() => {
        let cancelled = false;
        let exitTimer;

        Promise.all([
            loadConnectPage(),
            loadTransferPage(),
            new Promise((resolve) => window.setTimeout(resolve, 900)),
        ]).then(() => {
            if (cancelled) return;
            setBootPhase('exiting');
            exitTimer = window.setTimeout(() => {
                if (!cancelled) {
                    setBootPhase('hidden');
                }
            }, 420);
        });

        return () => {
            cancelled = true;
            if (exitTimer) window.clearTimeout(exitTimer);
        };
    }, []);

    // Handle Web Share Target API payload
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('share') === '1') {
            const title = params.get('title') || '';
            const text = params.get('text') || '';
            const url = params.get('url') || '';

            const sharedContent = [title, text, url].filter(Boolean).join('\n');

            if (sharedContent) {
                const newItem = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    text: sharedContent,
                    timestamp: Date.now(),
                    fromDevice: 'THIS DEVICE'
                };
                useAppStore.getState().addClipboardItem(newItem);

                // If connected, auto-send.
                const conns = useAppStore.getState().activeConnections;
                if (conns && conns.length > 0) {
                    conns.forEach(conn => {
                        if (conn.open) {
                            conn.send({
                                type: 'CLIPBOARD',
                                payload: {
                                    text: sharedContent,
                                    timestamp: Date.now(),
                                    fromDevice: 'THIS DEVICE'
                                }
                            });
                        }
                    });
                }
            }

            // Cleanup URL visually
            const urlObj = new URL(window.location);
            urlObj.searchParams.delete('share');
            urlObj.searchParams.delete('title');
            urlObj.searchParams.delete('text');
            urlObj.searchParams.delete('url');
            window.history.replaceState({}, document.title, urlObj.pathname + urlObj.search);
        }
    }, []);

    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
                <AnimatedRoutes />
            </Suspense>

            <GlobalToast />

            {bootPhase !== 'hidden' && <LoadingScreen isExiting={bootPhase === 'exiting'} />}
        </BrowserRouter>
    );
}

export default App;
