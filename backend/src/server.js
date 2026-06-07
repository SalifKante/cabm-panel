import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
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

// ---- CORS: dynamic allow-list + proper preflight ----
const ALLOWLIST = new Set([
  "http://127.0.0.1:3031",
  "http://127.0.0.1:3030",
  "http://localhost:3031",
  "http://localhost:3030",
  "https://cabm-panel.vercel.app", // API domain (if you hit it directly)
  "https://admin.cabmsarl.org",    // admin app
  "https://www.cabmsarl.org",      // public site (www)
  "https://cabmsarl.org",          // public site (apex, no www)
]);

// Handle preflight explicitly first (fast path)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWLIST.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, aToken, Authorization"
  );
  // Cookies are used for cross-site auth, so allow credentials:
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    // optional debug:
    // console.log("CORS preflight from:", origin);
    return res.sendStatus(204);
  }
  next();
});

// Also apply cors() (helps with non-OPTIONS flows)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin/SSR/health checks
      return ALLOWLIST.has(origin) ? cb(null, true) : cb(new Error("CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "aToken", "Authorization"],
    credentials: true, // send/receive the httpOnly auth cookie cross-site
    optionsSuccessStatus: 204,
  })
);

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
