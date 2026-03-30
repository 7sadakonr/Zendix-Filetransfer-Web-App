import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';

// Lazy Load Pages
const loadConnectPage = () => import('../pages/ConnectPage');
const loadTransferPage = () => import('../pages/TransferPage');
const ConnectPage = lazy(loadConnectPage);
const TransferPage = lazy(loadTransferPage);

// Loading Fallback
const LoadingScreen = ({ isExiting = false }) => (
    <div
        className={`fixed inset-0 flex flex-col md:flex-row md:items-center md:justify-center px-4 sm:px-6 lg:px-8 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pt-[calc(2rem+env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-[max(2rem,env(safe-area-inset-bottom))] overflow-hidden bg-[#1a1a1a] transition-[opacity,transform,filter] duration-500 ease-out ${isExiting ? 'opacity-0 scale-[1.015] blur-[2px]' : 'opacity-100 scale-100 blur-0'}`}
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

        <div className="relative z-10 flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-8 w-full max-w-[560px] lg:max-w-[800px] h-full md:h-auto justify-center items-stretch mx-auto">
            <div
                className="relative rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-8 w-full md:w-[280px] lg:w-[380px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden loading-card-shimmer"
                style={{
                    background: 'rgba(42, 42, 42, 0.7)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
            >
                <div className="relative z-[2] flex flex-col flex-1 min-h-0">
                    <div className="relative flex justify-between items-center shrink-0">
                        <div className="h-6 w-36 rounded-full bg-black/20 loading-card-shimmer" />
                        <div className="h-5 w-14 rounded-full bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                    </div>

                    <div
                        className="relative w-full h-px my-3 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)' }}
                    />

                    <div className="relative flex-1 flex flex-col items-center justify-center min-h-0">
                        <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-2xl sm:rounded-3xl bg-black/20 loading-card-shimmer shrink-0" />
                        <div className="mt-3 sm:mt-4 h-7 w-40 sm:w-44 rounded-full bg-black/20 loading-card-shimmer loading-card-shimmer-delay shrink-0" />
                    </div>

                    <div
                        className="relative w-full h-px my-3 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)' }}
                    />

                    <div className="relative flex items-center justify-between gap-4 shrink-0">
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 h-2.5 w-20 rounded-full bg-black/20 loading-card-shimmer" />
                            <div className="h-5 w-full max-w-[180px] rounded-full bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-black/20 loading-card-shimmer shrink-0" />
                    </div>
                </div>
            </div>

            <div
                className="relative rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] p-4 sm:p-5 lg:p-8 w-full md:w-[280px] lg:w-[380px] flex flex-col flex-1 md:flex-none min-h-0 backdrop-blur-2xl border border-white/[0.15] overflow-hidden loading-card-shimmer loading-card-shimmer-delay"
                style={{
                    background: 'rgba(42, 42, 42, 0.7)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
            >
                <div className="relative z-[2] flex flex-col flex-1 min-h-0">
                    <div className="h-6 w-40 rounded-full bg-black/20 loading-card-shimmer shrink-0" />

                    <div
                        className="relative w-full h-px my-3 sm:my-4 shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)' }}
                    />

                    <div className="relative mb-2 sm:mb-3 shrink-0">
                        <div className="mb-2 h-2.5 w-16 rounded-full bg-black/20 loading-card-shimmer" />
                        <div className="h-[46px] w-full rounded-lg bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                    </div>

                    <div className="mb-3 sm:mb-4 h-[46px] w-full rounded-lg bg-black/20 loading-card-shimmer shrink-0" />

                    <div className="relative flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 shrink-0">
                        <div className="flex-1 h-px bg-white/10" />
                        <div className="h-3 w-8 rounded-full bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <div className="h-[46px] w-full rounded-lg bg-black/20 loading-card-shimmer shrink-0" />

                    <div className="relative flex-1 flex items-end min-h-0">
                        <div className="mx-auto mb-1 h-4 w-52 rounded-full bg-black/20 loading-card-shimmer loading-card-shimmer-delay" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

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
                <Routes>
                    <Route path="/" element={<ConnectPage />} />
                    <Route path="/transfer" element={<TransferPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>

            {bootPhase !== 'hidden' && <LoadingScreen isExiting={bootPhase === 'exiting'} />}
        </BrowserRouter>
    );
}

export default App;
