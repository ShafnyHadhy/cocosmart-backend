import express from "express";
import Order from "../models/order.js";
import User from "../models/user.js";
import {
  createOrder,
  getOrders,
  updatOrderStatus,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.get("/", getOrders);
orderRouter.put("/status/:orderID", updatOrderStatus);

// NEW: Get orders for a specific user
orderRouter.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get user's email from User collection
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const orders = await Order.find({ email: user.email }).sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user's orders" });
  }
});

// Get a single order by orderID
orderRouter.get("/:orderID", async (req, res) => {
  try {
    const { orderID } = req.params;
    const order = await Order.findOne({ orderID });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Optional: If the request is from a customer, only allow their own order
    // if (!req.user.isAdmin && order.email !== req.user.email) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

export default orderRouter;
