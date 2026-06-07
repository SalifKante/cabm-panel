// src/utils/mailer.js
//
// Reusable Nodemailer helper. Configured from environment variables and used
// across the app:
//   - Phase 5  contact form notifications (here)
//   - Phase 6  account verification / password reset emails
//   - Phase 7  order intent notifications
//   - Phase 10 all HTML email templates
//
// The transporter is created lazily and cached, so importing this module never
// fails — a misconfigured/missing SMTP setup only surfaces when sendMail() runs.

import nodemailer from "nodemailer";

let transporter = null;

/**
 * Build (once) and return the shared Nodemailer transporter.
 * SMTP settings come from env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  transporter = nodemailer.createTransport({
    host,
    port,
    // 465 = implicit TLS; 587 (and others) use STARTTLS
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

/**
 * Send an email.
 *
 * @param {string|string[]} to       recipient(s)
 * @param {string} subject           email subject
 * @param {string} html             HTML body
 * @param {string} [text]           optional plain-text fallback
 * @returns {Promise<object>}        Nodemailer info object
 */
export async function sendMail(to, subject, html, text) {
  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "cabmsarl2022@gmail.com";

  const info = await getTransporter().sendMail({
    from,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });

  return info;
}

export default sendMail;
