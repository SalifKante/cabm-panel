// src/pages/Admin/AddActivity.jsx
import React, { useContext, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Tag,
  Type,
  AlignLeft,
  X,
  Loader2,
  UploadCloud,
  ArrowLeft,
} from "lucide-react";

/* ---------- Utils ---------- */
// 'YYYY-MM-DD' -> 'DD/MM/YYYY'
const toDDMMYYYY = (yyyy_mm_dd = "") => {
  if (!yyyy_mm_dd) return "";
  const [y, m, d] = yyyy_mm_dd.split("-");
  return `${d}/${m}/${y}`;
};

// Normalisation des tags
const normalizeTags = (raw = "") => {
  const arr = raw
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
  const unique = Array.from(new Set(arr));
  return { asString: unique.join(", "), asArray: unique };
};

const AddActivity = () => {
  const { aToken, backendUrl } = useContext(AdminContext);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const tags = useMemo(() => normalizeTags(tagsInput), [tagsInput]);

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };
  const handleDragOver = (e) => e.preventDefault();

  const removeImage = (idx) => {
    const nextFiles = images.filter((_, i) => i !== idx);
    const nextPrev = previews.filter((_, i) => i !== idx);
    setImages(nextFiles);
    setPreviews(nextPrev);
    if (nextFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = () => {
    if (!title.trim()) return "Le titre est requis.";
    if (!date) return "La date est requise.";
    if (!place.trim()) return "Le lieu est requis.";
    if (!description.trim()) return "La description est requise.";
    if (images.length === 0) return "Ajoutez au moins une image.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!aToken) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const form = new FormData();
    form.append("title", title.trim());
    form.append("date", toDDMMYYYY(date));
    form.append("place", place.trim());
    form.append("description", description.trim());
    form.append("tags", tags.asString);
    images.forEach((f) => form.append("image", f));

    try {
      setSubmitting(true);
      const base = backendUrl ? backendUrl.replace(/\/+$/, "") : "";
      const url = `${base}/api/admin/create-activity`;

      const res = await axios.post(url, form, {
        headers: { aToken },
      });

      toast.success(res?.data?.message || "Activité créée avec succès.");
      setTitle("");
      setDate("");
      setPlace("");
      setDescription("");
      setTagsInput("");
      setImages([]);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Échec de la création de l’activité.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------- shared UI helpers ------------------------- */
  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15";
  const labelClass =
    "mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700";
  const cardClass = "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* ------------------------------ header ----------------------------- */}
      <div className="mb-6">
        <Link
          to="/activities"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-primary"
        >
          <ArrowLeft size={16} /> Retour aux activités
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">
          Nouvelle activité
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ----------------------- LEFT: main content -------------------- */}
          <div className={`${cardClass} space-y-5 lg:col-span-2`}>
            {/* Titre */}
            <div>
              <label className={labelClass}>
                <Type size={16} />
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex.: Inauguration du nouveau puits"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Date + Lieu */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  <CalendarIcon size={16} />
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Envoyée au format <code>DD/MM/YYYY</code>.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  <MapPin size={16} />
                  Lieu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ex.: Bamako"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>
                <AlignLeft size={16} />
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                className={`${inputClass} resize-y`}
                placeholder="Décrivez brièvement l’activité…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div>
              <label className={labelClass}>
                <Tag size={16} />
                Tags
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex.: agriculture, formation, eau"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              {!!tags.asArray.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.asArray.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-gray-400">
                Séparez par des virgules : <code>#tag1, #tag2</code>
              </p>
            </div>
          </div>

          {/* ----------------------- RIGHT: images ------------------------- */}
          <div className={`${cardClass} lg:col-span-1`}>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Images <span className="text-red-500">*</span>
              </label>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                {images.length} image{images.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:bg-gray-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <UploadCloud size={24} />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">
                Glissez vos images ici
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                ou cliquez pour parcourir
              </p>
              <p className="mt-2 text-[11px] text-gray-400">PNG, JPG, WEBP…</p>
              <input
                ref={fileInputRef}
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
                className="sr-only"
              />
            </div>

            {!!previews.length && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img
                      src={src}
                      alt={`aperçu-${i + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(i);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Retirer l’image"
                      title="Retirer l’image"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500">
                        <X size={16} />
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
            to="/activities"
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <Plus size={16} />
                Créer l’activité
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddActivity;
