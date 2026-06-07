import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import activityModel from "../models/activityModel.js";
import stream from "stream";
import {
  getPagination,
  buildSearchFilter,
  paginate,
} from "../utils/queryBuilder.js";

// Make sure Cloudinary is configured at app boot:
// cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: ..., api_secret: ... });

function uploadBufferToCloudinary(buffer, folder = "activities") {
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

// API for admin activity
const createActivity = async (req, res) => {
  try {
    const { title, date, place, description, tags } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    // Required fields
    if (!title || !date || !place || !description) {
      return res.status(400).json({
        success: false,
        message:
          "Tous les champs (titre, date, lieu, description) sont requis.",
      });
    }

    // Date: DD/MM/YYYY
    if (
      !validator.matches(
        date,
        /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "La date doit être au format JJ/MM/AAAA.",
      });
    }

    // Images: 1..10
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Veuillez sélectionner au moins une image.",
      });
    }
    if (files.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 images sont autorisées.",
      });
    }

    // Tags: accept array or comma-separated string
    const tagsArray = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean)
      : String(tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

    // Upload all buffers to Cloudinary in parallel
    const uploads = await Promise.all(
      files.map((f) => uploadBufferToCloudinary(f.buffer, "activities"))
    );
    const imageUrls = uploads.map((u) => u.secure_url);

    // Convert date to ISO (YYYY-MM-DD)
    const iso = date.split("/").reverse().join("-");

    const activity = new activityModel({
      title: title.trim(),
      date: new Date(iso),
      place: place.trim(),
      description: description.trim(),
      image: imageUrls, // array of Cloudinary URLs
      tags: tagsArray,
    });

    await activity.save();

    return res.json({
      success: true,
      message: "Activité créée avec succès.",
      activity,
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    const msg = error?.message?.includes("File too large")
      ? "Fichier trop volumineux (max 8MB)."
      : error?.message || "Erreur serveur. Veuillez réessayer plus tard.";
    return res.status(500).json({ success: false, message: msg });
  }
};

// API to delete an activity
const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !validator.isMongoId(id)) {
      return res.status(400).json({ success: false, message: "ID invalide." });
    }
    const activity = await activityModel.findById(id);
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activité non trouvée." });
    }
    await activityModel.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: "Activité supprimée avec succès.",
    });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

// API to get count of activities
const getActivitiesCount = async (req, res) => {
  try {
    const count = await activityModel.countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error("Error fetching activities count:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// API to get activity by ID
const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !validator.isMongoId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID." });
    }
    const activity = await activityModel.findById(id);
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activity not found." });
    }
    res.json({ success: true, activity });
  } catch (error) {
    console.error("Error fetching activity by ID:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};



// API to get all activities (for admin)
// (not used currently, but can be useful for admin panel)
const getAllActivities = async (req, res) => {
  try {
    const activities = await activityModel.find().sort({ date: -1 });
    res.json({ success: true, activities });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * GET /api/activities  (PUBLIC)
 * Paginated list of PUBLISHED activities, newest first (by date).
 * Query:
 *  - q: search term across title, description, tags
 *  - page, limit: pagination (limit capped at 50)
 */
const listPublicActivities = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, {
      defaultLimit: 12,
      maxLimit: 50,
    });

    const filter = {
      isPublished: true,
      ...buildSearchFilter(req.query.q, ["title", "description", "tags"]),
    };

    const { items, pagination } = await paginate(activityModel, {
      filter,
      sort: { date: -1 },
      page,
      limit,
      skip,
    });

    return res.json({ success: true, data: items, pagination });
  } catch (error) {
    console.error("listPublicActivities error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * GET /api/activities/:id  (PUBLIC)
 * Single PUBLISHED activity by id.
 */
const getPublicActivity = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !validator.isMongoId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    const activity = await activityModel
      .findOne({ _id: id, isPublished: true })
      .lean();
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activity not found." });
    }

    return res.json({ success: true, data: activity });
  } catch (error) {
    console.error("getPublicActivity error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};


export {
  createActivity,
  getActivityById,
  getAllActivities,
  deleteActivity,
  getActivitiesCount,
  listPublicActivities,
  getPublicActivity,
};
