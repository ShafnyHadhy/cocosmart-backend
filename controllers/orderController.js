import Order from "../models/order.js";
import Product from "../models/product.js";
import { isAdmin, isCustomer } from "./userController.js";

export async function createOrder(req, res) {
  try {
    const user = req.user;

    if (user == null) {
      res.status(401).json({
        message: "Unaurthorized user...",
      });
      return;
    }

    const orderList = await Order.find().sort({ date: -1 }).limit(1);

    let newOrderID = "ORD0000001";

    if (orderList.length != 0) {
      let lastOrderIDInString = orderList[0].orderID; //"ORD0000123"
      let lastOrderNumberInString = lastOrderIDInString.replace("ORD", ""); //"0000123"
      let lastOrderNumber = parseInt(lastOrderNumberInString); //123
      let newOrderNumber = lastOrderNumber + 1; //124
      //padsStart
      let newOrderNumberInString = newOrderNumber.toString().padStart(7, "0"); //"00001234"

      newOrderID = "ORD" + newOrderNumberInString; //"ORD0000124"
    }

    let customerName = req.body.name;
    if (customerName == null) {
      customerName = user.firstname + " " + user.lastname;
    }

    let phone = req.body.phone;
    if (phone == null) {
      phone = "Not provided";
    }

    const itemsInRequest = req.body.items;

    if (itemsInRequest == null) {
      res.status(400).json({
        message: "Items are required to place an Order",
      });
      return;
    }

    if (!Array.isArray(itemsInRequest)) {
      res.status(400).json({
        message: "Items should be an array",
      });
      return;
    }

    const itemsToBeAdded = [];
    let total = 0;

    for (let i = 0; i < itemsInRequest.length; i++) {
      const item = itemsInRequest[i];

      const product = await Product.findOne({ productID: item.productID });

      if (product == null) {
        res.status(400).json({
          code: "not-found",
          message: `Product with ID ${item.productID} not found`,
          productID: item.productID,
        });
        return;
      }

      if (product.stock < item.quantity) {
        res.status(400).json({
          code: "stock",
          message: `Insufficient stock for product ID ${item.productID}`,
          productID: item.productID,
          availableStock: item.stock,
        });
        return;
      }

      itemsToBeAdded.push({
        productID: product.productID,
        quantity: item.quantity,
        name: product.name,
        price: product.price,
        image: product.images[0],
      });

      total += product.price * item.quantity;
    }

    const newOrder = new Order({
      orderID: newOrderID,
      items: itemsToBeAdded,
      customerName: customerName,
      email: user.email,
      phone: phone,
      address: req.body.address,
      total: total,
      status: "pending",
    });

    const savedOrder = await newOrder.save();

    for (let i = 0; i < itemsToBeAdded.length; i++) {
      const item = itemsToBeAdded[i];
      await Product.updateOne(
        { productID: item.productID },
        { $inc: { stock: -item.quantity } }
      );
    }

    res.status(201).json({
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// export async function getOrders(req, res) {
//   if (isAdmin(req)) {
//     const orders = await Order.find().sort({ date: -1 });
//     res.json({ orders });
//   } else if (isCustomer(req)) {
//     const orders = await Order.find({ email: user.email }).sort({ date: -1 });
//     res.json({ orders });
//   } else {
//     res.status(403).json({
//       message: "You are not authorized to view orders",
//     });
//   }
// }

export async function getOrders(req, res) {
  try {
    if (isAdmin(req)) {
      const orders = await Order.find().sort({ date: -1 });
      return res.json({ orders });
    }

    if (isCustomer(req)) {
      const orders = await Order.find({ email: req.user.email }).sort({
        date: -1,
      });
      return res.json({ orders });
    }

    return res.status(403).json({
      message: "You are not authorized to view orders",
    });
  } catch (err) {
    console.error("Error in getOrders:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
}

export async function updatOrderStatus(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({
      message: "You are not authorized to update an order",
    });
    return;
  }

  const orderID = req.params.orderID;
  const newStatus = req.body.status;

  try {
    await Order.updateOne({ orderID: orderID }, { status: newStatus });

    res.json({
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update order status",
    });
    return;
  }
}
