import mongoose from 'mongoose';

const locationDetailsSchema = new mongoose.Schema({
  x: {
    type: Number,
    required: true,
    description: "Center X coordinate of detection"
  },
  y: {
    type: Number,
    required: true,
    description: "Center Y coordinate of detection"
  },
  width: {
    type: Number,
    required: true,
    description: "Width of detection bounding box"
  },
  height: {
    type: Number,
    required: true,
    description: "Height of detection bounding box"
  },
  coveragePercentage: {
    type: Number,
    required: true,
    description: "Percentage of frame covered by detection"
  }
}, { _id: false });

const detectionSchema = new mongoose.Schema({
  size: {
    type: Number,
    required: true,
    description: "Detection area in pixels (width * height)"
  },
  department: {
    type: String,
    required: true,
    enum: ['cleaning', 'spill'],
    description: "Department responsible for handling"
  },
  severity: {
    type: String,
    required: true,
    enum: ['High', 'Medium', 'Low'],
    description: "Severity level based on size coverage"
  },
  priority: {
    type: String,
    required: true,
    enum: ['High', 'Medium', 'Low'],
    description: "Priority level based on class and severity"
  },
  location: {
    type: String,
    required: true,
    description: "Camera location string (e.g., CAM1-250-320)"
  },
  latitude: {
    type: Number,
    default: null,
    description: "GPS latitude coordinate"
  },
  longitude: {
    type: Number,
    default: null,
    description: "GPS longitude coordinate"
  },
  assigned: {
    type: Boolean,
    default: false,
    description: "Whether task is assigned to a worker"
  },
  assignedWorker: {
    type: String,
    default: null,
    description: "ID or name of assigned worker"
  },
  processing: {
    type: Boolean,
    default: false,
    description: "Whether task is currently being processed"
  },
  status: {
    type: String,
    default: 'Incomplete',
    enum: ['Incomplete', 'In Progress', 'Completed', 'Cancelled'],
    description: "Current status of the task"
  },
  description: {
    type: String,
    required: true,
    description: "Detailed description with class and confidence"
  },
  imagePath: {
    type: String,
    required: true,
    description: "Cloudinary URL or path of captured image"
  },
  cloudinaryPublicId: {
    type: String,
    description: "Cloudinary public ID for image management"
  },
  imageData: {
    type: String,
    description: "Base64 encoded image data (for web storage)"
  },
  locationDetails: {
    type: locationDetailsSchema,
    required: true,
    description: "Detailed location information"
  },
  confidenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    description: "Model confidence score (0-1)"
  },
  detectedClass: {
    type: String,
    required: true,
    enum: ['bin', 'garbage', 'spills'],
    description: "Detected object class"
  },
  cameraId: {
    type: String,
    default: 'CAM1',
    description: "Camera identifier"
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  collection: 'tasks'
});

// Indexes for better query performance
detectionSchema.index({ createdAt: -1 });
detectionSchema.index({ assigned: 1 });
detectionSchema.index({ status: 1 });
detectionSchema.index({ severity: 1, priority: 1 });
detectionSchema.index({ department: 1 });
detectionSchema.index({ location: 1 });

const Detection = mongoose.model('Detection', detectionSchema);

export default Detection;
