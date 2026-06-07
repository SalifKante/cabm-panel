import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiCheck,
  FiTrash2,
  FiMessageSquare,
  FiUser,
  FiFileText,
  FiClock,
  FiAlertTriangle,
} from "react-icons/fi";

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const CommentModeration = () => {
  const { backendUrl, aToken } = useContext(AdminContext);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState(null);

  // Delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null);

  const auth = useMemo(
    () => ({ withCredentials: true, headers: { aToken } }),
    [aToken]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${backendUrl}/api/blog/admin/comments`,
          auth
        );
        if (cancelled) return;
        if (data?.success) {
          const items = data.data || data.comments || [];
          setComments(Array.isArray(items) ? items : []);
        } else {
          toast.error(data?.message || "Impossible de charger les commentaires.");
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Erreur serveur pendant le chargement des commentaires."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, auth, refreshKey]);

  const onRefresh = () => setRefreshKey((k) => k + 1);

  const onApprove = async (comment) => {
    if (!comment?._id) return;
    setBusyId(comment._id);
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/blog/admin/comments/${comment._id}/approve`,
        {},
        auth
      );
      if (data?.success) {
        // Approved → leaves the pending queue.
        setComments((list) => list.filter((c) => c._id !== comment._id));
        toast.success("Commentaire approuvé.");
      } else {
        toast.error(data?.message || "Échec de l’approbation.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Échec de l’approbation."
      );
    } finally {
      setBusyId(null);
    }
  };

  const requestDelete = (comment) => {
    setTarget(comment);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target?._id) return;
    try {
      setPending(true);
      const { data } = await axios.delete(
        `${backendUrl}/api/blog/admin/comments/${target._id}`,
        auth
      );
      if (data?.success) {
        setComments((list) => list.filter((c) => c._id !== target._id));
        toast.success("Commentaire supprimé.");
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

  const count = comments.length;

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header ----------------------------- */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              Modération des commentaires
            </h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              {count} en attente
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
            disabled={loading}
            title="Rafraîchir"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
        </div>

        {/* ------------------------------ content ---------------------------- */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <FiMessageSquare className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-800">
              Aucun commentaire en attente
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Les nouveaux commentaires apparaîtront ici pour approbation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c._id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {/* content */}
                    <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
                      {c.content}
                    </p>

                    {/* meta */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        <FiUser className="shrink-0" />
                        <span className="font-medium text-gray-600">
                          {c.userId?.name || "Utilisateur"}
                        </span>
                        {c.userId?.email ? (
                          <span className="text-gray-400">
                            · {c.userId.email}
                          </span>
                        ) : null}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FiFileText className="shrink-0" />
                        {c.postId?.title || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FiClock className="shrink-0" />
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => onApprove(c)}
                      disabled={busyId === c._id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      title="Approuver"
                    >
                      {busyId === c._id ? (
                        <FiRefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FiCheck className="h-4 w-4" />
                      )}
                      Approuver
                    </button>
                    <button
                      onClick={() => requestDelete(c)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      title="Supprimer"
                    >
                      <FiTrash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                  Supprimer le commentaire
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Supprimer définitivement ce commentaire de{" "}
                  <span className="font-medium text-gray-700">
                    {target?.userId?.name || "cet utilisateur"}
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

export default CommentModeration;
