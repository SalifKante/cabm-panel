import mongoose from "mongoose";

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "admin", enum: ["admin"] },

    // --- Profile fields (managed from the admin panel) ---
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdminUser", AdminUserSchema);
