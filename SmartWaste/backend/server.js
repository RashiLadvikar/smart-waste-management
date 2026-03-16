import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import path from "path";
import { fileURLToPath } from "url";

import reportRoutes from "./routes/reportRoutes.js";
import chartRoutes from "./routes/chartRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import allUserRoutes from "./routes/allUserRoutes.js";
import payment from "./routes/payment.js";
import locationRoutes from "./routes/locationRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import reveiwSentimentRoute from "./routes/reveiwSentimentRoute.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import detectionRoutes from "./routes/detections.js";

import { Task } from "./taskModel.js";
import { assignTasks } from "./geneticTaskAssigner.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(ClerkExpressWithAuth());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("SmartWaste backend is running");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy"
  });
});

app.use("/api/task", detectionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/charts", chartRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/allusers", allUserRoutes);
app.use("/api/payment", payment);
app.use("/api/location", locationRoutes);
app.use("/api/worker", workerRoutes);
app.use("/api", reveiwSentimentRoute);
app.use("/api", reviewRoutes);
app.use("/api/reviews", reviewRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    const taskChangeStream = Task.watch();

    taskChangeStream.on("change", async (change) => {
      try {
        if (change.operationType === "insert") {
          console.log("New task inserted, reassigning tasks...");
          await assignTasks();
        }
      } catch (error) {
        console.error("Task reassignment error:", error);
      }
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.use((err, req, res, next) => {
  console.error("Global server error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;