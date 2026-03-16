import React, { useState, useRef, useEffect, useCallback } from 'react';

// Flask API URL — override via VITE_ROBOFLOW_API_URL env var for production
const FLASK_API_URL = import.meta.env.VITE_ROBOFLOW_API_URL || 'http://localhost:5001';

export default function CameraDetection({ isOpen, onClose }) {
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'running' | 'error' | 'denied' | 'no-server'
    const [detections, setDetections] = useState([]);
    const [stream, setStream] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [taskStats, setTaskStats] = useState({ created: 0 });

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const isSendingRef = useRef(false); // Prevent concurrent requests

    // ─────────────────────────────────────────
    // Check if multiple cameras exist
    // ─────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1);
            } catch {
                setHasMultipleCameras(false);
            }
        })();
    }, [isOpen]);

    // ─────────────────────────────────────────
    // Health check + camera start on open
    // ─────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            checkServerAndStart();
        }
        return () => {
            stopAll();
        };
    }, [isOpen]);

    const stopAll = useCallback(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setStream(null);
        isSendingRef.current = false;
    }, []);

    const checkServerAndStart = async () => {
        setStatus('loading');
        setErrorMsg('');
        try {
            const res = await fetch(`${FLASK_API_URL}/health`, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('Server not OK');
            // Reset dedup cache for fresh session
            await fetch(`${FLASK_API_URL}/reset-dedup`, { method: 'POST' });
            await startCamera(facingMode);
        } catch {
            setStatus('no-server');
            setErrorMsg(`Cannot reach the Flask server at ${FLASK_API_URL}. Start it with: python app.py`);
        }
    };

    // ─────────────────────────────────────────
    // Camera
    // ─────────────────────────────────────────
    const startCamera = useCallback(async (mode) => {
        // Stop previous stream
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }

        const constraints = {
            video: {
                facingMode: { ideal: mode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
            audio: false,
        };

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = mediaStream;
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().then(() => {
                        setStatus('running');
                        // Send a frame every 500 ms (respects Roboflow rate limit)
                        intervalRef.current = setInterval(captureAndDetect, 500);
                    });
                };
            }
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setStatus('denied');
            } else if (err.name === 'NotFoundError') {
                setStatus('error');
                setErrorMsg('No camera found on this device.');
            } else {
                // Fallback: simplest possible constraints
                try {
                    const fallback = await navigator.mediaDevices.getUserMedia({ video: true });
                    streamRef.current = fallback;
                    setStream(fallback);
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallback;
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current.play().then(() => {
                                setStatus('running');
                                intervalRef.current = setInterval(captureAndDetect, 500);
                            });
                        };
                    }
                } catch {
                    setStatus('error');
                    setErrorMsg('Failed to access camera: ' + err.message);
                }
            }
        }
    }, []);

    const switchCamera = async () => {
        const next = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(next);
        await startCamera(next);
    };

    // ─────────────────────────────────────────
    // Capture frame → POST to Flask → draw
    // ─────────────────────────────────────────
    const captureAndDetect = useCallback(async () => {
        if (isSendingRef.current) return; // skip if previous request still in flight
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!video.videoWidth || !video.videoHeight) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame (mirror for front camera)
        if (facingMode === 'user') {
            ctx.save(); ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();
        } else {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // Convert to base64 JPEG (quality 0.7 → smaller payload)
        const base64Image = canvas.toDataURL('image/jpeg', 0.7);

        isSendingRef.current = true;
        try {
            const response = await fetch(`${FLASK_API_URL}/detect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image }),
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            const preds = result.predictions || [];
            setDetections(preds);

            // Redraw frame + bounding boxes
            if (facingMode === 'user') {
                ctx.save(); ctx.scale(-1, 1);
                ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                ctx.restore();
            } else {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            drawDetections(ctx, preds, canvas.width, canvas.height);

            // Update saved count
            if (result.saved > 0) {
                setTaskStats(prev => ({ created: prev.created + result.saved }));
            }
        } catch (err) {
            // Non-fatal: just skip this frame
            console.warn('Detection request failed:', err.message);
        } finally {
            isSendingRef.current = false;
        }
    }, [facingMode]);

    // Keep the interval's closure fresh when facingMode changes
    useEffect(() => {
        if (status !== 'running') return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(captureAndDetect, 500);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [captureAndDetect, status]);

    // ─────────────────────────────────────────
    // Draw bounding boxes
    // ─────────────────────────────────────────
    const drawDetections = (ctx, predictions, w, h) => {
        predictions.forEach(pred => {
            const { bbox, class: cls, confidence } = pred;
            if (!bbox) return;

            // Use normalized coords from Flask API
            const x = bbox.xn * w;
            const y = bbox.yn * h;
            const bw = bbox.wn * w;
            const bh = bbox.hn * h;

            const color = cls === 'spills' ? '#E74C3C' : cls === 'garbage' ? '#F39C12' : '#1E8449';

            // Box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, bw, bh);

            // Label background
            const label = `${cls}  ${(confidence * 100).toFixed(0)}%`;
            ctx.font = 'bold 14px sans-serif';
            const tw = ctx.measureText(label).width;
            const labelY = y > 28 ? y - 28 : y;
            ctx.fillStyle = color;
            ctx.fillRect(x, labelY, tw + 12, 26);

            // Label text
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x + 6, labelY + 17);
        });
    };

    // ─────────────────────────────────────────
    // Close
    // ─────────────────────────────────────────
    const handleClose = () => {
        stopAll();
        setDetections([]);
        setErrorMsg('');
        setStatus('idle');
        setTaskStats({ created: 0 });
        onClose();
    };

    if (!isOpen) return null;

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ touchAction: 'none' }}>

            {/* ── Header ── */}
            <div className="flex justify-between items-center px-4 py-3 bg-neutral-900/95 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${status === 'running' ? 'bg-red-500 animate-pulse' : 'bg-neutral-500'}`} />
                    <h2 className="text-base font-bold text-white">Waste Detection</h2>
                    <span className="text-xs bg-[#1E8449]/20 text-[#1E8449] border border-[#1E8449]/30 px-2 py-0.5 rounded-full">
                        Roboflow AI
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {hasMultipleCameras && status === 'running' && (
                        <button
                            onClick={switchCamera}
                            className="p-2 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
                            title="Switch Camera"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full bg-neutral-700 hover:bg-red-600 text-white transition-colors"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Camera area ── */}
            <div className="relative flex-1 bg-black overflow-hidden">

                {/* Loading */}
                {status === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
                        <div className="text-white text-center px-6">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1E8449] border-t-transparent mx-auto mb-4" />
                            <p className="text-lg font-medium">Connecting to AI Server…</p>
                            <p className="text-gray-400 text-sm mt-1">Checking Roboflow + Camera</p>
                        </div>
                    </div>
                )}

                {/* No server */}
                {status === 'no-server' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10 px-6">
                        <div className="text-white text-center max-w-sm">
                            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Flask Server Offline</h3>
                            <p className="text-gray-400 text-sm mb-3">{errorMsg}</p>
                            <pre className="text-xs bg-neutral-800 rounded-lg px-4 py-3 text-left text-green-400 mb-5 whitespace-pre-wrap">
                                cd Model{'\n'}python app.py
                            </pre>
                            <button
                                onClick={checkServerAndStart}
                                className="px-6 py-3 bg-[#1E8449] hover:bg-[#1E8449]/90 text-white font-medium rounded-lg transition-colors"
                            >
                                Retry Connection
                            </button>
                        </div>
                    </div>
                )}

                {/* Permission denied */}
                {status === 'denied' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10 px-6">
                        <div className="text-white text-center max-w-sm">
                            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Camera Access Denied</h3>
                            <p className="text-gray-400 text-sm mb-5">Allow camera access in your browser settings then try again.</p>
                            <button onClick={checkServerAndStart} className="px-6 py-3 bg-[#1E8449] hover:bg-[#1E8449]/90 text-white font-medium rounded-lg transition-colors">
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Generic error */}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10 px-6">
                        <div className="text-white text-center max-w-sm">
                            <p className="text-red-400 mb-4">{errorMsg}</p>
                            <button onClick={checkServerAndStart} className="px-6 py-3 bg-[#1E8449] text-white rounded-lg">Retry</button>
                        </div>
                    </div>
                )}

                {/* Video */}
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    autoPlay
                    muted
                    style={{
                        display: stream ? 'block' : 'none',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                    }}
                />

                {/* Detection canvas overlay */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ display: stream ? 'block' : 'none' }}
                />

                {/* Task stats */}
                {stream && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 z-10 text-xs">
                        <p className="text-white font-semibold mb-0.5">Saved to DB</p>
                        <p className="text-[#1E8449] font-bold text-base">{taskStats.created}</p>
                    </div>
                )}

                {/* Detection badges */}
                {detections.length > 0 && stream && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pb-5 pt-10 z-10">
                        <p className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">Detected Now</p>
                        <div className="flex flex-wrap gap-2">
                            {detections.map((d, i) => {
                                const color = d.class === 'spills'
                                    ? 'bg-red-500' : d.class === 'garbage'
                                        ? 'bg-yellow-500' : 'bg-[#1E8449]';
                                return (
                                    <span key={i} className={`${color} text-white px-3 py-1 rounded-full text-xs font-medium capitalize`}>
                                        {d.class} — {(d.confidence * 100).toFixed(0)}%
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Scanning indicator when running but no detections */}
                {status === 'running' && detections.length === 0 && stream && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-gray-300 text-xs">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                            Scanning for waste…
                        </div>
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 bg-neutral-900/95 px-4 py-2.5 text-center">
                <p className="text-gray-500 text-xs">
                    Powered by Roboflow AI • Saves to MongoDB • Works on mobile
                </p>
            </div>
        </div>
    );
}
