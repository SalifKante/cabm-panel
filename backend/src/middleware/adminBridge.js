import { verifyToken } from "../utils/auth.js";
import userModel from "../models/userModel.js";
import AdminUser from "../models/AdminUser.js";

/**
 * resolveAdmin(req) — shared resolver for both auth systems. Returns an admin
 * identity object or null. Never writes a response.
 *
 * Path A: access_token cookie OR Authorization Bearer → verify JWT → User role "admin".
 * Path B: aToken header → verify JWT. The real legacy token is the string
 *   `ADMIN_EMAIL + ADMIN_PASSWORD` (what adminController.adminLogin signs and
 *   authAdmin checks); we honour that and resolve a backing admin User so
 *   req.user.id is a valid ObjectId (e.g. for blog createPost's author). Also
 *   supports a future { id, email }/email-string payload via AdminUser.
 */
async function resolveAdmin(req) {
  // --- Path A: new cookie/Bearer auth (User model) ---
  const cookieToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const newToken =
    cookieToken ||
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (newToken) {
    const payload = verifyToken(newToken);
    if (payload) {
      const userId = payload.id || payload._id || payload.sub;
      if (userId) {
        try {
          const user = await userModel.findById(userId).select("name email role");
          if (user && user.role === "admin") {
            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        } catch (e) {
          /* fall through to Path B */
        }
      }
    }
  }

  // --- Path B: legacy aToken header ---
  const legacyToken = req.headers.atoken;
  if (legacyToken) {
    const payload = verifyToken(legacyToken);
    if (payload) {
      // (B1) Real legacy token: payload is the string `ADMIN_EMAIL + ADMIN_PASSWORD`.
      const envMatch =
        typeof payload === "string" &&
        !!process.env.ADMIN_EMAIL &&
        !!process.env.ADMIN_PASSWORD &&
        payload === `${process.env.ADMIN_EMAIL}${process.env.ADMIN_PASSWORD}`;

      if (envMatch) {
        try {
          const user =
            (await userModel.findOne({
              email: process.env.ADMIN_EMAIL,
              role: "admin",
            })) || (await userModel.findOne({ role: "admin" }));

          if (user) {
            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: "admin",
            };
          }

          const adminDoc = await AdminUser.findOne({
            email: process.env.ADMIN_EMAIL,
          });
          return {
            id: adminDoc?._id?.toString(),
            name: "Admin",
            email: process.env.ADMIN_EMAIL,
            role: "admin",
          };
        } catch (e) {
          /* fall through */
        }
      }

      // (B2) Forward-compatible: payload is { id, email } or a bare email string.
      const adminId = payload.id || payload._id;
      const adminEmail =
        payload.email || (typeof payload === "string" ? payload : null);
      try {
        const admin = adminId
          ? await AdminUser.findById(adminId)
          : adminEmail
            ? await AdminUser.findOne({ email: adminEmail })
            : null;
        if (admin) {
          return {
            id: admin._id.toString(),
            name: "Admin",
            email: admin.email,
            role: "admin",
          };
        }
      } catch (e) {
        /* fall through */
      }
    }
  }

  return null;
}

/**
 * requireAdminAny — passes if EITHER auth system identifies an admin. Sets
 * req.user on success; returns 401 otherwise.
 */
export default async function requireAdminAny(req, res, next) {
  try {
    const identity = await resolveAdmin(req);
    if (!identity) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    req.user = identity;
    return next();
  } catch (err) {
    console.error("requireAdminAny error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

/**
 * attachAdminIfPresent — OPTIONAL auth for public routes. If a valid admin token
 * is present it sets req.user; otherwise it proceeds anonymously. Never blocks.
 * Used on GET /api/blog/posts so admins can see drafts while the public sees
 * only published posts.
 */
export async function attachAdminIfPresent(req, res, next) {
  try {
    const identity = await resolveAdmin(req);
    if (identity) req.user = identity;
  } catch (err) {
    console.error("attachAdminIfPresent error:", err);
  }
  return next();
}
