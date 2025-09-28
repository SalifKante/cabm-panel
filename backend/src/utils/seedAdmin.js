import AdminUser from "../models/AdminUser.js";
import { hashPassword } from "./auth.js";

export async function ensureAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const pass  = process.env.ADMIN_PASSWORD;

  if (!email || !pass) return;

  const existing = await AdminUser.findOne({ email });
  if (existing) return; // already seeded

  const passwordHash = await hashPassword(pass);
  await AdminUser.create({ email, passwordHash });
  console.log(`✅ Admin seeded: ${email}`);
}
