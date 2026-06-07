import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiShoppingCart,
} from "react-icons/fi";

/* ----------------------------- shared config ----------------------------- */
export const ORDER_STATUSES = [
  { key: "pending", label: "En attente", badge: "bg-amber-50 text-amber-700 border border-amber-200" },
  { key: "contacted", label: "Contacté", badge: "bg-blue-50 text-blue-700 border border-blue-200" },
  { key: "confirmed", label: "Confirmé", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { key: "delivered", label: "Livré", badge: "bg-emerald-600 text-white border border-emerald-600" },
  { key: "cancelled", label: "Annulé", badge: "bg-red-50 text-red-700 border border-red-200" },
];

export const statusConfig = (key) =>
  ORDER_STATUSES.find((s) => s.key === key) || {
    key,
    label: key || "—",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
  };

export const formatXOF = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} XOF`;
};

export const formatDate = (d) => {
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

/* ------------------------------ status badge ------------------------------ */
export const StatusBadge = ({ status }) => {
  const c = statusConfig(status);
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${c.badge}`}>
      {c.label}
    </span>
  );
};

/* --------------------------------- page ---------------------------------- */
const PAGE_SIZE = 20;

const OrderList = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState(""); // "" = Tous
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [updatingId, setUpdatingId] = useState(null);

  // Same auth pattern as the rest of the panel (AdminContext), plus cookie creds
  // since the order routes are protected by the auth cookie.
  const auth = useMemo(
    () => ({ withCredentials: true, headers: { aToken } }),
    [aToken]
  );

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [status, debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        if (status) params.set("status", status);
        if (debouncedQ.trim()) params.set("q", debouncedQ.trim());

        const { data } = await axios.get(
          `${backendUrl}/api/orders/admin?${params.toString()}`,
          auth
        );
        if (cancelled) return;

        if (data?.success) {
          const items = data.data || data.orders || [];
          setOrders(Array.isArray(items) ? items : []);
          setPagination(
            data.pagination || { page, totalPages: 1, total: items.length }
          );
        } else {
          toast.error(data?.message || "Impossible de charger les commandes.");
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur pendant le chargement des commandes.";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, auth, page, status, debouncedQ, refreshKey]);

  const onRefresh = () => setRefreshKey((k) => k + 1);
  const onView = (o) => navigate(`/orders/${encodeURIComponent(o.orderNumber)}`);

  const onChangeStatus = async (order, nextStatus) => {
    if (!order?._id || nextStatus === order.status) return;
    const prev = order.status;
    setUpdatingId(order._id);

    // Optimistic update
    setOrders((list) =>
      list.map((o) => (o._id === order._id ? { ...o, status: nextStatus } : o))
    );

    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/orders/admin/${order._id}/status`,
        { status: nextStatus },
        auth
      );
      if (data?.success) {
        const serverStatus = data?.data?.status ?? nextStatus;
        setOrders((list) =>
          list.map((o) =>
            o._id === order._id ? { ...o, status: serverStatus } : o
          )
        );
        toast.success(`Statut mis à jour : ${statusConfig(serverStatus).label}`);
      } else {
        throw new Error(data?.message || "Échec de la mise à jour.");
      }
    } catch (err) {
      // Revert on failure
      setOrders((list) =>
        list.map((o) => (o._id === order._id ? { ...o, status: prev } : o))
      );
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Échec de la mise à jour du statut."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const tabs = useMemo(
    () => [{ key: "", label: "Tous" }, ...ORDER_STATUSES.map((s) => ({ key: s.key, label: s.label }))],
    []
  );

  const StatusSelect = ({ order }) => (
    <select
      value={order.status}
      onChange={(e) => onChangeStatus(order, e.target.value)}
      disabled={updatingId === order._id}
      className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
      title="Changer le statut"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <FiShoppingCart className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-800">
        Aucune commande
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Aucune commande ne correspond aux filtres actuels.
      </p>
    </div>
  );

  /* ------------------------------- skeletons ------------------------------ */
  const TableSkeleton = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="border-t border-gray-100">
        <td className="px-4 py-3">
          <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
        </td>
        <td className="px-4 py-3 text-center">
          <div className="mx-auto h-5 w-8 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-20 animate-pulse rounded bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100" />
        </td>
        <td className="px-4 py-3">
          <div className="ml-auto h-8 w-36 animate-pulse rounded bg-gray-100" />
        </td>
      </tr>
    ));

  /* ------------------------------ pagination ------------------------------ */
  const total = pagination.total ?? orders.length;
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = pagination.page || page;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header ----------------------------- */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Commandes</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              {total} commande{total > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="N° commande ou téléphone…"
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
          </div>
        </div>

        {/* Status filter pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = status === t.key;
            return (
              <button
                key={t.key || "all"}
                onClick={() => setStatus(t.key)}
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
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <EmptyState />
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o._id}
                className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-primary-700">
                      {o.orderNumber}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(o.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{o.customer?.name || "—"}</div>
                  <div className="text-xs text-gray-400">
                    {o.customer?.phone || "—"}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {o.items?.length ?? 0} article(s)
                  </span>
                  <span className="font-semibold text-gray-800">
                    {formatXOF(o.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <StatusSelect order={o} />
                  <button
                    onClick={() => onView(o)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <FiEye /> Détails
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table (sm+) */}
        <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">N° commande</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 w-24 text-center">Articles</th>
                  <th className="px-4 py-3 w-36">Total</th>
                  <th className="px-4 py-3 w-28">Statut</th>
                  <th className="px-4 py-3 w-44">Date</th>
                  <th className="px-4 py-3 w-56 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o._id}
                      className="border-t border-gray-100 transition hover:bg-gray-50/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-primary-700">
                        {o.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {o.customer?.name || "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {o.customer?.phone || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {o.items?.length ?? 0}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">
                        {formatXOF(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <StatusSelect order={o} />
                          <button
                            onClick={() => onView(o)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-700 transition hover:bg-gray-50"
                            title="Voir les détails"
                          >
                            <FiEye />
                            <span className="sr-only">Détails</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && orders.length > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gray-500">
              Affichage {rangeStart}-{rangeEnd} sur {total} commande
              {total > 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Précédent</span>
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                const show =
                  n === 1 ||
                  n === totalPages ||
                  (n >= currentPage - 1 && n <= currentPage + 1);
                if (!show) {
                  if (n === currentPage - 2 || n === currentPage + 2) {
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
                    onClick={() => setPage(n)}
                    className={`min-w-[2rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      n === currentPage
                        ? "bg-primary text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="hidden sm:inline">Suivant</span>
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
