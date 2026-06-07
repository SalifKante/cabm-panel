// src/utils/whatsapp.js
//
// Builds the pre-filled WhatsApp deep link the customer is redirected to after
// submitting an order. There is no payment on the site — this bridges order
// intent to a WhatsApp conversation with the seller.

const WHATSAPP_PHONE = "22373879656";
const DIVIDER = "────────────────";

/**
 * Format a money amount: rounded, thousands grouped with plain spaces.
 * 15000 -> "15 000"
 */
export function formatAmount(n) {
  const num = Math.round(Number(n) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Build the plain-text WhatsApp message body for an order (French).
 */
export function buildWhatsAppMessage(order) {
  const cur = order.currency || "XOF";
  const items = Array.isArray(order.items) ? order.items : [];
  const lines = [];

  lines.push("Bonjour CABM, je souhaite passer une commande.");
  lines.push(`Numéro: ${order.orderNumber}`);
  lines.push(DIVIDER);

  items.forEach((it, i) => {
    const unitPart = it.unit
      ? `${formatAmount(it.price)}/${it.unit}`
      : `${formatAmount(it.price)}`;
    lines.push(
      `${i + 1}. ${it.productName} × ${it.quantity} — ${unitPart} — ${formatAmount(
        it.lineTotal
      )} ${cur}`
    );
  });

  lines.push(DIVIDER);
  lines.push(`Sous-total : ${formatAmount(order.subtotal)} ${cur}`);
  lines.push(`Livraison estimée : ${formatAmount(order.deliveryEstimate)} ${cur}`);
  lines.push(`Total : ${formatAmount(order.total)} ${cur}`);
  lines.push(DIVIDER);

  lines.push(`Nom : ${order.customer?.name || ""}`);
  lines.push(`Téléphone : ${order.customer?.phone || ""}`);
  if (order.customer?.location) lines.push(`Lieu : ${order.customer.location}`);
  if (order.customer?.note) lines.push(`Note : ${order.customer.note}`);

  lines.push("Merci !");

  return lines.join("\n");
}

/**
 * Build the full WhatsApp deep link for an order.
 * @returns {string} https://api.whatsapp.com/send?phone=...&text=<encoded>
 */
export function generateWhatsAppLink(order) {
  const text = encodeURIComponent(buildWhatsAppMessage(order));
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${text}`;
}

export default generateWhatsAppLink;
