import { v2 as cloudinary } from "cloudinary";
import stream from "stream";
import AdminUser from "../models/AdminUser.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const adminEmail = () => (process.env.ADMIN_EMAIL || "").toLowerCase().trim();

/**
 * Resolve the backing AdminUser for the env admin, creating it on the fly if it
 * somehow doesn't exist yet (it is normally seeded at boot by ensureAdminFromEnv).
 */
async function getOrCreateAdmin() {
  const email = adminEmail();
  if (!email) return null;

  let admin = await AdminUser.findOne({ email });
  if (!admin) {
    const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || "");
    admin = await AdminUser.create({ email, passwordHash });
  }
  return admin;
}

/** Shape the public profile payload sent to the panel. */
function publicProfile(admin) {
  return {
    email: admin.email,
    firstName: admin.firstName || "",
    lastName: admin.lastName || "",
    avatar: admin.avatar?.url || "",
  };
}

function uploadBufferToCloudinary(buffer, folder = "admin/avatars") {
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

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/profile                                                     */
/* -------------------------------------------------------------------------- */
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await getOrCreateAdmin();
    if (!admin) {
      return res
        .status(500)
        .json({ success: false, message: "Profil administrateur indisponible." });
    }
    return res.json({ success: true, data: publicProfile(admin) });
  } catch (error) {
    console.error("getAdminProfile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Erreur serveur. Veuillez réessayer." });
  }
};

/* -------------------------------------------------------------------------- */
/*  PUT /api/admin/profile   (multipart: firstName, lastName, avatar?)         */
/*  Email is intentionally NOT editable.                                       */
/* -------------------------------------------------------------------------- */
export const updateAdminProfile = async (req, res) => {
  try {
    const admin = await getOrCreateAdmin();
    if (!admin) {
      return res
        .status(500)
        .json({ success: false, message: "Profil administrateur indisponible." });
    }

    const { firstName, lastName } = req.body;
    if (typeof firstName !== "undefined") admin.firstName = String(firstName).trim();
    if (typeof lastName !== "undefined") admin.lastName = String(lastName).trim();

    // Optional new avatar
    if (req.file?.buffer) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "admin/avatars");

      // Best-effort cleanup of the previous avatar
      if (admin.avatar?.publicId) {
        try {
          await cloudinary.uploader.destroy(admin.avatar.publicId);
        } catch (e) {
          console.warn("Could not delete old avatar:", e?.message || e);
        }
      }

      admin.avatar = { url: result.secure_url, publicId: result.public_id };
    }

    await admin.save();

    return res.json({
      success: true,
      message: "Profil mis à jour avec succès.",
      data: publicProfile(admin),
    });
  } catch (error) {
    console.error("updateAdminProfile error:", error);
    const msg = error?.message?.includes("File too large")
      ? "Fichier trop volumineux (max 8MB)."
      : error?.message || "Erreur serveur durant la mise à jour.";
    return res.status(500).json({ success: false, message: msg });
  }
};

/* -------------------------------------------------------------------------- */
/*  PUT /api/admin/change-password   { currentPassword, newPassword }          */
/* -------------------------------------------------------------------------- */
export const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe actuel et le nouveau mot de passe sont requis.",
      });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      });
    }
    if (String(newPassword) === String(currentPassword)) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit être différent de l’ancien.",
      });
    }

    const admin = await getOrCreateAdmin();
    if (!admin) {
      return res
        .status(500)
        .json({ success: false, message: "Profil administrateur indisponible." });
    }

    // Verify the current password against the stored hash, falling back to the
    // env password if no hash is set yet (defensive — it normally is).
    const currentValid = admin.passwordHash
      ? await verifyPassword(admin.passwordHash, String(currentPassword))
      : String(currentPassword) === String(process.env.ADMIN_PASSWORD || "");

    if (!currentValid) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe actuel est incorrect.",
      });
    }

    admin.passwordHash = await hashPassword(String(newPassword));
    await admin.save();

    return res.json({
      success: true,
      message: "Mot de passe mis à jour avec succès.",
    });
  } catch (error) {
    console.error("changeAdminPassword error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Erreur serveur. Veuillez réessayer." });
  }
};
