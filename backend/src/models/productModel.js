import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    // ---- E-commerce fields (Phase 2) ----
    price: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, maxlength: 8, default: "XOF" },
    unit: { type: String, trim: true, maxlength: 40, default: "" }, // e.g. "kg", "pièce"
    deliveryDetails: { type: String, trim: true, maxlength: 2000, default: "" },
    stock: { type: Number, min: 0 }, // optional — left undefined when not tracked
    category: { type: String, trim: true, maxlength: 80, default: "", index: true },

    // ---- Existing fields (unchanged) ----
    image: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const productModel =
  mongoose.models.product || mongoose.model("Product", ProductSchema);

export default productModel;
