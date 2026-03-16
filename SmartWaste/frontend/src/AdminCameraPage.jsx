import React, { useState, useRef, useEffect } from 'react';
import * as ort from 'onnxruntime-web';
import { Camera, Activity, CheckCircle, Clock } from 'lucide-react';

export default function AdminCameraPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [detections, setDetections] = useState([]);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [stream, setStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const sessionRef = useRef(null);
    const animationFrameRef = useRef(null);

    // ONNX Model configuration
    const MODEL_INPUT_SIZE = 640;
    const CONFIDENCE_THRESHOLD = 0.5;
    const IOU_THRESHOLD = 0.45;

    // Waste categories
    const CLASSES = ['bin', 'garbage', 'spills'];

    // Track detected sites
    const detectedSitesRef = useRef(new Set());
    const [taskStats, setTaskStats] = useState({ total: 0, pending: 0 });

    // Fetch task statistics from database
    const fetchTaskStats = async () => {
        try {
            const response = await fetch('https://smartwatemobile-1.onrender.com/api/task/detections/stats/summary');
            const result = await response.json();

            if (result.success && result.data.overall) {
                const { total = 0, incomplete = 0 } = result.data.overall;
                setTaskStats({
                    total: total,
                    pending: incomplete
                });
            }
        } catch (error) {
            console.error('Error fetching task stats:', error);
        }
    };

    // Load ONNX model
    const loadModel = async () => {
        try {
            setIsLoading(true);
            setError(null);

            ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
            const modelPath = '/waste_detection.onnx';

            try {
                console.log('Loading ONNX model from:', modelPath);
                const session = await ort.InferenceSession.create(modelPath);
                sessionRef.current = session;
                setModelLoaded(true);
                console.log('✅ Model loaded successfully!');
            } catch (modelError) {
                console.warn('⚠️ Model file not found. Running in demo mode.');
                setError('Model not found. Running in demo mode with simulated detections.');
                setModelLoaded(true);
            }

            setIsLoading(false);
        } catch (err) {
            console.error('Error loading model:', err);
            setError('Failed to load detection model. Running in demo mode.');
            setIsLoading(false);
            setModelLoaded(true);
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            setStream(mediaStream);
            setCameraActive(true);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    detectObjects();
                };
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Failed to access camera. Please ensure camera permissions are granted.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setStream(null);
        setCameraActive(false);
        setDetections([]);
    };

    const preprocessImage = (imageData) => {
        const { data, width, height } = imageData;
        const input = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);

        for (let y = 0; y < MODEL_INPUT_SIZE; y++) {
            for (let x = 0; x < MODEL_INPUT_SIZE; x++) {
                const srcX = Math.floor(x * width / MODEL_INPUT_SIZE);
                const srcY = Math.floor(y * height / MODEL_INPUT_SIZE);
                const srcIdx = (srcY * width + srcX) * 4;

                input[y * MODEL_INPUT_SIZE + x] = data[srcIdx] / 255.0;
                input[MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + y * MODEL_INPUT_SIZE + x] = data[srcIdx + 1] / 255.0;
                input[2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + y * MODEL_INPUT_SIZE + x] = data[srcIdx + 2] / 255.0;
            }
        }

        return input;
    };

    const detectObjects = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (sessionRef.current) {
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const inputTensor = preprocessImage(imageData);
                const tensor = new ort.Tensor('float32', inputTensor, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
                const feeds = { images: tensor };
                const results = await sessionRef.current.run(feeds);

                const output = results[Object.keys(results)[0]];
                const detectedObjects = processDetections(output, canvas.width, canvas.height);

                setDetections(detectedObjects);
                drawDetections(ctx, detectedObjects);

                if (detectedObjects.length > 0) {
                    for (const detection of detectedObjects) {
                        await createTask(detection, canvas);
                    }
                }
            } catch (err) {
                console.error('Detection error:', err);
            }
        } else {
            const demoDetections = generateDemoDetections();
            setDetections(demoDetections);
            drawDetections(ctx, demoDetections);
        }

        animationFrameRef.current = requestAnimationFrame(detectObjects);
    };

    const generateDemoDetections = () => {
        if (Math.random() > 0.7) {
            return [{
                class: CLASSES[Math.floor(Math.random() * CLASSES.length)],
                confidence: 0.85 + Math.random() * 0.15,
                bbox: {
                    x: Math.random() * 0.5,
                    y: Math.random() * 0.5,
                    width: 0.2 + Math.random() * 0.2,
                    height: 0.2 + Math.random() * 0.2
                }
            }];
        }
        return [];
    };

    const processDetections = (output, canvasWidth, canvasHeight) => {
        if (!output || !output.data) return [];

        const shape = output.dims;
        const data = output.data;
        let rawDetections = [];

        if (shape.length === 3) {
            const [batch, values, numDetections] = shape;
            if (values < numDetections) {
                rawDetections = processYOLOv8TransposedFormat(data, numDetections, values);
            } else {
                rawDetections = processYOLOStandardFormat(data, numDetections, values);
            }
        }

        const validDetections = rawDetections.filter(det =>
            det.confidence > 0.8 &&
            det.classId >= 0 &&
            det.classId < CLASSES.length
        );

        const nmsDetections = applyNMS(validDetections, 0.45);

        return nmsDetections.map(det => ({
            class: CLASSES[det.classId],
            confidence: det.confidence,
            bbox: {
                x: Math.max(0, det.x - det.w / 2),
                y: Math.max(0, det.y - det.h / 2),
                width: det.w,
                height: det.h
            }
        }));
    };

    const applyNMS = (detections, iouThreshold) => {
        if (detections.length === 0) return [];

        const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
        const keep = [];

        while (sorted.length > 0) {
            const current = sorted.shift();
            keep.push(current);

            const remaining = [];
            for (const det of sorted) {
                if (det.classId !== current.classId) {
                    remaining.push(det);
                    continue;
                }

                const iou = calculateIOU(current, det);
                if (iou < iouThreshold) {
                    remaining.push(det);
                }
            }
            sorted.length = 0;
            sorted.push(...remaining);
        }

        return keep;
    };

    const calculateIOU = (box1, box2) => {
        const x1_min = box1.x - box1.w / 2;
        const y1_min = box1.y - box1.h / 2;
        const x1_max = box1.x + box1.w / 2;
        const y1_max = box1.y + box1.h / 2;

        const x2_min = box2.x - box2.w / 2;
        const y2_min = box2.y - box2.h / 2;
        const x2_max = box2.x + box2.w / 2;
        const y2_max = box2.y + box2.h / 2;

        const intersect_x_min = Math.max(x1_min, x2_min);
        const intersect_y_min = Math.max(y1_min, y2_min);
        const intersect_x_max = Math.min(x1_max, x2_max);
        const intersect_y_max = Math.min(y1_max, y2_max);

        const intersect_w = Math.max(0, intersect_x_max - intersect_x_min);
        const intersect_h = Math.max(0, intersect_y_max - intersect_y_min);
        const intersect_area = intersect_w * intersect_h;

        const box1_area = box1.w * box1.h;
        const box2_area = box2.w * box2.h;
        const union_area = box1_area + box2_area - intersect_area;

        return union_area > 0 ? intersect_area / union_area : 0;
    };

    const processYOLOv8TransposedFormat = (data, numDetections, numValues) => {
        const detections = [];

        for (let i = 0; i < numDetections; i++) {
            const x = data[0 * numDetections + i] / MODEL_INPUT_SIZE;
            const y = data[1 * numDetections + i] / MODEL_INPUT_SIZE;
            const w = data[2 * numDetections + i] / MODEL_INPUT_SIZE;
            const h = data[3 * numDetections + i] / MODEL_INPUT_SIZE;

            let maxClassConf = 0;
            let bestClass = 0;

            for (let j = 4; j < numValues && j < 7; j++) {
                const classConf = data[j * numDetections + i];
                if (classConf > maxClassConf) {
                    maxClassConf = classConf;
                    bestClass = j - 4;
                }
            }

            detections.push({
                x, y, w, h,
                confidence: maxClassConf,
                classId: bestClass
            });
        }

        return detections;
    };

    const processYOLOStandardFormat = (data, numDetections, values) => {
        const detections = [];

        for (let i = 0; i < numDetections; i++) {
            const base = i * values;

            const x = data[base] / MODEL_INPUT_SIZE;
            const y = data[base + 1] / MODEL_INPUT_SIZE;
            const w = data[base + 2] / MODEL_INPUT_SIZE;
            const h = data[base + 3] / MODEL_INPUT_SIZE;

            const objConf = values > 5 ? data[base + 4] : 1.0;

            let maxClassConf = 0;
            let bestClass = 0;
            const startIdx = values > 5 ? 5 : 4;
            const maxClasses = Math.min(3, values - startIdx);

            for (let j = 0; j < maxClasses; j++) {
                const classConf = data[base + startIdx + j];
                if (classConf > maxClassConf) {
                    maxClassConf = classConf;
                    bestClass = j;
                }
            }

            detections.push({
                x, y, w, h,
                confidence: objConf * maxClassConf,
                classId: bestClass
            });
        }

        return detections;
    };

    const drawDetections = (ctx, detections) => {
        detections.forEach(detection => {
            const { bbox, class: className, confidence } = detection;
            const x = bbox.x * ctx.canvas.width;
            const y = bbox.y * ctx.canvas.height;
            const width = bbox.width * ctx.canvas.width;
            const height = bbox.height * ctx.canvas.height;

            ctx.strokeStyle = '#1E8449';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            const label = `${className} ${(confidence * 100).toFixed(1)}%`;
            ctx.font = '16px Arial';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = '#1E8449';
            ctx.fillRect(x, y - 25, textWidth + 10, 25);

            ctx.fillStyle = 'white';
            ctx.fillText(label, x + 5, y - 7);
        });
    };

    const calculateSeverity = (bbox, canvasWidth, canvasHeight) => {
        const detectionArea = bbox.width * bbox.height * canvasWidth * canvasHeight;
        const frameArea = canvasWidth * canvasHeight;
        const coveragePercentage = (detectionArea / frameArea) * 100;

        if (coveragePercentage >= 20) return "High";
        if (coveragePercentage >= 10) return "Medium";
        return "Low";
    };

    const calculatePriority = (className, severity) => {
        const classPriority = {
            "spills": "High",
            "garbage": "Medium",
            "bin": "Low"
        };

        const basePriority = classPriority[className.toLowerCase()] || "Low";
        const priorityLevels = { "High": 3, "Medium": 2, "Low": 1 };

        return priorityLevels[severity] > priorityLevels[basePriority]
            ? severity
            : basePriority;
    };

    const getGPSCoordinates = async () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ latitude: null, longitude: null });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn('GPS error:', error.message);
                    resolve({ latitude: null, longitude: null });
                },
                { timeout: 5000, enableHighAccuracy: false }
            );
        });
    };

    const createTask = async (detection, canvas) => {
        try {
            const { class: className, confidence, bbox } = detection;

            const centerX = (bbox.x + bbox.width / 2) * canvas.width;
            const centerY = (bbox.y + bbox.height / 2) * canvas.height;

            const key = `${Math.floor(centerX / 50)}_${Math.floor(centerY / 50)}`;
            if (detectedSitesRef.current.has(key)) {
                return null;
            }

            detectedSitesRef.current.add(key);

            const severity = calculateSeverity(bbox, canvas.width, canvas.height);
            const priority = calculatePriority(className, severity);
            const gps = await getGPSCoordinates();

            const imageData = canvas.toDataURL('image/jpeg', 0.8);

            const x1 = bbox.x * canvas.width;
            const y1 = bbox.y * canvas.height;
            const x2 = (bbox.x + bbox.width) * canvas.width;
            const y2 = (bbox.y + bbox.height) * canvas.height;

            const taskData = {
                detectedClass: className,
                x1: x1.toString(),
                y1: y1.toString(),
                x2: x2.toString(),
                y2: y2.toString(),
                confidenceScore: confidence.toString(),
                frameHeight: canvas.height.toString(),
                frameWidth: canvas.width.toString(),
                latitude: gps.latitude?.toString() || '',
                longitude: gps.longitude?.toString() || '',
                cameraId: 'ADMIN_CAM',
                imageData: imageData
            };

            const response = await fetch(`https://smartwatemobile-1.onrender.com/api/task/detections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            const result = await response.json();

            if (result.success || response.ok) {
                console.log(`✅ Task created successfully`);
                // Refresh stats after creating a task
                fetchTaskStats();
                return result;
            }
        } catch (error) {
            console.error('❌ Task creation failed:', error);
            return null;
        }
    };

    useEffect(() => {
        loadModel();
        fetchTaskStats(); // Fetch initial stats

        // Set up interval to refresh stats every 30 seconds
        const statsInterval = setInterval(fetchTaskStats, 30000);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            clearInterval(statsInterval);
        };
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Camera className="w-8 h-8 text-[#1E8449]" />
                    Waste Detection Camera
                </h1>
                <p className="text-gray-400">Real-time AI-powered waste detection and monitoring</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Camera Status</p>
                            <p className="text-2xl font-bold mt-1">
                                {cameraActive ? (
                                    <span className="text-green-500">Active</span>
                                ) : (
                                    <span className="text-gray-500">Inactive</span>
                                )}
                            </p>
                        </div>
                        <Activity className={`w-8 h-8 ${cameraActive ? 'text-green-500' : 'text-gray-600'}`} />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Total Tasks</p>
                            <p className="text-2xl font-bold text-[#1E8449] mt-1">{taskStats.total}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-[#1E8449]" />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Pending Tasks</p>
                            <p className="text-2xl font-bold text-yellow-500 mt-1">{taskStats.pending}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
            </div>

            {/* Camera Controls */}
            <div className="mb-6">
                {!cameraActive ? (
                    <button
                        onClick={startCamera}
                        disabled={isLoading}
                        className="bg-[#1E8449] hover:bg-[#27ae60] text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Loading Model...' : 'Start Camera'}
                    </button>
                ) : (
                    <button
                        onClick={stopCamera}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                        Stop Camera
                    </button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 bg-yellow-500/20 border border-yellow-500 text-yellow-200 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {/* Camera Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Feed */}
                <div className="bg-neutral-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="bg-neutral-800 px-4 py-2 border-b border-gray-700">
                        <h3 className="font-semibold">Continuous Camera Feed</h3>
                    </div>
                    <div className="relative aspect-video bg-neutral-950">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                            autoPlay
                            style={{ display: cameraActive ? 'block' : 'none' }}
                        />
                        {!cameraActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <Camera className="w-16 h-16 mx-auto mb-2" />
                                    <p>Camera is off</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detection Canvas */}
                <div className="bg-neutral-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="bg-neutral-800 px-4 py-2 border-b border-gray-700">
                        <h3 className="font-semibold">Current Frame with Detections</h3>
                    </div>
                    <div className="relative aspect-video bg-neutral-950">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full object-cover"
                            style={{ display: cameraActive ? 'block' : 'none' }}
                        />
                        {!cameraActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <Activity className="w-16 h-16 mx-auto mb-2" />
                                    <p>No detections</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detection Info */}
            {detections.length > 0 && (
                <div className="mt-6 bg-neutral-900 border border-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Current Detections</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {detections.map((detection, index) => (
                            <div
                                key={index}
                                className="bg-[#1E8449] text-white px-4 py-3 rounded-md"
                            >
                                <div className="font-semibold capitalize">{detection.class}</div>
                                <div className="text-sm opacity-90">
                                    {(detection.confidence * 100).toFixed(1)}% confidence
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
