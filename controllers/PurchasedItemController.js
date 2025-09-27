import PurchasedItem from "../models/PurchasedItemModel.js";

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

// //Create Coco Products Inventory 
// export async function getCocoInventoryReport (req, res) {
//   try {
//     // thresholds
//     const minQtyDefault = Number(req.query.minQty ?? 100000); // GLOBAL low-stock threshold
//     const expDays = Number(req.query.expDays ?? 30);          // expiring soon window (days)

//     const now = new Date();
//     const soon = new Date(now.getTime() + expDays * 24 * 60 * 60 * 1000);

//     const products = await CocoProduct.find().lean();

//     const totalItems = products.length;
//     let lowStockCount = 0;
//     let expiringSoonCount = 0;
//     let totalValue = 0; // keep total value KPI (qty * avg cost)

//     const rows = products.map(p => {
//       const qty = Number(p.qty_on_hand || 0);
//       const cost = Number(p.std_cost || 0);  // keep avg cost
//       const value = qty * cost;
//       totalValue += value;

//       const minQty = minQtyDefault;

//       // expiry checks
//       const hasExpiry = !!p.expire_date;
//       const expiryDate = hasExpiry ? new Date(p.expire_date) : null;
//       const daysLeft = hasExpiry ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null;
//       const isExpiringSoon = hasExpiry && daysLeft > 0 && expiryDate <= soon;

//       // stock checks
//       const isLowStock = qty < minQty;

//       if (isLowStock) lowStockCount += 1;
//       if (isExpiringSoon) expiringSoonCount += 1;

//       // note
//       let note = "";
//       if (isLowStock) note += `Low stock (min ${minQty}). `;
//       if (isExpiringSoon) note += `Expiring in ${daysLeft} day(s). `;

//       return {
//         id: String(p._id),
//         name: p.pro_name,
//         qtyOnHand: qty,
//         avgCost: cost,          
//         expiryDate: hasExpiry ? expiryDate.toISOString() : null,
//         isLowStock,
//         isExpiringSoon,
//         note: note.trim(),
//       };
//     });

//     return res.json({
//       success: true,
//       generatedAt: new Date().toISOString(),
//       kpis: {
//         totalItems,
//         lowStockCount,
//         expiringSoonCount,
//         totalValue, //still included
//       },
//       rows,
//       params: { minQtyDefault, expDays },
//     });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ success: false, message: "Server error generating report" });
//   }
// };
