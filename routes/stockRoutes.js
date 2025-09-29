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
import { getStocksReportPDF } from "../controllers/stockReportController.js";

const router = express.Router();

// Create
router.post("/", addStock);

// Read all
router.get("/", getAllStocks);

// Utility: check stock_id availability
router.get("/check/stockid", checkStockId);
router.get("/report/pdf", getStocksReportPDF);

// Read by Mongo _id
router.get("/:id", getStockById);

// Update by Mongo _id
router.put("/:id", updateStock);

// Delete by Mongo _id
router.delete("/:id", deleteStock);



export default router;
