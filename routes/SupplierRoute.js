import express from 'express';
import { addSuppliers, checkSupId, deleteSupplier, getAllSuppliers, getSupplierById, updateSupplier } from '../controllers/SupplierController.js';




const router = express.Router();





router.get("/", getAllSuppliers);
router.post("/", addSuppliers);
router.get("/:id", getSupplierById);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

router.get("/check-sup-id", checkSupId);


export default router;