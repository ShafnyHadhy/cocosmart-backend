import express from "express";
import { createExpense, updateExpense, deleteExpense, getAllExpenses } from "../controllers/expenseController.js";

const expenseRouter = express.Router();

expenseRouter.post("/", createExpense);   
expenseRouter.get("/", getAllExpenses);       
expenseRouter.put("/:expenseID", updateExpense);    
expenseRouter.delete("/:expenseID", deleteExpense); 

export default expenseRouter;
