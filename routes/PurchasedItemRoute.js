import express from 'express';

import { addPurchasedItems, checkItemId, deletePurchasedItem, getAllPurchasedItems, getPurchasedItemById, updatePurchasedItem } from '../controllers/purchasedItemController.js';


const router = express.Router();





router.get("/", getAllPurchasedItems);
router.post("/", addPurchasedItems);
router.get("/:id", getPurchasedItemById);
router.put("/:id", updatePurchasedItem);
router.delete("/:id", deletePurchasedItem);

router.get("/check-item-id", checkItemId);


export default router;