// routes/publicRoute.js
import express from "express";
import { listPublicServices } from "../controllers/serviceController.js";

const publicRoute = express.Router();

// public list (no auth)
publicRoute.get("/services", listPublicServices);

export default publicRoute;
