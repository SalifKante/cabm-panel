import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiImage,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/**
 * ProductList
 * - Fetch: POST /api/admin/all-products
 * - Edit:   navigate to /edit-product/:id
 * - Delete: DELETE /api/admin/product/:id with popup confirmation
 * - Toggle: PATCH /api/admin/product/:id/status  { isActive: boolean }
 * - Responsive: cards on mobile, table on sm+
 * - Toasts for success/error
 */
const ProductList = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Delete popup state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null); // { _id, title }

  // Toggle pending state (to disable the clicked toggle button)
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.post(
          `${backendUrl}/api/admin/all-products`,
          {},
          { headers: { aToken } }
        );
        if (!cancelled) {
          if (data?.success) {
            const items = data.data || data.products || [];
            setProducts(Array.isArray(items) ? items : []);
          } else {
            toast.error(data?.message || "Impossible de charger les produits.");
          }
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur pendant le chargement.";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, aToken, refreshKey]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => p?.title?.toLowerCase().includes(s));
  }, [products, q]);

  const onRefresh = () => setRefreshKey((k) => k + 1);
  const onEdit = (id) => navigate(`/edit-product/${id}`);

  const requestDelete = (product) => {
    setTarget(product);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target?._id) return;
    try {
      setPending(true);
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/product/${target._id}`,
        { headers: { aToken } }
      );
      if (data?.success) {
        toast.success("Produit supprimé avec succès.");
        setProducts((prev) => prev.filter((p) => p._id !== target._id));
        setConfirmOpen(false);
        setTarget(null);
      } else {
        toast.error(data?.message || "Échec de la suppression.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur serveur pendant la suppression.";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  // ---- NEW: toggle activation/deactivation ----
  const onToggleActive = async (product) => {
    if (!product?._id) return;
    const next = !product.isActive;
    setTogglingId(product._id);

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p._id === product._id ? { ...p, isActive: next } : p))
    );

    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/product/${product._id}/status`,
        { isActive: next },
        { headers: { aToken } }
      );

      if (data?.success) {
        toast.success(next ? "Produit activé." : "Produit masqué.");
        // If API returns canonical value, sync it:
        const serverIsActive =
          data?.data?.isActive ?? data?.updated?.isActive ?? next;
        setProducts((prev) =>
          prev.map((p) =>
            p._id === product._id ? { ...p, isActive: serverIsActive } : p
          )
        );
      } else {
        // Revert optimistic change on failure
        setProducts((prev) =>
          prev.map((p) =>
            p._id === product._id ? { ...p, isActive: !next } : p
          )
        );
        toast.error(data?.message || "Échec de la mise à jour du statut.");
      }
    } catch (err) {
      // Revert optimistic change on error
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, isActive: !next } : p))
      );
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur pendant la mise à jour du statut.";
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };
  // --------------------------------------------

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-slate-600">
      <FiImage className="text-3xl mb-2" />
      <p className="text-sm">Aucun produit trouvé.</p>
    </div>
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-2xl font-semibold text-slate-800">Produits</h1>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher par titre…"
                className="w-64 max-w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3c388d]/20"
              />
            </div>

            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              disabled={loading}
              title="Rafraîchir"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Rafraîchir</span>
            </button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {loading ? (
            <div className="py-8 text-center text-slate-600">Chargement…</div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            filtered.map((p) => {
              const thumb = p?.image?.[0];
              return (
                <div
                  key={p._id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={p.title}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40 w-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <FiImage className="text-2xl" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-medium text-slate-800">{p.title}</h2>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                          p.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.isActive ? "Actif" : "Masqué"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3">
                      {p.description}
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {/* NEW: Toggle button (mobile) */}
                      <button
                        onClick={() => onToggleActive(p)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-slate-50 ${
                          p.isActive
                            ? "border-slate-300 text-slate-700"
                            : "border-emerald-300 text-emerald-700"
                        }`}
                        disabled={togglingId === p._id}
                        title={p.isActive ? "Masquer" : "Activer"}
                      >
                        {togglingId === p._id ? (
                          <>
                            <FiRefreshCw className="animate-spin" /> …
                          </>
                        ) : p.isActive ? (
                          <>
                            <FiX /> Masquer
                          </>
                        ) : (
                          <>
                            <FiRefreshCw /> Activer
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onEdit(p._id)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-slate-50"
                        title="Modifier"
                      >
                        <FiEdit2 /> Éditer
                      </button>
                      <button
                        onClick={() => requestDelete(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 text-red-700 px-2.5 py-1.5 text-xs hover:bg-red-50"
                        title="Supprimer"
                      >
                        <FiTrash2 /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table (sm and up) */}
        <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 w-20">Image</th>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3 w-48">Créé le</th>
                <th className="px-4 py-3 w-24">Statut</th>
                <th className="px-4 py-3 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-600">
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const thumb = p?.image?.[0];
                  return (
                    <tr
                      key={p._id}
                      className="border-t border-slate-100 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <div className="h-12 w-16 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={p.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FiImage className="text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {p.title}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-2">
                          {p.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.isActive ? "Actif" : "Masqué"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* NEW: Toggle button (table) */}
                          <button
                            onClick={() => onToggleActive(p)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 hover:bg-slate-50 ${
                              p.isActive
                                ? "border-slate-300 text-slate-700"
                                : "border-emerald-300 text-emerald-700"
                            }`}
                            disabled={togglingId === p._id}
                            title={p.isActive ? "Masquer" : "Activer"}
                          >
                            {togglingId === p._id ? (
                              <>
                                <FiRefreshCw className="animate-spin" />
                                <span className="sr-only">Mise à jour…</span>
                              </>
                            ) : p.isActive ? (
                              <>
                                <FiX />
                                <span className="sr-only">Masquer</span>
                              </>
                            ) : (
                              <>
                                <FiRefreshCw />
                                <span className="sr-only">Activer</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => onEdit(p._id)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 hover:bg-slate-50"
                            title="Modifier"
                          >
                            <FiEdit2 />
                            <span className="sr-only">Modifier</span>
                          </button>
                          <button
                            onClick={() => requestDelete(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 text-red-700 px-2.5 py-1.5 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <FiTrash2 />
                            <span className="sr-only">Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && products.length === 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
            <FiAlertTriangle /> Aucun produit n’est disponible pour le moment.
          </div>
        )}
      </div>

      {/* ===================== Delete Confirmation Popup ===================== */}
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
                    Supprimer le produit
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
                    {target?.title || "ce produit"}
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
      {/* ===================================================================== */}
    </div>
  );
};

export default ProductList;
