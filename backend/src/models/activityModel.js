import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    date: { type: Date, default: Date.now }, // sys date by default
    place: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },

    image: { type: [String], default: [] },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);

const activityModel = mongoose.models.activity || mongoose.model("Activity", ActivitySchema);

export default activityModel;