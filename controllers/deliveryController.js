import Delivery from "../models/delivery.js";
import Driver from "../models/driver.js";
import Vehicle from "../models/vehicle.js";

// Create Delivery
export const assignDelivery = async (req, res) => {
  try {
    const { orderId, vehicle, driver, route, scheduledDate } = req.body;
    if (!orderId || !vehicle || !driver || !route || !scheduledDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newDelivery = new Delivery({
      orderId,
      vehicle,
      driver,
      route,
      scheduledDate,
    });

    await newDelivery.save();

    await Vehicle.findByIdAndUpdate(vehicle, { status: "unavailable" });
    await Driver.findByIdAndUpdate(driver, { status: "unavailable" });

    res.status(201).json(newDelivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Deliveries
export const getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate("vehicle", "vehicleId") // updated to show vehicleId
      .populate("driver", "name");
    res.status(200).json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Delivery
export const editDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle, driver, route, scheduledDate } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery)
      return res.status(404).json({ message: "Delivery not found" });

    const oldVehicle = delivery.vehicle.toString();
    const oldDriver = delivery.driver.toString();

    delivery.vehicle = vehicle;
    delivery.driver = driver;
    delivery.route = route;
    delivery.scheduledDate = scheduledDate;
    await delivery.save();

    if (vehicle !== oldVehicle) {
      await Vehicle.findByIdAndUpdate(oldVehicle, { status: "available" });
      await Vehicle.findByIdAndUpdate(vehicle, { status: "unavailable" });
    }

    if (driver !== oldDriver) {
      await Driver.findByIdAndUpdate(oldDriver, { status: "available" });
      await Driver.findByIdAndUpdate(driver, { status: "unavailable" });
    }

    res.status(200).json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark Delivered
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { km, fuelUsed, transportCost, deliveryStatus } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery)
      return res.status(404).json({ message: "Delivery not found" });

    delivery.km = km;
    delivery.fuelUsed = fuelUsed;
    delivery.transportCost = transportCost;
    delivery.deliveryStatus = deliveryStatus;

    await delivery.save();

    await Vehicle.findByIdAndUpdate(delivery.vehicle, { status: "available" });
    await Driver.findByIdAndUpdate(delivery.driver, { status: "available" });

    res.status(200).json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Delivery
export const deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Delivery.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "Delivery not found" });

    await Vehicle.findByIdAndUpdate(deleted.vehicle, { status: "available" });
    await Driver.findByIdAndUpdate(deleted.driver, { status: "available" });

    res.json({ message: "Delivery deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
