import express from 'express';

import { addPurchasedItems, checkItemId, deletePurchasedItem, getAllPurchasedItems, getPurchasedItemById, updatePurchasedItem } from '../controllers/purchasedItemController.js';
import { getPurchasedItemsReportPDF } from '../controllers/purchasedItemReportController.js';


const router = express.Router();





router.get("/", getAllPurchasedItems);
router.post("/", addPurchasedItems);

router.get("/check-item-id", checkItemId);
router.get("/report/pdf", getPurchasedItemsReportPDF);

router.get("/:id", getPurchasedItemById);
router.put("/:id", updatePurchasedItem);
router.delete("/:id", deletePurchasedItem);





export default router;