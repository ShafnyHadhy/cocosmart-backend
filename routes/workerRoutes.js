import express from "express";
import {
  createWorker,
  listWorkers,
  getWorker,
  updateWorker,
  deleteWorker,
  listEligibleWorkerUsers,
  getWorkerWithTasks,
  listAvailableWorkers,
  updateWorkerProfile,
  getWorkforceAnalytics,
  updateWorkerPerformance,
} from "../controllers/workerController.js";

const router = express.Router();

router.get("/", listWorkers);
router.post("/", createWorker);
router.get("/analytics", getWorkforceAnalytics); // workforce analytics
router.get("/:workerId", getWorker);
router.get("/:workerId/details", getWorkerWithTasks);
router.put("/:workerId", updateWorker);
router.put("/:workerId/profile", updateWorkerProfile);
router.put("/:workerId/performance", updateWorkerPerformance); // update performance metrics
router.delete("/:workerId", deleteWorker);
router.get("/eligible/users", listEligibleWorkerUsers);
router.get("/available/list", listAvailableWorkers);

export default router;


