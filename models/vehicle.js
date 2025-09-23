import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true }, // e.g. VN-001
  plateNumber: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  fuelType: { type: String, required: true }, // e.g. Petrol, Diesel, EV
  insuranceExpiry: { type: Date, required: true }, // ISO date format
  status: { type: String, default: "available" },
});

export default mongoose.model("Vehicle", vehicleSchema);
