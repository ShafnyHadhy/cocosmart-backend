// models/RorderModel.js
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const rorderSchema = new Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
    },
    item_id: {
      type: String,
      required: true,
      trim: true,
    },
    unit_cost: {
      type: Number,
      required: true,
      min: 0,
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
    requested_by: {
      type: String, // inventory manager name or id
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected","Ordered"],
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true } // createdAt, updatedAt
);

const Rorder = mongoose.model("Rorder", rorderSchema);
export default Rorder;
