import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRoute from "./routes/adminRoute.js";
import publicRoute from "./routes/publicRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 8000;

connectDB();
connectCloudinary();

app.use(express.json());

// ---- CORS: dynamic allow-list + proper preflight ----
const ALLOWLIST = new Set([
  "http://127.0.0.1:3031",
  "http://127.0.0.1:3030",
  "http://localhost:3031",
  "http://localhost:3030",
  "https://cabm-panel.vercel.app", // API domain (if you hit it directly)
  "https://admin.cabmsarl.org",    // admin app
  "https://www.cabmsarl.org",      // public site
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
  // If you use cookies with cross-site requests, also:
  // res.setHeader("Access-Control-Allow-Credentials", "true");

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
    credentials: false, // set true only if you actually send cookies
    optionsSuccessStatus: 204,
  })
);

// ---- routes ----
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/admin", adminRoute);
app.use("/api/public", publicRoute);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
