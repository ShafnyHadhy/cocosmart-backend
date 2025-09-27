import express from "express";
import { createFinance, updateFinance, deleteFinance, getAllFinance, createFinanceByOrder, } from "../controllers/financeController.js";

const financeRouter = express.Router();

financeRouter.post("/", createFinance);   
financeRouter.get("/", getAllFinance);       
financeRouter.put("/:financeID", updateFinance);    
financeRouter.delete("/:financeID", deleteFinance);
financeRouter.post("/createByOrder", createFinanceByOrder);

export default financeRouter;
