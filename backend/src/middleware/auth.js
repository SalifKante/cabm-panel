import { verifyToken } from "../utils/auth.js";
import userModel from "../models/userModel.js";

/**
 * requireAuth — verify the JWT (HttpOnly cookie preferred, Bearer fallback),
 * then load the current user from the User model so downstream handlers get
 * fresh, full user data on req.user (id, email, role, isVerified, name).
 */
export async function requireAuth(req, res, next) {
  // 1) Prefer HttpOnly cookie
  const cookieToken = req.cookies?.access_token;
  // 2) Fallback to Authorization: Bearer
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;

  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ ok: false, error: "Invalid token" });

  const userId = payload.id || payload._id || payload.sub;
  if (!userId) return res.status(401).json({ ok: false, error: "Invalid token" });

  try {
    const user = await userModel
      .findById(userId)
      .select("name email role isVerified phone avatar");

    if (!user) {
      return res.status(401).json({ ok: false, error: "User not found" });
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isVerified: user.isVerified,
    };

    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

/**
 * requireAdmin — must run after requireAuth.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  next();
}

/**
 * requireVerified — must run after requireAuth. Blocks unverified accounts.
 */
export function requireVerified(req, res, next) {
  if (!req.user || req.user.isVerified !== true) {
    return res
      .status(403)
      .json({ ok: false, error: "Email not verified" });
  }
  next();
}
