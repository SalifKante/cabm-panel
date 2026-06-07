// src/emails/templates.js
//
// Reusable transactional email templates. Every function returns
// { html, text } — an inline-CSS HTML body plus a plain-text fallback.
//
// Shared layout: dark-green (#14532d) header with "CABM" wordmark, white
// content area, amber (#f59e0b) CTA button, gray footer with "Bamako, Mali".
// Manrope font with Arial fallback. Inline CSS only (email-client safe).

import { formatAmount } from "../utils/whatsapp.js";

const GREEN = "#14532d";
const AMBER = "#f59e0b";
const FONT = "'Manrope', Arial, Helvetica, sans-serif";

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3030").replace(
  /\/+$/,
  ""
);

const STATUS_LABELS = {
  pending: "En attente",
  contacted: "Contactée",
  confirmed: "Confirmée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/* ------------------------------- helpers ---------------------------------- */

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Amber CTA button. */
function button(label, url) {
  return `<a href="${url}" style="display:inline-block;background:${AMBER};color:#1f2937;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px;font-family:${FONT};">${esc(
    label
  )}</a>`;
}

/** Wrap inner HTML in the shared CABM layout. */
function layout(innerHtml) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;font-family:${FONT};">
    <div style="background:${GREEN};padding:20px 24px;">
      <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;font-family:${FONT};">CABM</span>
      <span style="color:#a7f3d0;font-size:12px;display:block;margin-top:2px;">Complexe Agro Business Mali</span>
    </div>
    <div style="background:#ffffff;padding:28px 24px;color:#1f2937;font-size:15px;line-height:1.6;">
      ${innerHtml}
    </div>
    <div style="background:#e5e7eb;padding:16px 24px;color:#6b7280;font-size:12px;text-align:center;font-family:${FONT};">
      CABM — Complexe Agro Business Mali<br/>Bamako, Mali
    </div>
  </div>
</body>
</html>`;
}

function fallbackLinkBlock(url) {
  return `<p style="margin:16px 0 0;color:#6b7280;font-size:12px;">Ou copiez ce lien dans votre navigateur :</p>
  <p style="margin:4px 0 0;word-break:break-all;font-size:12px;"><a href="${url}" style="color:${GREEN};">${esc(
    url
  )}</a></p>`;
}

/* ------------------------------- templates -------------------------------- */

/**
 * Account verification / welcome email.
 */
export function welcomeEmail(name, verificationUrl) {
  const inner = `
    <h2 style="margin:0 0 12px;color:${GREEN};font-size:20px;">Bienvenue chez CABM</h2>
    <p style="margin:0 0 12px;">Bonjour ${esc(name)},</p>
    <p style="margin:0 0 20px;">Merci de votre inscription. Veuillez confirmer votre adresse email pour activer votre compte.</p>
    <p style="margin:0 0 8px;">${button("Vérifier mon email", verificationUrl)}</p>
    ${fallbackLinkBlock(verificationUrl)}
    <p style="margin:20px 0 0;color:#6b7280;font-size:12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;
  const text = `Bienvenue chez CABM

Bonjour ${name},

Merci de votre inscription. Confirmez votre adresse email :
${verificationUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

CABM — Bamako, Mali`;
  return { html: layout(inner), text };
}

/**
 * Password reset email.
 */
export function passwordResetEmail(name, resetUrl) {
  const inner = `
    <h2 style="margin:0 0 12px;color:${GREEN};font-size:20px;">Réinitialisation du mot de passe</h2>
    <p style="margin:0 0 12px;">Bonjour ${esc(name)},</p>
    <p style="margin:0 0 20px;">Vous avez demandé à réinitialiser votre mot de passe. Ce lien expire dans 1 heure.</p>
    <p style="margin:0 0 8px;">${button("Réinitialiser mon mot de passe", resetUrl)}</p>
    ${fallbackLinkBlock(resetUrl)}
    <p style="margin:20px 0 0;color:#6b7280;font-size:12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.</p>`;
  const text = `Réinitialisation du mot de passe

Bonjour ${name},

Vous avez demandé à réinitialiser votre mot de passe (lien valable 1 heure) :
${resetUrl}

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

CABM — Bamako, Mali`;
  return { html: layout(inner), text };
}

