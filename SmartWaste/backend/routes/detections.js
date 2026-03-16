import express from 'express';
import Detection from '../Models/Detection.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Helper functions
const calculateSeverity = (width, height, frameHeight, frameWidth) => {
  const detectionArea = width * height;
  const frameArea = frameHeight * frameWidth;
  const coveragePercentage = (detectionArea / frameArea) * 100;

  if (coveragePercentage >= 20) return "High";
  if (coveragePercentage >= 10) return "Medium";
  return "Low";
};

const calculatePriority = (className, severity) => {
  const classPriority = {
    spills: "High",
    garbage: "Medium",
    bin: "Low"
  };

  const basePriority = classPriority[className.toLowerCase()] || "Low";
  const priorityLevels = { High: 3, Medium: 2, Low: 1 };

  return priorityLevels[severity] > priorityLevels[basePriority] ? severity : basePriority;
};

// CREATE detection with Cloudinary upload
router.post('/detections', async (req, res) => {
  try {
    const {
      detectedClass,
      x1, y1, x2, y2,
      confidenceScore,
      frameHeight = 640,
      frameWidth = 640,
      latitude = null,
      longitude = null,
      cameraId = 'CAM1',
      imageData // Base64 image data
    } = req.body;

    const centerX = (parseFloat(x1) + parseFloat(x2)) / 2;
    const centerY = (parseFloat(y1) + parseFloat(y2)) / 2;
    const width = parseFloat(x2) - parseFloat(x1);
    const height = parseFloat(y2) - parseFloat(y1);
    const detectionSize = width * height;
    const coveragePercentage = (detectionSize / (frameHeight * frameWidth)) * 100;

    const severity = calculateSeverity(width, height, frameHeight, frameWidth);
    const priority = calculatePriority(detectedClass, severity);
    const department = detectedClass.toLowerCase() !== "spills" ? "cleaning" : "spill";
    const location = `${cameraId}-${Math.round(centerX)}-${Math.round(centerY)}`;

    // Upload image to Cloudinary
    let imageUrl = null;
    let cloudinaryPublicId = null;
    let uploadWarning = null;

    if (imageData) {
      try {
        const uploadResult = await cloudinary.uploader.upload(imageData, {
          folder: 'waste-detection',
          resource_type: 'image',
          public_id: `detection_${Date.now()}`,
          transformation: [
            { width: 1280, height: 720, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });

        imageUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
        console.log(`✅ Image uploaded to Cloudinary: ${imageUrl}`);
      } catch (uploadError) {
        console.error('⚠️ Cloudinary upload failed:', uploadError.message);
        uploadWarning = `Image upload failed: ${uploadError.message}. Detection saved without image.`;
        // Continue without image - don't fail the entire request
      }
    }

    const detectionData = {
      size: detectionSize,
      department,
      severity,
      priority,
      location,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      assigned: false,
      assignedWorker: null,
      processing: false,
      status: "Incomplete",
      description: `Detected ${detectedClass} with ${parseFloat(confidenceScore).toFixed(2)} confidence.`,
      imagePath: imageUrl || `detection_${Date.now()}.jpg`, // Cloudinary URL or fallback
      cloudinaryPublicId, // Store for potential deletion later
      locationDetails: {
        x: centerX,
        y: centerY,
        width,
        height,
        coveragePercentage
      },
      confidenceScore: parseFloat(confidenceScore),
      detectedClass,
      cameraId
    };

    const savedDetection = await new Detection(detectionData).save();

    console.log(`✅ Detection stored with ID: ${savedDetection._id}`);

    const response = {
      success: true,
      id: savedDetection._id,
      data: savedDetection,
      message: `Detection stored successfully`
    };

    // Add warning if image upload failed
    if (uploadWarning) {
      response.warning = uploadWarning;
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('❌ Error storing detection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// READ all detections with filters
router.get('/detections', async (req, res) => {
  try {
    const {
      status = null,
      assigned = null,
      department = null,
      severity = null,
      priority = null,
      limit = 50,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (assigned !== null) filter.assigned = assigned === 'true';
    if (department) filter.department = department;
    if (severity) filter.severity = severity;
    if (priority) filter.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const detections = await Detection.find(filter).sort(sort).skip(skip).limit(parseInt(limit));
    const total = await Detection.countDocuments(filter);

    res.json({
      success: true,
      data: detections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching detections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// READ by ID
router.get('/detections/:id', async (req, res) => {
  try {
    const detection = await Detection.findById(req.params.id);
    if (!detection) return res.status(404).json({ success: false, message: 'Detection not found' });
    res.json({ success: true, data: detection });
  } catch (error) {
    console.error('Error fetching detection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE detection
router.put('/detections/:id', async (req, res) => {
  try {
    const { assigned, assignedWorker, processing, status } = req.body;
    const updateData = {};
    if (assigned !== undefined) updateData.assigned = assigned;
    if (assignedWorker !== undefined) updateData.assignedWorker = assignedWorker;
    if (processing !== undefined) updateData.processing = processing;
    if (status !== undefined) updateData.status = status;

    const detection = await Detection.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!detection) return res.status(404).json({ success: false, message: 'Detection not found' });

    res.json({ success: true, data: detection, message: 'Detection updated successfully' });
  } catch (error) {
    console.error('Error updating detection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE detection
router.delete('/detections/:id', async (req, res) => {
  try {
    const detection = await Detection.findByIdAndDelete(req.params.id);
    if (!detection) return res.status(404).json({ success: false, message: 'Detection not found' });

    // Delete image from Cloudinary if it exists
    if (detection.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(detection.cloudinaryPublicId);
        console.log(`✅ Deleted image from Cloudinary: ${detection.cloudinaryPublicId}`);
      } catch (cloudinaryError) {
        console.log('Could not delete image from Cloudinary:', cloudinaryError.message);
      }
    }

    res.json({ success: true, message: 'Detection deleted successfully' });
  } catch (error) {
    console.error('Error deleting detection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ANALYTICS: summary stats
router.get('/detections/stats/summary', async (req, res) => {
  try {
    const stats = await Detection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          assigned: { $sum: { $cond: ['$assigned', 1, 0] } },
          unassigned: { $sum: { $cond: ['$assigned', 0, 1] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          incomplete: { $sum: { $cond: [{ $eq: ['$status', 'Incomplete'] }, 1, 0] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } },
          mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'Medium'] }, 1, 0] } },
          lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'Low'] }, 1, 0] } },
          avgConfidence: { $avg: '$confidenceScore' }
        }
      }
    ]);

    const departmentStats = await Detection.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgSeverity: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$severity', 'High'] }, then: 3 },
                  { case: { $eq: ['$severity', 'Medium'] }, then: 2 },
                  { case: { $eq: ['$severity', 'Low'] }, then: 1 }
                ]
              }
            }
          }
        }
      }
    ]);

    const classStats = await Detection.aggregate([
      {
        $group: {
          _id: '$detectedClass',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidenceScore' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {},
        byDepartment: departmentStats,
        byClass: classStats
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
