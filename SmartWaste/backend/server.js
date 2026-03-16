import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import reportRoutes from "./routes/reportRoutes.js";
import chartRoutes from "./routes/chartRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import allUserRoutes from "./routes/allUserRoutes.js";
import payment from "./routes/payment.js";
import locationRoutes from "./routes/locationRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import reviewRoutess from "./routes/reveiwRoutess.js";
import reveiwSentimentRoute from "./routes/reveiwSentimentRoute.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import detectionRoutes from "./routes/detections.js";

/* ===== changeStreamWatcher imports (UNCHANGED) ===== */
import { Task } from "./taskModel.js";
import { assignTasks } from "./geneticTaskAssigner.js";

/* ================================================ */

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Clerk authentication
app.use(ClerkExpressWithAuth());

// ES6 __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/task", detectionRoutes);

// Connect to MongoDB (SINGLE CONNECTION)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    /* ===== changeStreamWatcher logic (UNCHANGED) ===== */
    const taskChangeStream = Task.watch();

    taskChangeStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        console.log("🆕 New task inserted, reassigning tasks...");
        await assignTasks();
      }
    });
    /* =============================================== */
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/reports/:id/:status", reportRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/charts", chartRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/allusers", allUserRoutes);
app.use("/api/payment", payment);
app.use("/api/location", locationRoutes);
app.use("/api/user", userRoutes);
app.use("/api/worker", workerRoutes);
app.use("/api", reviewRoutes);
app.use("/api", reveiwSentimentRoute);
app.use("/api/reviews", reviewRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("Waste Management API is running");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Sign in " });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
