import Worker from "../Models/Worker.js";

// get all worker data 
export const getAllWorkers = async (req, res) => {
    try {
        const workers = await Worker.find(); // Fetch all workers without grouping
        res.status(200).json(workers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get worker by ID
export const getWorkerById = async (req, res) => {
    try {
        const worker = await Worker.findById(req.params.id);
        if (!worker) return res.status(404).json({ message: "Worker not found" });
        res.status(200).json(worker);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// add a new worker 
export const addWorker = async (req, res) => {
    try {
        console.log('Request Body:', req.body); // Log the request body
        const newWorker = new Worker(req.body);
        await newWorker.save();
        res.status(201).json(newWorker);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateWorker = async (req, res) => {
    try {
        const { department, shift, location, available } = req.body;
        const { id } = req.params; // Get ID from URL parameter

        const updatedWorker = await Worker.findByIdAndUpdate(
            id, // Use req.params.id instead of req.body.id
            { department, shift, location, available },
            { new: true } // Return the updated document
        );

        if (!updatedWorker) {
            return res.status(404).json({ message: "Worker not found" });
        }

        res.status(200).json(updatedWorker);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Delete worker by ID
export const deleteWorker = async (req, res) => {
    try {
        const deletedWorker = await Worker.findByIdAndDelete(req.params.id);
        if (!deletedWorker) return res.status(404).json({ message: "Worker not found" });
        res.status(200).json({ message: "Worker deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

