//const CocoProduct = require("../models/CocoProductModel");
import CocoProduct from '../models/CocoProductModel.js';

//const { default: CocoProduct } = require("../models/CocoProductModel");



import Stock from "../models/StockModel.js";
import { v4 as uuidv4 } from "uuid";
function todayAt00() {
  const t = new Date(); t.setHours(0,0,0,0); return t;
}


async function logStock({ item_id, type, reason, qty, std_cost, unit_cost, enter_by }) {
  if (!qty || qty <= 0) return;
  await Stock.create({
    item_id,
    category: "product" || "purchased",  // depending on controller
    type,
    reason,
    qty,
    tot_value: Number(std_cost || unit_cost || 0) * Number(qty || 0),
    date: todayAt00(),
    enter_by: enter_by || "system",
  });
}


//data insert part
export async function addCocoProducts (req, res, next) {
  const {
    pro_id,
    pro_name,
    pro_category,
    pro_uom,
    std_cost,
    qty_on_hand,
    qty_reserved,
    expire_date,
    updated_at,
    updated_by,
  } = req.body;

  let cocoProducts;

  try {
    cocoProducts = new CocoProduct({
      pro_id,
      pro_name,
      pro_category,
      pro_uom,
      std_cost,
      qty_on_hand,
      qty_reserved,
      expire_date,
      updated_at,
      updated_by,
    });
    await cocoProducts.save();
    await logStock({
  item_id: pro_id,
  type: "in",
  reason: "coco-create",
  qty: Number(qty_on_hand || 0),
  std_cost: Number(std_cost || 0),
  enter_by: updated_by,
});

  } catch (err) {
    console.log(err);
    //this add nice error for duplicate pro_id
    if (err.code === 11000 && err.keyPattern?.pro_id) {
      return res.status(409).json({ message: "pro_id already exists" });
    }
    return res.status(500).json({ message: "unable to add Coco Product" });
  }
  //if not inserting data to DB
  if (!cocoProducts) {
    return res.status(404).json({ message: "unable to add Coco Product" });
  }
  return res.status(200).json({ cocoProducts });
};


//display part
export async function getAllCocoProducts(req, res, next){
  let cocoProducts;

  //get all users
  try {
    cocoProducts = await CocoProduct.find();
  } catch (err) {
    console.log(err);
  }

  //not found
  if (!cocoProducts) {
    return res.status(404).json({ message: "Coco Product not found" });
  }

  //display all users
  return res.status(200).json({ cocoProducts });
};


//get by Id
export async function getCocoProductById (req, res, next){
  const id = req.params.id; //display using an ID

  let cocoProducts; //create variable

  try {
    cocoProducts = await CocoProduct.findById(id);
  } catch (err) {
    console.log(err);
  }

  //if there are no available users
  if (!cocoProducts) {
    return res.status(404).json({ message: "Coco Product not found" });
  }
  return res.status(200).json({ cocoProducts });
};


//Update
export async function updateCocoProduct  (req, res, next) {
  const id = req.params.id;
  const oldDoc = await CocoProduct.findById(id).lean();


  const {
    pro_id, // stripped (locked)
    _id, // stripped
    updated_at, // stripped (backend controls)
    // allowed fields:
    pro_name,
    pro_category,
    pro_uom,
    std_cost,
    qty_on_hand,
    qty_reserved,
    expire_date,
    updated_by,
  } = req.body;

  const allowed = {
    pro_name,
    pro_category,
    pro_uom,
    std_cost,
    qty_on_hand,
    qty_reserved,
    expire_date,
    updated_by,
  };

  let cocoProducts;
  try {
    cocoProducts = await CocoProduct.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true, runValidators: true }
    );
    if (oldDoc) {
  const oldOnHand = Number(oldDoc.qty_on_hand || 0);
  const newOnHand = Number(cocoProducts.qty_on_hand || 0);
  const incOnHand = newOnHand - oldOnHand;

  if (incOnHand > 0) {
    await logStock({
      item_id: oldDoc.pro_id,
      type: "in",
      reason: "products-in",
      qty: incOnHand,
      std_cost: Number(cocoProducts.std_cost || 0),
      enter_by: cocoProducts.updated_by,
    });
  }

  const oldRes = Number(oldDoc.qty_reserved || 0);
  const newRes = Number(cocoProducts.qty_reserved || 0);
  const incRes = newRes - oldRes;

  if (incRes > 0) {
    await logStock({
      item_id: oldDoc.pro_id,
      type: "out",
      reason: "for-sale",
      qty: incRes,
      std_cost: Number(cocoProducts.std_cost || 0),
      enter_by: cocoProducts.updated_by,
    });
  }
}

  } catch (err) {
    console.log(err);
  }

  if (!cocoProducts) {
    return res
      .status(404)
      .json({ message: "Unable to update coco product details" });
  }
  return res.status(200).json({ cocoProducts });
};


