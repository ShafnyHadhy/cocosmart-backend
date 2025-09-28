// controllers/rorderController.js
import Rorder from "../models/RorderModel.js";

/**
 * Helpers
 */
function toNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function computeTotal(unit_cost, qty) {
  return toNumber(unit_cost) * toNumber(qty);
}

/**
 * Create
 * - Status always starts as "pending" (even if sent in body)
 * - tot_value auto-computed if missing or out-of-sync
 * - Anyone can call, but typically Inventory Manager
 */
export async function addRorder(req, res) {
  const {
    order_id,
    item_id,
    unit_cost,
    qty,
    tot_value,
    requested_by,
    // status ignored on create
  } = req.body;

  try {
    const total = computeTotal(unit_cost, qty);
    const doc = new Rorder({
      order_id,
      item_id,
      unit_cost: toNumber(unit_cost),
      qty: toNumber(qty),
      tot_value: total, // keep source of truth
      requested_by,
      status: "pending",
    });

    await doc.save();
    return res.status(200).json({ rorder: doc });
  } catch (err) {
    console.error(err);
    if (err.code === 11000 && err.keyPattern?.order_id) {
      return res.status(409).json({ message: "order_id already exists" });
    }
    return res.status(500).json({ message: "unable to add reorder" });
  }
}

/**
 * Read all
 */
export async function getAllRorders(req, res) {
  try {
    const rorders = await Rorder.find();
    if (!rorders) return res.status(404).json({ message: "Reorders not found" });
    return res.status(200).json({ rorders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error" });
  }
}

/**
 * Get by Mongo _id
 */
export async function getRorderById(req, res) {
  const id = req.params.id;
  try {
    const rorder = await Rorder.findById(id);
    if (!rorder) return res.status(404).json({ message: "Reorder not found" });
    return res.status(200).json({ rorder });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error" });
  }
}

/**
 * Update (Inventory Manager or Admin) — NON-STATUS FIELDS ONLY
 * - Blocks status changes here (only adminStatusUpdate can change it)
 * - Recomputes tot_value from unit_cost * qty if either changes
 */
export async function updateRorder(req, res) {
  const id = req.params.id;

  const {
    order_id, // locked
    _id,      // locked
    status,   // blocked here
    item_id,
    unit_cost,
    qty,
    tot_value, // ignored (we recompute)
    requested_by,
  } = req.body;

  const update = {
    item_id,
    unit_cost: unit_cost !== undefined ? toNumber(unit_cost) : undefined,
    qty: qty !== undefined ? toNumber(qty) : undefined,
    requested_by,
  };

  // clean undefineds
  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

  // Recompute tot_value if unit_cost or qty present
  if ("unit_cost" in update || "qty" in update) {
    // need current doc to compute correctly if one of them is missing in payload
    const current = await Rorder.findById(id).lean();
    if (!current) return res.status(404).json({ message: "Reorder not found" });

    const nextUnit = "unit_cost" in update ? update.unit_cost : current.unit_cost;
    const nextQty = "qty" in update ? update.qty : current.qty;
    update.tot_value = computeTotal(nextUnit, nextQty);
  }

  // Explicitly block status changes here
  if (status !== undefined) {
    return res.status(403).json({ message: "Status can only be edited by admin" });
  }

  try {
    const rorder = await Rorder.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!rorder) return res.status(404).json({ message: "Unable to update reorder" });
    return res.status(200).json({ rorder });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error" });
  }
}

/**
 * Admin-only: Update status
 * - Accepts: pending | approved | rejected
 * - Rejects non-admin roles
 */
export async function adminStatusUpdate(req, res) {
  const id = req.params.id;
  const { status } = req.body;

  // Simple role check — adjust to match your auth middleware
  const role = req.user?.role; // e.g., 'admin' | 'inventory_manager'
  if (role !== "admin") {
    return res.status(403).json({ message: "Only admin can update status" });
  }

  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const rorder = await Rorder.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!rorder) return res.status(404).json({ message: "Reorder not found" });
    return res.status(200).json({ rorder });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error" });
  }
}

/**
 * Delete
 * - Typically Inventory Manager (or Admin) can delete. Adjust check as needed.
 */
export async function deleteRorder(req, res) {
  const id = req.params.id;

  try {
    const rorder = await Rorder.findByIdAndDelete(id);
    if (!rorder) {
      return res.status(404).json({ message: "Unable to delete the reorder" });
    }
    return res.status(200).json({ rorder });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error" });
  }
}

/**
 * Utility: check whether order_id already exists
 */
export async function checkOrderId(req, res) {
  try {
    const { order_id } = req.query;
    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id is required" });
    }
    const exists = await Rorder.exists({ order_id });
    return res.json({ success: true, exists: !!exists });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
