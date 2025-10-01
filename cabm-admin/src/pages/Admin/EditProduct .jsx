import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiImage,
  FiUpload,
  FiX,
  FiAlertTriangle,
  FiArrowLeft,
  FiSave,
} from "react-icons/fi";

/**
 * EditProduct
 * - Loads product by :id from POST /api/admin/all-products (then find by id)
 * - Fields: title, description
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

    const keptCount = existingImages.filter((u) => !removeSet.has(u)).length;
    const totalAfter =
      (replaceImages ? 0 : keptCount) + files.length;

    // Must have 1..10 images after update
    if (totalAfter < 1) e.images = "Au moins une image est requise.";
    if (totalAfter > MAX_FILES) e.images = `Maximum ${MAX_FILES} images autorisées.`;

    // file type/size validation is done on add, but keep a guard
    return e;
  }, [title, description, existingImages, removeSet, files.length, replaceImages]);

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
        errors.title || errors.description || errors.images || "Veuillez corriger les erreurs."
      );
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
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

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-slate-600">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800">Modifier le produit</h1>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            <FiArrowLeft /> Retour
          </Link>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5"
        >
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 outline-none transition ${
                errors.title
                  ? "border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-300 focus:ring-2 focus:ring-[#3c388d]/20"
              }`}
              placeholder="Titre du produit"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertTriangle /> {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 outline-none transition resize-y ${
                errors.description
                  ? "border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-300 focus:ring-2 focus:ring-[#3c388d]/20"
              }`}
              placeholder="Décrivez le produit…"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertTriangle /> {errors.description}
              </p>
            )}
          </div>

          {/* Existing images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Images existantes
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={replaceImages}
                  onChange={(e) => {
                    setReplaceImages(e.target.checked);
                    // if switching to replace, clear selections/added files for clarity
                    clearNewFiles();
                    setRemoveSet(new Set()); // not needed in replace mode
                  }}
                />
                Remplacer toutes les images
              </label>
            </div>

            {!replaceImages ? (
              existingImages.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {existingImages.map((url) => {
                    const checked = removeSet.has(url);
                    return (
                      <div
                        key={url}
                        className={`relative rounded-xl overflow-hidden border ${
                          checked ? "border-red-300" : "border-slate-200"
                        }`}
                      >
                        <img src={url} alt="" className="h-28 w-full object-cover" />
                        <label className="absolute top-1 left-1 bg-white/90 px-2 py-1 rounded-lg text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-1 align-middle"
                            checked={checked}
                            onChange={() => toggleRemoveExisting(url)}
                          />
                          Retirer
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-600">Aucune image enregistrée.</p>
              )
            ) : (
              <p className="text-xs text-red-600">
                Mode remplacement activé : les images existantes seront ignorées et
                remplacées par les nouvelles sélectionnées.
              </p>
            )}
          </div>

          {/* Uploader */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {replaceImages ? "Nouvelles images (1 à 10)" : "Ajouter des images"}
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                errors.images
                  ? "border-red-300 bg-red-50/30"
                  : "border-slate-300 hover:border-[#3c388d]"
              }`}
            >
              <FiImage className="mx-auto mb-2 text-2xl" />
              <p className="text-sm text-slate-600">
                Glissez-déposez vos images ici, ou
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-white text-sm shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
                >
                  <FiUpload /> Sélectionner des fichiers
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFileInputChange}
                  className="hidden"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Formats: JPG, PNG, WEBP, GIF, SVG — max 8MB chacun.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {remainingAllowed >= 0
                  ? `Vous pouvez encore ajouter ${remainingAllowed} fichier(s).`
                  : `Limite dépassée`}
              </p>
            </div>

            {errors.images && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <FiAlertTriangle /> {errors.images}
              </p>
            )}

            {/* New file previews */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {previews.map((p, i) => (
                  <div
                    key={`${p.url}-${i}`}
                    className="relative rounded-xl overflow-hidden border border-slate-200"
                  >
                    <img src={p.url} alt={p.name} className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewAt(i)}
                      className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-slate-700 shadow p-1"
                      title="Retirer"
                    >
                      <FiX />
                    </button>
                    <div className="px-2 py-1 text-[10px] text-slate-600 truncate">
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to="/products"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white shadow hover:opacity-95 disabled:opacity-60"
            >
              {saving ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
    </div>
  );
};

export default EditProduct;
