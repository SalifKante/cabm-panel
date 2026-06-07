// src/routes/activityRoute.js
//
// Public, read-only activity API. Admin activity CRUD remains in adminRoute.js
// (untouched for backward compatibility with the admin panel).

import express from "express";
import {
  listPublicActivities,
  getPublicActivity,
} from "../controllers/activityController.js";

const activityRoute = express.Router();

/**
 * GET /api/activities
 * Public, paginated list of PUBLISHED activities (newest first by date).
 * Query params:
 *   - q      search term (matches title, description, tags)
 *   - page   page number (default 1)
 *   - limit  page size (default 12, max 50)
 * Response: { success, data: Activity[], pagination }
 */
activityRoute.get("/", listPublicActivities);

/**
 * GET /api/activities/:id
 * Public single PUBLISHED activity by id.
 * Response: { success, data: Activity }
 */
activityRoute.get("/:id", getPublicActivity);

export default activityRoute;
