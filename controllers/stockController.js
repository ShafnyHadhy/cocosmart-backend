// controllers/StockController.js
import Stock from "../models/StockModel.js";

// ===== Create =====
export async function addStock(req, res, next) {
  const {
    stock_id,
    item_id,
    category,
    type,
    reason,
    qty,
    tot_value,
    date,
    enter_by,
  } = req.body;

  let stock;

  try {
    stock = new Stock({
      stock_id,
      item_id,
      category,
      type,
      reason,
      qty,
      tot_value,
      ...(date ? { date: new Date(date) } : {}),
      enter_by,
    });
    await stock.save();
  } catch (err) {
    console.log(err);
    // duplicate check for stock_id
    if (err.code === 11000 && err.keyPattern?.stock_id) {
      return res.status(409).json({ message: "stock_id already exists" });
    }
    return res.status(500).json({ message: "unable to add Stock " });
  }

  if (!stock) {
    return res.status(404).json({ message: "unable to add Stock " });
  }
  return res.status(200).json({ stock });
}

// ===== Read / Display all =====
export async function getAllStocks(req, res, next) {
  let stocks;

  try {
    stocks = await Stock.find();
  } catch (err) {
    console.log(err);
  }

  if (!stocks) {
    return res.status(404).json({ message: "Stocks not found" });
  }

  return res.status(200).json({ stocks });
}

// ===== Get by Mongo _id =====
export async function getStockById(req, res, next) {
  const id = req.params.id;

  let stock

  try {
    stock = await Stock.findById(id);
  } catch (err) {
    console.log(err);
  }

  if (!stock) {
    return res.status(404).json({ message: "Stocks not found" });
  }
  return res.status(200).json({ stock });
}

// ===== Update =====
export async function updateStock(req, res, next) {
  const id = req.params.id;

  const {
    stock_id, // stripped (locked)
    _id,     // stripped
    item_id,
    category,
    type,
    reason,
    qty,
    tot_value,
    date,
    enter_by,
  } = req.body;

  const allowed = {
    item_id,
    category,
    type,
    reason,
    qty,
    tot_value,
    enter_by,
  };

  // handle date separately
  if (date === null || date === "") {
    allowed.date = null;
  } else if (date) {
    allowed.date = new Date(date);
  }

  let stock;
  try {
    stock = await Stock.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true, runValidators: true }
    );
  } catch (err) {
    console.log(err);
  }

  if (!stock) {
    return res
      .status(404)
      .json({ message: "Unable to update stock " });
  }
  return res.status(200).json({ stock});
}

// ===== Delete =====
export async function deleteStock(req, res, next) {
  const id = req.params.id;

  let stock;

  try {
    stock = await Stock.findByIdAndDelete(id);
  } catch (err) {
    console.log(err);
  }
  if (!stock) {
    return res
      .status(404)
      .json({ message: "Unable to delete the stock " });
  }
  return res.status(200).json({ stock });
}

// ===== Utility: check whether stock_id already exists =====
export async function checkStockId(req, res) {
  try {
    const { stock_id } = req.query;
    if (!stock_id) {
      return res
        .status(400)
        .json({ success: false, message: "stock_id is required" });
    }
    const exists = await Stock.exists({ stock_id });
    return res.json({ success: true, exists: !!exists });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
