import mongoose from "mongoose";

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  phone: { type: String },
  email: { type: String, required: true }, // e.g. user@gmail.com
  address: { type: String }, // optional
  status: {
    type: String,
    enum: ["available", "unavailable"],
    default: "available",
  }, // available or busy
});

export default mongoose.model("Driver", driverSchema);
