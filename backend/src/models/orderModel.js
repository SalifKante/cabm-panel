import mongoose from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "contacted",
  "confirmed",
  "delivered",
  "cancelled",
];

/* ------------------------------------------------------------------ */
/* Counter — per-year sequence used to build human-friendly order nums */
/* ------------------------------------------------------------------ */
const CounterSchema = new mongoose.Schema({
  _id: String, // e.g. "order-2026"
  seq: { type: Number, default: 0 },
});
const Counter =
  mongoose.models.counter || mongoose.model("Counter", CounterSchema);

/* ------------------------------ subdocs ----------------------------- */
const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String },
    price: { type: Number },
    unit: { type: String },
    quantity: { type: Number },
    lineTotal: { type: Number },
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    location: { type: String, trim: true },
    note: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

/* ------------------------------- order ------------------------------ */
const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true }, // set by pre-save hook
    customer: { type: CustomerSchema, required: true },
    items: { type: [OrderItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    deliveryEstimate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "XOF" },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },

    whatsappSentAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate "CABM-YYYY-NNNNN". Runs on insert only.
// (orderNumber is intentionally NOT `required`, so document validation — which
// runs before this 'save' hook — does not fail on a not-yet-generated number.)
OrderSchema.pre("save", async function (next) {
  if (!this.isNew || this.orderNumber) return next();
  try {
    const year = new Date().getFullYear();
    const counter = await Counter.findByIdAndUpdate(
      `order-${year}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const seq = String(counter.seq).padStart(5, "0");
    this.orderNumber = `CABM-${year}-${seq}`;
    return next();
  } catch (err) {
    return next(err);
  }
});

const orderModel = mongoose.models.order || mongoose.model("Order", OrderSchema);

export default orderModel;
