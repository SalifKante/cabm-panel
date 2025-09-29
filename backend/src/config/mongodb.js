// import mongoose from 'mongoose';

// const connectDB = async () => {
//   mongoose.connection.on('connected', () => {
//     console.log('MongoDB connected successfully');
//   });

//   // mongoose.connection.on('error', (err) => {
//   //   console.error(`MongoDB connection error: ${err}`);
//   //   process.exit(1);
//   // });

  
//   await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.MONGODB_DB_NAME}`)
//   // console.log(`${process.env.MONGODB_URI}/${process.env.MONGODB_DB_NAME}`);
// }

// export default connectDB;

// src/config/moondodb.js (or wherever)
import mongoose from "mongoose";

const connectDB = async () => {
  // Clean pieces to avoid "/cabmsarl" bugs
  const rawUri = process.env.MONGODB_URI || "";
  const rawDb  = process.env.MONGODB_DB_NAME || "";

  const base = rawUri.replace(/\/+$/, "");      // remove trailing slashes
  const db   = rawDb.replace(/^\/+/, "");       // remove leading slashes

  // Build final URI only once (or pass dbName option below)
  const finalUri = db ? `${base}/${db}` : base;

  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected successfully");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err?.message || err);
    process.exit(1);
  });

  // Connect (either with db in URI, or use { dbName: db } – not both)
  await mongoose.connect(finalUri, {
    // If you prefer: await mongoose.connect(base, { dbName: db });
    serverSelectionTimeoutMS: 15000,
  });

  // Light debug (mask user:password)
  try {
    const u = new URL(finalUri);
    if (u.username) u.username = "***";
    if (u.password) u.password = "***";
    console.log("🔗 Mongo URI:", u.toString());
  } catch {
    console.log("🔗 Mongo URI:", finalUri.replace(/\/\/.*@/, "//***:***@"));
  }
};

export default connectDB;
