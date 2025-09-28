import express from "express";
import { createActivity } from "../controllers/adminController.js";
import upload from "../middleware/multer.js";

const adminRoute = express.Router();

adminRoute.post("/create-activity", upload.single("image"), createActivity);

export default adminRoute;