import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const folder = process.env.CLOUDINARY_FOLDER || "cabm/activities";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder,
    resource_type: "image",
    format: undefined, // keep original format
    public_id: undefined, // let cloudinary generate
    transformation: [{ quality: "auto", fetch_format: "auto" }]
  })
});

export const uploadImages = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB per image
}).array("images", 10); // up to 10 files at once
