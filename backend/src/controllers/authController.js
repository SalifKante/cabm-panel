// src/controllers/authController.js
import { body, validationResult } from "express-validator";
import userModel from "../models/userModel.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRandomToken,
  setTokenCookie,
  clearTokenCookie,
} from "../utils/auth.js";
import { sendMail } from "../utils/mailer.js";
import { welcomeEmail, passwordResetEmail } from "../emails/templates.js";

// Client app base URL (the public site that renders verify/reset pages).
// Trailing slash trimmed so links concatenate cleanly.
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3030").replace(
  /\/+$/,
  ""
);

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/* -------------------------------------------------------------------------- */
/*                               validators                                   */
/* -------------------------------------------------------------------------- */

const registerValidators = [
  body("name")
    .exists({ checkNull: true })
    .withMessage("Le nom est requis.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Le nom doit comporter entre 1 et 100 caractères."),
  body("email")
    .exists({ checkNull: true })
    .withMessage("L'email est requis.")
    .bail()
    .isString()
    .trim()
    .isEmail()
    .withMessage("Veuillez fournir un email valide."),
  body("phone")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage("Le numéro de téléphone est invalide (max 40 caractères)."),
  body("password")
    .exists({ checkNull: true })
    .withMessage("Le mot de passe est requis.")
    .bail()
    .isString()
    .isLength({ min: 8 })
    .withMessage("Le mot de passe doit comporter au moins 8 caractères."),
];

const loginValidators = [
  body("email")
    .exists({ checkNull: true })
    .withMessage("L'email est requis.")
    .bail()
    .isString()
    .trim()
    .isEmail()
    .withMessage("Veuillez fournir un email valide."),
  body("password")
    .exists({ checkNull: true })
    .withMessage("Le mot de passe est requis.")
    .bail()
    .isString()
    .notEmpty()
    .withMessage("Le mot de passe est requis."),
];

const forgotValidators = [
  body("email")
    .exists({ checkNull: true })
    .withMessage("L'email est requis.")
    .bail()
    .isString()
    .trim()
    .isEmail()
    .withMessage("Veuillez fournir un email valide."),
];

const resetValidators = [
  body("password")
    .exists({ checkNull: true })
    .withMessage("Le mot de passe est requis.")
    .bail()
    .isString()
    .isLength({ min: 8 })
    .withMessage("Le mot de passe doit comporter au moins 8 caractères."),
];

/**
 * Run validation chains imperatively. On failure, sends 400 and returns false.
 */
async function runValidations(req, res, validations) {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return true;
  res.status(400).json({
    success: false,
    message: "Validation échouée. Veuillez vérifier les champs.",
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
  return false;
}

// Shape the user object returned to clients (never expose passwordHash/tokens).
function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    avatar: user.avatar,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 handlers                                   */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const valid = await runValidations(req, res, registerValidators);
    if (!valid) return;

    const { name, email, phone, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await userModel.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Un compte avec cet email existe déjà." });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateRandomToken();

    const user = await userModel.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : undefined,
      passwordHash,
      verificationToken,
      isVerified: false,
      role: "user",
    });

    // Send verification email — failure must not block account creation.
    try {
      const link = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const { html, text } = welcomeEmail(user.name, link);
      await sendMail(
        user.email,
        "Vérifiez votre adresse email — CABM",
        html,
        text
      );
    } catch (mailErr) {
      console.error(
        "Verification email failed (account still created):",
        mailErr
      );
    }

    return res.json({
      success: true,
      message: "Compte créé. Vérifiez votre email.",
    });
  } catch (error) {
    // Duplicate-key race on the unique email index
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Un compte avec cet email existe déjà." });
    }
    console.error("register error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

/**
 * GET /api/auth/verify-email/:token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token manquant." });
    }

    const user = await userModel.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token de vérification invalide ou expiré.",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.json({ success: true, message: "Email vérifié avec succès." });
  } catch (error) {
    console.error("verifyEmail error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const valid = await runValidations(req, res, loginValidators);
    if (!valid) return;

    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await userModel.findOne({ email: normalizedEmail });
    // Generic message to avoid leaking which accounts exist. Accounts created
    // via Google only (no passwordHash) can't log in with a password.
    if (!user || !user.passwordHash) {
      return res
        .status(401)
        .json({ success: false, message: "Email ou mot de passe incorrect." });
    }

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Email ou mot de passe incorrect." });
    }

    const token = signAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    setTokenCookie(res, token);

    return res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * GET /api/auth/google
 * The redirect to Google is performed by passport.authenticate() mounted at the
 * route level, so this handler is an explicit no-op placeholder for completeness.
 */
const googleAuth = (req, res) => {
  // Unreachable in practice — passport.authenticate("google") handles the redirect.
  res.redirect("/api/auth/google");
};

/**
 * GET /api/auth/google/callback
 * Runs after passport has authenticated and set req.user. Issues the JWT cookie
 * and redirects to the frontend (no JSON response).
 */
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=google`);
    }

    const token = signAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    setTokenCookie(res, token);

    return res.redirect(FRONTEND_URL);
  } catch (error) {
    console.error("googleCallback error:", error);
    return res.redirect(`${FRONTEND_URL}/login?error=google`);
  }
};

/**
 * POST /api/auth/forgot-password
 * Always responds with success (no user enumeration).
 */
const forgotPassword = async (req, res) => {
  try {
    const valid = await runValidations(req, res, forgotValidators);
    if (!valid) return;

    const { email } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await userModel.findOne({ email: normalizedEmail });

    if (user) {
      const token = generateRandomToken();
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      try {
        const link = `${FRONTEND_URL}/reset-password/${token}`;
        const { html, text } = passwordResetEmail(user.name, link);
        await sendMail(
          user.email,
          "Réinitialisation de votre mot de passe — CABM",
          html,
          text
        );
      } catch (mailErr) {
        console.error("Reset email failed:", mailErr);
      }
    }

    return res.json({
      success: true,
      message: "Email de réinitialisation envoyé.",
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * POST /api/auth/reset-password/:token
 */
const resetPassword = async (req, res) => {
  try {
    const valid = await runValidations(req, res, resetValidators);
    if (!valid) return;

    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token manquant." });
    }

    const user = await userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Token invalide ou expiré." });
    }

    const { password } = req.body;
    user.passwordHash = await hashPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: "Mot de passe réinitialisé." });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  clearTokenCookie(res);
  return res.json({ success: true });
};

/**
 * GET /api/auth/me  (requireAuth)
 */
const getMe = (req, res) => {
  return res.json({ success: true, user: req.user });
};

export {
  register,
  verifyEmail,
  login,
  googleAuth,
  googleCallback,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
};
