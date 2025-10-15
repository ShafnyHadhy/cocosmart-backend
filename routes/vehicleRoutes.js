import express from "express";
import Vehicle from "../models/vehicle.js";

const router = express.Router();

// GET all vehicles
router.get("/", async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.status(200).json(vehicles);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

// POST /api/vehicles - Add new vehicle
router.post("/", async (req, res) => {
  const { vehicleId, plateNumber, type, fuelType, insuranceExpiry } = req.body;

  // Validate required fields
  if (!vehicleId || !plateNumber || !type || !fuelType || !insuranceExpiry) {
    return res.status(400).json({
      message:
        "All fields are required: vehicleId, plateNumber, type, fuelType, insuranceExpiry",
    });
  }

  // Validate insuranceExpiry is a future date
  const expiryDate = new Date(insuranceExpiry);
  const today = new Date();
  if (expiryDate < today) {
    return res
      .status(400)
      .json({ message: "Insurance expiry must be a future date" });
  }

  // Validate fuelType does not start with a digit
  if (/^\d/.test(fuelType)) {
    return res
      .status(400)
      .json({ message: "Fuel type cannot start with a digit" });
  }

  try {
    const vehicle = new Vehicle({
      vehicleId,
      plateNumber,
      type,
      fuelType,
      insuranceExpiry,
    });

    await vehicle.save();
    res.status(201).json({ message: "Vehicle added successfully", vehicle });
  } catch (error) {
    console.error("Error adding vehicle:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Vehicle with this Vehicle ID or Plate Number already exists",
      });
    }
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

// PUT /api/vehicles/:id - Update vehicle
router.put("/:id", async (req, res) => {
  try {
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    res.status(200).json(updatedVehicle);
  } catch (err) {
    console.error("Error updating vehicle:", err);
    res.status(500).json({ message: "Failed to update vehicle" });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle
router.delete("/:id", async (req, res) => {
  try {
    const deletedVehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deletedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    console.error("Error deleting vehicle:", err);
    res.status(500).json({ message: "Failed to delete vehicle" });
  }
});

export default router;
