import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  FiArrowLeft,
  FiSave,
  FiSend,
  FiUploadCloud,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";

/**
 * PostEditor — used for both create (/blog/new) and edit (/blog/:id/edit).
 * Sends multipart/form-data with aToken header + withCredentials:true.
 *
 * NOTE: the backend has no "get post by id" admin endpoint, so for edit we load
 * the posts list and find by id. This works for published posts (the only ones
 * the list currently returns); editing drafts needs backend ?all=true support.
 */
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

const PostEditor = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");

  // Cover image
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null); // object URL for new file
  const [existingCover, setExistingCover] = useState(""); // URL already saved

  const [categories, setCategories] = useState([]);

  const fileInputRef = useRef(null);

  const auth = useMemo(
    () => ({ withCredentials: true, headers: { aToken } }),
    [aToken]
  );

  // Load categories
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/blog/categories`, auth);
        if (!cancelled && data?.success) {
          setCategories(Array.isArray(data.data) ? data.data : []);
        }
      } catch {
        /* non-fatal: category dropdown stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, auth]);

  // Load post for edit via the admin endpoint (returns any post, incl. drafts)
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${backendUrl}/api/blog/admin/posts/${id}`,
          { withCredentials: true, headers: { aToken } }
        );
        if (cancelled) return;

        if (data?.success && data.data) {
          const post = data.data;
          setTitle(post.title || "");
          setExcerpt(post.excerpt || "");
          setContent(post.content || "");
          setCategoryId(post.category?._id || post.category || "");
          setTags(Array.isArray(post.tags) ? post.tags.join(", ") : "");
          setStatus(post.status || "draft");
          setExistingCover(post.coverImage || "");
        } else {
          toast.error(data?.message || "Article introuvable.");
          navigate("/blog");
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Erreur serveur lors du chargement."
        );
        navigate("/blog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, aToken, id, isEdit, navigate]);

  const errors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = "Le titre est requis.";
    if (!content.trim()) e.content = "Le contenu est requis.";
    return e;
  }, [title, content]);

  const onPickFile = (file) => {
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    if (!isImg) {
      toast.warn(`${file.name} (format non supporté)`);
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.warn(`${file.name} (> 8MB)`);
      return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const onFileInputChange = (e) => {
    onPickFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const clearNewCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("excerpt", excerpt.trim());
    fd.append("content", content);
    fd.append("category", categoryId || ""); // empty = no/clear category
    fd.append("tags", tags.trim());
    fd.append("status", status);
    if (coverFile) fd.append("coverImage", coverFile);
    return fd;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length) {
      toast.error(errors.title || errors.content || "Veuillez corriger les erreurs.");
      return;
    }
    try {
      setSaving(true);
      const fd = buildFormData();
      const { data } = isEdit
        ? await axios.put(`${backendUrl}/api/blog/posts/${id}`, fd, auth)
        : await axios.post(`${backendUrl}/api/blog/posts`, fd, auth);

      if (data?.success) {
        toast.success(isEdit ? "Article mis à jour." : "Article créé.");
        navigate("/blog");
      } else {
        toast.error(data?.message || "Échec de l’enregistrement.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur durant l’enregistrement."
      );
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    if (!isEdit) {
      // For a new post, just set status to published and save.
      setStatus("published");
      toast.info("Sélectionnez « Enregistrer » pour publier ce nouvel article.");
      return;
    }
    try {
      setPublishing(true);
      const { data } = await axios.patch(
        `${backendUrl}/api/blog/posts/${id}/publish`,
        {},
        auth
      );
      if (data?.success) {
        setStatus("published");
        toast.success("Article publié. Notification envoyée aux abonnés.");
      } else {
        toast.error(data?.message || "Échec de la publication.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Échec de la publication."
      );
    } finally {
      setPublishing(false);
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

  const previewSrc = coverPreview || existingCover || "";

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* ------------------------------ header ----------------------------- */}
      <div className="mb-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-primary"
        >
          <FiArrowLeft className="h-4 w-4" /> Retour aux articles
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">
          {isEdit ? "Modifier l’article" : "Nouvel article"}
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
                placeholder="Titre de l’article"
                className={inputClass(errors.title)}
              />
              {errors.title && <ErrorText>{errors.title}</ErrorText>}
            </div>

            {/* Excerpt */}
            <div>
              <label className={labelClass}>Extrait</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Court résumé affiché dans les listes et emails…"
                className={`${inputClass(false)} resize-y`}
              />
              <p className="mt-1 text-xs text-gray-400">{excerpt.length}/500</p>
            </div>

            {/* Content */}
            <div>
              <label className={labelClass}>
                Contenu <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder="Contenu de l’article (HTML accepté — éditeur riche TipTap à venir)…"
                className={`${inputClass(errors.content)} resize-y font-mono`}
              />
              {errors.content && <ErrorText>{errors.content}</ErrorText>}
            </div>

            {/* Category + Tags */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Catégorie</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass(false)}
                >
                  <option value="">— Aucune —</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Tags{" "}
                  <span className="text-gray-400">(séparés par des virgules)</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="agriculture, mali, récolte"
                  className={inputClass(false)}
                />
              </div>
            </div>
          </div>

          {/* ----------------------- RIGHT: meta + cover ------------------- */}
          <div className={`${cardClass} space-y-5 lg:col-span-1`}>
            {/* Status */}
            <div>
              <label className={labelClass}>Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass(false)}
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>

            {/* Cover image */}
            <div>
              <label className={labelClass}>Image de couverture</label>

              {previewSrc ? (
                <div className="relative overflow-hidden rounded-xl border border-gray-200">
                  <img
                    src={previewSrc}
                    alt="cover"
                    className="h-40 w-full object-cover"
                  />
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={clearNewCover}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow transition hover:bg-white"
                      title="Retirer la nouvelle image"
                    >
                      <FiX />
                    </button>
                  )}
                  <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                    {coverPreview ? "Nouvelle image (non enregistrée)" : "Image actuelle"}
                  </span>
                </div>
              ) : (
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    onPickFile(e.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:bg-gray-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <FiUploadCloud className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    Glissez une image ici
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    ou cliquez pour parcourir
                  </p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    JPG, PNG, WEBP, GIF, SVG — max 8MB
                  </p>
                </div>
              )}

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <FiUploadCloud className="h-4 w-4" />
                  {previewSrc ? "Changer l’image" : "Sélectionner une image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Publish (edit + draft only) */}
            {isEdit && status !== "published" && (
              <div className="border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={publishing || saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  <FiSend className="h-4 w-4" />
                  {publishing ? "Publication…" : "Publier maintenant"}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  Publie l’article et notifie les abonnés.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------ actions ---------------------------- */}
        <div className="mt-6 flex items-center justify-end gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Link
            to="/blog"
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
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l’article"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostEditor;
