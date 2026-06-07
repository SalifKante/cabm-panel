// src/controllers/orderController.js
import mongoose from "mongoose";
import { body, validationResult } from "express-validator";
import orderModel, { ORDER_STATUSES } from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { generateWhatsAppLink } from "../utils/whatsapp.js";
import { sendMail } from "../utils/mailer.js";
import { orderReceivedEmail } from "../emails/templates.js";
import {
  getPagination,
  buildSearchFilter,
  paginate,
} from "../utils/queryBuilder.js";

const ADMIN_RECIPIENT =
  process.env.CONTACT_EMAIL || process.env.SMTP_USER || "cabmsarl2022@gmail.com";

/* -------------------------------------------------------------------------- */
/*                               validators                                   */
/* -------------------------------------------------------------------------- */

const createOrderValidators = [
  body("customer.name")
    .exists({ checkNull: true })
    .withMessage("Le nom du client est requis.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Le nom du client est invalide (max 120 caractères)."),
  body("customer.phone")
    .exists({ checkNull: true })
    .withMessage("Le téléphone du client est requis.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage("Le téléphone du client est invalide (max 40 caractères)."),
  body("customer.email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("L'email du client est invalide."),
  body("customer.location")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 300 }),
  body("customer.note")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 1000 }),
  body("deliveryEstimate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("La livraison estimée doit être un nombre positif."),
  body("items")
    .isArray({ min: 1 })
    .withMessage("La commande doit contenir au moins un article."),
  body("items.*.productId")
    .exists({ checkNull: true })
    .withMessage("productId requis pour chaque article.")
    .bail()
    .custom((v) => mongoose.isValidObjectId(v))
    .withMessage("productId invalide."),
  body("items.*.quantity")
    .exists({ checkNull: true })
    .withMessage("quantity requise pour chaque article.")
    .bail()
    .isInt({ min: 1 })
    .withMessage("La quantité doit être un entier supérieur ou égal à 1."),
];

async function runValidations(req, res, validations) {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return true;
  res.status(400).json({
    success: false,
    message: "Validation échouée. Veuillez vérifier les champs.",
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
  return false;
}

/* -------------------------------------------------------------------------- */
/*                                 handlers                                   */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/orders  (PUBLIC)
 * Creates an order intent. All prices/totals are recomputed server-side from
 * the database — client-supplied prices are ignored entirely.
 */
const createOrder = async (req, res) => {
  try {
    const valid = await runValidations(req, res, createOrderValidators);
    if (!valid) return;

    const { customer = {}, items = [] } = req.body;

    // Load all referenced products that are active.
    const ids = items.map((it) => it.productId);
    const products = await productModel.find({
      _id: { $in: ids },
      isActive: true,
    });
    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    // Recompute each line server-side; reject missing/inactive/out-of-stock.
    const computedItems = [];
    let subtotal = 0;
    let currency = "XOF";

    for (const it of items) {
      const product = byId.get(String(it.productId));
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Produit indisponible ou introuvable (id: ${it.productId}).`,
        });
      }

      const quantity = Number(it.quantity);

      // Optional stock check — only when the product tracks stock.
      if (typeof product.stock === "number" && quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour « ${product.title} » (disponible: ${product.stock}).`,
        });
      }

      const price = Number(product.price) || 0;
      const lineTotal = price * quantity;
      subtotal += lineTotal;
      currency = product.currency || currency;

      computedItems.push({
        productId: product._id,
        productName: product.title,
        price,
        unit: product.unit || "",
        quantity,
        lineTotal,
      });
    }

    const deliveryEstimate = Number(req.body.deliveryEstimate) || 0;
    const total = subtotal + deliveryEstimate;

    const order = new orderModel({
      customer: {
        name: String(customer.name).trim(),
        phone: String(customer.phone).trim(),
        email: customer.email ? String(customer.email).trim() : undefined,
        location: customer.location ? String(customer.location).trim() : undefined,
        note: customer.note ? String(customer.note).trim() : undefined,
        // Only trust a server-known authenticated user, never client input.
        userId: req.user?.id || undefined,
      },
      items: computedItems,
      subtotal,
      deliveryEstimate,
      total,
      currency,
      status: "pending",
      whatsappSentAt: new Date(), // handing off to WhatsApp now
    });

    await order.save();

    const whatsappUrl = generateWhatsAppLink(order);

    // Notify admin — failure must not fail the order.
    try {
      const { html, text } = orderReceivedEmail(order, whatsappUrl);
      await sendMail(
        ADMIN_RECIPIENT,
        `Nouvelle commande — ${order.orderNumber}`,
        html,
        text
      );
    } catch (mailErr) {
      console.error("Order notification email failed (order saved):", mailErr);
    }

    return res.json({
      success: true,
      orderNumber: order.orderNumber,
      whatsappUrl,
    });
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

/**
 * GET /api/orders/:orderNumber  (PUBLIC)
 * Look up order status by its order number.
 */
const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await orderModel.findOne({ orderNumber }).lean();
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Commande introuvable." });
    }
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("getOrderByNumber error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/orders/admin  (ADMIN)
 * Paginated list with optional ?status= filter and ?q= search
 * (orderNumber or customer phone).
 */
const listOrders = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const filter = {
      ...buildSearchFilter(req.query.q, ["orderNumber", "customer.phone"]),
    };

    const status = (req.query.status ?? "").toString().trim();
    if (status) {
      if (!ORDER_STATUSES.includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Statut invalide." });
      }
      filter.status = status;
    }

    const { items, pagination } = await paginate(orderModel, {
      filter,
      sort: { createdAt: -1 },
      page,
      limit,
      skip,
    });

    return res.json({ success: true, data: items, pagination });
  } catch (error) {
    console.error("listOrders error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * PATCH /api/orders/admin/:id/status  (ADMIN)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID de commande invalide." });
    }
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs autorisées: ${ORDER_STATUSES.join(", ")}.`,
      });
    }

    const order = await orderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Commande introuvable." });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/orders/admin/stats  (ADMIN)
 * Counts by status + total orders + delivered revenue.
 */
const getOrderStats = async (req, res) => {
  try {
    const agg = await orderModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
    ]);

    // Initialise all statuses to 0 so the shape is stable.
    const byStatus = ORDER_STATUSES.reduce((acc, s) => {
      acc[s] = 0;
      return acc;
    }, {});

    let totalOrders = 0;
    let deliveredRevenue = 0;

    for (const row of agg) {
      if (row._id in byStatus) byStatus[row._id] = row.count;
      totalOrders += row.count;
      if (row._id === "delivered") deliveredRevenue = row.revenue || 0;
    }

    return res.json({
      success: true,
      data: {
        totalOrders,
        byStatus,
        revenue: deliveredRevenue, // realised revenue (delivered orders)
        currency: "XOF",
      },
    });
  } catch (error) {
    console.error("getOrderStats error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

export {
  createOrder,
  getOrderByNumber,
  listOrders,
  updateOrderStatus,
  getOrderStats,
};
