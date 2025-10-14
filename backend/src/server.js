import dotenv from "dotenv";
import { fileURLToPath } from "url"; // <= you were missing this import
import path from "path";

import express from "express";
import cors from "cors";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRoute from "./routes/adminRoute.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 8000;
connectDB();
connectCloudinary();

// base middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://127.0.0.1:3031",
      "http://127.0.0.1:3030",
      "https://cabm-panel.vercel.app",
      "https://admin.cabmsarl.org",
      "https://www.cabmsarl.org",
    ],
  })
);

// api endpoints
app.get("/", (req, res) => {
  res.send("API is running...");
});

// admin routes
app.use("/api/admin", adminRoute);
// http://localhost:3033/api/admin/create-activity

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
