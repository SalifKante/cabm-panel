// src/controllers/userAdminController.js
//
// Admin-only management of registered (client) users. Mounted under /api/admin
// behind requireAdminAny, so it works with BOTH the legacy aToken (admin panel)
// and the cookie-JWT admin.
//
// Safety rails:
//   - The primary env admin (ADMIN_EMAIL) is protected: it can't be demoted,
//     unverified or deleted.
//   - An admin can't perform destructive actions on their own account.

import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import commentModel from "../models/commentModel.js";
import {
  getPagination,
  buildSearchFilter,
  buildPaginationMeta,
} from "../utils/queryBuilder.js";

const PRIMARY_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();

// Public-safe projection (never expose hashes/tokens).
const PUBLIC_FIELDS =
  "name email phone avatar bio role isVerified createdAt updatedAt";

function isPrimaryAdmin(user) {
  return (
    PRIMARY_ADMIN_EMAIL &&
    String(user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL
  );
}

/**
 * GET /api/admin/users
 * Query: q (name/email/phone), role (user|admin), verified (true|false),
 *        page, limit.
 */
export const listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, {
      defaultLimit: 12,
      maxLimit: 100,
    });

    const filter = {
      ...buildSearchFilter(req.query.q, ["name", "email", "phone"]),
    };

    const role = (req.query.role ?? "").toString().trim();
    if (role === "user" || role === "admin") filter.role = role;

    const verified = (req.query.verified ?? "").toString().trim();
    if (verified === "true") filter.isVerified = true;
    if (verified === "false") filter.isVerified = false;

    const [items, total] = await Promise.all([
      userModel
        .find(filter)
        .select(PUBLIC_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      userModel.countDocuments(filter),
    ]);

    // Flag the protected primary admin so the UI can disable destructive actions.
    const data = items.map((u) => ({
      ...u,
      isPrimaryAdmin: isPrimaryAdmin(u),
    }));

    return res.json({
      success: true,
      data,
      pagination: buildPaginationMeta({ total, page, limit }),
    });
  } catch (error) {
    console.error("listUsers error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/admin/users/stats
 * Counts for the dashboard cards.
 */
export const getUsersStats = async (req, res) => {
  try {
    const [total, admins, verified] = await Promise.all([
      userModel.countDocuments({}),
      userModel.countDocuments({ role: "admin" }),
      userModel.countDocuments({ isVerified: true }),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        admins,
        users: total - admins,
        verified,
        unverified: total - verified,
      },
    });
  } catch (error) {
    console.error("getUsersStats error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * PATCH /api/admin/users/:id/role   { role: "user" | "admin" }
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }
    if (!["user", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Rôle invalide (user ou admin)." });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur introuvable." });
    }

    // Protect the primary admin from being demoted.
    if (isPrimaryAdmin(user) && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "L'administrateur principal ne peut pas être rétrogradé.",
      });
    }
    // Prevent self-demotion (don't let an admin lock themselves out).
    if (req.user?.id && String(req.user.id) === String(user._id) && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez pas modifier votre propre rôle.",
      });
    }

    user.role = role;
    await user.save();

    return res.json({
      success: true,
      message:
        role === "admin"
          ? "Utilisateur promu administrateur."
          : "Administrateur rétrogradé en utilisateur.",
      data: { _id: user._id, role: user.role },
    });
  } catch (error) {
    console.error("updateUserRole error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * PATCH /api/admin/users/:id/verify   { isVerified: boolean }
 */
export const setUserVerified = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }
    if (typeof isVerified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Le corps doit contenir { isVerified: boolean }.",
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur introuvable." });
    }

    // The primary admin must stay verified.
    if (isPrimaryAdmin(user) && isVerified === false) {
      return res.status(403).json({
        success: false,
        message: "L'administrateur principal doit rester vérifié.",
      });
    }

    user.isVerified = isVerified;
    if (isVerified) user.verificationToken = undefined;
    await user.save();

    return res.json({
      success: true,
      message: isVerified
        ? "Compte marqué comme vérifié."
        : "Vérification du compte annulée.",
      data: { _id: user._id, isVerified: user.isVerified },
    });
  } catch (error) {
    console.error("setUserVerified error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Removes the user and their blog comments.
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur introuvable." });
    }

    if (isPrimaryAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: "L'administrateur principal ne peut pas être supprimé.",
      });
    }
    if (req.user?.id && String(req.user.id) === String(user._id)) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez pas supprimer votre propre compte.",
      });
    }

    await user.deleteOne();
    // Clean up their comments (best-effort).
    await commentModel.deleteMany({ userId: id });

    return res.json({ success: true, message: "Utilisateur supprimé." });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};
