// src/routes/productRoute.js
//
// Public, read-only product API. Admin product CRUD remains in adminRoute.js
// (untouched for backward compatibility with the admin panel).

import express from "express";
import {
  listPublicProducts,
  getPublicProduct,
} from "../controllers/productController.js";

const productRoute = express.Router();

/**
 * GET /api/products
 * Public, paginated list of ACTIVE products.
 * Query params:
 *   - q         search term (matches title, description, category)
 *   - category  exact category filter
 *   - type      "showcase" | "shop" — filters by product type when provided
 *               (omitted → returns ALL active products, backward compatible)
 *   - page      page number (default 1)
 *   - limit     page size (default 12, max 50)
 * Response: { success, data: Product[], pagination }
 */
productRoute.get("/", listPublicProducts);

/**
 * GET /api/products/:id
 * Public single ACTIVE product by id.
 * Response: { success, data: Product }
 */
productRoute.get("/:id", getPublicProduct);

export default productRoute;
