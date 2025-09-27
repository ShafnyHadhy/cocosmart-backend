import express from 'express';
// const express = require("express");
import { addCocoProducts, checkProId, deleteCocoProduct, getAllCocoProducts, getCocoInventoryReport, getCocoProductById, updateCocoProduct } from '../controllers/CocoProductController.js';
import { getCocoInventoryReportPDF } from "../controllers/CocoProductReportController.js"; 

const router = express.Router();

//insert model
//const CocoProduct = require("../models/CocoProductModel");

//insert coco product Controller
//const CocoProductController = require("../controllers/CocoProductController");

// //for report generation
// const CocoProductReportController = require("../controllers/CocoProductReportController");


// // Add new PDF report endpoint
// router.get("/report/pdf", CocoProductReportController.getCocoInventoryReportPDF);
// // ✨ ADDED: /cocoProducts/check-pro-id?pro_id=XXXX
// router.get("/check-pro-id", CocoProductController.checkProId);
router.get("/", getAllCocoProducts);
router.post("/", addCocoProducts);

router.get("/report/pdf", getCocoInventoryReportPDF);
router.get("/check-pro-id", checkProId); 

router.get("/:id", getCocoProductById);         // GET /api/cocoProducts/:id
router.put("/:id", updateCocoProduct);          // PUT /api/cocoProducts/:id
router.delete("/:id", deleteCocoProduct);   

       // GET /api/cocoProducts/check-pro-id?pro_id=...
//router.get("/report", getCocoInventoryReport);
// router.post("/", CocoProductController.addCocoProducts);
// router.get("/:id", CocoProductController.getCocoProductById);
// router.put("/:id", CocoProductController.updateCocoProduct);
// router.delete("/:id", CocoProductController.deleteCocoProduct);

//export
//module.exports = router;
export default router;