import express from "express";
import { adminLogin, createActivity } from "../controllers/adminController.js";
import upload from "../middleware/multer.js";
import authAdmin from "../middleware/authAdmin.js";

const adminRoute = express.Router();

adminRoute.post("/create-activity", authAdmin, upload.array("image", 10), createActivity);
adminRoute.post("/login",  adminLogin);

export default adminRoute;