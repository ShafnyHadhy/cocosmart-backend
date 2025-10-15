import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    workerId: { type: String, required: true, unique: true },
    userEmail: { type: String, required: true, index: true },
    jobRole: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
    dateOfBirth: { type: Date, required: true },
    nic: { type: String, required: true, unique: true },
    skills: [{ type: String }], // Array of skills
    hourlyRate: { type: Number, min: 0 },
    performanceRating: { type: Number, min: 0, max: 5, default: 0 },
    totalTasksCompleted: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    lastActiveAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Worker", workerSchema);


