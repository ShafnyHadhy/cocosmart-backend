import Plot from "../models/plantation.js";

// GET all plots
export const getAllPlots = async (req, res) => {
  try {
    const plots = await Plot.find();
    if (!plots || plots.length === 0) {
      return res.status(404).json({ message: "No plots found" });
    }
    return res.status(200).json(plots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST add new plot
export const addPlot = async (req, res) => {
  const { plotID, name, location, size, noOfTrees, irrigationSchedules, harvest } = req.body;

  try {
    const plot = new Plot({
      plotID,
      name,
      location,
      size,
      noOfTrees,
      irrigationSchedules,
      harvest,
    });

    await plot.save();

    return res.status(201).json(plot);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error adding plot" });
  }
};

export async function getPlotByID(req, res){
    try{
        const plotID = req.params.plotID;

        const plot = await Plot.findOne(
            {
                plotID: plotID
            }
        )

        if(plot == null){
            res.status(404).json({
                message: "Plot not found"
            })
        }else{
            res.json(plot);
        }
    }catch(err){
        console.error(err);
        res.status(500).json({
            message: "Failed to retrive plot by ID"
        })
    }
}

export async function updatePlot(req, res){

    // if(!isAdmin(req)){
    //     res.status(403).json({
    //         message : "You are not authorized to update a plot"
    //     })
    // }

    try{
        const plotID = req.params.plotID;
        const updatedData = req.body;

        await Plot.updateOne(
            {plotID: plotID}, //use {} for plotID variable
            updatedData //don't use {} for updatedData variable
        );

        res.json({
            message: "Plot updated successfully"
        });
    }catch(err){
        console.error(err);
        res.status(500).json({
            message: "failed to update plot"
        });
    }
}

export async function deletePlot(req, res){

    // if(!isAdmin(req)){
    //     res.status(403).json({
    //         message : "You are not authorized to delete a plot"
    //     });
    // }

    try{
        const plotID = req.params.plotID;

        await Plot.deleteOne({
            plotID : plotID
        })

        res.json({
            message: "Plot deleted successfully"
        });

    }catch(err){
        console.error(err);
        res.status(500).json({
            message: "Failed to delete product"
        });
    }
}



