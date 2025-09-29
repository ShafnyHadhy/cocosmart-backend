import PurchasedItem from "../models/PurchasedItemModel.js";







import Stock from "../models/StockModel.js";
import { v4 as uuidv4 } from "uuid";

function todayAt00() {
  const t = new Date(); t.setHours(0,0,0,0); return t;
}
async function logStock({ item_id, type, reason, qty, std_cost, unit_cost, enter_by }) {
  if (!qty || qty <= 0) return;
  await Stock.create({
    item_id,
    category: "purchased",  // depending on controller
    type,
    reason,
    qty,
    tot_value: Number(std_cost || unit_cost || 0) * Number(qty || 0),
    date: todayAt00(),
    enter_by: enter_by || "system",
  });
}



//Create
export async function addPurchasedItems(req, res, next) {
  const {
    item_id,
    item_name,
    category,
    item_unit,
    unit_cost,
    ROL,
    quantity,
    expire_date,
    supplier,
  } = req.body;

  let purchasedItems;

  try {
    purchasedItems = new PurchasedItem({
      item_id,
      item_name,
      category,
      item_unit,
      unit_cost,
      ROL,
      quantity,
      ...(expire_date ? { expire_date: new Date(expire_date) } : {}),
      supplier,
    });
    await purchasedItems.save();
    await logStock({
  item_id,
  type: "in",
  reason: "purchase-create",
  qty: Number(quantity || 0),
  unit_cost: Number(unit_cost || 0),
  enter_by: supplier,   // or whoever is logged in if you track users
});

  } catch (err) {
    console.log(err);
    //this add nice error for duplicate pro_id
    if (err.code === 11000 && err.keyPattern?.item_id) {
      return res.status(409).json({ message: "item_id already exists" });
    }
    return res.status(500).json({ message: "unable to add Purchased Item" });
  }
  //if not inserting data to DB
  if (!purchasedItems) {
    return res.status(404).json({ message: "unable to add Purchased Item" });
  }
  return res.status(200).json({ purchasedItems });
}

//read/display part
export async function getAllPurchasedItems(req, res, next) {
  let purchasedItems;

  //get all items
  try {
    purchasedItems = await PurchasedItem.find();
  } catch (err) {
    console.log(err);
  }

  //not found
  if (!purchasedItems) {
    return res.status(404).json({ message: "Purchased Item not found" });
  }

  //display all items
  return res.status(200).json({ purchasedItems });
}

//get by Id
export async function getPurchasedItemById(req, res, next) {
  const id = req.params.id; //display using an ID

  let purchasedItems; //create variable

  try {
    purchasedItems = await PurchasedItem.findById(id);
  } catch (err) {
    console.log(err);
  }

  //if there are no available users
  if (!purchasedItems) {
    return res.status(404).json({ message: "Purchased Item not found" });
  }
  return res.status(200).json({ purchasedItems });
}

//Update
export async function updatePurchasedItem(req, res, next) {
  const id = req.params.id;
  const oldDoc = await PurchasedItem.findById(id).lean();

  const {
    item_id, // stripped (locked)
    _id, // stripped
    item_name,
    category,
    item_unit,
    unit_cost,
    ROL,
    quantity,
    expire_date ,
    supplier,
  } = req.body;

  const allowed = {
    item_name,
    category,
    item_unit,
    unit_cost,
    ROL,
    quantity,
    supplier,
  };
   // handle expire_date: set to null to clear, or set to Date if provided
if (expire_date === null || expire_date === "") {
 allowed.expire_date = null;
} else if (expire_date) {
  allowed.expire_date = new Date(expire_date);
 }

  let purchasedItems;
  try {
    purchasedItems = await PurchasedItem.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true, runValidators: true }
    );
    if (oldDoc && purchasedItems) {
  const oldQty = Number(oldDoc.quantity || 0);
  const newQty = Number(purchasedItems.quantity || 0);

  if (newQty > oldQty) {
    await logStock({
      item_id: oldDoc.item_id,
      type: "in",
      reason: "item-purchased",
      qty: newQty - oldQty,
      unit_cost: Number(purchasedItems.unit_cost || 0),
      enter_by: purchasedItems.supplier,
    });
  } else if (newQty < oldQty) {
    await logStock({
      item_id: oldDoc.item_id,
      type: "out",
      reason: "item-used",
      qty: oldQty - newQty,
      unit_cost: Number(purchasedItems.unit_cost || 0),
      enter_by: purchasedItems.supplier,
    });
  }
}

  } catch (err) {
    console.log(err);
  }

  if (!purchasedItems) {
    return res
      .status(404)
      .json({ message: "Unable to update purchased item details" });
  }
  return res.status(200).json({ purchasedItems });
}

export async function deletePurchasedItem(req, res, next) {
  const id = req.params.id;

  let purchasedItems;

  try {
    purchasedItems = await PurchasedItem.findByIdAndDelete(id);
  } catch (err) {
    console.log(err);
  }
  if (!purchasedItems) {
    return res
      .status(404)
      .json({ message: "Unable to delete the purchased item" });
  }
  return res.status(200).json({ purchasedItems });
}


// check whether item_id is already existing
export async function checkItemId (req, res) {
  try {
    const { item_id } = req.query;
    if (!item_id) {
      return res
        .status(400)
        .json({ success: false, message: "item_id is required" });
    }
    const exists = await PurchasedItem.exists({ item_id });
    return res.json({ success: true, exists: !!exists });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
