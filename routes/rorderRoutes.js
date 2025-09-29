// routes/rorderRoutes.js
import express from "express";
import {
  addRorder,
  getAllRorders,
  getRorderById,
  updateRorder,
  adminStatusUpdate,
  deleteRorder,
  checkOrderId,
} from "../controllers/rorderController.js";

const router = express.Router();

router.post("/", addRorder);
router.get("/", getAllRorders);
router.get("/check-id", checkOrderId);
router.get("/:id", getRorderById);

// non-status fields only
router.put("/:id", updateRorder);

// admin-only status update (controller checks req.user?.role)
router.patch("/:id/status", adminStatusUpdate);

router.delete("/:id", deleteRorder);

export default router;
