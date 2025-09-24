import mongoose from "mongoose";

export async function connectMongo({ uri, dbName }) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    dbName,          // uses 'cabm' DB without changing your URI
    maxPoolSize: 10, // Render dynos are small; keep the pool modest
    serverSelectionTimeoutMS: 15000
  });

  // graceful shutdown
  process.on("SIGTERM", () => mongoose.connection.close());
  process.on("SIGINT", () => mongoose.connection.close());

  return mongoose.connection;
}
