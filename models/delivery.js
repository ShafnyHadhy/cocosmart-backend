import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    route: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    deliveryStatus: {
      type: String,
      enum: ["scheduled", "in-progress", "completed"],
      default: "scheduled",
    },
    km: { type: Number },
    fuelUsed: { type: Number },
    transportCost: { type: Number },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Delivery", deliverySchema);
