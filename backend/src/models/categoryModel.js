import mongoose from "mongoose";

function slugify(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (é -> e, ï -> i)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// Auto-generate slug from name (on create or when name changes).
CategorySchema.pre("validate", function (next) {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = slugify(this.name);
  }
  next();
});

const categoryModel =
  mongoose.models.category || mongoose.model("Category", CategorySchema);

export default categoryModel;
