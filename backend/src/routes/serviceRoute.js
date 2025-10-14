// import express from "express";
// import authAdmin from "../middleware/authAdmin";
// import {
//   createService,
//   deleteService,
//   listAllServices,
//   listPublicServices,
//   setServiceStatus,
//   updateService,
// } from "../controllers/serviceController";

// const router = express.Router();

// // Public
// router.get("/", listPublicServices);

// // Admin
// router.get("/admin", authAdmin, listAllServices);
// router.post("/", authAdmin, createService);
// router.patch("/:id", authAdmin, updateService);
// router.patch("/:id/status", authAdmin, setServiceStatus);
// router.delete("/:id", authAdmin, deleteService);

// export default router;
