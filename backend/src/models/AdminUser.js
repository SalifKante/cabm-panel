import mongoose from "mongoose";

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "admin", enum: ["admin"] }
  },
  { timestamps: true }
);

export default mongoose.model("AdminUser", AdminUserSchema);
