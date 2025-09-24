// const PurchasedItem = require("../models/PurchasedItemModel");

// //display part
// const getAllCocoProducts = async (req, res, next) => {
//   let cocoProducts;

//   //get all users
//   try {
//     cocoProducts = await CocoProduct.find();
//   } catch (err) {
//     console.log(err);
//   }

//   //not found
//   if (!cocoProducts) {
//     return res.status(404).json({ message: "Coco Product not found" });
//   }

//   //display all users
//   return res.status(200).json({ cocoProducts });
// };
