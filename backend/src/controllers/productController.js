import productModel from "../models/productModel.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import stream from "stream";
import {
  getPagination,
  buildSearchFilter,
  paginate,
} from "../utils/queryBuilder.js";
import {
  runValidations,
  createProductValidators,
  updateProductValidators,
} from "../validators/productValidators.js";

// ✅ Cloudinary must be configured once at app boot:
// cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: ..., api_secret: ... });

function uploadBufferToCloudinary(buffer, folder = "products") {
  return new Promise((resolve, reject) => {
    const passthrough = new stream.PassThrough();
    passthrough.end(buffer);

    const uploader = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder },
      (err, result) => (err ? reject(err) : resolve(result))
    );

    passthrough.pipe(uploader);
  });
}

/**
 * Pick the optional e-commerce fields from a (sanitized) body and coerce them
 * to their proper types. Only keys actually present (non-empty) are returned,
 * so this is safe for both create and partial update.
 */
function pickEcommerceFields(body = {}) {
  const out = {};
  if (body.type !== undefined && body.type !== "") {
    const t = String(body.type).trim();
    if (t === "showcase" || t === "shop") out.type = t;
  }
  if (body.price !== undefined && body.price !== "") out.price = Number(body.price);
  if (body.currency !== undefined && body.currency !== "")
    out.currency = String(body.currency).trim();
  if (body.unit !== undefined) out.unit = String(body.unit).trim();
  if (body.deliveryDetails !== undefined)
    out.deliveryDetails = String(body.deliveryDetails).trim();
  if (body.stock !== undefined && body.stock !== "") out.stock = Number(body.stock);
  if (body.category !== undefined) out.category = String(body.category).trim();
  return out;
}

// ===================== ADMIN — Create Product =====================
const createProduct = async (req, res) => {
  try {
    // Validate text fields (runs after Multer; adminRoute.js untouched)
    const valid = await runValidations(req, res, createProductValidators);
    if (!valid) return;

    const { title, description } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    // Champs requis
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Le titre et la description sont requis.",
      });
    }

    // Images: 1..10 (exactement le même esprit que votre controller d’activité)
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Veuillez sélectionner au moins une image.",
      });
    }
    if (files.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 images sont autorisées.",
      });
    }

    // Upload en parallèle vers Cloudinary (on garde uniquement secure_url)
    const uploads = await Promise.all(
      files.map((f) => uploadBufferToCloudinary(f.buffer, "products"))
    );
    const imageUrls = uploads.map((u) => u.secure_url);

    // Création du document (respect strict de votre schéma + champs e-commerce)
    const product = new productModel({
      title: title.trim(),
      description: description.trim(),
      image: imageUrls, // array de strings (URLs)
      ...pickEcommerceFields(req.body),
      // isActive: par défaut true (depuis le schema)
    });

    await product.save();

    return res.json({
      success: true,
      message: "Produit créé avec succès.",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    const msg = error?.message?.includes("File too large")
      ? "Fichier trop volumineux (max 8MB)."
      : error?.message || "Erreur serveur. Veuillez réessayer plus tard.";
    return res.status(500).json({ success: false, message: msg });
  }
};

/**
 * GET /api/admin/all-products  (ADMIN)
 * Optional query:
 *  - q: text search on title
 *  - active: "true" | "false" to filter isActive
 *
 * NOTE: kept as-is for backward compatibility with the admin panel.
 */
