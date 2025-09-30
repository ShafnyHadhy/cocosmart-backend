// routes/taskRoutes.js
import express from "express";
import {
  getTasks,
  getDeletedTasks,
  getTaskById,
  createTask,
  updateTask,
  softDeleteTask,
  restoreTask,
  permanentDeleteTask,
  getTasksForWorker,
  updateTaskStatusByWorker,
  getTaskAnalytics,
  getWorkerAnalytics,
  assignWorkerToTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.get("/", getTasks);                // active
router.get("/trash", getDeletedTasks);    // deleted only
router.get("/analytics", getTaskAnalytics); // task analytics
router.get("/worker/:workerId", getTasksForWorker);
router.get("/worker/:workerId/analytics", getWorkerAnalytics); // worker analytics
router.get("/:taskId", getTaskById);
router.post("/", createTask);
router.put("/:taskId", updateTask);
router.delete("/:taskId", softDeleteTask);
router.post("/:taskId/restore", restoreTask);
router.delete("/:taskId/permanent", permanentDeleteTask);
router.patch("/:taskId/status", updateTaskStatusByWorker);
router.post("/:taskId/assign", assignWorkerToTask);

export default router;
