import express from "express";
import User from "../models/user.js";
import {
  createUser,
  loginUser,
  updateUser,
  deleteUser,
  getAllUsers,
  verifyPassword,
  changePassword,
} from "../controllers/userController.js";

const userRouter = express.Router();

// Get all users (for admin or display)
userRouter.get("/", getAllUsers);

// Get user by email (for user profile)
userRouter.get("/email/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await User.findOne({ email }).select(
      "firstname lastname email phone role createdAt"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Fetch user by email error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Signup route
userRouter.post("/", createUser);

// Login route
userRouter.post("/login", loginUser);

// Update user
userRouter.put("/:id", updateUser);

// Delete user
userRouter.delete("/:id", deleteUser);

// Verify old password
userRouter.post("/verify-password/:id", verifyPassword);

// Change password
userRouter.put("/change-password/:id", changePassword);

export default userRouter;
