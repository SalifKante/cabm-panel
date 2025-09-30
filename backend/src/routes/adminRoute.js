import express from "express";
import { adminLogin, createActivity, deleteActivity, getActivitiesCount, getAllActivities } from "../controllers/adminController.js";
import upload from "../middleware/multer.js";
import authAdmin from "../middleware/authAdmin.js";

const adminRoute = express.Router();

adminRoute.post("/create-activity", authAdmin, upload.array("image", 10), createActivity);
adminRoute.post("/login",  adminLogin);
adminRoute.post('/all-activities', authAdmin, getAllActivities);
adminRoute.delete("/activity/:id", authAdmin, deleteActivity);
adminRoute.get("/activities-count", authAdmin, getActivitiesCount);


export default adminRoute;