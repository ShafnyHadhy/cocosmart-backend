import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import productRouter from "./routes/productRouter.js";
import expenseRouter from "./routes/expenseRouter.js";
import financeRouter from "./routes/financeRouter.js";
import orderRouter from "./routes/orderRouter.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import userRoutes from "./routes/userRouter.js";
// { requestPasswordReset } from "../controllers/userController.js";
import plantationRouter from "./routes/plantationRouter.js";
//import productRouter from "./routes/productRouter.js";
// const cocoProductRouter = require("./routes/CocoProductRoute");
import cocoProductRouter from "./routes/CocoProductRoute.js";
import purchasedItemRouter from "./routes/PurchasedItemRoute.js";
import supplierRouter from "./routes/SupplierRoute.js";
import rorderRoutes from "./routes/rorderRoutes.js"; 

//import productRouter from "./routes/productRouter.js";
import taskRouter from './routes/taskRoutes.js';
import workerRouter from './routes/workerRoutes.js';
import inventoryRequestRoutes from "./routes/inventoryRequestRoutes.js";
import chatRouter from "./routes/chatRouter.js"; // Import the new chat router
import stockRoutes from "./routes/stockRoutes.js";



//loads whats inside on .env file
dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // JSON body parsing

//Middleware to parse requests with token
app.use(
    (req,res,next)=>{

        let token = req.header("Authorization")

        if(token != null){

            token = token.replace("Bearer ", "")
            
            jwt.verify(token, process.env.JWT_SECRET,
                (err,decoded)=>{
                   if(decoded == null){
                        res.json(
                            {
                                message: "Invalid token please login again."
                            }
                        )
                        return
                   }else{
                        req.user = decoded
                   }
                }
            )
        }
        next()
    }
)

//link to connect backend with mongoDB
const connectionString = process.env.MONGO_URI;

//connect DB and project
mongoose.connect(connectionString).then(
    ()=>{
        console.log("Your database connected successfully!")
    }
).catch(
    ()=>{
        console.log("Database connection failed...")
    }
)

//app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter)
app.use("/api/expenses", expenseRouter);
app.use("/api/finances", financeRouter);
// Routes
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/users", userRoutes);

app.use("/api/plots", plantationRouter);

app.use("/api/cocoProducts", cocoProductRouter)
app.use("/api/purchasedItems", purchasedItemRouter)
app.use("/api/suppliers", supplierRouter)
app.use("/api/stocks", stockRoutes);
app.use("/api/rorders", rorderRoutes);  

app.use('/api/tasks', taskRouter);
app.use('/api/workers', workerRouter);

app.listen(5000, 
    ()=>{
        console.log("Server is running on port 5000...")
    }
)
