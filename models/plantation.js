import mongoose from "mongoose";

const plotSchema = new mongoose.Schema(
  {
    plotID: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    noOfTrees: {
      type: Number,
      required: true,
    },
    irrigationSchedules: {
      type: Date,
      required: true,
    },
    harvest: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Plot", plotSchema);