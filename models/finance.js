import mongoose from "mongoose";

const financeSchema = new mongoose.Schema(
    {
        financeID: {
            type: String,
            required: true,
            unique: true
        },
        type: {
            type: String,
            enum: ["income", "expense"],
            required: true
        },
        source: { 
            type: String, 
            required: true 
        },
        amount: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true,
            default: Date.now
        },
        expenseID: {
            type: String,
            default: null // will be set if linked to an Expense
        }
    }
);

const Finance = mongoose.model('Finance', financeSchema);
export default Finance;
