import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Signup
export async function createUser(req, res) {
  try {
    const { firstname, lastname, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone)
      return res
        .status(400)
        .json({ message: "Phone number already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstname,
      lastname,
      email,
      phone,
      password: hashedPassword,
      role: "user", // matches schema enum
    });

    await user.save();
    res.json({ message: "User created successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Failed to create user", error });
  }
}

// Login
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      {
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        phone: user.phone,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
}

// Get all users
export async function getAllUsers(req, res) {
  try {
    const users = await User.find().select(
      "firstname lastname email phone role createdAt"
    );
    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

// Update user (including role)
export async function updateUser(req, res) {
  try {
    const userId = req.params.id;
    const { firstname, lastname, email, phone, password, role } = req.body;

    const updatedData = { firstname, lastname, email, phone, role };

    if (password) updatedData.password = await bcrypt.hash(password, 10);

    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user", error });
  }
}

// Delete user
export async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user", error });
  }
}
//.......................................................
// Get user by email
export async function getUserByEmail(req, res) {
  try {
    const email = req.params.email;
    const user = await User.findOne({ email }).select(
      "firstname lastname email phone role createdAt"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Get user by email error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

// Verify old password
export async function verifyPassword(req, res) {
  try {
    const userId = req.params.id;
    const { oldPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.json({ success: false });

    res.json({ success: true });
  } catch (error) {
    console.error("Verify password error:", error);
    res.status(500).json({ message: "Failed to verify password" });
  }
}

// Change password
export async function changePassword(req, res) {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
}

export function isAdmin(req) {
  if (req.user == null) {
    return false;
  }
  if (req.user.role != "admin") {
    return false;
  }

  return true;
}

export function isCustomer(req) {
  if (req.user == null) {
    return false;
  }
  if (req.user.role != "user") {
    return false;
  }

  return true;
}

export function isInventory(req) {
  if (req.user == null) return false;
  if (req.user.role !== "Inventory") return false;
  return true;
}
