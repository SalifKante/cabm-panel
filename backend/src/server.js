import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import passport from "./config/passport.js";
import sanitizeRequest from "./middleware/sanitize.js";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import { ensureAdminFromEnv } from "./utils/seedAdmin.js";
import { seedBlog } from "./utils/seedBlog.js";
import adminRoute from "./routes/adminRoute.js";
import publicRoute from "./routes/publicRoute.js";
import productRoute from "./routes/productRoute.js";
import activityRoute from "./routes/activityRoute.js";
import contactRoute from "./routes/contactRoute.js";
import authRoute from "./routes/authRoute.js";
import orderRoute from "./routes/orderRoute.js";
import blogRoute from "./routes/blogRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 8000;

// Trust the first proxy hop (Vercel/Railway) so express-rate-limit and req.ip
// use the real client IP from X-Forwarded-For.
app.set("trust proxy", 1);

// ---- CORS — MUST be the very first middleware ----
// Running before helmet/sanitizers guarantees the preflight (OPTIONS) is answered
// with the right headers even if a later middleware errors. For non-OPTIONS the
// headers are set on res up-front, so they survive an eventual error response too.
const ALLOWLIST = new Set([
  "http://127.0.0.1:3031",
  "http://127.0.0.1:3030",
  "http://localhost:3031",
  "http://localhost:3030",
  "https://cabm-panel.vercel.app", // API domain (if hit directly)
  "https://admin.cabmsarl.org",    // admin app
  "https://www.cabmsarl.org",      // public site (www)
  "https://cabmsarl.org",          // public site (apex, no www)
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWLIST.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    // Credentials header is only meaningful with a specific (non-wildcard) origin.
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  // Reflect whatever headers the browser asks for in the preflight, with a sane
  // default — so a new custom header never silently breaks the preflight.
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, aToken, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Connect, then run idempotent startup seeders (admin user, then sample blog).
connectDB()
  .then(async () => {
    await ensureAdminFromEnv();
    await seedBlog();
  })
  .catch((e) => console.error("Startup seeding error:", e?.message || e));
connectCloudinary();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ---- Security hardening ----
app.use(helmet());

// Express 5 compat: req.query is a getter-only property, but downstream
// sanitizers (express-mongo-sanitize, our XSS middleware) reassign it. Make it a
// writable own property so those assignments don't throw.
app.use((req, res, next) => {
  const desc = Object.getOwnPropertyDescriptor(req, "query");
  if (!desc || !desc.writable) {
    Object.defineProperty(req, "query", {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
});

app.use(mongoSanitize()); // strip $ / . operators from keys (NoSQL injection)
app.use(sanitizeRequest); // strip HTML tags from string inputs (XSS)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ---- routes ----
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Lightweight JSON health check (uptime monitoring / deploy verification).
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

app.use("/api/admin", adminRoute);
app.use("/api/public", publicRoute);
app.use("/api/products", productRoute);
app.use("/api/activities", activityRoute);
app.use("/api/contact", contactRoute);
app.use("/api/auth", authRoute);
app.use("/api/orders", orderRoute);
app.use("/api/blog", blogRoute);

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ressource introuvable.",
    code: 404,
  });
});

// ---- Global error handler ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const code = err.status || err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || "Erreur serveur.",
    code,
  };
  if (Array.isArray(err.errors)) payload.errors = err.errors; // validation
  if (process.env.NODE_ENV !== "production") payload.stack = err.stack;

  if (code >= 500) console.error("Unhandled error:", err);
  res.status(code).json(payload);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
