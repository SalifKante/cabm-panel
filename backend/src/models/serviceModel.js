import mongoose from "mongoose";

export const ALLOWED_ICONS = [
  "Droplets",
  "MessageSquare",
  "BarChart3",
  "GraduationCap",
  "ClipboardList",
  "Wrench",
  "Shield",
  "Sprout",
  "Tractor",
];

const ServiceSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true, trim: true },
    desc:    { type: String, required: true, trim: true },
    icon:    { type: String, required: true, enum: ALLOWED_ICONS },
    order:   { type: Number, default: 0 },
    isActive:{ type: Boolean, default: true }, // mask/unmask
  },
  { timestamps: true }
);
const serviceModel = mongoose.models.service || mongoose.model("Service", ServiceSchema);

export default serviceModel;