/**
 * Admin notification — contact form received.
 */
export function contactReceivedEmail(name, email, phone, message) {
  const inner = `
    <h2 style="margin:0 0 12px;color:${GREEN};font-size:20px;">Nouveau message de contact</h2>
    <p style="margin:0 0 4px;"><strong>Nom :</strong> ${esc(name)}</p>
    <p style="margin:0 0 4px;"><strong>Email :</strong> ${esc(email)}</p>
    <p style="margin:0 0 12px;"><strong>Téléphone :</strong> ${esc(phone || "—")}</p>
    <div style="border-top:1px solid #e5e7eb;padding-top:12px;">
      <p style="margin:0 0 6px;"><strong>Message :</strong></p>
      <p style="margin:0;">${esc(message).replace(/\n/g, "<br/>")}</p>
    </div>`;
  const text = `Nouveau message de contact

Nom : ${name}
Email : ${email}
Téléphone : ${phone || "—"}

Message :
${message}

CABM — Bamako, Mali`;
  return { html: layout(inner), text };
}

/**
 * Admin notification — new order received (with item table).
 */
export function orderReceivedEmail(order, whatsappUrl) {
  const cur = order.currency || "XOF";
  const items = Array.isArray(order.items) ? order.items : [];

  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${esc(
          it.productName
        )}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${
          it.quantity
        }${it.unit ? " " + esc(it.unit) : ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatAmount(
          it.price
        )} ${cur}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatAmount(
          it.lineTotal
        )} ${cur}</td>
      </tr>`
    )
    .join("");

  const inner = `
    <h2 style="margin:0 0 12px;color:${GREEN};font-size:20px;">Nouvelle commande — ${esc(
      order.orderNumber
    )}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="text-align:left;color:#6b7280;">
          <th style="padding:6px 8px;">Produit</th>
          <th style="padding:6px 8px;text-align:center;">Qté</th>
          <th style="padding:6px 8px;text-align:right;">Prix</th>
          <th style="padding:6px 8px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:16px 0 4px;"><strong>Sous-total :</strong> ${formatAmount(
      order.subtotal
    )} ${cur}</p>
    <p style="margin:0 0 4px;"><strong>Livraison estimée :</strong> ${formatAmount(
      order.deliveryEstimate
    )} ${cur}</p>
    <p style="margin:0 0 16px;"><strong>Total :</strong> ${formatAmount(
      order.total
    )} ${cur}</p>
    <div style="border-top:1px solid #e5e7eb;padding-top:12px;">
      <p style="margin:0 0 4px;"><strong>Client :</strong> ${esc(
        order.customer?.name
      )}</p>
      <p style="margin:0 0 4px;"><strong>Téléphone :</strong> ${esc(
        order.customer?.phone
      )}</p>
      ${
        order.customer?.location
          ? `<p style="margin:0 0 4px;"><strong>Lieu :</strong> ${esc(
              order.customer.location
            )}</p>`
          : ""
      }
      ${
        order.customer?.note
          ? `<p style="margin:0 0 4px;"><strong>Note :</strong> ${esc(
              order.customer.note
            )}</p>`
          : ""
      }
    </div>
    ${
      whatsappUrl
        ? `<p style="margin:18px 0 0;">${button(
            "Ouvrir la conversation WhatsApp",
            whatsappUrl
          )}</p>`
        : ""
    }`;

  const text = [
    `Nouvelle commande — ${order.orderNumber}`,
    "",
    ...items.map(
      (it) =>
        `- ${it.productName} x ${it.quantity}${
          it.unit ? " " + it.unit : ""
        } = ${formatAmount(it.lineTotal)} ${cur}`
    ),
    "",
    `Sous-total : ${formatAmount(order.subtotal)} ${cur}`,
    `Livraison estimée : ${formatAmount(order.deliveryEstimate)} ${cur}`,
    `Total : ${formatAmount(order.total)} ${cur}`,
    "",
    `Client : ${order.customer?.name} (${order.customer?.phone})`,
    order.customer?.location ? `Lieu : ${order.customer.location}` : "",
    order.customer?.note ? `Note : ${order.customer.note}` : "",
    whatsappUrl ? `WhatsApp : ${whatsappUrl}` : "",
    "",
    "CABM — Bamako, Mali",
  ]
    .filter(Boolean)
    .join("\n");

  return { html: layout(inner), text };
}

/**
 * Customer notification — order status changed.
 */
export function orderStatusEmail(order, newStatus) {
  const label = STATUS_LABELS[newStatus] || newStatus;
  const trackUrl = `${FRONTEND_URL}/commande/${order.orderNumber}`;
  const inner = `
    <h2 style="margin:0 0 12px;color:${GREEN};font-size:20px;">Mise à jour de votre commande</h2>
    <p style="margin:0 0 12px;">Bonjour ${esc(order.customer?.name || "")},</p>
    <p style="margin:0 0 12px;">Le statut de votre commande <strong>${esc(
      order.orderNumber
    )}</strong> est maintenant :</p>
    <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:${GREEN};">${esc(
      label
    )}</p>
    <p style="margin:0 0 8px;">${button("Voir ma commande", trackUrl)}</p>
    ${fallbackLinkBlock(trackUrl)}`;
  const text = `Mise à jour de votre commande

