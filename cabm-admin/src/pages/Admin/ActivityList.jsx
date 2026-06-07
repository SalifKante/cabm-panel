// src/pages/Admin/ActivityList.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiSearch,
  FiMapPin,
  FiCalendar,
  FiTrash2,
  FiPlusCircle,
  FiCompass,
  FiImage,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";

/* -------------------- utils -------------------- */
const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
};

const useDebounced = (value, delay = 300) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
};

/* ---------- pick only the first image, from multiple possible shapes ---------- */
const getFirstImage = (a) => {
  if (Array.isArray(a?.pictures) && a.pictures.length) {
    const first = a.pictures.find(Boolean);
    if (typeof first === "string") return first;
    if (first && typeof first === "object")
      return first.url || first.secure_url || first.path || null;
  }
  if (Array.isArray(a?.images) && a.images.length) {
    const first = a.images.find(Boolean);
    if (typeof first === "string") return first;
    if (first && typeof first === "object")
      return first.url || first.secure_url || first.path || null;
  }
  if (Array.isArray(a?.image) && a.image.length) {
    const first = a.image.find(Boolean);
    if (typeof first === "string") return first;
    if (first && typeof first === "object")
      return first.url || first.secure_url || first.path || null;
  }
  if (a?.image) return typeof a.image === "string" ? a.image : a.image.url || null;
  if (a?.cover) return typeof a.cover === "string" ? a.cover : a.cover.url || null;
  return null;
};

/* -------------------- thumbnail -------------------- */
const Thumb = ({ a, className }) => {
  const cover = getFirstImage(a);
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className={`overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center ${className}`}
    >
      {cover && !imgError ? (
        <img
          src={cover}
          alt={a?.title || "activity"}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : (
        <FiImage className="text-gray-300 text-xl" />
      )}
    </div>
  );
};

/* -------------------- tags -------------------- */
const TagPills = ({ tags }) =>
  Array.isArray(tags) && tags.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t, i) => (
        <span
          key={i}
          className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
        >
          {t}
        </span>
      ))}
    </div>
  ) : null;

/* -------------------- list -------------------- */
const ActivityList = () => {
  const { getAllActivities, activity = [], backendUrl, aToken } =
    useContext(AdminContext);

  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await getAllActivities();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dq]);

  const filtered = useMemo(() => {
    if (!dq) return activity;
    const needle = dq.toLowerCase().trim();
    return activity.filter((a) => {
      const hay = [
        a?.title,
        a?.place,
        a?.description,
        ...(Array.isArray(a?.tags) ? a.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [activity, dq]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const current = filtered.slice(start, end);

  const onAskDelete = (a) => {
    setTarget(a);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target?._id) return setConfirmOpen(false);
    setPending(true);
    try {
      await axios.delete(`${backendUrl}/api/admin/activity/${target._id}`, {
        headers: { aToken },
      });
      toast.success("Activité supprimée avec succès");
      setConfirmOpen(false);
      setTarget(null);
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Suppression impossible");
    } finally {
      setPending(false);
    }
  };

  const goto = (p) => setPage(Math.min(Math.max(1, p), pageCount));

  const count = filtered.length;

  /* ------------------------------ empty state ----------------------------- */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <FiCompass className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-800">
        Aucune activité
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {dq
          ? "Aucune activité ne correspond à cette recherche."
          : "Ajoutez votre première activité pour commencer."}
      </p>
      {!dq && (
        <Link
          to="/add-activity"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
        >
          <FiPlusCircle className="h-4 w-4" />
          Ajouter une activité
        </Link>
      )}
    </div>
  );

  /* ------------------------------- skeletons ------------------------------ */
  const RowSkeleton = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 border-t border-gray-100 px-4 py-4"
      >
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
      </div>
    ));

  /* -------------------------------- row ----------------------------------- */
  const MetaLine = ({ a }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
      <span className="inline-flex items-center gap-1">
        <FiCalendar className="shrink-0" />
        {formatDate(a?.date)}
      </span>
      {a?.place && (
        <span className="inline-flex items-center gap-1">
          <FiMapPin className="shrink-0" />
          {a.place}
        </span>
      )}
    </div>
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header ----------------------------- */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Activités</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              {count} activité{count > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="w-64 max-w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <button
              onClick={fetchAll}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50"
              disabled={loading}
              title="Rafraîchir"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>

            <Link
              to="/add-activity"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
            >
              <FiPlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter une activité</span>
              <span className="sm:hidden">Ajouter</span>
            </Link>
          </div>
        </div>

        {/* ------------------------------ content ---------------------------- */}
        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
              />
            ))
          ) : count === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <EmptyState />
            </div>
          ) : (
            current.map((a) => (
              <div
                key={a?._id || a?.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <Thumb a={a} className="h-40 w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-semibold text-gray-800">
                      {a?.title || "Sans titre"}
                    </h3>
                    <button
                      onClick={() => onAskDelete(a)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      title="Supprimer l'activité"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <MetaLine a={a} />
                  {a?.description && (
                    <p className="line-clamp-2 text-sm text-gray-500">
                      {a.description}
                    </p>
                  )}
                  <TagPills tags={a?.tags} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop rows */}
        <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:block">
          {loading ? (
            <RowSkeleton />
          ) : count === 0 ? (
            <EmptyState />
          ) : (
            current.map((a) => (
              <div
                key={a?._id || a?.id}
                className="flex items-center gap-4 border-t border-gray-100 px-4 py-4 transition first:border-t-0 hover:bg-gray-50/60"
              >
                <Thumb a={a} className="h-16 w-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-gray-800">
                    {a?.title || "Sans titre"}
                  </h3>
                  <div className="mt-0.5">
                    <MetaLine a={a} />
                  </div>
                  {a?.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                      {a.description}
                    </p>
                  )}
                  {Array.isArray(a?.tags) && a.tags.length > 0 && (
                    <div className="mt-2">
                      <TagPills tags={a.tags} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onAskDelete(a)}
                  className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  title="Supprimer l'activité"
                >
                  <FiTrash2 className="h-4 w-4" />
                  <span className="sr-only">Supprimer</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* ------------------------------ pagination ------------------------ */}
        {!loading && count > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gray-500">
              Affichage {start + 1}-{Math.min(end, count)} sur {count} activité
              {count > 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-3">
              {/* Page size */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Par page</span>
                <select
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[6, 9, 12, 24].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pager */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goto(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Précédent</span>
                </button>

                {Array.from({ length: pageCount }).map((_, i) => {
                  const n = i + 1;
                  const show =
                    n === 1 ||
                    n === pageCount ||
                    (n >= page - 1 && n <= page + 1);
                  if (!show) {
                    if (n === page - 2 || n === page + 2) {
                      return (
                        <span
                          key={n}
                          className="px-2 text-sm text-gray-400 select-none"
                        >
                          …
                        </span>
                      );
                    }
                    return null;
                  }
                  return (
                    <button
                      key={n}
                      onClick={() => goto(n)}
                      className={`min-w-[2rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        n === page
                          ? "bg-primary text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}

                <button
                  onClick={() => goto(page + 1)}
                  disabled={page >= pageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================== Confirm delete modal ===================== */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !pending && setConfirmOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <FiAlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-800">
                  Supprimer cette activité ?
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-medium text-gray-700">
                    {target?.title || "cette activité"}
                  </span>{" "}
                  ? Cette action est irréversible.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => !pending && setConfirmOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  disabled={pending}
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                  disabled={pending}
                >
                  {pending ? (
                    <FiRefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiTrash2 className="h-4 w-4" />
                  )}
                  {pending ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityList;
