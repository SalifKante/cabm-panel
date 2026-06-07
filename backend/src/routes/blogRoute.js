// src/routes/blogRoute.js
import express from "express";
import upload from "../middleware/multer.js";
import {
  requireAuth,
  requireVerified,
  attachUserIfPresent,
} from "../middleware/auth.js";
import requireAdminAny, {
  attachAdminIfPresent,
} from "../middleware/adminBridge.js";
import {
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
} from "../controllers/blogController.js";

const blogRoute = express.Router();

// Logged-in + verified client users (commenting, liking, subscribing).
const protect = [requireAuth, requireVerified];

/* -------------------------------------------------------------------------- */
/*                          ADMIN — posts (declare first)                     */
/*  Specific paths before "/posts/:slug" so they aren't captured as a slug.   */
/*  requireAdminAny accepts EITHER the cookie-JWT admin or the legacy aToken.  */
/* -------------------------------------------------------------------------- */
blogRoute.post("/posts", requireAdminAny, upload.single("coverImage"), createPost);
blogRoute.put("/posts/:id", requireAdminAny, upload.single("coverImage"), updatePost);
blogRoute.delete("/posts/:id", requireAdminAny, deletePost);
blogRoute.patch("/posts/:id/publish", requireAdminAny, publishPost);

/* --------------------------- ADMIN — comments ----------------------------- */
blogRoute.get("/admin/comments", requireAdminAny, listPendingComments);
blogRoute.patch("/admin/comments/:id/approve", requireAdminAny, approveComment);
blogRoute.delete("/admin/comments/:id", requireAdminAny, deleteAnyComment);

/* ------------------------- ADMIN — single post ---------------------------- */
// Fetch any post (incl. drafts) by id for editing.
blogRoute.get("/admin/posts/:id", requireAdminAny, getPostById);

/* -------------------------------------------------------------------------- */
/*               PROTECTED — comments / likes / subscribe                     */
/* -------------------------------------------------------------------------- */
blogRoute.post("/posts/:slug/comments", ...protect, createComment);
blogRoute.post("/posts/:slug/like", ...protect, toggleLike);
blogRoute.post("/comments/:id/like", ...protect, toggleCommentLike);
blogRoute.delete("/comments/:id", ...protect, deleteOwnComment);
blogRoute.post("/subscribe", ...protect, subscribe);

/* -------------------------------------------------------------------------- */
/*                                  PUBLIC                                    */
/* -------------------------------------------------------------------------- */
blogRoute.get("/unsubscribe/:token", unsubscribe); // no auth by design
blogRoute.get("/categories", listCategories);
// Optional admin auth: anonymous users get published posts only; an authenticated
// admin (cookie or aToken) sees drafts too.
blogRoute.get("/posts", attachAdminIfPresent, listPosts);
blogRoute.get("/posts/:slug/comments", attachUserIfPresent, getPostComments);
blogRoute.get("/posts/:slug", getPost); // keep last among GET /posts*

export default blogRoute;
