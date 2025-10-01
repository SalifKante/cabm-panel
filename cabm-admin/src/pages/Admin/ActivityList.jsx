// src/pages/Admin/ActivityList.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiSearch,
  FiMapPin,
  FiCalendar,
  FiTrash2,
  FiX,
  FiAlertTriangle,
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

/* -------------------- skeleton -------------------- */
const CardSkeleton = () => (
  <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
    <div className="h-32 sm:h-40 bg-gray-100 animate-pulse" />
    <div className="p-3 sm:p-4 space-y-2">
      <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
      <div className="h-3.5 bg-gray-100 rounded w-1/2 animate-pulse" />
      <div className="h-3.5 bg-gray-100 rounded w-full animate-pulse" />
    </div>
  </div>
);

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

/* -------------------- tiny spinner -------------------- */
const Spinner = () => (
  <div className="inline-block h-5 w-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
);

/* -------------------- activity card -------------------- */
const ActivityCard = ({ a, onAskDelete }) => {
  const cover = getFirstImage(a);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition bg-white">
      {/* Image area with spinner overlay */}
      {cover && !imgError ? (
        <div className="relative h-36 sm:h-44 w-full bg-gray-100">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </div>
          )}
          <img
            src={cover}
            alt={a?.title || "activity"}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgError(true);
              setImgLoaded(false);
            }}
          />
        </div>
      ) : (
        <div className="h-36 sm:h-44 w-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          No image
        </div>
      )}

      <div className="p-3 sm:p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold line-clamp-1">
            {a?.title || "Sans titre"}
          </h3>

          {/* Delete button */}
          <button
            onClick={() => onAskDelete(a)}
            className="inline-flex items-center justify-center rounded-lg p-2 border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 transition"
            title="Supprimer l'activité"
          >
            <FiTrash2 className="text-[18px]" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[13px] sm:text-sm text-gray-600">
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

        {a?.description && (
          <p className="text-gray-700 text-[13px] sm:text-sm line-clamp-3">
            {a.description}
          </p>
        )}

        {Array.isArray(a?.tags) && a.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {a.tags.map((t, i) => (
              <span
                key={i}
                className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full border border-primary/20 text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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

  return (
    <div className="px-3 sm:px-5 lg:px-8 pt-4 sm:pt-6 pb-10">
      {/* Header & controls (stacked on mobile) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Activités</h1>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (titre, lieu, tags…) "
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 text-sm sm:text-base"
            />
          </div>

          <button
            onClick={fetchAll}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary text-white hover:opacity-95 active:opacity-90 transition"
            title="Rafraîchir"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm sm:text-base">
          <p className="text-gray-700">
            Aucune activité trouvée{dq ? " pour cette recherche." : "."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {current.map((a) => (
              <ActivityCard
                key={a?._id || a?.id}
                a={a}
                onAskDelete={onAskDelete}
              />
            ))}
          </div>

          {/* Pagination bar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs sm:text-sm text-gray-600">
              Affichage{" "}
              <span className="font-medium">
                {filtered.length === 0 ? 0 : start + 1}–{Math.min(end, filtered.length)}
              </span>{" "}
              sur <span className="font-medium">{filtered.length}</span>
            </div>

            {/* Page size */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Par page</span>
              <select
                className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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

            {/* Pager: compact on mobile */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goto(page - 1)}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm"
                disabled={page === 1}
              >
                Précédent
              </button>
              <span className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
                Page <span className="font-medium">{page}</span> / {pageCount}
              </span>
              <button
                onClick={() => goto(page + 1)}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm"
                disabled={page === pageCount}
              >
                Suivant
              </button>

              {/* First/Last visible on ≥sm */}
              <button
                onClick={() => goto(1)}
                className="hidden sm:inline-block px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm"
                disabled={page === 1}
              >
                «
              </button>
              <button
                onClick={() => goto(pageCount)}
                className="hidden sm:inline-block px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm"
                disabled={page === pageCount}
              >
                »
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirm delete modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !pending && setConfirmOpen(false)}
          />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-gray-200">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b">
                <div className="flex items-center gap-2 text-red-600">
                  <FiAlertTriangle />
                  <h3 className="font-semibold text-sm sm:text-base">
                    Supprimer l’activité
                  </h3>
                </div>
                <button
                  onClick={() => !pending && setConfirmOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  title="Fermer"
                >
                  <FiX />
                </button>
              </div>

              <div className="p-3 sm:p-4 space-y-1.5">
                <p className="text-gray-700 text-sm">
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-medium">
                    {target?.title || "cette activité"}
                  </span>{" "}
                  ?
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  Cette action est irréversible.
                </p>
              </div>

              <div className="p-3 sm:p-4 flex items-center justify-end gap-2 sm:gap-3 border-t">
                <button
                  onClick={() => !pending && setConfirmOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
                  disabled={pending}
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 text-sm"
                  disabled={pending}
                >
                  <FiTrash2 />
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
