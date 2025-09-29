import Delivery from "../models/delivery.js";
import Driver from "../models/driver.js";
import Vehicle from "../models/vehicle.js";
import Order from "../models/order.js";

// Assign Delivery - FIXED
export const assignDelivery = async (req, res) => {
  try {
    const { orderId, vehicle, driver, route, scheduledDate } = req.body;

    if (!orderId || !vehicle || !driver || !route || !scheduledDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the order by orderID (string field)
    const order = await Order.findOne({ orderID: orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Create a delivery entry
    const newDelivery = new Delivery({
      order: order._id,
      vehicle,
      driver,
      route,
      scheduledDate,
    });

    await newDelivery.save();

    // Update vehicle and driver status
    await Vehicle.findByIdAndUpdate(vehicle, { status: "unavailable" });
    await Driver.findByIdAndUpdate(driver, { status: "unavailable" });

    // UPDATE ORDER STATUS - FIXED
    order.status = "Processing";
    await order.save();

    res.status(201).json(newDelivery);
  } catch (error) {
    console.error("Error assigning delivery:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get All Deliveries - FIXED (populate order)
export const getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate("order", "orderID status") // Populate order details
      .populate("vehicle", "vehicleId")
      .populate("driver", "name");

    res.status(200).json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Delivery Status - FIXED
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { km } = req.body;

    if (!km || km <= 0) {
      return res.status(400).json({ message: "KM must be a positive number" });
    }

    const delivery = await Delivery.findById(id).populate("order");
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Auto-calculate fuel used and transport cost
    const fuelUsed = km / 30;
    const transportCost = fuelUsed * 100;

    delivery.km = km;
    delivery.fuelUsed = fuelUsed;
    delivery.transportCost = transportCost;
    delivery.deliveryStatus = "completed";

    await delivery.save();

    // Make vehicle and driver available again
    await Vehicle.findByIdAndUpdate(delivery.vehicle, { status: "available" });
    await Driver.findByIdAndUpdate(delivery.driver, { status: "available" });

    // Update linked order status
    if (delivery.order) {
      delivery.order.status = "Completed";
      await delivery.order.save();
    }

    res.status(200).json(delivery);
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ message: error.message });
  }
};

// Other functions remain the same but ensure they use order ObjectId
export const editDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle, driver, route, scheduledDate } = req.body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

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

export const deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Delivery.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    await Vehicle.findByIdAndUpdate(deleted.vehicle, { status: "available" });
    await Driver.findByIdAndUpdate(deleted.driver, { status: "available" });

    res.json({ message: "Delivery deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
