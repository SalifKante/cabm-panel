import crypto from "crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

export async function hashPassword(plain) {
  return argon2.hash(plain);
}
export async function verifyPassword(hash, plain) {
  return argon2.verify(hash, plain);
}

export function signAccessToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES || "1h";
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                       Phase 6 — tokens & auth cookie                       */
/* -------------------------------------------------------------------------- */

const ACCESS_COOKIE_NAME = "access_token";
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Generate a cryptographically random hex token (64 chars / 32 bytes).
 * Used for email verification and password reset tokens.
 */
export function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Shared cookie options so set/clear use identical attributes (required for the
 * browser to actually clear the cookie). `secure` and `domain` come from env.
 */
function baseCookieOptions() {
  // SameSite controls whether the cookie is sent on cross-site requests.
  //  - "lax"  (default): site and API share the same parent domain (e.g.
  //    www.cabmsarl.org + api.cabmsarl.org). Most reliable.
  //  - "none": site and API are on DIFFERENT sites (e.g. www.cabmsarl.org calling
  //    cabm-panel.vercel.app). Requires Secure, and the cookie must NOT be scoped
  //    to a domain the API host doesn't belong to — so leave COOKIE_DOMAIN unset.
  // Set COOKIE_SAMESITE=none on the backend when the public site calls the bare
  // Vercel URL instead of an api.cabmsarl.org subdomain.
  const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();

  // SameSite=None is invalid without Secure, so force Secure on in that case.
  const secure =
    String(process.env.COOKIE_SECURE).toLowerCase() === "true" ||
    sameSite === "none";

  const domain = process.env.COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

/**
 * Set the JWT in an HttpOnly cookie named "access_token" (1 hour).
 */
export function setTokenCookie(res, token) {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: ONE_HOUR_MS,
  });
}

/**
 * Clear the "access_token" cookie using the same attributes it was set with.
 */
export function clearTokenCookie(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, baseCookieOptions());
}
