// controllers/taskController.js
import Task from "../models/taskModel.js";
import Worker from "../models/worker.js";

// Get active (non-deleted) tasks
export const getTasks = async (req, res) => {
  try {
    const filter = { deleted: false };
    if (req.query.status) filter.status = req.query.status;
    const tasks = await Task.find(filter);
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get deleted tasks (trash)
export const getDeletedTasks = async (_req, res) => {
  try {
    const tasks = await Task.find({ deleted: true });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get one task by taskId
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.taskId });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create task
export const createTask = async (req, res) => {
  try {
    const { 
      taskId, 
      title, 
      description, 
      priority, 
      category, 
      scheduledDate, 
      scheduledTime, 
      estimatedHours, 
      status, 
      assignedWorkers 
    } = req.body;
    
    // Optional: Validate assigned workers exist
    if (Array.isArray(assignedWorkers) && assignedWorkers.length) {
      const count = await Worker.countDocuments({ workerId: { $in: assignedWorkers } });
      if (count !== assignedWorkers.length) {
        return res.status(400).json({ message: "One or more assigned workers do not exist" });
      }
    }
    
    const newTask = new Task({ 
      taskId, 
      title, 
      description, 
      priority, 
      category, 
      scheduledDate, 
      scheduledTime, 
      estimatedHours, 
      status, 
      assignedWorkers: assignedWorkers || [] 
    });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const body = req.body;
    if (Array.isArray(body.assignedWorkers) && body.assignedWorkers.length) {
      const count = await Worker.countDocuments({ workerId: { $in: body.assignedWorkers } });
      if (count !== body.assignedWorkers.length) {
        return res.status(400).json({ message: "One or more assigned workers do not exist" });
      }
    }
    const updated = await Task.findOneAndUpdate(
      { taskId: req.params.taskId },
      body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Task not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List tasks for a specific worker
export const getTasksForWorker = async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const tasks = await Task.find({ deleted: false, assignedWorkers: workerId });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Worker updates own status for a task
export const updateTaskStatusByWorker = async (req, res) => {
  try {
    const { status, workerId } = req.body; // "To Do" | "In Progress" | "Completed"
    const { taskId } = req.params;
    
    console.log("Updating task status:", { taskId, status, workerId });
    
    if (!status) return res.status(400).json({ message: "status is required" });
    if (!workerId) return res.status(400).json({ message: "workerId is required" });

    const task = await Task.findOne({ taskId });
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check if worker is assigned to this task
    if (!task.assignedWorkers.includes(workerId)) {
      return res.status(403).json({ message: "Worker not assigned to this task" });
    }

    // Update worker availability based on status
    try {
      if (status === 'In Progress') {
        // Mark worker as busy when they start working
        await Worker.findOneAndUpdate(
          { workerId },
          { isAvailable: false, lastActiveAt: new Date() }
        );
        console.log("Worker marked as busy:", workerId);
      } else if (status === 'Completed' || status === 'To Do') {
        // Check if worker has any other in-progress tasks
        const otherInProgressTasks = await Task.find({
          assignedWorkers: workerId,
          status: 'In Progress',
          taskId: { $ne: taskId }
        });
        
        // If no other in-progress tasks, mark as available
        if (otherInProgressTasks.length === 0) {
          await Worker.findOneAndUpdate(
            { workerId },
            { isAvailable: true, lastActiveAt: new Date() }
          );
          console.log("Worker marked as available:", workerId);
        }
      }
    } catch (workerError) {
      console.error("Error updating worker availability:", workerError);
      // Don't fail the entire request if worker update fails
    }

    // Update task status
    task.status = status;
    if (status === 'Completed') {
      task.completedAt = new Date();
      task.completedBy = workerId;
    }
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get task analytics
export const getTaskAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filter = { deleted: false };
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const tasks = await Task.find(filter);
    
    // Calculate analytics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const todoTasks = tasks.filter(t => t.status === 'To Do').length;
    const onHoldTasks = tasks.filter(t => t.status === 'On Hold').length;
    
    // Priority distribution
    const priorityStats = {
      Low: tasks.filter(t => t.priority === 'Low').length,
      Medium: tasks.filter(t => t.priority === 'Medium').length,
      High: tasks.filter(t => t.priority === 'High').length,
      Critical: tasks.filter(t => t.priority === 'Critical').length
    };
    
    // Category distribution
    const categoryStats = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});
    
    // Overdue tasks
    const today = new Date();
    const overdueTasks = tasks.filter(task => {
      if (!task.scheduledDate) return false;
      return new Date(task.scheduledDate) < today && task.status !== 'Completed';
    }).length;
    
    // Average completion time (for completed tasks)
    const completedTasksWithTime = tasks.filter(t => t.status === 'Completed' && t.completedAt);
    const avgCompletionTime = completedTasksWithTime.length > 0 
      ? completedTasksWithTime.reduce((sum, task) => {
          const completionTime = new Date(task.completedAt) - new Date(task.createdAt);
          return sum + completionTime;
        }, 0) / completedTasksWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      onHoldTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      priorityStats,
      categoryStats,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get worker performance analytics
export const getWorkerAnalytics = async (req, res) => {
  try {
    const { workerId } = req.params;
    
    // Get worker's tasks
    const tasks = await Task.find({ 
      deleted: false, 
      assignedWorkers: workerId 
    });
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const todoTasks = tasks.filter(t => t.status === 'To Do').length;
    
    // Calculate performance metrics
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Average task completion time
    const completedTasksWithTime = tasks.filter(t => t.status === 'Completed' && t.completedAt);
    const avgCompletionTime = completedTasksWithTime.length > 0 
      ? completedTasksWithTime.reduce((sum, task) => {
          const completionTime = new Date(task.completedAt) - new Date(task.createdAt);
          return sum + completionTime;
        }, 0) / completedTasksWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;
    
    // Tasks by priority
    const priorityBreakdown = {
      Low: tasks.filter(t => t.priority === 'Low').length,
      Medium: tasks.filter(t => t.priority === 'Medium').length,
      High: tasks.filter(t => t.priority === 'High').length,
      Critical: tasks.filter(t => t.priority === 'Critical').length
    };
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTasks = tasks.filter(t => new Date(t.createdAt) >= thirtyDaysAgo);
    
    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate: Math.round(completionRate * 10) / 10,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      priorityBreakdown,
      recentTasks: recentTasks.length,
      performanceRating: completionRate >= 90 ? 5 : 
                        completionRate >= 80 ? 4 : 
                        completionRate >= 70 ? 3 : 
                        completionRate >= 60 ? 2 : 1
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Soft delete -> trash
export const softDeleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { taskId: req.params.taskId },
      { deleted: true },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task moved to trash", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Restore
export const restoreTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { taskId: req.params.taskId },
      { deleted: false },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task restored", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Permanent delete
export const permanentDeleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ taskId: req.params.taskId });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Assign worker to existing task
export const assignWorkerToTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { workerId } = req.body;
    
    if (!workerId) {
      return res.status(400).json({ message: "Worker ID is required" });
    }
    
    // Check if task exists
    const task = await Task.findOne({ taskId, deleted: false });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Check if worker exists
    const worker = await Worker.findOne({ workerId });
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    
    // Initialize assignedWorkers array if it doesn't exist
    if (!task.assignedWorkers) {
      task.assignedWorkers = [];
    }
    
    // Check if worker is already assigned
    if (task.assignedWorkers.includes(workerId)) {
      return res.status(400).json({ message: "Worker is already assigned to this task" });
    }
    
    // Add worker to assigned workers
    task.assignedWorkers.push(workerId);
    await task.save();
    
    console.log('Worker assigned successfully:', { taskId, workerId, assignedWorkers: task.assignedWorkers });
    
    res.json({ message: "Worker assigned to task successfully", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
