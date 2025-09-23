import express from "express";
import {
  assignDelivery,
  getAllDeliveries,
  editDelivery,
  updateDeliveryStatus,
  deleteDelivery,
} from "../controllers/deliveryController.js";

const router = express.Router();

router.get("/", getAllDeliveries);
router.post("/", assignDelivery);
router.put("/:id", editDelivery);
router.put("/:id/markDelivered", updateDeliveryStatus);
router.delete("/:id", deleteDelivery);

export default router;
