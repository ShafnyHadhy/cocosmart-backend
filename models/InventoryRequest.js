import mongoose from "mongoose";

const InventoryRequestSchema = new mongoose.Schema(
  {
    productID: {
      type: String,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    requestedBy: {
      type: String,
      ref: "User", // Admin who made the request
    },
  },
  { timestamps: true }
);

export default mongoose.model("InventoryRequest", InventoryRequestSchema);
