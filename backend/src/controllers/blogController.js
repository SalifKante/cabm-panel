// src/controllers/blogController.js
import mongoose from "mongoose";
import stream from "stream";
import { v2 as cloudinary } from "cloudinary";
import { body, validationResult } from "express-validator";

import postModel from "../models/postModel.js";
import categoryModel from "../models/categoryModel.js";
import commentModel from "../models/commentModel.js";
import subscriberModel from "../models/subscriberModel.js";
import userModel from "../models/userModel.js";
import { sendMail } from "../utils/mailer.js";
import { newPostEmail, commentApprovedEmail } from "../emails/templates.js";
import {
  getPagination,
  buildSearchFilter,
  buildPaginationMeta,
} from "../utils/queryBuilder.js";

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3030").replace(
  /\/+$/,
  ""
);
// Used to build the (backend) unsubscribe link in subscriber emails.
const API_URL = (process.env.API_URL || FRONTEND_URL).replace(/\/+$/, "");

/* ------------------------------- helpers ---------------------------------- */

function uploadBufferToCloudinary(buffer, folder = "blog") {
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

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

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

// Email blast for a freshly published post. Recipients = ALL verified registered
// users ∪ active newsletter subscribers (deduplicated by email). Each send is
// isolated so one failure does not stop the rest.
//
// NOTE: this is awaited by the publish handlers so the emails actually go out on
// serverless (Vercel) — a fire-and-forget after res.json() would be killed when
// the function freezes. For very large audiences, move this to a queue/cron.
async function notifyNewPost(post) {
  const [subs, users] = await Promise.all([
    subscriberModel.find({ isActive: true }).select("email unsubscribeToken").lean(),
    userModel.find({ isVerified: true }).select("email").lean(),
  ]);

  // Map subscriber email -> unsubscribe token (so subscribers keep a working
  // one-click unsubscribe link).
  const tokenByEmail = new Map();
  for (const s of subs) {
    if (s.email) tokenByEmail.set(s.email.toLowerCase(), s.unsubscribeToken);
  }

  // Union of all recipient emails (registered users + subscribers).
  const recipients = new Set();
  for (const u of users) if (u.email) recipients.add(u.email.toLowerCase());
  for (const s of subs) if (s.email) recipients.add(s.email.toLowerCase());

  let sent = 0;
  for (const email of recipients) {
    const token = tokenByEmail.get(email);
    // Subscribers get their token link; registered-only users get the site link.
    const unsubscribeUrl = token
      ? `${API_URL}/api/blog/unsubscribe/${token}`
      : FRONTEND_URL;
    const { html, text } = newPostEmail(post, unsubscribeUrl);
    try {
      await sendMail(email, `Nouvel article — ${post.title}`, html, text);
      sent += 1;
    } catch (e) {
      console.error("New-post email failed for", email, "-", e.message);
    }
  }
  console.log(`📣 New-post blast "${post.title}": ${sent}/${recipients.size} sent`);
}

/* -------------------------------------------------------------------------- */
/*                                  PUBLIC                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/blog/posts
 * Paginated posts. Filters: ?category=<slug> ?tag=<tag> ?q=<search>.
 * Public callers see only published posts. Admins (identified via the optional
 * attachAdminIfPresent middleware → req.user.role === "admin") see ALL posts,
 * including drafts.
 */
const listPosts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, {
      defaultLimit: 9,
      maxLimit: 50,
    });

    const isAdmin = req.user?.role === "admin";
    const filter = {
      ...(isAdmin ? {} : { status: "published" }),
      ...buildSearchFilter(req.query.q, ["title", "excerpt", "tags"]),
    };

    const tag = (req.query.tag ?? "").toString().trim();
    if (tag) filter.tags = tag;

    const categorySlug = (req.query.category ?? "").toString().trim();
    if (categorySlug) {
      const cat = await categoryModel
        .findOne({ slug: categorySlug.toLowerCase() })
        .select("_id");
      if (!cat) {
        // Unknown category => no matches.
        return res.json({
          success: true,
          data: [],
          pagination: buildPaginationMeta({ total: 0, page, limit }),
        });
      }
      filter.category = cat._id;
    }

    const [items, total] = await Promise.all([
      postModel
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("category", "name slug")
        .populate("author", "name avatar")
        .lean(),
      postModel.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: buildPaginationMeta({ total, page, limit }),
    });
  } catch (error) {
    console.error("listPosts error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/blog/posts/:slug
 * Single published post; increments views; returns likesCount.
 */
const getPost = async (req, res) => {
  try {
    const slug = String(req.params.slug).toLowerCase();

    const post = await postModel
      .findOneAndUpdate(
        { slug, status: "published" },
        { $inc: { views: 1 } },
        { new: true }
      )
      .populate("category", "name slug")
      .populate("author", "name avatar");

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    const data = post.toObject();
    data.likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
    delete data.likes; // don't expose the list of user ids

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getPost error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/blog/categories
 */
const listCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find().sort({ name: 1 }).lean();
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error("listCategories error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/blog/posts/:slug/comments
 * Approved comments for a post, nested into a threaded structure.
 */
const getPostComments = async (req, res) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const post = await postModel.findOne({ slug }).select("_id");
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    const comments = await commentModel
      .find({ postId: post._id, status: "approved" })
      .sort({ createdAt: 1 })
      .populate("userId", "name avatar")
      .lean();

    // Optionally mark which comments the current viewer liked (if authenticated).
    const viewerId = req.user?.id ? String(req.user.id) : null;

    // Build threaded tree (parents with .replies).
    const map = new Map();
    const roots = [];
    comments.forEach((c) => {
      c.replies = [];
      // Expose a like count + viewer state, but never the raw list of user ids.
      const likeIds = Array.isArray(c.likes) ? c.likes.map(String) : [];
      c.likesCount = likeIds.length;
      c.likedByMe = viewerId ? likeIds.includes(viewerId) : false;
      delete c.likes;
      map.set(c._id.toString(), c);
    });
    comments.forEach((c) => {
      const parent = c.parentId && map.get(c.parentId.toString());
      if (parent) parent.replies.push(c);
      else roots.push(c); // top-level (or orphaned reply)
    });

    return res.json({ success: true, data: roots });
  } catch (error) {
    console.error("getPostComments error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/* -------------------------------------------------------------------------- */
/*                  PROTECTED (requireAuth + requireVerified)                 */
/* -------------------------------------------------------------------------- */

const commentValidators = [
  body("content")
    .exists({ checkNull: true })
    .withMessage("Le contenu du commentaire est requis.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Le commentaire doit comporter entre 1 et 2000 caractères."),
];

/**
 * POST /api/blog/posts/:slug/comments
 * Queues a comment as pending moderation.
 */
const createComment = async (req, res) => {
  try {
    const valid = await runValidations(req, res, commentValidators);
    if (!valid) return;

    const slug = String(req.params.slug).toLowerCase();
    const post = await postModel.findOne({ slug }).select("_id");
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    let parentId = null;
    if (req.body.parentId) {
      if (!mongoose.isValidObjectId(req.body.parentId)) {
        return res
          .status(400)
          .json({ success: false, message: "parentId invalide." });
      }
      const parent = await commentModel
        .findById(req.body.parentId)
        .select("postId");
      if (!parent || parent.postId.toString() !== post._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Le commentaire parent est introuvable pour cet article.",
        });
      }
      parentId = req.body.parentId;
    }

    const comment = await commentModel.create({
      postId: post._id,
      userId: req.user.id,
      content: String(req.body.content).trim(),
      parentId,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Commentaire soumis et en attente de modération.",
      data: comment,
    });
  } catch (error) {
    console.error("createComment error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * DELETE /api/blog/comments/:id
 * Delete the requester's own comment only.
 */
const deleteOwnComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const comment = await commentModel.findById(id);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Commentaire introuvable." });
    }
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez supprimer que vos propres commentaires.",
      });
    }

    await comment.deleteOne();
    return res.json({ success: true, message: "Commentaire supprimé." });
  } catch (error) {
    console.error("deleteOwnComment error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * POST /api/blog/posts/:slug/like
 * Toggle the requester's like on a published post.
 */
const toggleLike = async (req, res) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const post = await postModel.findOne({ slug, status: "published" });
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    const uid = req.user.id;
    const idx = post.likes.findIndex((x) => x.toString() === uid);
    let liked;
    if (idx >= 0) {
      post.likes.splice(idx, 1);
      liked = false;
    } else {
      post.likes.push(uid);
      liked = true;
    }
    await post.save();

    return res.json({ success: true, liked, likesCount: post.likes.length });
  } catch (error) {
    console.error("toggleLike error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * POST /api/blog/comments/:id/like
 * Toggle the requester's like on a single (approved) comment.
 */
const toggleCommentLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const comment = await commentModel.findById(id);
    if (!comment || comment.status !== "approved") {
      return res
        .status(404)
        .json({ success: false, message: "Commentaire introuvable." });
    }

    const uid = req.user.id;
    const idx = comment.likes.findIndex((x) => x.toString() === uid);
    let liked;
    if (idx >= 0) {
      comment.likes.splice(idx, 1);
      liked = false;
    } else {
      comment.likes.push(uid);
      liked = true;
    }
    await comment.save();

    return res.json({ success: true, liked, likesCount: comment.likes.length });
  } catch (error) {
    console.error("toggleCommentLike error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * POST /api/blog/subscribe
 * Subscribe an email to blog notifications (defaults to the user's email).
 */
const subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || req.user.email || "")
      .trim()
      .toLowerCase();

    // Basic email shape check.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Veuillez fournir un email valide." });
    }

    let sub = await subscriberModel.findOne({ email });
    if (sub) {
      if (!sub.isActive) {
        sub.isActive = true;
        await sub.save();
      }
    } else {
      sub = await subscriberModel.create({ email });
    }

    return res.json({
      success: true,
      message: "Inscription aux notifications réussie.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.json({
        success: true,
        message: "Inscription aux notifications réussie.",
      });
    }
    console.error("subscribe error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/blog/unsubscribe/:token   (no auth)
 */
const unsubscribe = async (req, res) => {
  try {
    const { token } = req.params;
    const sub = await subscriberModel.findOne({ unsubscribeToken: token });
    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "Lien de désinscription invalide." });
    }

    if (sub.isActive) {
      sub.isActive = false;
      await sub.save();
    }

    return res.json({ success: true, message: "Désinscription réussie." });
  } catch (error) {
    console.error("unsubscribe error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/* -------------------------------------------------------------------------- */
/*                     ADMIN (requireAuth + requireAdmin)                     */
/* -------------------------------------------------------------------------- */

const postValidators = [
  body("title")
    .exists({ checkNull: true })
    .withMessage("Le titre est requis.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Le titre doit comporter entre 1 et 200 caractères."),
  body("content")
    .exists({ checkNull: true })
    .withMessage("Le contenu est requis.")
    .bail()
    .isString()
    .isLength({ min: 1 })
    .withMessage("Le contenu est requis."),
  body("excerpt")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("L'extrait est trop long (max 500 caractères)."),
  body("status")
    .optional({ checkFalsy: true })
    .isIn(["draft", "published"])
    .withMessage("Statut invalide."),
];

/**
 * POST /api/blog/posts   (cover image via multipart field "coverImage")
 */
const createPost = async (req, res) => {
  try {
    const valid = await runValidations(req, res, postValidators);
    if (!valid) return;

    const { title, excerpt, content, category, status } = req.body;

    let categoryId;
    if (category) {
      if (!mongoose.isValidObjectId(category)) {
        return res
          .status(400)
          .json({ success: false, message: "Catégorie invalide." });
      }
      categoryId = category;
    }

    let coverImage;
    if (req.file) {
      const up = await uploadBufferToCloudinary(req.file.buffer, "blog");
      coverImage = up.secure_url;
    }

    const willPublish = status === "published";

    const post = new postModel({
      title: String(title).trim(),
      excerpt: excerpt ? String(excerpt).trim() : undefined,
      content,
      coverImage,
      category: categoryId,
      tags: parseTags(req.body.tags),
      status: willPublish ? "published" : "draft",
      author: req.user.id,
      publishedAt: willPublish ? new Date() : undefined,
    });

    await post.save();

    // If created directly as published, notify all registered users + subscribers.
    if (willPublish) {
      try {
        await notifyNewPost(post);
      } catch (e) {
        console.error("notifyNewPost failed:", e.message);
      }
    }

    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Un article avec un titre/slug similaire existe déjà.",
      });
    }
    console.error("createPost error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * PUT /api/blog/posts/:id   (optional cover image)
 */
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const post = await postModel.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    const { title, excerpt, content, category, status } = req.body;

    if (typeof title !== "undefined") post.title = String(title).trim();
    if (typeof excerpt !== "undefined") post.excerpt = String(excerpt).trim();
    if (typeof content !== "undefined") post.content = content;
    if (typeof req.body.tags !== "undefined") post.tags = parseTags(req.body.tags);

    if (typeof category !== "undefined") {
      if (category) {
        if (!mongoose.isValidObjectId(category)) {
          return res
            .status(400)
            .json({ success: false, message: "Catégorie invalide." });
        }
        post.category = category;
      } else {
        post.category = undefined;
      }
    }

    if (typeof status !== "undefined" && ["draft", "published"].includes(status)) {
      post.status = status;
      if (status === "published" && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    if (req.file) {
      const up = await uploadBufferToCloudinary(req.file.buffer, "blog");
      post.coverImage = up.secure_url;
    }

    await post.save();
    return res.json({ success: true, data: post });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Un article avec un titre/slug similaire existe déjà.",
      });
    }
    console.error("updatePost error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * DELETE /api/blog/posts/:id
 */
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const post = await postModel.findByIdAndDelete(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    // Clean up associated comments.
    await commentModel.deleteMany({ postId: id });

    return res.json({ success: true, message: "Article supprimé." });
  } catch (error) {
    console.error("deletePost error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * PATCH /api/blog/posts/:id/publish
 * Publishes a post and triggers the subscriber email blast (non-blocking).
 */
const publishPost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const post = await postModel.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    const wasAlreadyPublished = post.status === "published" && !!post.publishedAt;

    post.status = "published";
    if (!post.publishedAt) post.publishedAt = new Date();
    await post.save();

    // Notify all registered users + subscribers — only on the first publish, so
    // re-publishing an already-live post doesn't spam everyone again.
    if (!wasAlreadyPublished) {
      try {
        await notifyNewPost(post);
      } catch (e) {
        console.error("notifyNewPost failed:", e.message);
      }
    }

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("publishPost error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/blog/admin/comments
 * All pending comments for moderation.
 */
const listPendingComments = async (req, res) => {
  try {
    const items = await commentModel
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("userId", "name avatar email")
      .populate("postId", "title slug")
      .lean();

    return res.json({ success: true, data: items });
  } catch (error) {
    console.error("listPendingComments error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * PATCH /api/blog/admin/comments/:id/approve
 */
const approveComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const comment = await commentModel
      .findByIdAndUpdate(id, { status: "approved" }, { new: true })
      .populate("userId", "name email")
      .populate("postId", "title slug");
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Commentaire introuvable." });
    }

    // Notify the comment author (non-blocking, best-effort).
    const authorEmail = comment.userId?.email;
    const post = comment.postId;
    if (authorEmail && post) {
      const postUrl = `${FRONTEND_URL}/blog/${post.slug}`;
      const { html, text } = commentApprovedEmail(comment, post.title, postUrl);
      sendMail(
        authorEmail,
        `Votre commentaire a été approuvé — ${post.title}`,
        html,
        text
      ).catch((e) =>
        console.error("Comment-approved email failed:", e.message)
      );
    }

    return res.json({ success: true, data: comment });
  } catch (error) {
    console.error("approveComment error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * DELETE /api/blog/admin/comments/:id
 * Delete any comment (moderation).
 */
const deleteAnyComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const comment = await commentModel.findByIdAndDelete(id);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Commentaire introuvable." });
    }

    return res.json({ success: true, message: "Commentaire supprimé." });
  } catch (error) {
    console.error("deleteAnyComment error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/blog/admin/posts/:id  (admin)
 * Returns any post by _id regardless of status (for editing drafts).
 */
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }

    const post = await postModel
      .findById(id)
      .populate("category", "name slug")
      .populate("author", "name avatar");

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Article introuvable." });
    }

    return res.json({ success: true, data: post });
  } catch (error) {
    console.error("getPostById error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

export {
  // public
  listPosts,
  getPost,
  listCategories,
  getPostComments,
  // protected
  createComment,
  deleteOwnComment,
  toggleLike,
  toggleCommentLike,
  subscribe,
  unsubscribe,
  // admin
  createPost,
  updatePost,
  deletePost,
  publishPost,
  getPostById,
  listPendingComments,
  approveComment,
  deleteAnyComment,
};
