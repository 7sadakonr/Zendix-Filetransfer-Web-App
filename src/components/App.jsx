import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { usePeerConnection } from '../hooks/usePeerConnection';
import useAppStore from '../stores/useAppStore';

// Lazy Load Pages
const ConnectPage = lazy(() => import('../pages/ConnectPage'));
const TransferPage = lazy(() => import('../pages/TransferPage'));

// Loading Fallback
const LoadingScreen = () => (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6 overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
            <div
                className="absolute top-[-12%] left-[-10%] w-[60vw] min-w-[320px] aspect-square rounded-full opacity-20 blur-[100px]"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)' }}
            />
            <div
                className="absolute bottom-[-18%] right-[-8%] w-[50vw] min-w-[260px] aspect-square rounded-full opacity-25 blur-[100px]"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.16) 0%, transparent 72%)' }}
            />
        </div>

        <div className="relative flex flex-col items-center gap-5">
            <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="liquid-shell" />
                <div className="liquid-shell-delay" />
                <div className="liquid-core">
                    <div className="liquid-blob liquid-blob-a" />
                    <div className="liquid-blob liquid-blob-b" />
                    <div className="liquid-blob liquid-blob-c" />
                    <div className="liquid-highlight" />
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm font-medium tracking-[0.24em] text-zinc-500 uppercase">
                    Loading
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                    Preparing your transfer space
                </p>
            </div>
        </div>
    </div>
);

function App() {
    // Initialize peer connection at app level
    usePeerConnection();

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
        </BrowserRouter>
    );
}

export default App;
