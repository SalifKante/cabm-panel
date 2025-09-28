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
