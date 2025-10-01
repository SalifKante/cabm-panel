// src/routes/adminRoute.js
import express from "express";
import {
  adminLogin,
} from "../controllers/adminController.js";
import {
  createActivity,
  deleteActivity,
  getActivitiesCount,
  getActivityById,
  getAllActivities,
} from "../controllers/activityController.js";

import {
  createProduct,
  deleteProduct,
  getProductsCount,
  listProducts,
  patchProductStatus,
  updateProduct
} from "../controllers/productController.js";

import upload from "../middleware/multer.js";

import authAdmin from "../middleware/authAdmin.js";


const adminRoute = express.Router();

/* ------------------------ ACTIVITY ROUTES (existing) ----------------------- */
adminRoute.post("/create-activity", authAdmin, upload.array("image", 10), createActivity);
adminRoute.post("/login", adminLogin);
// adminRoute.post("/all-activities", authAdmin, getAllActivities);
adminRoute.get("/activity/:id", getActivityById);
adminRoute.post("/all-activities", getAllActivities);
adminRoute.delete("/activity/:id", authAdmin, deleteActivity);
adminRoute.get("/activities-count", authAdmin, getActivitiesCount);

/* ------------------------- PRODUCT ROUTES (new) ---------------------------- */
/** Create product
 * Body: multipart/form-data
 *  - text: title, description
 *  - files: image[]   (use "image" as the field name, up to 10 files)
 */
adminRoute.post("/create-product", authAdmin, upload.array("image", 10), createProduct);

/** List products (kept as POST to mirror your activities route) */
// adminRoute.post("/all-products", authAdmin, listProducts);
adminRoute.post("/all-products", listProducts);

// Update product (partial update, e.g. only title or only images, etc.)
adminRoute.put("/product/:id", authAdmin, upload.array("image", 10), updateProduct);

/** Delete one product by ID */
adminRoute.delete("/product/:id", authAdmin, deleteProduct);

/** Count products */
adminRoute.get("/products-count", authAdmin, getProductsCount);

// Update product status (activate/deactivate)
adminRoute.patch("/product/:id/status", authAdmin, patchProductStatus);


export default adminRoute;
