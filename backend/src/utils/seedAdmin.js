import AdminUser from "../models/AdminUser.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "./auth.js";

export async function ensureAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const pass  = process.env.ADMIN_PASSWORD;

  if (!email || !pass) return;

  // --- AdminUser (legacy) — creation logic unchanged ---
  const existing = await AdminUser.findOne({ email });
  if (!existing) {
    const passwordHash = await hashPassword(pass);
    await AdminUser.create({ email, passwordHash });
    console.log(`✅ Admin seeded: ${email}`);
  }

  // --- User (new auth) — ensure a matching admin User exists ---
  // The legacy admin auth has no User document, but blog createPost stores
  // `author` as a User ObjectId. Seeding/keeping an admin User in sync gives the
  // legacy-admin (via adminBridge) a valid author id, and lets the same admin
  // log in through /api/auth/login. Additive: never downgrades an existing user.
  try {
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      const updates = {};
      if (existingUser.role !== "admin") updates.role = "admin";
      if (existingUser.isVerified !== true) updates.isVerified = true;

      if (Object.keys(updates).length) {
        await userModel.updateOne({ _id: existingUser._id }, { $set: updates });
        console.log(`✅ Admin User updated (${Object.keys(updates).join(", ")}): ${email}`);
      }
    } else {
      const passwordHash = await hashPassword(pass);
      await userModel.create({
        name: "Administrateur CABM",
        email,
        passwordHash,
        role: "admin",
        isVerified: true,
      });
      console.log(`✅ Admin User seeded: ${email}`);
    }
  } catch (err) {
    console.error("⚠️ Failed to ensure admin User:", err?.message || err);
  }
}
