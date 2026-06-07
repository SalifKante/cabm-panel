// src/routes/orderRoute.js
import express from "express";
import rateLimit from "express-rate-limit";
import requireAdminAny from "../middleware/adminBridge.js";
import {
  createOrder,
  getOrderByNumber,
  listOrders,
  updateOrderStatus,
  getOrderStats,
} from "../controllers/orderController.js";

const orderRoute = express.Router();

// 10 order submissions / 15 min per IP.
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de commandes envoyées. Veuillez réessayer dans quelques minutes.",
  },
});

/* -------------------------------- public ---------------------------------- */
orderRoute.post("/", createOrderLimiter, createOrder);

/* --------------------------------- admin ---------------------------------- */
// NOTE: admin routes MUST be declared before the public "/:orderNumber" route,
// otherwise "admin" / "admin/stats" would be captured as an order number.
// requireAdminAny accepts EITHER the cookie-JWT admin or the legacy aToken admin.
orderRoute.get("/admin/stats", requireAdminAny, getOrderStats);
orderRoute.get("/admin", requireAdminAny, listOrders);
orderRoute.patch("/admin/:id/status", requireAdminAny, updateOrderStatus);

/* ----------------------- public single (keep last) ------------------------ */
orderRoute.get("/:orderNumber", getOrderByNumber);

export default orderRoute;