Bonjour ${order.customer?.name || ""},

Le statut de votre commande ${order.orderNumber} est maintenant : ${label}

Suivi : ${trackUrl}

CABM — Bamako, Mali`;
  return { html: layout(inner), text };
}

/**
 * Subscriber notification — a new blog post was published.
 */
export function newPostEmail(post, unsubscribeUrl) {
  const postUrl = `${FRONTEND_URL}/blog/${post.slug}`;
  const cover = post.coverImage
    ? `<img src="${esc(
        post.coverImage
      )}" alt="" style="width:100%;max-width:552px;border-radius:8px;margin:0 0 16px;display:block;" />`
    : "";
  const inner = `
    <h2 style="margin:0 0 12px;color:${GREEN};font-size:20px;">Nouvel article sur le blog CABM</h2>
    ${cover}
    <h3 style="margin:0 0 8px;color:#1f2937;font-size:18px;">${esc(post.title)}</h3>
    ${post.excerpt ? `<p style="margin:0 0 20px;">${esc(post.excerpt)}</p>` : ""}
    <p style="margin:0 0 8px;">${button("Lire l'article", postUrl)}</p>
    ${fallbackLinkBlock(postUrl)}
    <p style="margin:20px 0 0;color:#6b7280;font-size:12px;">
      Vous recevez cet email car vous êtes abonné aux notifications du blog CABM.
      <a href="${unsubscribeUrl}" style="color:${GREEN};">Se désabonner</a>.
    </p>`;
  const text = `Nouvel article sur le blog CABM

${post.title}

${post.excerpt || ""}

Lire l'article : ${postUrl}

Se désabonner : ${unsubscribeUrl}

CABM — Bamako, Mali`;
  return { html: layout(inner), text };
}

/**
 * Author notification — their comment was approved.
 */
export function commentApprovedEmail(comment, postTitle, postUrl) {
  const excerpt = String(comment?.content || "");
  const inner = `
    <h2 style="margin:0 0 12px;color:${GREEN};font-size:20px;">Votre commentaire a été approuvé</h2>
    <p style="margin:0 0 12px;">Votre commentaire sur l'article <strong>${esc(
      postTitle
    )}</strong> est maintenant visible :</p>
    <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f3f4f6;border-left:3px solid ${AMBER};color:#374151;">${esc(
      excerpt
    ).replace(/\n/g, "<br/>")}</blockquote>
    <p style="margin:0 0 8px;">${button("Voir la discussion", postUrl)}</p>
    ${fallbackLinkBlock(postUrl)}`;
  const text = `Votre commentaire a été approuvé

Votre commentaire sur l'article "${postTitle}" est maintenant visible :

"${excerpt}"

Voir la discussion : ${postUrl}

CABM — Bamako, Mali`;
  return { html: layout(inner), text };
}
