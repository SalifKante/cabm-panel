// src/routes/contactRoute.js
import express from "express";
import rateLimit from "express-rate-limit";
import { submitContact } from "../controllers/contactController.js";

const contactRoute = express.Router();

// Rate limit: max 5 submissions per IP per 15 minutes.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Trop de messages envoyés. Veuillez réessayer dans quelques minutes.",
  },
});

/**
 * POST /api/contact
 * Public contact form submission (rate limited).
 * Body: { name, email, phone?, message }
 * Response: { success, message }
 */
contactRoute.post("/", contactLimiter, submitContact);

export default contactRoute;
