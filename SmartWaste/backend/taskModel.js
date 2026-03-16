// taskModel.js
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  size: { type: Number, required: true }, // Size of the task (could be in square meters or other units)
  department: { type: String, enum: ['cleaning', 'spill'], required: true }, // Department related to the task
  severity: { type: String, enum: ['High', 'Medium', 'Low'], required: true }, // Severity of the task
  priority: { type: String, enum: ['High', 'Medium', 'Low'], required: true }, // Priority of the task
  location: { type: String, required: true }, // Location of the task (e.g., CAM1, CAM2, Floor)
  assigned: { type: Boolean, default: false }, // Indicates if the task has been assigned to a worker
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }, // Reference to the assigned worker
  processing: { type: Boolean, default: false }, // Flag to indicate if task is currently being processed
  status: { type: String, enum: ['In Progress', 'Completed', 'Incomplete'], default: 'Incomplete' }, // Status of the task
  description: { type: String }, // Description of the task
  createdAt: { type: Date, default: Date.now }, // Date when the task was created (important for shift matching)
}, { timestamps: true });

export const Task = mongoose.model('Task', taskSchema);