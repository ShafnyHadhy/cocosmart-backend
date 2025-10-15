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

// Specific routes first
orderRouter.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orders = await Order.find({ email: user.email }).sort({ date: -1 });
    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch user's orders" });
  }
});

// Then generic route
orderRouter.get("/id/:orderID", async (req, res) => {
  try {
    const { orderID } = req.params;
    const order = await Order.findOne({ orderID });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
});

export default orderRouter;
