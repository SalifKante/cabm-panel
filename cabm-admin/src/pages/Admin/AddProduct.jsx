import React, { useContext, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  FiImage,
  FiUploadCloud,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiArrowLeft,
} from "react-icons/fi";

/**
 * AddProduct
 * - Fields: title, description, price, unit, stock (optional), category,
 *   deliveryDetails, image[] (1..10 files)
 * - Currency is fixed to XOF (shown as a static label, not editable)
 * - Sends multipart/form-data to POST /api/admin/create-product
 * - Uses AdminContext: backendUrl, aToken
 * - Shows success/error via react-toastify
 */
const AddProduct = () => {
  const { aToken, backendUrl } = useContext(AdminContext);

  // "shop" = boutique product (sold), "showcase" = homepage display only
  const [type, setType] = useState("shop");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // e-commerce fields
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [deliveryDetails, setDeliveryDetails] = useState("");

  // local file state
  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // {url, name, size, idx}
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // ------- helpers -------
  const MAX_FILES = 10;
  const MAX_SIZE = 8 * 1024 * 1024; // 8MB

  const remaining = MAX_FILES - files.length;

  // Showcase products are for display only — price is optional for them.
  const isShowcase = type === "showcase";

  const errors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = "Le titre est requis.";
    if (!description.trim()) e.description = "La description est requise.";

    // price: required for shop products; optional for showcase.
    // When provided, it must always be a non-negative number.
    if (String(price).trim() === "") {
      if (!isShowcase) e.price = "Le prix est requis.";
    } else if (Number.isNaN(Number(price)) || Number(price) < 0) {
      e.price = "Le prix doit être un nombre positif.";
    }

    // stock: optional, but if provided must be a non-negative integer
    if (String(stock).trim() !== "") {
      const n = Number(stock);
      if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) {
        e.stock = "Le stock doit être un entier positif.";
      }
    }

    if (files.length === 0) e.image = "Sélectionnez au moins une image (max 10).";
    if (files.length > MAX_FILES) e.image = `Maximum ${MAX_FILES} images.`;
    return e;
  }, [title, description, price, stock, files.length, isShowcase]);

  const buildPreviews = (fileList) => {
    const p = fileList.map((f, idx) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
      idx,
    }));
    setPreviews(p);
  };

  const handleAddFiles = (incoming) => {
    // Filter only images, size <= 8MB
    const valid = [];
    const rejected = [];

    for (const f of incoming) {
      const isImg = /^image\/(png|jpe?g|webp|gif|svg\+xml|svg)$/.test(f.type) || f.type.startsWith("image/");
      if (!isImg) {
        rejected.push(`${f.name} (format non supporté)`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        rejected.push(`${f.name} (> 8MB)`);
        continue;
      }
      valid.push(f);
    }

    // Respect 10 max (existing + new)
    let next = [...files, ...valid];
    if (next.length > MAX_FILES) {
      const extra = next.length - MAX_FILES;
      next = next.slice(0, MAX_FILES);
      rejected.push(`${extra} fichier(s) ignoré(s) (limite ${MAX_FILES}).`);
    }

    setFiles(next);
    buildPreviews(next);

    if (rejected.length) {
      toast.warn(
        <>
          <div className="font-medium">Certains fichiers ont été ignorés :</div>
          <ul className="list-disc ml-5">
            {rejected.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </>
      );
    }
  };

  const onFileInputChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    handleAddFiles(incoming);
    // reset input so same file can be re-picked later if removed
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const incoming = Array.from(e.dataTransfer.files || []);
    handleAddFiles(incoming);
  };

  const handleDragOver = (e) => e.preventDefault();

  const removeAt = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    // revoke old preview URL
    URL.revokeObjectURL(previews[idx]?.url);
    setFiles(next);
    buildPreviews(next);
  };

  const clearAll = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setFiles([]);
    setPreviews([]);
    setType("shop");
    setTitle("");
    setDescription("");
    setPrice("");
    setUnit("");
    setStock("");
    setCategory("");
    setDeliveryDetails("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ------- submit -------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      // Show first error
      const first =
        errors.title || errors.description || errors.price || errors.stock || errors.image;
      toast.error(first || "Veuillez corriger les erreurs.");
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("type", type);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("price", String(price).trim());
      fd.append("currency", "XOF"); // fixed currency
      fd.append("unit", unit.trim());
      if (String(stock).trim() !== "") fd.append("stock", String(stock).trim());
      fd.append("category", category.trim());
      fd.append("deliveryDetails", deliveryDetails.trim());
      files.forEach((f) => fd.append("image", f)); // field name MUST be "image"

      const { data } = await axios.post(
        `${backendUrl}/api/admin/create-product`,
        fd,
        {
          headers: {
            aToken
          },
        }
      );

      if (data?.success) {
        toast.success(
          <>
            <div className="font-medium flex items-center gap-2">
              <FiCheckCircle className="inline" /> Produit créé avec succès
            </div>
          </>
        );
        clearAll();
      } else {
        toast.error(data?.message || "Une erreur est survenue.");
      }
    } catch (err) {
      // server message if any (our backend returns message)
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur serveur. Veuillez réessayer.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------- shared UI helpers ------------------------- */
  const inputClass = (hasError) =>
    `w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${
      hasError
        ? "border-red-400 focus:ring-red-200"
        : "border-gray-200 focus:border-primary focus:ring-primary/15"
    }`;

  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const cardClass =
    "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";
  const ErrorText = ({ children }) => (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
      <FiAlertTriangle /> {children}
    </p>
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* ------------------------------ header ----------------------------- */}
      <div className="mb-6">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-primary"
        >
          <FiArrowLeft className="h-4 w-4" /> Retour aux produits
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Nouveau produit</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ----------------------- LEFT: main content -------------------- */}
          <div className={`${cardClass} space-y-5 lg:col-span-2`}>
            {/* Type de produit */}
            <div>
              <label className={labelClass}>
                Type de produit <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass(false)}
              >
                <option value="shop">Produit boutique</option>
                <option value="showcase">Produit vitrine</option>
              </select>
              {isShowcase && (
                <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  Ce produit sera affiché sur la page d'accueil uniquement. Les
                  champs prix et stock sont optionnels.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className={labelClass}>
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Produits Agro-alimentaires (Légumes, fruits)"
                className={inputClass(errors.title)}
              />
              {errors.title && <ErrorText>{errors.title}</ErrorText>}
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Décrivez le produit…"
                className={`${inputClass(errors.description)} resize-y`}
              />
              {errors.description && <ErrorText>{errors.description}</ErrorText>}
            </div>

            {/* ---------------- E-commerce details ---------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Price (with fixed XOF label) */}
              <div>
                <label className={labelClass}>
                  Prix{" "}
                  {isShowcase ? (
                    <span className="text-gray-400">(optionnel)</span>
                  ) : (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex: 1500"
                    className={`${inputClass(errors.price)} pr-14`}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                    XOF
                  </span>
                </div>
                {errors.price && <ErrorText>{errors.price}</ErrorText>}
              </div>

              {/* Unit */}
              <div>
                <label className={labelClass}>Unité</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder='Ex: "kg", "pièce", "lot"'
                  className={inputClass(false)}
                />
              </div>

              {/* Stock (optional) */}
              <div>
                <label className={labelClass}>
                  Stock <span className="text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Laisser vide si non suivi"
                  className={inputClass(errors.stock)}
                />
                {errors.stock && <ErrorText>{errors.stock}</ErrorText>}
              </div>

              {/* Category */}
              <div>
                <label className={labelClass}>Catégorie</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Céréales, Fruits, Légumes"
                  className={inputClass(false)}
                />
              </div>
            </div>

            {/* Delivery details */}
            <div>
              <label className={labelClass}>Détails de livraison</label>
              <textarea
                value={deliveryDetails}
                onChange={(e) => setDeliveryDetails(e.target.value)}
                rows={3}
                placeholder="Ex: Livraison à Bamako sous 48h, frais selon zone…"
                className={`${inputClass(false)} resize-y`}
              />
            </div>
          </div>

          {/* ----------------------- RIGHT: images ------------------------- */}
          <div className={`${cardClass} lg:col-span-1`}>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Images <span className="text-red-500">*</span>
              </label>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                {files.length}/{MAX_FILES} images
              </span>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-gray-50 px-4 py-8 text-center transition hover:bg-gray-100 ${
                errors.image ? "border-red-300" : "border-gray-300"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <FiUploadCloud className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">
                Glissez vos images ici
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                ou cliquez pour parcourir
              </p>
              <p className="mt-2 text-[11px] text-gray-400">
                JPG, PNG, WEBP, GIF, SVG — max 8MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onFileInputChange}
                className="hidden"
              />
            </div>

            <p className="mt-2 text-xs text-gray-400">
              {remaining > 0
                ? `Il reste ${remaining} emplacement(s).`
                : "Limite atteinte."}
            </p>

            {errors.image && <ErrorText>{errors.image}</ErrorText>}

            {/* Previews */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {previews.map((p, i) => (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img
                      src={p.url}
                      alt={p.name}
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
                      title="Retirer"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500">
                        <FiX />
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------ actions ---------------------------- */}
        <div className="mt-6 flex items-center justify-end gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Link
            to="/products"
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {submitting ? "Envoi…" : "Créer le produit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
