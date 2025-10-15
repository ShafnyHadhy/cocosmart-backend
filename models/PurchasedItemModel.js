import mongoose from 'mongoose';
const Schema = mongoose.Schema;

//this function is to prevent entering past days as expire date
function startOfTodayUTC() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

const purchasedItemSchema = new Schema({
  item_id: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
  },
  item_name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  item_unit: {
    type: String,
    required: true,
  },
  unit_cost: {
    type: Number,
    required: true,
  },
  ROL: {
    type: Number,
    required: true,
  },
  quantity: {
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
  supplier: {
    type: String,
    required: true,
  },
});

const PurchasedItem = mongoose.model('PurchasedItem', purchasedItemSchema);
export default PurchasedItem;
