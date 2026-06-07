import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";
import { verifyPassword } from "../utils/auth.js";

// API for admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;

    // Only the configured admin email may log in.
    if (!email || email.toLowerCase().trim() !== String(envEmail).toLowerCase().trim()) {
      return res.json({
        success: false,
        message: "E-mail ou Mot de Passe non valide",
      });
    }

    // Validate the password against the stored hash (which the admin can change
    // from the profile page). Fall back to the env password if no hash exists.
    const admin = await AdminUser.findOne({
      email: String(envEmail).toLowerCase().trim(),
    });

    const passwordValid = admin?.passwordHash
      ? await verifyPassword(admin.passwordHash, String(password))
      : String(password) === String(envPassword);

    if (!passwordValid) {
      return res.json({
        success: false,
        message: "E-mail ou Mot de Passe non valide",
      });
    }

    // IMPORTANT: the token identity stays the stable env string so the existing
    // `authAdmin` middleware keeps working even after the password is changed.
    const token = jwt.sign(envEmail + envPassword, process.env.JWT_SECRET);
    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.log("Error during admin login:", error);
    res.json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

export { adminLogin };
