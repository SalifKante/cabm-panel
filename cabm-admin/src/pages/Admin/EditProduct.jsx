import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiUploadCloud,
  FiX,
  FiAlertTriangle,
  FiArrowLeft,
  FiSave,
} from "react-icons/fi";

/**
 * EditProduct
 * - Loads product by :id from POST /api/admin/all-products (then find by id)
 * - Fields: title, description, price, unit, stock (optional), category,
 *   deliveryDetails (currency fixed to XOF, shown as a static label)
 * - Image control:
 *    - replaceImages: boolean (if true, fully replace by newly uploaded files)
 *    - removeImages[]: list of existing image URLs to remove
 *    - append new files (if replaceImages=false)
 * - Submit: PUT /api/admin/product/:id (multipart/form-data)
 * - Validates images: 1..10 only when replacing; otherwise allows 0 new files if keeping some existing
 */
const EditProduct = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // e-commerce fields
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [deliveryDetails, setDeliveryDetails] = useState("");

  // Existing images from DB
  const [existingImages, setExistingImages] = useState([]); // string[]
  const [removeSet, setRemoveSet] = useState(new Set()); // URLs to remove

  // New files to upload
  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // {url, name, size}

  // Replace mode
  const [replaceImages, setReplaceImages] = useState(false);

  const fileInputRef = useRef(null);

  const MAX_FILES = 10;
  const MAX_SIZE = 8 * 1024 * 1024;

  // Load product using your admin "all-products" endpoint
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.post(
          `${backendUrl}/api/admin/all-products`,
          {},
          { headers: {aToken} }
        );
        if (cancelled) return;

        if (!data?.success) {
          toast.error(data?.message || "Impossible de charger le produit.");
          navigate("/products");
          return;
        }

        const items = data.data || data.products || [];
        const found = items.find((p) => p._id === id);
        if (!found) {
          toast.error("Produit introuvable.");
          navigate("/products");
          return;
        }

        setTitle(found.title || "");
        setDescription(found.description || "");
        setPrice(found.price ?? "");
        setUnit(found.unit ?? "");
        setStock(typeof found.stock === "number" ? found.stock : "");
        setCategory(found.category ?? "");
        setDeliveryDetails(found.deliveryDetails ?? "");
        setExistingImages(Array.isArray(found.image) ? found.image : []);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur lors du chargement.";
        toast.error(msg);
        navigate("/products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, aToken, id, navigate]);

  // Helpers
  const remainingAllowed = useMemo(() => {
    if (replaceImages) return MAX_FILES - files.length;
    const keptCount = existingImages.filter((u) => !removeSet.has(u)).length;
    return MAX_FILES - keptCount - files.length;
  }, [replaceImages, files.length, existingImages, removeSet]);

  const errors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = "Le titre est requis.";
    if (!description.trim()) e.description = "La description est requise.";

    // price: required, numeric, >= 0
    if (String(price).trim() === "") {
      e.price = "Le prix est requis.";
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

    const keptCount = existingImages.filter((u) => !removeSet.has(u)).length;
    const totalAfter =
      (replaceImages ? 0 : keptCount) + files.length;

    // Must have 1..10 images after update
    if (totalAfter < 1) e.images = "Au moins une image est requise.";
    if (totalAfter > MAX_FILES) e.images = `Maximum ${MAX_FILES} images autorisées.`;

    // file type/size validation is done on add, but keep a guard
    return e;
  }, [title, description, price, stock, existingImages, removeSet, files.length, replaceImages]);

  const buildPreviews = (list) => {
    const p = list.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
    }));
    setPreviews(p);
  };

  const handleAddFiles = (incoming) => {
    const valid = [];
    const rejected = [];
    for (const f of incoming) {
      const isImg =
        /^image\/(png|jpe?g|webp|gif|svg\+xml|svg)$/.test(f.type) ||
        f.type.startsWith("image/");
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

    // Enforce available slots
    let next = [...files, ...valid];
    const keptCount = existingImages.filter((u) => !removeSet.has(u)).length;
    const maxAllowed = replaceImages ? MAX_FILES : MAX_FILES - keptCount;
    if (next.length > maxAllowed) {
      const extra = next.length - maxAllowed;
      next = next.slice(0, maxAllowed);
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
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const incoming = Array.from(e.dataTransfer.files || []);
    handleAddFiles(incoming);
  };
  const handleDragOver = (e) => e.preventDefault();

  const removeNewAt = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    URL.revokeObjectURL(previews[idx]?.url);
    setFiles(next);
    buildPreviews(next);
  };

  const toggleRemoveExisting = (url) => {
    const s = new Set(removeSet);
    if (s.has(url)) s.delete(url);
    else s.add(url);
    setRemoveSet(s);
  };

  const clearNewFiles = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setFiles([]);
    setPreviews([]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length) {
      toast.error(
        errors.title ||
          errors.description ||
          errors.price ||
          errors.stock ||
          errors.images ||
          "Veuillez corriger les erreurs."
      );
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("price", String(price).trim());
      fd.append("currency", "XOF"); // fixed currency
      fd.append("unit", unit.trim());
      if (String(stock).trim() !== "") fd.append("stock", String(stock).trim());
      fd.append("category", category.trim());
      fd.append("deliveryDetails", deliveryDetails.trim());
      fd.append("replaceImages", String(replaceImages));
      // removeImages[]
      [...removeSet].forEach((u) => fd.append("removeImages[]", u));
      // new files
      files.forEach((f) => fd.append("image", f));

      const { data } = await axios.put(
        `${backendUrl}/api/admin/product/${id}`,
        fd,
        { headers: {aToken} }
      );

      if (data?.success) {
        toast.success("Produit mis à jour avec succès.");
        navigate("/products");
      } else {
        toast.error(data?.message || "Échec de la mise à jour.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur serveur durant la mise à jour.";
      toast.error(msg);
    } finally {
      setSaving(false);
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
  const cardClass = "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";
  const ErrorText = ({ children }) => (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
      <FiAlertTriangle /> {children}
    </p>
  );

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="mb-6">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-7 w-56 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-1" />
        </div>
      </div>
    );
  }

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
        <h1 className="mt-2 text-2xl font-bold text-gray-800">
          Modifier le produit
        </h1>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ----------------------- LEFT: main content -------------------- */}
          <div className={`${cardClass} space-y-5 lg:col-span-2`}>
            {/* Title */}
            <div>
              <label className={labelClass}>
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass(errors.title)}
                placeholder="Titre du produit"
              />
              {errors.title && <ErrorText>{errors.title}</ErrorText>}
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass(errors.description)} resize-y`}
                placeholder="Décrivez le produit…"
              />
              {errors.description && <ErrorText>{errors.description}</ErrorText>}
            </div>

            {/* ---------------- E-commerce details ---------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Price (with fixed XOF label) */}
              <div>
                <label className={labelClass}>
                  Prix <span className="text-red-500">*</span>
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
          <div className={`${cardClass} space-y-4 lg:col-span-1`}>
            {/* Existing images */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Images existantes
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary/30"
                    checked={replaceImages}
                    onChange={(e) => {
                      setReplaceImages(e.target.checked);
                      // if switching to replace, clear selections/added files for clarity
                      clearNewFiles();
                      setRemoveSet(new Set()); // not needed in replace mode
                    }}
                  />
                  Tout remplacer
                </label>
              </div>

              {!replaceImages ? (
                existingImages.length ? (
                  <div className="grid grid-cols-2 gap-3">
                    {existingImages.map((url) => {
                      const checked = removeSet.has(url);
                      return (
                        <div
                          key={url}
                          className={`group relative overflow-hidden rounded-lg border-2 transition ${
                            checked ? "border-red-400" : "border-gray-200"
                          }`}
                        >
                          <img
                            src={url}
                            alt=""
                            className={`h-24 w-full object-cover transition ${
                              checked ? "opacity-40" : ""
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleRemoveExisting(url)}
                            className={`absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full shadow transition ${
                              checked
                                ? "bg-red-500 text-white"
                                : "bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-500"
                            }`}
                            title={checked ? "Annuler le retrait" : "Retirer"}
                          >
                            <FiX />
                          </button>
                          {checked && (
                            <span className="absolute bottom-1.5 left-1.5 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              À retirer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Aucune image enregistrée.</p>
                )
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Mode remplacement activé : les images existantes seront ignorées
                  et remplacées par les nouvelles.
                </p>
              )}
            </div>

            {/* Uploader */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {replaceImages ? "Nouvelles images" : "Ajouter des images"}
                </label>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {files.length}/{MAX_FILES} images
                </span>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-gray-50 px-4 py-8 text-center transition hover:bg-gray-100 ${
                  errors.images ? "border-red-300" : "border-gray-300"
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
                {remainingAllowed >= 0
                  ? `Vous pouvez encore ajouter ${remainingAllowed} fichier(s).`
                  : "Limite dépassée"}
              </p>

              {errors.images && <ErrorText>{errors.images}</ErrorText>}

              {/* New file previews */}
              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {previews.map((p, i) => (
                    <div
                      key={`${p.url}-${i}`}
                      className="group relative overflow-hidden rounded-lg border border-gray-200"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewAt(i)}
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
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? (
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
            ) : (
              <FiSave />
            )}
            {saving ? "Mise à jour…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
