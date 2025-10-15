import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    adminReply: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
