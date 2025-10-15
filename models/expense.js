import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
    {
        expenseID:{
            type: String,
            required: true,
            unique: true
        },
        category: {
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
        } 
    }
)

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;