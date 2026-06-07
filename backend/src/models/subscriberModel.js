import mongoose from "mongoose";
import crypto from "crypto";

const SubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    isActive: { type: Boolean, default: true },
    unsubscribeToken: { type: String, unique: true },
  },
  { timestamps: true }
);

// Auto-generate a one-time unsubscribe token on creation.
SubscriberSchema.pre("save", function (next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(32).toString("hex");
  }
  next();
});

const subscriberModel =
  mongoose.models.subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);

export default subscriberModel;
