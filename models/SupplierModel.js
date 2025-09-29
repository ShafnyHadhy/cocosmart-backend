import mongoose from "mongoose";
const Schema = mongoose.Schema;

const supplierSchema = new Schema({
  sup_id: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
  },
  sup_name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
  },
  contact: {
    type: String,
    required: true,
    match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"], // adjust as needed
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
});

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
