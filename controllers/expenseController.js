import Expense from '../models/expense.js';
import Finance from '../models/finance.js';
import { isAdmin } from './userController.js';

function generateExpenseID() {
    return "EXP-" + Date.now();
}
function generateFinanceID() {
    return "FIN-" + Date.now();
}

export async function createExpense(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to create an Expense" });
    }

    try {
        const { category, amount, description, date } = req.body;

        const expenseID = generateExpenseID();
        const financeID = generateFinanceID();

        const expense = await Expense.create({
            expenseID,
            category, //source for Finance
            amount,
            description,
            date
        });

        // Create Finance linked to this Expense
        const finance = await Finance.create({
            financeID,
            type: "expense",
            source: category, 
            amount,
            description,
            date,
            expenseID // link to Expense
        });

        res.status(201).json({
            message: "Expense and Finance created successfully",
             expense,
             finance
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to create an Expense or Finance",
            error: err.message
        });
    }
}


export async function getAllExpenses(req, res) {
    try {
        const expenses = await Expense.find().sort({ date: -1});
        res.status(200).json(expenses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch expenses", error: err.message });
    }
}

// UPDATE Expense + linked Finance
export async function updateExpense(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to update an Expense" });
    }

    try {
        const { expenseID } = req.params;
        const { category, amount, description, date } = req.body;

        // Update Expense
        const expense = await Expense.findOneAndUpdate(
            { expenseID },
            { category, amount, description, date },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        // Update corresponding Finance entry
        await Finance.findOneAndUpdate(
            { expenseID },
            { source: category, type: "expense", amount, description, date },
            { new: true }
        );

        res.status(200).json({ message: "Expense and linked Finance updated", expense });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update Expense or Finance", error: err.message });
    }
}

// DELETE Expense + linked Finance
export async function deleteExpense(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to delete an Expense" });
    }

    try {
        const { expenseID } = req.params;

        // Delete Expense
        const expense = await Expense.findOneAndDelete({ expenseID });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        // Delete linked Finance
        await Finance.deleteOne({ expenseID });

        res.status(200).json({ message: "Expense and linked Finance deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete Expense or Finance", error: err.message });
    }
}