export async function deleteCocoProduct (req, res, next) {
  const id = req.params.id;

  let cocoProducts;

  try {
    cocoProducts = await CocoProduct.findByIdAndDelete(id);
  } catch (err) {
    console.log(err);
  }
  if (!cocoProducts) {
    return res
      .status(404)
      .json({ message: "Unable to delete the coco product" });
  }
  return res.status(200).json({ cocoProducts });
};


// check whether pro_id is already existing
export async function checkProId (req, res) {
  try {
    const { pro_id } = req.query;
    if (!pro_id) {
      return res
        .status(400)
        .json({ success: false, message: "pro_id is required" });
    }
    const exists = await CocoProduct.exists({ pro_id });
    return res.json({ success: true, exists: !!exists });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

//Create Coco Products Inventory report function
export async function getCocoInventoryReport (req, res) {
  try {
    // thresholds
    const minQtyDefault = Number(req.query.minQty ?? 100000); // GLOBAL low-stock threshold
    const expDays = Number(req.query.expDays ?? 30);          // expiring soon window (days)

    const now = new Date();
    const soon = new Date(now.getTime() + expDays * 24 * 60 * 60 * 1000);

    const products = await CocoProduct.find().lean();

    const totalItems = products.length;
    let lowStockCount = 0;
    let expiringSoonCount = 0;
    let totalValue = 0; // keep total value KPI (qty * avg cost)

    const rows = products.map(p => {
      const qty = Number(p.qty_on_hand || 0);
      const cost = Number(p.std_cost || 0);  // keep avg cost
      const value = qty * cost;
      totalValue += value;

      const minQty = minQtyDefault;

      // expiry checks
      const hasExpiry = !!p.expire_date;
      const expiryDate = hasExpiry ? new Date(p.expire_date) : null;
      const daysLeft = hasExpiry ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null;
      const isExpiringSoon = hasExpiry && daysLeft > 0 && expiryDate <= soon;

      // stock checks
      const isLowStock = qty < minQty;

      if (isLowStock) lowStockCount += 1;
      if (isExpiringSoon) expiringSoonCount += 1;

      // note
      let note = "";
      if (isLowStock) note += `Low stock (min ${minQty}). `;
      if (isExpiringSoon) note += `Expiring in ${daysLeft} day(s). `;

      return {
        id: String(p._id),
        name: p.pro_name,
        qtyOnHand: qty,
        avgCost: cost,          
        expiryDate: hasExpiry ? expiryDate.toISOString() : null,
        isLowStock,
        isExpiringSoon,
        note: note.trim(),
      };
    });

    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalItems,
        lowStockCount,
        expiringSoonCount,
        totalValue, //still included
      },
      rows,
      params: { minQtyDefault, expDays },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error generating report" });
  }
};




















// //data insert part
// const addCocoProducts = async (req, res, next) => {
//   const {
//     pro_id,
//     pro_name,
//     pro_category,
//     pro_uom,
//     pro_description,
//     std_cost,
//     sell_price,
//     qty_on_hand,
//     qty_reserved,
//     expire_date,
//     updated_at,
//     updated_by,
//   } = req.body;

//   let cocoProducts;

//   try {
//     cocoProducts = new CocoProduct({
//       pro_id,
//       pro_name,
//       pro_category,
//       pro_uom,
//       pro_description,
//       std_cost,
//       sell_price,
//       qty_on_hand,
//       qty_reserved,
//       expire_date,
//       updated_at,
//       updated_by,
//     });
//     await cocoProducts.save();
//   } catch (err) {
//     console.log(err);
//     // ✨ ADDED: nice error for duplicate pro_id
//     if (err.code === 11000 && err.keyPattern?.pro_id) {
//       return res.status(409).json({ message: "pro_id already exists" });
//     }
//     return res.status(500).json({ message: "unable to add Coco Product" });
//   }
//   //if not inserting data to DB
//   if (!cocoProducts) {
//     return res.status(404).json({ message: "unable to add Coco Product" });
//   }
//   return res.status(200).json({ cocoProducts });
// };

// //get by Id
// const getCocoProductById = async (req, res, next) => {
//   const id = req.params.id; //display using an ID

//   let cocoProducts; //create variable

//   try {
//     cocoProducts = await CocoProduct.findById(id);
//   } catch (err) {
//     console.log(err);
//   }

//   //if there are no available users
//   if (!cocoProducts) {
//     return res.status(404).json({ message: "Coco Product not found" });
//   }
//   return res.status(200).json({ cocoProducts });
// };

// // //update coco product details
// //     const updateCocoProduct = async (req, res, next) => {

// //         const id = req.params.id;
// //         const {pro_id,pro_name,pro_category,pro_uom,pro_description,std_cost,sell_price,qty_on_hand,qty_reserved,expire_date,updated_at,updated_by} = req.body;

// //         let cocoProducts;  // create a variable

// //         try{    //variable eka update kranna method ekk call kranna oone
// //             cocoProducts = await CocoProduct.findByIdAndUpdate(id,{
// //                 pro_id:pro_id,pro_name:pro_name,pro_category:pro_category,pro_uom:pro_uom,pro_description:pro_description,std_cost:std_cost,sell_price:sell_price,qty_on_hand:qty_on_hand,qty_reserved:qty_reserved,expire_date:expire_date,updated_at:updated_at,updated_by:updated_by
// //             });
// //             cocoProducts = await cocoProducts.save();
// //         }catch(err){
// //             console.log(err);
// //         }
// //         if(!cocoProducts){
// //             return res.status(404).json({message: "Unable to update coco product details"});
// //         }
// //             return res.status(200).json({cocoProducts});
// //     }

// // update coco product details
// const updateCocoProduct = async (req, res, next) => {
//   const id = req.params.id;

//   const {
//     pro_id, // stripped (locked)
//     _id, // stripped
//     updated_at, // stripped (backend controls)
//     // allowed fields:
//     pro_name,
//     pro_category,
//     pro_uom,
//     pro_description,
//     std_cost,
//     sell_price,
//     qty_on_hand,
//     qty_reserved,
//     expire_date,
//     updated_by,
//   } = req.body;

//   const allowed = {
//     pro_name,
//     pro_category,
//     pro_uom,
//     pro_description,
//     std_cost,
//     sell_price,
//     qty_on_hand,
//     qty_reserved,
//     expire_date,
//     updated_by,
//   };

//   let cocoProducts;
//   try {
//     cocoProducts = await CocoProduct.findByIdAndUpdate(
//       id,
//       { $set: allowed },
//       { new: true, runValidators: true }
//     );
//   } catch (err) {
//     console.log(err);
//   }

//   if (!cocoProducts) {
//     return res
//       .status(404)
//       .json({ message: "Unable to update coco product details" });
//   }
//   return res.status(200).json({ cocoProducts });
// };

// //deelte coco product
// const deleteCocoProduct = async (req, res, next) => {
//   const id = req.params.id;

//   let cocoProducts;

//   try {
//     cocoProducts = await CocoProduct.findByIdAndDelete(id);
//   } catch (err) {
//     console.log(err);
//   }
//   if (!cocoProducts) {
//     return res
//       .status(404)
//       .json({ message: "Unable to delete the coco product" });
//   }
//   return res.status(200).json({ cocoProducts });
// };

// // define the function
// const checkProId = async (req, res) => {
//   try {
//     const { pro_id } = req.query;
//     if (!pro_id) {
//       return res
//         .status(400)
//         .json({ success: false, message: "pro_id is required" });
//     }
//     const exists = await CocoProduct.exists({ pro_id });
//     return res.json({ success: true, exists: !!exists });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // ---- REPORT: Coco Products Inventory (Avg Cost kept, Sell Price removed) ----
// const getCocoInventoryReport = async (req, res) => {
//   try {
//     // thresholds
//     const minQtyDefault = Number(req.query.minQty ?? 100000); // GLOBAL low-stock threshold
//     const expDays = Number(req.query.expDays ?? 14);          // expiring soon window (days)

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
//       // REMOVED: const sell = Number(p.sell_price || 0);
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
//         avgCost: cost,                             // ✅ keep
//         // REMOVED: sellPrice
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
//         totalValue, // ✅ still included
//       },
//       rows,
//       params: { minQtyDefault, expDays },
//     });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ success: false, message: "Server error generating report" });
//   }
// };

// exports.getCocoInventoryReport = getCocoInventoryReport;
// // export it here with the rest:
// exports.checkProId = checkProId;

// exports.deleteCocoProduct = deleteCocoProduct;
// exports.updateCocoProduct = updateCocoProduct;
// exports.getCocoProductById = getCocoProductById;
//exports.getAllCocoProducts = getAllCocoProducts;
// exports.addCocoProducts = addCocoProducts;
// exports.checkProId = checkProId;
