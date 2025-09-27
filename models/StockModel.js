import mongoose from "mongoose";
const Schema = mongoose.Schema;

const stockSchema = new Schema(
  {
    stock_id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    item_id: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    tot_value: {
      type: Number,
      required: true,
      min: 0,
    },
    
    date: {
      type: Date,
      required: true, // must send in JSON
    },

    // date: {
    //   type: Date,
    //   default: Date.now, //auto fill system time
    //   immutable: true,
    // },
    enter_by: {
      type: String, // manager name or id
      required: true,
      trim: true,
    },
  },
  { timestamps: true } // keeps createdAt, updatedAt
);

const Stock = mongoose.model("Stock", stockSchema);
export default Stock;
