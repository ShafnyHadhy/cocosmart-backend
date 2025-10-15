import express from "express";
import { createInventoryRequest, getAllRequests, updateRequestStatus, } from "../controllers/inventoryRequestController.js";

const router = express.Router();

// POST - create new request
router.post("/", createInventoryRequest);

// GET - get all requests
router.get("/", getAllRequests);

// PUT - update request status
router.put("/:id", updateRequestStatus);

export default router;
