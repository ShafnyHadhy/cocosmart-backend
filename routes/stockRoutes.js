// routes/stockRoutes.js
import express from "express";
import {
  addStock,
  getAllStocks,
  getStockById,
  updateStock,
  deleteStock,
  checkStockId,
} from "../controllers/stockController.js";

const router = express.Router();

// Create
router.post("/", addStock);

// Read all
router.get("/", getAllStocks);

// Utility: check stock_id availability
router.get("/check/stockid", checkStockId);

// Read by Mongo _id
router.get("/:id", getStockById);

// Update by Mongo _id
router.put("/:id", updateStock);

// Delete by Mongo _id
router.delete("/:id", deleteStock);



export default router;