const listProducts = async (req, res) => {
  try {
    const { q, active } = req.query;
    const filter = {};
    if (q) filter.title = { $regex: q, $options: "i" };
    if (typeof active !== "undefined") filter.isActive = active === "true";

    const items = await productModel.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error("listProducts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/products  (PUBLIC)
 * Paginated list of ACTIVE products.
 * Query:
 *  - q: search term across title, description, category
 *  - category: exact category filter
 *  - type: "showcase" | "shop" — when provided, filters by product type
 *          (no type param → returns ALL active products, backward compatible)
 *  - page, limit: pagination (limit capped at 50)
 */
const listPublicProducts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, {
      defaultLimit: 12,
      maxLimit: 50,
    });

    const filter = {
      isActive: true,
      ...buildSearchFilter(req.query.q, ["title", "description", "category"]),
    };

    const category = (req.query.category ?? "").toString().trim();
    if (category) filter.category = category;

    // Optional type filter — only applied for recognized values so an
    // unknown/empty ?type= stays backward compatible (returns all products).
    const type = (req.query.type ?? "").toString().trim();
    if (type === "showcase" || type === "shop") filter.type = type;

    const { items, pagination } = await paginate(productModel, {
      filter,
      sort: { createdAt: -1 },
      page,
      limit,
      skip,
    });

    return res.json({ success: true, data: items, pagination });
  } catch (err) {
    console.error("listPublicProducts error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Count products
const getProductsCount = async (req, res) => {
  try {
    const count = await productModel.countDocuments();
    res.json({ success: true, count });
  } catch (err) {
    console.error("getProductsCount error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/** GET /api/admin product fetch by id (ADMIN — used internally) */
const getProduct = async (req, res) => {
  try {
    const item = await productModel.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    console.error("getProduct error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/products/:id  (PUBLIC)
 * Single ACTIVE product by id.
 */
const getPublicProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }

    const item = await productModel.findOne({ _id: id, isActive: true }).lean();
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, data: item });
  } catch (err) {
    console.error("getPublicProduct error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PUT /api/admin/product/:id
 * Body: multipart/form-data
 *  - text: title?, description?, isActive? ("true"/"false")
 *  - e-commerce: price?, currency?, unit?, deliveryDetails?, stock?, category?
 *  - control: replaceImages? ("true"/"false", default "false")
 *  - control: removeImages[]? (array of image URLs to drop from DB)
 *  - files: image[] (use field name "image")
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate text fields (runs after Multer; adminRoute.js untouched)
    const valid = await runValidations(req, res, updateProductValidators);
    if (!valid) return;

    // Find current doc
    const doc = await productModel.findById(id);
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Produit introuvable." });
    }

    // Parse body
    const { title, description } = req.body;
    const replaceImages =
      String(req.body.replaceImages ?? "false").toLowerCase() === "true";

    // removeImages can come as string or array; accept both
    const removeImagesRaw =
      req.body.removeImages ?? req.body["removeImages[]"] ?? [];
    const removeImages = [].concat(removeImagesRaw).map(String).filter(Boolean);

    const files = Array.isArray(req.files) ? req.files : [];

    // ---------- Title / Description (optional updates) ----------
    const update = {};
    if (typeof title !== "undefined") update.title = String(title).trim();
    if (typeof description !== "undefined")
      update.description = String(description).trim();

    // ---------- isActive (optional) ----------
    if (typeof req.body.isActive !== "undefined" && req.body.isActive !== "") {
      update.isActive =
        String(req.body.isActive).toLowerCase() === "true" ||
        req.body.isActive === true;
    }

    // ---------- E-commerce fields (optional) ----------
    Object.assign(update, pickEcommerceFields(req.body));

    // ---------- Images logic (strict 1..10 total) ----------
    // Start from existing images
    let images = Array.isArray(doc.image) ? [...doc.image] : [];

    if (replaceImages) {
      // Replace mode: must upload between 1 and 10 files
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Veuillez sélectionner au moins une image (mode remplacement).",
        });
      }
      if (files.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Maximum 10 images sont autorisées (mode remplacement).",
        });
      }

      // Upload all new files
      const uploads = await Promise.all(
        files.map((f) => uploadBufferToCloudinary(f.buffer, "products"))
      );
      const newUrls = uploads.map((u) => u.secure_url);
      images = newUrls; // fully replaced
    } else {
      // Append mode
      // 1) Remove requested existing URLs (if any)
      if (removeImages.length) {
        const toRemove = new Set(removeImages);
        images = images.filter((u) => !toRemove.has(u));
      }

      // 2) Append new uploads (if any), but keep total <= 10
      if (files.length) {
        const keptCount = images.length;
        const available = 10 - keptCount;

        if (available <= 0) {
          return res.status(400).json({
            success: false,
            message:
              "Vous avez déjà atteint la limite de 10 images. Retirez-en avant d’en ajouter.",
          });
        }
        if (files.length > available) {
          return res.status(400).json({
            success: false,
            message: `Vous ne pouvez ajouter que ${available} image(s) supplémentaire(s) (limite 10).`,
          });
        }

        const uploads = await Promise.all(
          files.map((f) => uploadBufferToCloudinary(f.buffer, "products"))
        );
        const newUrls = uploads.map((u) => u.secure_url);
        images.push(...newUrls);
      }

      // After removal & append, must keep at least 1
      if (images.length < 1) {
        return res.status(400).json({
          success: false,
          message: "Au moins une image est requise.",
        });
      }
    }

    // Final safety check
    if (images.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 images sont autorisées.",
      });
    }

    update.image = images;

    // Save and return
    const updated = await productModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    return res.json({
      success: true,
      message: "Produit mis à jour avec succès.",
      product: updated,
    });
  } catch (error) {
    console.error("updateProduct error:", error);
    const msg = error?.message?.includes("File too large")
      ? "Fichier trop volumineux (max 8MB)."
      : error?.message || "Erreur serveur durant la mise à jour.";
    return res.status(500).json({ success: false, message: msg });
  }
};

/** DELETE /api/products/:id
 * NOTE: Your schema stores only URLs, so we cannot delete Cloudinary files here.
 * This only removes the DB document.
 */
const deleteProduct = async (req, res) => {
  try {
    const item = await productModel.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    await item.deleteOne();
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const patchProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validate ID
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }

    // Validate body
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Body must include { isActive: boolean }",
      });
    }

    const updated = await productModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true, lean: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product status updated",
      data: { _id: updated._id, isActive: updated.isActive },
    });
  } catch (err) {
    console.error("patchProductStatus error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error updating status" });
  }
};

export {
  createProduct,
  listProducts,
  listPublicProducts,
  getProductsCount,
  getProduct,
  getPublicProduct,
  updateProduct,
  deleteProduct,
  patchProductStatus,
};
