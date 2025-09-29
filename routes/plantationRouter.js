import express from "express";
import { getAllPlots, addPlot, getPlotByID, updatePlot, deletePlot } from "../controllers/plantationController.js";

const router = express.Router();

// GET all plots
router.get("/", getAllPlots);

// POST add new plot
router.post("/", addPlot);

router.put("/:plotID", updatePlot);
router.delete("/:plotID", deletePlot);


//GET By ID
router.get("/:plotID", getPlotByID);


export default router;
