// src/controllers/contactController.js
import { body, validationResult } from "express-validator";
import contactModel from "../models/contactModel.js";
import { sendMail } from "../utils/mailer.js";
import { contactReceivedEmail } from "../emails/templates.js";

// Where contact notifications are delivered. Overridable via env, defaults to
// the business inbox per CLAUDE.md.
const CONTACT_RECIPIENT =
  process.env.CONTACT_EMAIL || process.env.SMTP_USER || "cabmsarl2022@gmail.com";

// express-validator chains: name required, email valid, message >= 10 chars.
const contactValidators = [
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
    .withMessage("Veuillez fournir un email valide.")
    .isLength({ max: 254 })
    .withMessage("L'email est trop long."),
  body("phone")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage("Le numéro de téléphone est invalide (max 40 caractères)."),
  body("message")
    .exists({ checkNull: true })
    .withMessage("Le message est requis.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Le message doit comporter entre 10 et 5000 caractères."),
];

/**
 * POST /api/contact
 * Validate, persist the message, then notify the admin by email.
 * Email failures are swallowed: the message is already saved, so we still
 * report success to the visitor.
 */
const submitContact = async (req, res) => {
  try {
    // Run validation
    await Promise.all(contactValidators.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation échouée. Veuillez vérifier les champs.",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, phone, message } = req.body;

    // Persist first — this is the source of truth.
    const saved = await contactModel.create({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : undefined,
      message: String(message).trim(),
    });

    // Notify admin. Failure here must NOT fail the request.
    try {
      const { html, text } = contactReceivedEmail(
        saved.name,
        saved.email,
        saved.phone,
        saved.message
      );
      await sendMail(
        CONTACT_RECIPIENT,
        `Nouveau message de contact — ${saved.name}`,
        html,
        text
      );
    } catch (mailErr) {
      console.error(
        "Contact notification email failed (message still saved):",
        mailErr
      );
    }

    return res.json({
      success: true,
      message: "Message envoyé avec succès",
    });
  } catch (error) {
    console.error("submitContact error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

export { submitContact, contactValidators };
