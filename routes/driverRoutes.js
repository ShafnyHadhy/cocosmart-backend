import express from "express";
import Driver from "../models/driver.js";

const router = express.Router();

// GET all drivers
router.get("/", async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.status(200).json(drivers);
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).json({ message: "Failed to fetch drivers" });
  }
});

// POST add driver
router.post("/", async (req, res) => {
  const { name, licenseNumber, phone, email, address } = req.body;

  // Validation
  if (!name || !licenseNumber || !phone || !email) {
    return res.status(400).json({
      message: "Name, license number, phone, and email are required",
    });
  }

  if (!/^[a-zA-Z\s]{2,50}$/.test(name)) {
    return res.status(400).json({ message: "Invalid name format" });
  }

  if (!/^LN-\d{8}$/.test(licenseNumber)) {
    return res
      .status(400)
      .json({ message: "License number must be in format LN-XXXXXXXX" });
  }

  if (!/^07\d{8}$/.test(phone)) {
    return res
      .status(400)
      .json({ message: "Phone must start with 07 and be 10 digits" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const driver = new Driver({ name, licenseNumber, phone, email, address });
    await driver.save();
    res.status(201).json(driver);
  } catch (err) {
    console.error("Error adding driver:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Driver with this license number already exists" });
    }
    res.status(500).json({ message: "Failed to add driver" });
  }
});

// PUT update driver
router.put("/:id", async (req, res) => {
  try {
    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.status(200).json(updatedDriver);
  } catch (err) {
    console.error("Error updating driver:", err);
    res.status(500).json({ message: "Failed to update driver" });
  }
});

// DELETE driver
router.delete("/:id", async (req, res) => {
  try {
    const deletedDriver = await Driver.findByIdAndDelete(req.params.id);
    if (!deletedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.status(200).json({ message: "Driver deleted successfully" });
  } catch (err) {
    console.error("Error deleting driver:", err);
    res.status(500).json({ message: "Failed to delete driver" });
  }
});

export default router;
