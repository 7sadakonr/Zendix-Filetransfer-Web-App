import { useEffect, useRef, useState, useCallback } from 'react';


const QRScanner = ({ onScan }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const animationRef = useRef(null);

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasScanned, setHasScanned] = useState(false);
    
    const isScanningRef = useRef(false);

    const stopCamera = useCallback(() => {
        isScanningRef.current = false;
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const scanQRCode = useCallback(() => {
        if (hasScanned || !isScanningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            if (isScanningRef.current) {
                animationRef.current = requestAnimationFrame(scanQRCode);
            }
            return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Dynamic import
        import('jsqr').then(jsQRModule => {
            if (!isScanningRef.current) return;
            
            const jsQR = jsQRModule.default;
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert"
            });

            if (code && code.data) {
                setHasScanned(true);
                isScanningRef.current = false;
                if (onScan) onScan(code.data);
            }

            // Loop only if not scanned (or keep scanning? Logic says stop if scanned)
            if (!code || !code.data) {
                if (isScanningRef.current) {
                    animationRef.current = requestAnimationFrame(scanQRCode);
                }
            }
        });

    }, [onScan, hasScanned]);

    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                // iOS Safari requires these specific constraints
                const constraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (!mounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    // iOS Safari needs these attributes
                    videoRef.current.setAttribute('playsinline', 'true');
                    videoRef.current.setAttribute('webkit-playsinline', 'true');
                    videoRef.current.muted = true;

                    await videoRef.current.play();

                    setIsLoading(false);
                    isScanningRef.current = true;
                    scanQRCode();
                }
            } catch (err) {
                console.error('Camera error:', err);
                if (!mounted) return;

                const msg = err.message || String(err);
                if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                    setError('Camera permission denied. Please allow camera access.');
                } else if (msg.includes('NotFound')) {
                    setError('No camera found on this device.');
                } else if (msg.includes('NotReadable') || msg.includes('in use')) {
                    setError('Camera is being used by another app.');
                } else {
                    setError('Camera error: ' + msg);
                }
                setIsLoading(false);
            }
        };

        startCamera();

        return () => {
            mounted = false;
            stopCamera();
        };
    }, [scanQRCode, stopCamera]);

    // Check secure context
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return (
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-200 text-center">
                <p className="font-bold mb-2">HTTPS Required</p>
                <p className="text-sm">Camera only works on HTTPS. Check your URL.</p>
            </div>
        );
    }

    return (
        <>
            {/* Video fills entire parent */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                webkit-playsinline="true"
                muted
                autoPlay
                style={{
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)'
                }}
            />

            {/* Hidden canvas for QR processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Loading state */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                    <div className="w-10 h-10 border-4 border-stone-600 border-t-white rounded-full animate-spin mb-3" />
                    <span className="text-stone-400 text-sm">Opening Camera...</span>
                </div>
            )}

            {/* Success state */}
            {hasScanned && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold">
                        ✓ QR Code Detected!
                    </div>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-200 text-center">
                        <p className="font-bold mb-1">Camera Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default QRScanner;
