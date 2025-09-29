import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Counter schema to keep track of stock sequence
const counterSchema = new Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

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
    enter_by: {
      type: String, // manager name or id
      required: true,
      trim: true,
    },
  },
  { timestamps: true } // keeps createdAt, updatedAt
);

// Auto-generate stock_id like STK001, STK002...
stockSchema.pre("validate", async function (next) {
  if (!this.stock_id) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: "stock" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.stock_id = "STK" + String(counter.seq).padStart(3, "0");
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Stock = mongoose.model("Stock", stockSchema);
export default Stock;
