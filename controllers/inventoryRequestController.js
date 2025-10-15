import InventoryRequest from "../models/InventoryRequest.js";

// Create a new request
export const createInventoryRequest = async (req, res) => {
  try {
    const { productID, productName, description, requestedBy } = req.body;

    const newRequest = await InventoryRequest.create({
      productID,
      productName,
      description,
      requestedBy,
    });

    res.status(201).json({
      message: "Request sent successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("Error creating inventory request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all requests (for admin or inventory manager)
export const getAllRequests = async (req, res) => {
  try {
    const requests = await InventoryRequest.find()
      .populate("productId", "name price")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching inventory requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update request status (e.g., Approve or Reject)
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedRequest = await InventoryRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({
      message: "Request status updated successfully",
      updatedRequest,
    });
  } catch (error) {
    console.error("Error updating inventory request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
