import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, trim: true }, // optional

    // Required only for password-based accounts. Google (OAuth) accounts have
    // no local password, so passwordHash is optional when googleId is set.
    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },

    // Sparse + unique: many users may have no googleId, but among those that do
    // it must be unique (one Google account => one user). The passport strategy
    // relies on this for findOne-by-googleId lookups.
    googleId: { type: String, unique: true, sparse: true },

    avatar: { type: String },
    bio: { type: String, trim: true, maxlength: 500 },

    role: { type: String, enum: ["user", "admin"], default: "user" },

    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

const userModel = mongoose.models.user || mongoose.model("User", UserSchema);

export default userModel;
