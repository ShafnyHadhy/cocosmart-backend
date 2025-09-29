// models/taskModel.js
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    category: { type: String, enum: ["General", "Harvesting", "Planting", "Maintenance", "Quality Control", "Packaging", "Transportation"], default: "General" },
    scheduledDate: { type: Date },
    scheduledTime: { type: String }, // Time in HH:MM format
    estimatedHours: { type: Number, min: 0.5 },
    status: { type: String, enum: ["To Do", "In Progress", "Completed", "On Hold"], default: "To Do" },
    assignedWorkers: [{ type: String }], // workerId strings
    workerStatuses: { type: Map, of: String, default: {} }, // Track individual worker statuses
    completedAt: { type: Date },
    completedBy: { type: String }, // workerId who completed
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
