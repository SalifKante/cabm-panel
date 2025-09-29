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

// Util: 'YYYY-MM-DD' -> 'DD/MM/YYYY'
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
  const [tagsInput, setTagsInput] = useState(""); // <-- raw input (virgule OK)
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
    form.append("tags", tags.asString); // normalisé seulement à l’envoi
    images.forEach((f) => form.append("image", f));

    try {
      setSubmitting(true);
      const base = backendUrl ? backendUrl.replace(/\/+$/, "") : "";
      const url = `${base}/api/admin/create-activity`;

      const res = await axios.post(url, form, {
        headers: {
          // "Content-Type": "multipart/form-data",
          // on envoie les 2 en-têtes courants pour éviter 401 selon backend
          // Authorization: `Bearer ${aToken}`,
          // aToken: aToken,
          aToken
        },
        // withCredentials: true, // utile si cookies + CORS
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
    <div className="max-w-5xl mx-auto pt-8 pb-16 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Ajouter une activité
        </h1>
        <p className="text-sm text-gray-500">
          Remplissez le formulaire ci-dessous, puis validez pour créer une
          activité (images multiples, tags séparés par des virgules).
        </p>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200"
      >
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Titre */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Type size={16} />
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Ex.: Inauguration du nouveau puits"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon size={16} />
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Sera envoyé comme <code>DD/MM/YYYY</code> à l’API.
            </p>
          </div>

          {/* Lieu */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} />
              Lieu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Ex.: Bamako"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>

          {/* Tags (saisie libre, virgule OK) */}
          <div className="col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Tag size={16} />
              Tags
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Ex.: agriculture, formation, eau"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            {!!tags.asArray.length && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.asArray.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-1 rounded-full bg-[#3c388d]/10 text-[#3c388d] border border-[#3c388d]/30"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Séparez les tags par des virgules. Ils seront envoyés comme{" "}
              <code>#tag1, #tag2, #tag3</code>.
            </p>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <AlignLeft size={16} />
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3c388d]/40"
              placeholder="Décrivez brièvement l’activité…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Images */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <ImageIcon size={16} />
              Images <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
              />
            </div>

            {!!previews.length && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="relative group rounded-lg overflow-hidden border border-[#3c388d]/40"
                  >
                    <img
                      src={src}
                      alt={`aperçu-${i + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-x-0 top-0 h-1 bg-[#3c388d]" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-white/95 border border-[#3c388d]/40 text-[#3c388d] hover:bg-white"
                      aria-label="Retirer l’image"
                      title="Retirer l’image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Les fichiers seront envoyés en <code>multipart/form-data</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:opacity-95 disabled:opacity-60"
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
