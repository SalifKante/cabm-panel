import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { connectMongo } from "./db.js";
// import health from "./routes/health.js";

const app = express();
app.set("trust proxy", 1);

// security & logs
app.use(helmet());
app.use(morgan("tiny"));

// CORS (allow only your sites)
const allow = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => (!origin || allow.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked"))),
  credentials: true
}));

app.use(express.json());

// routes
// app.use(health);

// boot
const PORT = process.env.PORT || 10000;
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "cabm";

if (!uri) {
  console.error("❌ MONGODB_URI is missing");
  process.exit(1);
}

connectMongo({ uri, dbName })
  .then(() => {
    console.log("✅ Mongo connected to DB:", dbName);
    app.listen(PORT, () => console.log(`🚀 API listening on :${PORT}`));
  })
  .catch(err => {
    console.error("❌ Mongo connection error:", err.message);
    process.exit(1);
  });
