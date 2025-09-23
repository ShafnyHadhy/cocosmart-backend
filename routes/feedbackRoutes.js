import express from "express";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  replyToFeedback,
  deleteFeedback,
} from "../controllers/feedbackController.js";

const router = express.Router();

router.post("/", createFeedback); // User submits feedback
router.get("/", getAllFeedback); // Admin/User view all
router.get("/:id", getFeedbackById); // Admin views one
router.put("/:id/reply", replyToFeedback); // Admin replies
router.delete("/:id", deleteFeedback); // Admin deletes

export default router;
