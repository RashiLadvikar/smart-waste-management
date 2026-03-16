import express from 'express';
import { 
    getAllWorkers, 
    getWorkerById, 
    addWorker, 
    updateWorker, 
    deleteWorker 
} from '../controllers/workerController.js';

const router = express.Router();

// Get all workers
router.get('/', getAllWorkers);

// Get a single worker by ID
router.get('/:id', getWorkerById);

// Create a new worker
router.post('/', addWorker);

// Update a worker by ID
router.put('/:id', updateWorker);

// Delete a worker by ID
router.delete('/:id', deleteWorker);

export default router;
