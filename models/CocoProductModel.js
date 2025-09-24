import mongoose from 'mongoose';
//const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//this function is to prevent entering past days as expire date
function startOfTodayUTC() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

const cocoProductSchema = new Schema({
  pro_id: {
    type: String,
    required: true,
    unique: true,
    immutable: true, 
  },
  pro_name: {
    type: String,
    required: true,
  },
  pro_category: {
    type: String,
    required: true,
  },
  pro_uom: {
    type: String,
    required: true,
  },
  std_cost: {
    type: Number,
    required: true,
  },
  qty_on_hand: {
    type: Number,
    required: true,
  },
  qty_reserved: {
    type: Number,
    required: true,
  },
  expire_date: {
    type: Date,
    validate: {
      validator: function (v) {
        if (!v) return true; // allow null if you want
        // compare against start of "today" in UTC
        return v >= startOfTodayUTC();
      },
      message: "expire_date cannot be in the past",
    },
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  updated_by: {
    type: String,
  },
});

// **Added this middleware to automatically update `updated_at` field when the document is saved**
/*cocoProductSchema.pre('save', function(next) {
    if (this.isModified()) {  // Check if any field is modified
        this.updated_at = new Date();  // Set `updated_at` to the current date
    }
    next();
});*/

// **Added this middleware to automatically update `updated_at` field when using `findOneAndUpdate` or `findByIdAndUpdate`**
cocoProductSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated_at: new Date() }); // Set `updated_at` to the current date
  next();
});

// Add pre hook for `findByIdAndUpdate` as well (same as `findOneAndUpdate`)
cocoProductSchema.pre("findByIdAndUpdate", function (next) {
  this.set({ updated_at: new Date() }); // Set `updated_at` to the current date
  next();
});

// module.exports = mongoose.model(
//   "CocoProductModel", //file name
//   cocoProductSchema //function name
// );
const CocoProduct = mongoose.model('CocoProduct', cocoProductSchema);
export default CocoProduct;