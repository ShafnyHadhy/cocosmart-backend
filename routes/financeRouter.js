import express from "express";
import { createFinance, updateFinance, deleteFinance, getAllFinance, } from "../controllers/financeController.js";

const financeRouter = express.Router();

financeRouter.post("/", createFinance);   
financeRouter.get("/", getAllFinance);       
financeRouter.put("/:financeID", updateFinance);    
financeRouter.delete("/:financeID", deleteFinance);

export default financeRouter;
