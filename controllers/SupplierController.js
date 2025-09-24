import Supplier from "../models/SupplierModel.js";

//Create
export async function addSuppliers(req, res, next) {
  const {
    sup_id,
    sup_name,
    email,
    contact,
    address,
  } = req.body;

  let suppliers;

  try {
    suppliers = new Supplier({
    sup_id,
    sup_name,
    email,
    contact,
    address,
    });
    await suppliers.save();
  } catch (err) {
    console.log(err);
    //this add nice error for duplicate pro_id
    if (err.code === 11000 && err.keyPattern?.sup_id) {
      return res.status(409).json({ message: "sup_id already exists" });
    }
    return res.status(500).json({ message: "unable to add Supplier" });
  }
  //if not inserting data to DB
  if (!suppliers) {
    return res.status(404).json({ message: "unable to add Supplier" });
  }
  return res.status(200).json({ suppliers });
}

//read/display part
export async function getAllSuppliers(req, res, next) {
  let suppliers;

  //get all items
  try {
    suppliers = await Supplier.find();
  } catch (err) {
    console.log(err);
  }

  //not found
  if (!suppliers) {
    return res.status(404).json({ message: "Supplier not found" });
  }

  //display all items
  return res.status(200).json({ suppliers });
}

//get by Id
export async function getSupplierById(req, res, next) {
  const id = req.params.id; //display using an ID

  let suppliers; //create variable

  try {
    suppliers = await Supplier.findById(id);
  } catch (err) {
    console.log(err);
  }

  //if there are no available users
  if (!suppliers) {
    return res.status(404).json({ message: "Supplier not found" });
  }
  return res.status(200).json({ suppliers });
}

//Update
export async function updateSupplier(req, res, next) {
  const id = req.params.id;

  const {
    sup_id, // stripped (locked)
    _id, // stripped
    sup_name,
    email,
    contact,
    address,
  } = req.body;

  const allowed = {
    sup_name,
    email,
    contact,
    address,
  };

  let suppliers;
  try {
    suppliers = await Supplier.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true, runValidators: true }
    );
  } catch (err) {
    console.log(err);
  }

  if (!suppliers) {
    return res
      .status(404)
      .json({ message: "Unable to update supplier details" });
  }
  return res.status(200).json({ suppliers });
}

export async function deleteSupplier(req, res, next) {
  const id = req.params.id;

  let suppliers;

  try {
    suppliers = await Supplier.findByIdAndDelete(id);
  } catch (err) {
    console.log(err);
  }
  if (!suppliers) {
    return res
      .status(404)
      .json({ message: "Unable to delete the supplier" });
  }
  return res.status(200).json({ suppliers });
}


// check whether item_id is already existing
export async function checkSupId (req, res) {
  try {
    const { sup_id } = req.query;
    if (!sup_id) {
      return res
        .status(400)
        .json({ success: false, message: "sup_id is required" });
    }
    const exists = await Supplier.exists({ sup_id });
    return res.json({ success: true, exists: !!exists });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};