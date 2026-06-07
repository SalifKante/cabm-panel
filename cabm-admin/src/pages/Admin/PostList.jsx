import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiPlusCircle,
  FiSend,
  FiFileText,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

/* ------------------------------- helpers ---------------------------------- */
const statusBadge = (status) =>
  status === "published"
    ? { label: "Publié", cls: "bg-emerald-50 text-emerald-700" }
    : { label: "Brouillon", cls: "bg-gray-100 text-gray-600" };

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
};

const PAGE_SIZE = 20;

const PostList = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | published | draft
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [publishingId, setPublishingId] = useState(null);

  // Delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null);

  const auth = useMemo(
    () => ({ withCredentials: true, headers: { aToken } }),
    [aToken]
  );

  useEffect(() => {
    setPage(1);
  }, [tab, q]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        // ?all=true is forward-compatible: the backend currently returns only
        // published posts, but will include drafts once it honours this flag.
        params.set("all", "true");
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));

        const { data } = await axios.get(
          `${backendUrl}/api/blog/posts?${params.toString()}`,
          auth
        );
        if (cancelled) return;

        if (data?.success) {
          const items = data.data || data.posts || [];
          setPosts(Array.isArray(items) ? items : []);
          setPagination(
            data.pagination || { page, totalPages: 1, total: items.length }
          );
        } else {
          toast.error(data?.message || "Impossible de charger les articles.");
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Erreur serveur pendant le chargement des articles."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, auth, page, refreshKey]);

  const filtered = useMemo(() => {
    let list = posts;
    if (tab !== "all") list = list.filter((p) => p.status === tab);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((p) => p?.title?.toLowerCase().includes(s));
    return list;
  }, [posts, tab, q]);

  const onRefresh = () => setRefreshKey((k) => k + 1);

  const onPublish = async (post) => {
    if (!post?._id) return;
    setPublishingId(post._id);
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/blog/posts/${post._id}/publish`,
        {},
        auth
      );
      if (data?.success) {
        const updated = data.data || {};
        setPosts((list) =>
          list.map((p) =>
            p._id === post._id
              ? {
                  ...p,
                  status: "published",
                  publishedAt:
                    updated.publishedAt ?? p.publishedAt ?? new Date().toISOString(),
                }
              : p
          )
        );
        toast.success("Article publié. Notification envoyée aux abonnés.");
      } else {
        throw new Error(data?.message || "Échec de la publication.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Échec de la publication."
      );
    } finally {
      setPublishingId(null);
    }
  };

  const requestDelete = (post) => {
    setTarget(post);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target?._id) return;
    try {
      setPending(true);
      const { data } = await axios.delete(
        `${backendUrl}/api/blog/posts/${target._id}`,
        auth
      );
      if (data?.success) {
        toast.success("Article supprimé.");
        setPosts((list) => list.filter((p) => p._id !== target._id));
        setConfirmOpen(false);
        setTarget(null);
      } else {
        toast.error(data?.message || "Échec de la suppression.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur pendant la suppression."
      );
    } finally {
      setPending(false);
    }
  };

  const tabs = [
    { key: "all", label: "Tous" },
    { key: "published", label: "Publiés" },
    { key: "draft", label: "Brouillons" },
  ];

  const count = filtered.length;

  /* ------------------------------ empty state ----------------------------- */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <FiFileText className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-800">
        Aucun article
      </h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        {tab === "draft"
          ? "L’API ne renvoie actuellement que les articles publiés. Les brouillons apparaîtront une fois ?all=true pris en charge côté serveur."
          : "Créez votre premier article pour commencer."}
      </p>
    </div>
  );

  /* ------------------------------- skeletons ------------------------------ */
  const TableSkeleton = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="border-t border-gray-100">
        <td className="px-4 py-3">
          <div className="h-3.5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded bg-gray-100" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
        </td>
        <td className="px-4 py-3">
          <div className="ml-auto h-8 w-28 animate-pulse rounded bg-gray-100" />
        </td>
      </tr>
    ));

  /* -------------------------------- actions ------------------------------- */
  const ActionButtons = ({ p }) => (
    <div className="flex items-center justify-end gap-1">
      {p.status !== "published" && (
        <button
          onClick={() => onPublish(p)}
          disabled={publishingId === p._id}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-60"
          title="Publier"
        >
          {publishingId === p._id ? (
            <FiRefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <FiSend className="h-4 w-4" />
          )}
          <span className="sr-only">Publier</span>
        </button>
      )}
      <Link
        to={`/blog/${p._id}/edit`}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-primary-50 hover:text-primary-700"
        title="Modifier"
      >
        <FiEdit2 className="h-4 w-4" />
        <span className="sr-only">Modifier</span>
      </Link>
      <button
        onClick={() => requestDelete(p)}
        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
        title="Supprimer"
      >
        <FiTrash2 className="h-4 w-4" />
        <span className="sr-only">Supprimer</span>
      </button>
    </div>
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header ----------------------------- */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Articles</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              {count} article{count > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher par titre…"
                className="w-64 max-w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <button
              onClick={onRefresh}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50"
              disabled={loading}
              title="Rafraîchir"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
            <Link
              to="/blog/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
            >
              <FiPlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvel article</span>
              <span className="sm:hidden">Nouveau</span>
            </Link>
          </div>
        </div>

        {/* Status pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
              />
            ))
          ) : count === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <EmptyState />
            </div>
          ) : (
            filtered.map((p) => {
              const b = statusBadge(p.status);
              return (
                <div
                  key={p._id}
                  className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-gray-800">{p.title}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${b.cls}`}>
                      {b.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span>{p.category?.name || "—"}</span>
                    <span>{formatDate(p.publishedAt || p.createdAt)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-1">
                    <ActionButtons p={p} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table */}
        <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3 w-40">Catégorie</th>
                  <th className="px-4 py-3 w-28">Statut</th>
                  <th className="px-4 py-3 w-36">Date</th>
                  <th className="px-4 py-3 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : count === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const b = statusBadge(p.status);
                    return (
                      <tr
                        key={p._id}
                        className="border-t border-gray-100 transition hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-3">
                          <div className="line-clamp-1 font-medium text-gray-800">
                            {p.title}
                          </div>
                          {p.excerpt ? (
                            <div className="line-clamp-1 text-xs text-gray-400">
                              {p.excerpt}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {p.category?.name ? (
                            <span className="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                              {p.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${b.cls}`}>
                            {b.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                          {formatDate(p.publishedAt || p.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <ActionButtons p={p} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && count > 0 && (pagination.totalPages || 1) > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              Page {pagination.page || page} / {pagination.totalPages || 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(pagination.page || page) <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft className="h-4 w-4" /> Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(pagination.page || page) >= (pagination.totalPages || 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
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
                  Supprimer l’article
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-medium text-gray-700">
                    {target?.title || "cet article"}
                  </span>{" "}
                  ? Les commentaires associés seront également supprimés. Action
                  irréversible.
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

export default PostList;
