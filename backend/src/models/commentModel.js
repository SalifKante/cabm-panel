import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    }, // for threaded replies

    // Users who liked this comment (toggle via POST /api/blog/comments/:id/like)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

const commentModel =
  mongoose.models.comment || mongoose.model("Comment", CommentSchema);

export default commentModel;
