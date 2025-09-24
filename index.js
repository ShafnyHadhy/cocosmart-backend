import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

// Routes
import deliveryRoutes from "./routes/deliveryRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import orderRouter from "./routes/orderRouter.js";
import productRouter from "./routes/productRouter.js";
import userRoutes from "./routes/userRouter.js";
// { requestPasswordReset } from "../controllers/userController.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // JSON body parsing

// Optional JWT middleware
app.use((req, res, next) => {
  const token = req.header("Authorization");
  if (token) {
    const cleanedToken = token.replace("Bearer ", "");
    jwt.verify(cleanedToken, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) req.user = decoded;
    });
  }
  next();
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected successfully!"))
  .catch((err) => console.error("Database connection failed:", err));

// Routes
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}...`));
