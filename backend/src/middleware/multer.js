// import multer from "multer";

// const storage = multer.diskStorage({
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + "-" + file.originalname);
//     }
// });

// const upload = multer({ storage });

// export default upload;

// middleware/multer.js
import multer from "multer";

const fileFilter = (req, file, cb) => {
  const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype);
  if (!ok) return cb(new Error("Seules les images sont autorisées."), false);
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),          // <— no disk writes
  limits: { files: 10, fileSize: 8 * 1024 * 1024 }, // ≤10 files, ≤8MB each
  fileFilter,
});

export default upload;
