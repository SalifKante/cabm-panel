import mongoose from "mongoose";
import serviceModel from "../models/serviceModel.js";

// NOTE: Response keys (`items` for lists, `item` for a single doc, `count`) are
// kept as-is so adminRoute.js / publicRoute.js and the admin panel stay
// backward compatible. Every handler now has try/catch and a consistent shape:
// { success, items?/item?/count?, message?, pagination? }.

// PUBLIC — active only
const listPublicServices = async (req, res) => {
  try {
    const items = await serviceModel
      .find({ isActive: true })
      .sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, items });
  } catch (error) {
    console.error("listPublicServices error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN — list all
const listAllServices = async (req, res) => {
  try {
    const items = await serviceModel.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, items });
  } catch (error) {
    console.error("listAllServices error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN — create
const createService = async (req, res) => {
  try {
    const payload = req.body; // { title, desc, icon, order?, isActive? }
    const item = await serviceModel.create(payload);
    return res.status(201).json({ success: true, item });
  } catch (error) {
    console.error("createService error:", error);
    // Surface mongoose validation errors as 400, everything else as 500
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN — update
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service id" });
    }

    const payload = req.body;
    const item = await serviceModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res.json({ success: true, item });
  } catch (error) {
    console.error("updateService error:", error);
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN — delete
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service id" });
    }

    const deleted = await serviceModel.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res.json({ success: true, message: "Service deleted" });
  } catch (error) {
    console.error("deleteService error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN — mask/unmask
const setServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service id" });
    }
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isActive boolean required" });
    }

    const item = await serviceModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    return res.json({ success: true, item });
  } catch (error) {
    console.error("setServiceStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN — count
const countServices = async (req, res) => {
  try {
    const count = await serviceModel.countDocuments();
    return res.json({ success: true, count });
  } catch (error) {
    console.error("countServices error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  listPublicServices,
  listAllServices,
  createService,
  updateService,
  deleteService,
  setServiceStatus,
  countServices,
};
