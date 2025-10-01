// src/components/AddActivity.jsx
import React, { useContext, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  Plus,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  MapPin,
  Tag,
  Type,
  AlignLeft,
  X,
  Loader2,
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

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 pt-4 sm:pt-6 pb-20">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Ajouter une activité
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Formulaire rapide et optimisé pour mobile. Ajoutez des images et
          séparez les tags par des virgules.
        </p>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Fields */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Titre */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Type size={16} />
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Ex.: Inauguration du nouveau puits"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <CalendarIcon size={16} />
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Envoyée au format <code>DD/MM/YYYY</code>.
            </p>
          </div>

          {/* Lieu */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <MapPin size={16} />
              Lieu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Ex.: Bamako"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <Tag size={16} />
              Tags
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Ex.: agriculture, formation, eau"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            {!!tags.asArray.length && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.asArray.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] sm:text-xs px-2 py-1 rounded-full bg-[#3c388d]/10 text-[#3c388d] border border-[#3c388d]/30"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              Séparez par des virgules : <code>#tag1, #tag2</code>
            </p>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <AlignLeft size={16} />
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Décrivez brièvement l’activité…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Images */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <ImageIcon size={16} />
              Images <span className="text-red-500">*</span>
            </label>

            {/* Mobile-friendly picker: big target */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
                className="sr-only"
              />
              <label
                htmlFor="images"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <ImageIcon size={18} />
                <span>Sélectionner des images</span>
              </label>
              <span className="hidden sm:block text-xs text-gray-500">
                PNG, JPG, WEBP…
              </span>
            </div>

            {!!previews.length && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="relative group overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img
                      src={src}
                      alt={`aperçu-${i + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/95 border border-gray-300 text-gray-700 shadow hover:bg-white"
                      aria-label="Retirer l’image"
                      title="Retirer l’image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-2">
              Les fichiers seront envoyés en <code>multipart/form-data</code>.
            </p>
          </div>
        </div>

        {/* Footer — sticky on mobile for easy access */}
        <div className="border-t border-gray-200">
          <div className="px-4 sm:px-5 py-3 sm:py-4 grid grid-cols-1 sm:flex sm:items-center sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setTitle("");
                setDate("");
                setPlace("");
                setDescription("");
                setTagsInput("");
                setImages([]);
                setPreviews([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Réinitialiser
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-95 disabled:opacity-60"
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
        </div>
      </form>
    </div>
  );
};

export default AddActivity;
