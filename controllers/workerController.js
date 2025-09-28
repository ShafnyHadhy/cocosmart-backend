import Worker from "../models/worker.js";
import User from "../models/user.js";

// Create a worker linked to an existing user with role "worker"
export const createWorker = async (req, res) => {
  try {
    const { workerId, userEmail, jobRole, isAvailable, dateOfBirth } = req.body;
    if (!workerId || !userEmail || !dateOfBirth) {
      return res.status(400).json({ message: "workerId, userEmail, and dateOfBirth are required" });
    }

    // Validate age (18-40)
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18 || age > 40) {
      return res.status(400).json({ message: "Age must be between 18 and 40 years" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user || user.role !== "worker") {
      return res.status(400).json({ message: "User must exist and have role 'worker'" });
    }

    const exists = await Worker.findOne({ $or: [{ workerId }, { userEmail }] });
    if (exists) {
      return res.status(409).json({ message: "Worker with same workerId or userEmail already exists" });
    }

    const worker = new Worker({ workerId, userEmail, jobRole, isAvailable, dateOfBirth });
    await worker.save();
    res.status(201).json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listWorkers = async (_req, res) => {
  try {
    const workers = await Worker.find();
    res.json({ workers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getWorker = async (req, res) => {
  try {
    const worker = await Worker.findOne({ workerId: req.params.workerId });
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateWorker = async (req, res) => {
  try {
    const updated = await Worker.findOneAndUpdate(
      { workerId: req.params.workerId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Worker not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const deleted = await Worker.findOneAndDelete({ workerId: req.params.workerId });
    if (!deleted) return res.status(404).json({ message: "Worker not found" });
    res.json({ message: "Worker deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List users eligible to be created as workers (role 'worker' and not already in Worker collection)
export const listEligibleWorkerUsers = async (_req, res) => {
  try {
    const users = await User.find({ role: "worker" }).select("email firstname lastname role");
    const workerDocs = await Worker.find().select("userEmail");
    const existing = new Set(workerDocs.map(w => w.userEmail));
    const eligible = users.filter(u => !existing.has(u.email));
    res.json({ users: eligible });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List available workers (isAvailable: true)
export const listAvailableWorkers = async (_req, res) => {
  try {
    const workers = await Worker.find({ isAvailable: true }).select("workerId userEmail jobRole");
    const users = await User.find({ email: { $in: workers.map(w => w.userEmail) } }).select("email firstname lastname phone image");
    
    const availableWorkers = workers.map(worker => {
      const user = users.find(u => u.email === worker.userEmail);
      return {
        workerId: worker.workerId,
        userEmail: worker.userEmail,
        jobRole: worker.jobRole,
        name: user ? `${user.firstname} ${user.lastname}` : worker.userEmail,
        phone: user?.phone || "",
        image: user?.image || ""
      };
    });
    
    res.json({ workers: availableWorkers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get worker with assigned tasks
export const getWorkerWithTasks = async (req, res) => {
  try {
    const worker = await Worker.findOne({ workerId: req.params.workerId });
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    
    const user = await User.findOne({ email: worker.userEmail });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Get assigned tasks
    const Task = (await import("../models/taskModel.js")).default;
    const tasks = await Task.find({ 
      deleted: false, 
      assignedWorkers: worker.workerId 
    });
    
    // Calculate age
    const today = new Date();
    const birthDate = new Date(worker.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    res.json({
      worker: {
        ...worker.toObject(),
        name: `${user.firstname} ${user.lastname}`,
        age,
        phone: user.phone || "",
        image: user.image || "",
        assignedTasks: tasks
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update worker profile
export const updateWorkerProfile = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { jobRole, skills, hourlyRate, notes } = req.body;

    const updatedWorker = await Worker.findOneAndUpdate(
      { workerId },
      { jobRole, skills, hourlyRate, notes, lastActiveAt: new Date() },
      { new: true }
    );

    if (!updatedWorker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    res.json({ message: "Worker profile updated successfully", worker: updatedWorker });
  } catch (error) {
    console.error("Error updating worker profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get workforce analytics
export const getWorkforceAnalytics = async (req, res) => {
  try {
    const workers = await Worker.find();
    const totalWorkers = workers.length;
    const availableWorkers = workers.filter(w => w.isAvailable).length;
    const busyWorkers = totalWorkers - availableWorkers;
    
    // Calculate average performance rating
    const avgPerformanceRating = workers.length > 0 
      ? workers.reduce((sum, w) => sum + (w.performanceRating || 0), 0) / workers.length 
      : 0;
    
    // Workers by job role
    const roleDistribution = workers.reduce((acc, worker) => {
      acc[worker.jobRole] = (acc[worker.jobRole] || 0) + 1;
      return acc;
    }, {});
    
    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = workers.filter(w => new Date(w.createdAt) >= thirtyDaysAgo).length;
    
    // Top performers (by performance rating)
    const topPerformers = workers
      .filter(w => w.performanceRating > 0)
      .sort((a, b) => (b.performanceRating || 0) - (a.performanceRating || 0))
      .slice(0, 5)
      .map(w => ({
        workerId: w.workerId,
        performanceRating: w.performanceRating,
        totalTasksCompleted: w.totalTasksCompleted || 0
      }));
    
    res.json({
      totalWorkers,
      availableWorkers,
      busyWorkers,
      utilizationRate: totalWorkers > 0 ? (availableWorkers / totalWorkers) * 100 : 0,
      avgPerformanceRating: Math.round(avgPerformanceRating * 10) / 10,
      roleDistribution,
      recentRegistrations,
      topPerformers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update worker performance metrics
export const updateWorkerPerformance = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { totalTasksCompleted, totalHoursWorked, performanceRating } = req.body;
    
    const worker = await Worker.findOneAndUpdate(
      { workerId },
      { 
        totalTasksCompleted, 
        totalHoursWorked, 
        performanceRating,
        lastActiveAt: new Date()
      },
      { new: true }
    );
    
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


