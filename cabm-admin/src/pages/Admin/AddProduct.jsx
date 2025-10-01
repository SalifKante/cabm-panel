import React, { useContext, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiImage,
  FiUpload,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";

/**
 * AddProduct
 * - Fields: title, description, image[] (1..10 files)
 * - Sends multipart/form-data to POST /api/admin/create-product
 * - Uses AdminContext: backendUrl, aToken
 * - Shows success/error via react-toastify
 */
const AddProduct = () => {
  const { aToken, backendUrl } = useContext(AdminContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // local file state
  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // {url, name, size, idx}
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // ------- helpers -------
  const MAX_FILES = 10;
  const MAX_SIZE = 8 * 1024 * 1024; // 8MB

  const remaining = MAX_FILES - files.length;

  const errors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = "Le titre est requis.";
    if (!description.trim()) e.description = "La description est requise.";
    if (files.length === 0) e.image = "Sélectionnez au moins une image (max 10).";
    if (files.length > MAX_FILES) e.image = `Maximum ${MAX_FILES} images.`;
    return e;
  }, [title, description, files.length]);

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
    setTitle("");
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ------- submit -------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      // Show first error
      const first = errors.title || errors.description || errors.image;
      toast.error(first || "Veuillez corriger les erreurs.");
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-800 mb-4">
          Ajouter un produit
        </h1>

        <form
          onSubmit={handleSubmit}
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
              placeholder="Ex: Produits Agro-alimentaires (Légumes, fruits)"
              className={`w-full rounded-xl border px-3 py-2 outline-none transition ${
                errors.title
                  ? "border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-300 focus:ring-2 focus:ring-[#3c388d]/20"
              }`}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Décrivez le produit…"
              className={`w-full rounded-xl border px-3 py-2 outline-none transition resize-y ${
                errors.description
                  ? "border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-300 focus:ring-2 focus:ring-[#3c388d]/20"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertTriangle /> {errors.description}
              </p>
            )}
          </div>

          {/* Uploader */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Images (1 à 10) <span className="text-red-500">*</span>
            </label>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                errors.image
                  ? "border-red-300 bg-red-50/30"
                  : "border-slate-300 hover:border-primary"
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
                {files.length} / {MAX_FILES} sélectionné(s)
                {remaining > 0 ? ` — il reste ${remaining}` : " — limite atteinte"}
              </p>
            </div>

            {errors.image && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <FiAlertTriangle /> {errors.image}
              </p>
            )}

            {/* Previews */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {previews.map((p, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl overflow-hidden border border-slate-200"
                  >
                    <img
                      src={p.url}
                      alt={p.name}
                      className="h-28 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              disabled={submitting}
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white shadow hover:opacity-95 disabled:opacity-60"
            >
              {submitting && (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
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
    </div>
  );
};

export default AddProduct;
