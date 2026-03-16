import React, { useRef, useEffect, useState } from "react";

function WasteDetectionExactSchema() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [session, setSession] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [detectedSites, setDetectedSites] = useState(new Set());
  const [dbStats, setDbStats] = useState({ total: 0, recent: 0, pending: 0 });
  const [apiEndpoint] = useState('https://smartwatemobile-1.onrender.com/api/task'); // Change to your API URL
  const [tasks, setTasks] = useState([]);
  const detectionLoopRef = useRef(null);

  const addLog = (message) => {
    console.log(message);
    setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Load ONNX model
  useEffect(() => {
    const loadModel = async () => {
      try {
        addLog('Checking ONNX Runtime availability...');

        if (typeof ort === 'undefined') {
          throw new Error("ONNX Runtime not loaded. Add script tag to HTML.");
        }

        addLog('Configuring ONNX Runtime...');
        ort.env.wasm.wasmPaths = "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.16.3/";

        addLog('Loading model from /waste_detection.onnx...');

        const model = await ort.InferenceSession.create("/waste_detection.onnx", {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        });

        const inputs = model.inputNames;
        const outputs = model.outputNames;

        addLog(`Model loaded successfully!`);
        setModelInfo({ inputs, outputs });
        setSession(model);

      } catch (err) {
        addLog(`Model loading failed: ${err.message}`);
        setError(`Failed to load model: ${err.message}. Please ensure waste_detection.onnx is available.`);
      }
    };

    loadModel();
  }, []);

  // Calculate severity exactly matching Python logic
  const calculateSeverity = (width, height, frameHeight, frameWidth) => {
    const detectionArea = width * height;
    const frameArea = frameHeight * frameWidth;
    const coveragePercentage = (detectionArea / frameArea) * 100;

    if (coveragePercentage >= 20) return "High";
    if (coveragePercentage >= 10) return "Medium";
    return "Low";
  };

  // Calculate priority exactly matching Python logic
  const calculatePriority = (className, severity) => {
    const classPriority = {
      "spills": "High",
      "garbage": "Medium",
      "bin": "Low"
    };

    const basePriority = classPriority[className.toLowerCase()] || "Low";
    const priorityLevels = { "High": 3, "Medium": 2, "Low": 1 };

    return priorityLevels[severity] > priorityLevels[basePriority] ? severity : basePriority;
  };

  // Get GPS coordinates
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
          addLog(`GPS error: ${error.message}`);
          resolve({ latitude: null, longitude: null });
        },
        { timeout: 5000 }
      );
    });
  };

  // Store detection using exact API format
  const storeDetection = async (detectionPayload) => {
    try {
      addLog('📤 Sending detection to API...');

      const formData = new FormData();

      // Add all fields matching the API endpoint
      Object.keys(detectionPayload).forEach(key => {
        if (key === 'imageBlob') {
          formData.append('image', detectionPayload[key], detectionPayload.imagePath);
        } else if (typeof detectionPayload[key] === 'object' && detectionPayload[key] !== null) {
          formData.append(key, JSON.stringify(detectionPayload[key]));
        } else {
          formData.append(key, detectionPayload[key]);
        }
      });

      const response = await fetch(`${apiEndpoint}/detections`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        addLog(`✅ Detection stored with ID: ${result.id}`);
        setDbStats(prev => ({
          total: prev.total + 1,
          recent: prev.recent + 1,
          pending: prev.pending + 1
        }));

        // Add to local tasks list
        const newTask = {
          id: result.id,
          class: detectionPayload.detectedClass,
          priority: detectionPayload.priority,
          status: 'Incomplete',
          location: detectionPayload.location,
          timestamp: new Date().toISOString()
        };
        setTasks(prev => [newTask, ...prev.slice(0, 9)]);

        return result;
      } else {
        throw new Error(result.error || 'API request failed');
      }

    } catch (error) {
      addLog(`❌ Database storage failed: ${error.message}`);
      throw error;
    }
  };

  // Log detection with exact Python data structure
  const logDetection = async (className, x1, y1, x2, y2, canvas, score) => {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const key = `${Math.floor(centerX / 50)}_${Math.floor(centerY / 50)}`;

    // Avoid duplicate detections in same area (same as Python)
    if (detectedSites.has(key)) {
      return;
    }

    setDetectedSites(prev => new Set([...prev, key]));
    addLog(`⚠️ Problem detected at approx. location (x=${centerX.toFixed(0)}, y=${centerY.toFixed(0)})`);

    // Capture image as blob for upload
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

    // Generate filename matching Python format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').substring(0, 19);
    const filename = `problem_detected_${timestamp}.jpg`;

    addLog(`📸 Screenshot captured: ${filename}`);

    // Get frame dimensions
    const frameHeight = canvas.height;
    const frameWidth = canvas.width;

    // Calculate all values using exact Python logic
    const width = x2 - x1;
    const height = y2 - y1;
    const detectionSize = width * height;
    const coveragePercentage = (detectionSize / (frameHeight * frameWidth)) * 100;

    const severity = calculateSeverity(width, height, frameHeight, frameWidth);
    const priority = calculatePriority(className, severity);

    // Department assignment exactly matching Python
    const department = className.toLowerCase() !== "spills" ? "cleaning" : "spill";

    // Location string exactly matching Python format
    const cameraId = 'CAM1';
    const location = `${cameraId}-${Math.round(centerX)}-${Math.round(centerY)}`;

    // Get GPS coordinates
    const gpsCoords = await getGPSCoordinates();

    // Create detection payload matching exact Python structure
    const detectionPayload = {
      // API endpoint parameters
      detectedClass: className,
      x1: x1.toString(),
      y1: y1.toString(),
      x2: x2.toString(),
      y2: y2.toString(),
      confidenceScore: score.toString(),
      frameHeight: frameHeight.toString(),
      frameWidth: frameWidth.toString(),
      latitude: gpsCoords.latitude?.toString() || null,
      longitude: gpsCoords.longitude?.toString() || null,
      cameraId: cameraId,
      imageData: imageData,
      imagePath: filename,
      imageBlob: imageBlob,

      // These will be calculated by the backend to match Python exactly:
      size: detectionSize,
      department: department,
      severity: severity,
      priority: priority,
      location: location,
      assigned: false,
      assignedWorker: null,
      processing: false,
      status: "Incomplete",
      description: `Detected ${className} with ${score.toFixed(2)} confidence.`,
      locationDetails: {
        x: centerX,
        y: centerY,
        width: width,
        height: height,
        coveragePercentage: coveragePercentage
      }
    };

    // Store in database
    await storeDetection(detectionPayload);
  };

  // Load recent stats on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/detections/stats/summary`);
        const result = await response.json();

        if (result.success) {
          setDbStats({
            total: result.data.overall.total || 0,
            recent: 0,
            pending: result.data.overall.incomplete || 0
          });
          addLog('✅ Loaded existing database statistics');
        }
      } catch (error) {
        addLog('ℹ️ Could not load existing stats from database');
      }
    };

    loadStats();
  }, [apiEndpoint]);

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      addLog('Requesting camera access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'environment'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          addLog('Camera stream ready, starting video...');
          videoRef.current.play().then(() => {
            addLog('Video started successfully');
            setIsStreaming(true);
            setTimeout(() => {
              startDetectionLoop();
            }, 100);
          });
        };
      }
    } catch (err) {
      addLog(`Camera error: ${err.message}`);
      setError("Camera access failed. Please allow camera permissions.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    addLog('Camera stopped');
    if (detectionLoopRef.current?.stop) {
      detectionLoopRef.current.stop();
    }
  };

  // Detection loop
  const startDetectionLoop = () => {
    let frameCount = 0;
    let shouldContinue = true;

    const detect = async () => {
      frameCount++;

      if (frameCount % 60 === 0) {
        addLog(`Detection loop running - frame ${frameCount}`);
      }

      const hasSession = !!session;
      const hasVideo = !!videoRef.current;
      const videoHasStream = !!(videoRef.current?.srcObject);

      if (!shouldContinue || !hasSession || !hasVideo || !videoHasStream) {
        addLog(`Detection stopped - Continue: ${shouldContinue}, Session: ${hasSession}, Video: ${hasVideo}, Stream: ${videoHasStream}`);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !ctx) {
        addLog('Detection stopped - no canvas');
        return;
      }

      const readyState = videoRef.current.readyState;

      if (readyState >= 2) {
        try {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          // Only run real inference - no mock mode
          await runInference(ctx, canvas);
        } catch (err) {
          addLog(`Inference error: ${err.message}`);
        }
      }

      if (shouldContinue && hasSession && hasVideo && videoHasStream) {
        detectionLoopRef.current = requestAnimationFrame(detect);
      }
    };

    detectionLoopRef.current = {
      stop: () => {
        shouldContinue = false;
        addLog('Detection loop stopped by request');
      }
    };

    detect();
  };

  // ONNX inference
  const runInference = async (ctx, canvas) => {
    try {
      const imgData = ctx.getImageData(0, 0, 640, 640);
      const input = preprocessImageForYOLO(imgData);
      const inputName = session.inputNames[0];
      const tensor = new ort.Tensor("float32", input, [1, 3, 640, 640]);
      const feeds = { [inputName]: tensor };
      const results = await session.run(feeds);
      await processYOLOOutput(ctx, canvas, results);
    } catch (err) {
      addLog(`Inference failed: ${err.message}`);
      throw err;
    }
  };

  // Image preprocessing
  const preprocessImageForYOLO = (imgData) => {
    const { data } = imgData;
    const input = new Float32Array(3 * 640 * 640);

    for (let y = 0; y < 640; y++) {
      for (let x = 0; x < 640; x++) {
        const pixelIndex = (y * 640 + x) * 4;
        const outputIndex = y * 640 + x;

        input[outputIndex] = data[pixelIndex] / 255.0;
        input[outputIndex + 640 * 640] = data[pixelIndex + 1] / 255.0;
        input[outputIndex + 640 * 640 * 2] = data[pixelIndex + 2] / 255.0;
      }
    }

    return input;
  };

  // Process YOLO output with database storage
  const processYOLOOutput = async (ctx, canvas, results) => {
    const outputName = session.outputNames[0];
    const output = results[outputName];

    if (!output) return;

    const shape = output.dims;
    const data = output.data;

    const classNames = ["bin", "garbage", "spills"];
    const colors = ["#00ff00", "#ff9900", "#ff0000"];

    let detections = [];

    // Process different output formats
    if (shape.length === 3) {
      const [batch, values, numDetections] = shape;
      if (values < numDetections) {
        detections = processYOLOv8TransposedFormat(data, numDetections, values);
      } else {
        detections = processYOLOFormat(data, numDetections, values);
      }
    }

    // Filter valid detections
    const confidenceThreshold = 0.5;
    const validDetections = detections.filter(det =>
      det.confidence > confidenceThreshold &&
      det.classId >= 0 &&
      det.classId < classNames.length
    );

    if (validDetections.length > 0) {
      addLog(`Found ${validDetections.length} detections above ${confidenceThreshold} confidence`);

      for (const det of validDetections) {
        const { x, y, w, h, confidence, classId } = det;

        const x1 = Math.max(0, (x - w / 2) * 640);
        const y1 = Math.max(0, (y - h / 2) * 640);
        const width = Math.min(640 - x1, w * 640);
        const height = Math.min(640 - y1, h * 640);

        if (width <= 0 || height <= 0) continue;

        // Draw bounding box
        ctx.lineWidth = 4;
        ctx.strokeStyle = colors[classId];
        ctx.fillStyle = colors[classId];
        ctx.strokeRect(x1, y1, width, height);

        const label = `${classNames[classId]}: ${(confidence * 100).toFixed(1)}%`;
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = 20;

        ctx.fillStyle = colors[classId] + '90';
        ctx.fillRect(x1, y1 - textHeight - 2, textWidth + 8, textHeight + 4);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(label, x1 + 4, y1 - 6);

        // Log detection to database
        if (confidence >= 0.0) {
          await logDetection(classNames[classId], x1, y1, x1 + width, y1 + height, canvas, confidence);
        }
      }
    }
  };

  // Format processors
  const processYOLOv8TransposedFormat = (data, numDetections, numValues) => {
    const detections = [];
    for (let i = 0; i < numDetections; i++) {
      const x = data[0 * numDetections + i];
      const y = data[1 * numDetections + i];
      const w = data[2 * numDetections + i];
      const h = data[3 * numDetections + i];

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
        x: x / 640, y: y / 640, w: w / 640, h: h / 640,
        confidence: maxClassConf, classId: bestClass
      });
    }
    return detections;
  };

  const processYOLOFormat = (data, numDetections, values) => {
    const detections = [];
    for (let i = 0; i < numDetections; i++) {
      const base = i * values;
      const x = data[base], y = data[base + 1], w = data[base + 2], h = data[base + 3];
      const objConf = data[base + 4];

      let maxClassConf = 0, bestClass = 0;
      const maxClasses = Math.min(3, values - 5);
      for (let j = 0; j < maxClasses; j++) {
        const classConf = data[base + 5 + j];
        if (classConf > maxClassConf) {
          maxClassConf = classConf;
          bestClass = j;
        }
      }

      detections.push({
        x, y, w, h, confidence: objConf * maxClassConf, classId: bestClass
      });
    }
    return detections;
  };

  // Get priority color for UI
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-orange-600 bg-orange-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Smart Waste Detection with Task Database</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            disabled={!session}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg"
          >
            {session ? "Start Detection" : "Loading Model..."}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg"
          >
            Stop Detection
          </button>
        )}

        <button
          onClick={() => {
            setDebugLog([]);
            setDetectedSites(new Set());
            setDbStats({ total: 0, recent: 0, pending: 0 });
            setTasks([]);
          }}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
        >
          Clear Session Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Display */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              width="640"
              height="640"
              className="relative z-10 w-full h-full"
            />
          </div>

          {/* Database Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{dbStats.total}</div>
              <div className="text-sm text-gray-600">Total Detected</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{dbStats.recent}</div>
              <div className="text-sm text-gray-600">This Session</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{dbStats.pending}</div>
              <div className="text-sm text-gray-600">Pending Tasks</div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent Tasks */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-3">Recent Detection Tasks</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No tasks detected yet
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-3 bg-white rounded border text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold capitalize">{task.class}</span>
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="text-gray-600 mb-1">{task.location}</div>
                    <div className="text-gray-500">
                      {new Date(task.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Log */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">System Log</h3>
            <div className="text-xs font-mono bg-black text-green-400 p-3 rounded max-h-48 overflow-y-auto">
              {debugLog.length === 0 ? (
                <div>System ready...</div>
              ) : (
                debugLog.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}


export default WasteDetectionExactSchema;
