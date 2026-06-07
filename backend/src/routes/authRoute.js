// src/routes/authRoute.js
import express from "express";
import rateLimit from "express-rate-limit";
import passport from "../config/passport.js";
import upload from "../middleware/multer.js";
import { requireAuth } from "../middleware/auth.js";
import {
  register,
  verifyEmail,
  login,
  googleCallback,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  updateProfile,
} from "../controllers/authController.js";

const authRoute = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3030").replace(
  /\/+$/,
  ""
);

// Guards the Google routes when OAuth isn't configured (no GOOGLE_CLIENT_ID),
// so the strategy is unregistered. Returns a clean 503 instead of passport
// throwing "Unknown authentication strategy" (a 500 stack trace).
const googleGuard = (req, res, next) => {
  if (!passport._strategies.google) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth n'est pas configuré sur ce serveur.",
    });
  }
  next();
};

// 10 requests / 15 min per IP for register & login.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
  },
});

// 5 requests / 15 min per IP for password reset requests.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de demandes. Veuillez réessayer dans quelques minutes.",
  },
});

/* ------------------------------ local auth -------------------------------- */
authRoute.post("/register", authLimiter, register);
authRoute.get("/verify-email/:token", verifyEmail);
authRoute.post("/login", authLimiter, login);
authRoute.post("/forgot-password", forgotLimiter, forgotPassword);
authRoute.post("/reset-password/:token", resetPassword);
authRoute.post("/logout", logout);
authRoute.get("/me", requireAuth, getMe);
authRoute.put("/profile", requireAuth, upload.single("avatar"), updateProfile);

/* ------------------------------ Google OAuth ------------------------------ */
authRoute.get(
  "/google",
  googleGuard,
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

authRoute.get(
  "/google/callback",
  googleGuard,
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google`,
  }),
  googleCallback
);

export default authRoute;
