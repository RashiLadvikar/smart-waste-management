import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    shift: { type: String, enum: ['morning', 'evening', 'night'], required: true },
    department: { type: String, enum: ['cleaning', 'spill', 'maintenance', 'other'], required: true },
    available: { type: Boolean, default: true, required: true },
    emergencyResponder: { type: Boolean, required: true },
    location: { type: String, required: true }, // Added location field
    startDate: { type: Date },
    taskLoad: { type: Number, default: 0 }, // Number of tasks assigned to the worker
    taskHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }] ,// List of task ids assigned to worker
    additionalDetails: { type: String }
}, { timestamps: true });

const Worker = mongoose.model('Worker', workerSchema);
export default Worker;