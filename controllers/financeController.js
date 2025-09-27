import Finance from "../models/finance.js";
import Product from "../models/product.js";
import { isAdmin } from './userController.js';

function generateFinanceID() {
    return "FIN-" + Date.now();
}


export async function createFinance(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to create a Finance record" });
    }

    try {
        const { type, source, amount, description, date } = req.body;

        if (type === "expense") {
            return res.status(400).json({ message: "Expenses must be created via Expense controller" });
        }

        const finance = new Finance({
            financeID: generateFinanceID(), 
            type,
            source,
            amount,
            description,
            date,
        });

        await finance.save();

        res.status(201).json({ message: "Finance record created successfully", finance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create Finance record", error: err.message });
    }
}

export async function createFinanceByOrder(req, res){

    try{
        const itemsInRequest = req.body.items;
        //console.log(itemsInRequest);

        let totalProfit = 0;

        for (let item of itemsInRequest) {
            const product = await Product.findOne({ productID: item.productID });
         
            if (!product) continue;

            const price = Number(product.price);
            const cost = Number(product.cost);
            const quantity = Number(item.quantity);

            if ([price, cost, quantity].some(isNaN)) {
                console.warn(`Invalid number in order item:`, item);
                continue;
            }

            totalProfit += (price - cost) * quantity;
        }

        let type = "income";
        let source = "Order Sales: " + req.body.orderID;
        let amount = Number(totalProfit);
        let description = `Profit from order ${req.body.orderID}`
        let date = new Date();

        const newFinance = new Finance({
            financeID: generateFinanceID(), 
            type,
            source,
            amount,
            description,
            date,
        });

        const savedIncome = await newFinance.save();

        res.status(201).json(
            {
                message: "Sales income added to finance successfully",
                finance: savedIncome 
            }
        )

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create Finance record by sales", error: err.message });
    } 
}


export async function getAllFinance(req, res) {
    try {
        const finances = await Finance.find().sort({ date: -1});
        res.status(200).json(finances);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch Finance records", error: err.message });
    }
}



export async function updateFinance(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to update a Finance record" });
    }

    try {
        const { financeID } = req.params;
        const { type, source, amount, description, date } = req.body;

        // Check if finance record exists
        const finance = await Finance.findOne({ financeID });

        if (!finance) {
            return res.status(404).json({ message: "Finance record not found" });
        }

        // Prevent editing expense-linked records
        if (finance.type === "expense" && finance.expenseID) {
            return res.status(400).json({ message: "Expense-related finance records can only be updated via Expense controller" });
        }

        // Update income record
        finance.source = source || finance.source;
        finance.amount = amount || finance.amount;
        finance.description = description || finance.description;
        finance.date = date || finance.date;

        await finance.save();

        res.status(200).json({ message: "Finance record updated successfully", finance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update Finance record", error: err.message });
    }
}


export async function deleteFinance(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to delete a Finance record" });
    }

    try {
        const { financeID } = req.params;

        const finance = await Finance.findOne({ financeID });

        if (!finance) {
            return res.status(404).json({ message: "Finance record not found" });
        }

        // Prevent deleting expense-linked finance records
        if (finance.type === "expense" && finance.expenseID) {
            return res.status(400).json({ message: "Expense-related finance records can only be deleted via Expense controller" });
        }

        await Finance.deleteOne({ financeID });

        res.status(200).json({ message: "Finance record deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete Finance record", error: err.message });
    }
}
