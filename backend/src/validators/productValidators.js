// src/validators/productValidators.js
//
// express-validator chains for the admin product create/update endpoints.
//
// These are applied *inside* the controllers via `runValidations()` (rather than
// as route middleware) so that `adminRoute.js` stays untouched and backward
// compatible. Validation runs after Multer has parsed the multipart body, so all
// text fields arrive as strings — chains coerce/validate accordingly.

import { body, validationResult } from "express-validator";

/**
 * Run an array of express-validator chains imperatively.
 * On failure, sends a 400 response and returns false.
 * On success, returns true (req.body has been sanitized in place).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express-validator').ValidationChain[]} validations
 * @returns {Promise<boolean>}
 */
export const runValidations = async (req, res, validations) => {
  await Promise.all(validations.map((v) => v.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) return true;

  res.status(400).json({
    success: false,
    message: "Validation échouée. Veuillez vérifier les champs.",
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
  return false;
};

// Optional e-commerce fields shared by create & update.
// `checkFalsy: true` skips empty strings (common from multipart forms) so these
// remain genuinely optional.
const optionalEcommerceFields = [
  body("price")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Le prix doit être un nombre positif."),
  body("currency")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 8 })
    .withMessage("La devise est invalide (max 8 caractères)."),
  body("unit")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 40 })
    .withMessage("L'unité est invalide (max 40 caractères)."),
  body("deliveryDetails")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Les détails de livraison sont trop longs (max 2000 caractères)."),
  body("stock")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Le stock doit être un entier positif."),
  body("category")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 80 })
    .withMessage("La catégorie est invalide (max 80 caractères)."),
];

/**
 * Validators for POST /api/admin/create-product.
 * title & description are required; e-commerce fields optional.
 */
export const createProductValidators = [
  body("title")
    .exists({ checkNull: true })
    .withMessage("Le titre est requis.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 180 })
    .withMessage("Le titre doit comporter entre 1 et 180 caractères."),
  body("description")
    .exists({ checkNull: true })
    .withMessage("La description est requise.")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("La description doit comporter entre 1 et 5000 caractères."),
  ...optionalEcommerceFields,
];

/**
 * Validators for PUT /api/admin/product/:id.
 * All fields optional (partial update), but validated when present.
 */
export const updateProductValidators = [
  body("title")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 180 })
    .withMessage("Le titre doit comporter entre 1 et 180 caractères."),
  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("La description doit comporter entre 1 et 5000 caractères."),
  body("isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("isActive doit être un booléen."),
  ...optionalEcommerceFields,
];
