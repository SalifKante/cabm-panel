import { verifyToken } from "../utils/auth.js";

export function requireAuth(req, res, next) {
  // 1) Prefer HttpOnly cookie
  const cookieToken = req.cookies?.access_token;
  // 2) Fallback to Authorization: Bearer
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;

  const token = cookieToken || bearerToken;
  if (!token) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ ok: false, error: "Invalid token" });

  req.user = payload; // { id, email, role }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  next();
}
