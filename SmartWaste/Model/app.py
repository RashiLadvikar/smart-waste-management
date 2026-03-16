import os
import io
import base64
import time
import tempfile
import geocoder
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from roboflow import Roboflow

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = Flask(__name__)

# Allow requests from local dev and any deployed frontend
CORS(app, resources={r"/*": {"origins": "*"}})

# ─────────────────────────────────────────────
# MongoDB connection
# ─────────────────────────────────────────────
mongo_uri = os.environ.get("MONGO_URI", "mongodb+srv://root:root@cluster0.ik1za.mongodb.net/")
client = MongoClient(mongo_uri)
db = client["SmartWaste"]
collection = db["tasks"]

# ─────────────────────────────────────────────
# Roboflow model (loaded once at startup)
# ─────────────────────────────────────────────
print("Initializing Roboflow client...")
rf = Roboflow(api_key=os.environ.get("ROBOFLOW_API_KEY", "OnGIwp43w9s3C9lPMInc"))
project = rf.workspace().project("smartwaste-jp5l5")
model = project.version(1).model
print("✅ Roboflow model loaded successfully!")

# ─────────────────────────────────────────────
# In-memory dedup tracker (resets on server restart)
# ─────────────────────────────────────────────
detected_sites = {}


# ─────────────────────────────────────────────
# Helpers (same logic as original app.py)
# ─────────────────────────────────────────────

def calculate_severity(x1, y1, x2, y2, frame_height, frame_width):
    detection_area = (x2 - x1) * (y2 - y1)
    frame_area = frame_height * frame_width
    pct = (detection_area / frame_area) * 100
    if pct >= 20:
        return "High"
    elif pct >= 10:
        return "Medium"
    return "Low"


def calculate_priority(class_name, severity):
    class_priority = {
        "spills": "High",
        "garbage": "Medium",
        "bin": "Low",
        "trash": "Low",
    }
    base = class_priority.get(class_name.lower(), "Low")
    levels = {"High": 3, "Medium": 2, "Low": 1}
    return severity if levels.get(severity, 1) > levels.get(base, 1) else base


def get_gps_coordinates():
    try:
        g = geocoder.ip("me")
        if g.latlng:
            return g.latlng[0], g.latlng[1]
    except Exception:
        pass
    return None, None


def log_detection(class_name, x1, y1, x2, y2, frame_height, frame_width, score, image_b64=None):
    """Save detection to MongoDB (deduplicates by location key)."""
    global detected_sites
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    key = (int(center_x / 50), int(center_y / 50))

    if key in detected_sites:
        return None  # duplicate

    detected_sites[key] = True
    print(f"⚠️  New detection '{class_name}' at (x={center_x:.0f}, y={center_y:.0f})")

    severity = calculate_severity(x1, y1, x2, y2, frame_height, frame_width)
    priority = calculate_priority(class_name, severity)
    detection_size = (x2 - x1) * (y2 - y1)
    latitude, longitude = get_gps_coordinates()

    # Save frame image to disk (matches original behaviour)
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    filename = f"problem_detected_{timestamp}.jpg"
    if image_b64:
        try:
            img_bytes = base64.b64decode(image_b64.split(",")[-1])
            with open(filename, "wb") as f:
                f.write(img_bytes)
            print(f"📸 Screenshot saved: {filename}")
        except Exception as e:
            print(f"Warning: could not save screenshot: {e}")

    record = {
        "size": detection_size,
        "department": "spill" if class_name.lower() == "spills" else "cleaning",
        "severity": severity,
        "priority": priority,
        "location": f"CAM1-{center_x:.0f}-{center_y:.0f}",
        "latitude": latitude,
        "longitude": longitude,
        "assigned": False,
        "assignedWorker": None,
        "processing": False,
        "status": "Incomplete",
        "description": f"Detected {class_name} with {score:.2f} confidence.",
        "imagePath": filename,
        "locationDetails": {
            "x": center_x,
            "y": center_y,
            "width": x2 - x1,
            "height": y2 - y1,
            "coveragePercentage": (detection_size / (frame_height * frame_width)) * 100
        },
        "confidenceScore": score,
        "createdAt": datetime.now(),
    }

    result = collection.insert_one(record)
    print(f"✅ Detection stored in MongoDB: {result.inserted_id}")
    return str(result.inserted_id)


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Simple health check — confirms server and model are up."""
    return jsonify({"status": "ok", "model": "loaded"}), 200


@app.route("/detect", methods=["POST"])
def detect():
    """
    Accepts a JSON body:
        { "image": "<base64 data-url or raw base64 JPEG>" }
    Returns:
        { "predictions": [...], "count": N, "saved": M }
    """
    data = request.get_json(force=True, silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "Missing 'image' field in JSON body"}), 400

    image_b64 = data["image"]

    # Strip data-URL prefix if present  (e.g.  "data:image/jpeg;base64,/9j/...")
    raw_b64 = image_b64.split(",")[-1]

    # Decode to bytes and write to a temp file for Roboflow
    try:
        img_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        return jsonify({"error": f"Invalid base64 image: {e}"}), 400

    # Use a named temp file so Roboflow SDK can open it by path
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(img_bytes)
        tmp_path = tmp.name

    try:
        results = model.predict(tmp_path, confidence=40, overlap=30).json()
    except Exception as e:
        os.unlink(tmp_path)
        return jsonify({"error": f"Roboflow inference failed: {e}"}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    predictions = results.get("predictions", [])
    saved_count = 0

    # Roboflow may return width/height as strings — cast to int to be safe
    frame_width  = int(results.get("image", {}).get("width",  640) or 640)
    frame_height = int(results.get("image", {}).get("height", 480) or 480)

    formatted = []
    for p in predictions:
        class_name = p.get("class", "unknown")
        confidence = p.get("confidence", 0) / 100  # Roboflow gives 0-100
        cx = p.get("x", 0)
        cy = p.get("y", 0)
        pw = p.get("width", 0)
        ph = p.get("height", 0)

        x1 = int(cx - pw / 2)
        y1 = int(cy - ph / 2)
        x2 = int(cx + pw / 2)
        y2 = int(cy + ph / 2)

        formatted.append({
            "class": class_name,
            "confidence": round(confidence, 4),
            "bbox": {
                "x1": x1, "y1": y1,
                "x2": x2, "y2": y2,
                # Normalised 0-1 values for easy canvas drawing
                "xn": max(0, x1 / frame_width),
                "yn": max(0, y1 / frame_height),
                "wn": pw / frame_width,
                "hn": ph / frame_height,
            }
        })

        # Log qualifying detections to MongoDB
        if class_name.lower() in ["bin", "garbage", "spills", "trash"] and confidence >= 0.0:
            mongo_id = log_detection(
                class_name, x1, y1, x2, y2,
                frame_height, frame_width, confidence,
                image_b64
            )
            if mongo_id:
                saved_count += 1
                formatted[-1]["mongoId"] = mongo_id

    return jsonify({
        "predictions": formatted,
        "count": len(formatted),
        "saved": saved_count,
    }), 200


@app.route("/reset-dedup", methods=["POST"])
def reset_dedup():
    """Clears the in-memory dedup tracker. Useful when starting a new session."""
    global detected_sites
    detected_sites = {}
    return jsonify({"status": "dedup cache cleared"}), 200


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 Starting SmartWaste Detection API on port {port}...")
    print(f"   Health check: http://localhost:{port}/health")
    print(f"   Detect:       POST http://localhost:{port}/detect")
    # host='0.0.0.0' makes it reachable from mobile on the same WiFi
    app.run(host="0.0.0.0", port=port, debug=False)
