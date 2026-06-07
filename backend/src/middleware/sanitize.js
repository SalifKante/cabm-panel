// src/middleware/sanitize.js
//
// Custom XSS sanitization middleware. Strips ALL HTML tags from string values
// in req.body, req.query and req.params (defence-in-depth against stored XSS).
//
// - Multipart requests are skipped: those bodies are parsed per-route by Multer
//   (after this middleware), and admin rich-text content (blog posts) is sent as
//   multipart so its HTML is preserved.
// - sanitize-html escapes &, <, > in text nodes; we decode those five common
//   entities back afterwards so stored data stays clean readable text rather
//   than entity-encoded noise.

import sanitizeHtml from "sanitize-html";

const STRIP_OPTS = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

function decodeBasicEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanString(value) {
  return decodeBasicEntities(sanitizeHtml(value, STRIP_OPTS));
}

function deepClean(value) {
  if (typeof value === "string") return cleanString(value);
  if (Array.isArray(value)) return value.map(deepClean);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = deepClean(value[key]);
    }
    return value;
  }
  return value;
}

export default function sanitizeRequest(req, res, next) {
  const contentType = req.headers["content-type"] || "";
  // Multer owns multipart bodies; don't touch them here.
  if (contentType.includes("multipart/form-data")) return next();

  if (req.body && typeof req.body === "object") {
    req.body = deepClean(req.body);
  }
  if (req.query && Object.keys(req.query).length) {
    // req.query is made writable by the Express-5 compat shim in server.js.
    req.query = deepClean(req.query);
  }
  if (req.params && Object.keys(req.params).length) {
    req.params = deepClean(req.params);
  }

  next();
}
