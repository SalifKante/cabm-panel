import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiArrowLeft,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiFileText,
  FiClock,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import {
  ORDER_STATUSES,
  statusConfig,
  StatusBadge,
  formatXOF,
  formatDate,
} from "./OrderList";

const OrderDetail = () => {
  // Route is /orders/:id — we link from the list using the orderNumber, and the
  // public GET /api/orders/:orderNumber returns the full order (incl. _id).
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl, aToken } = useContext(AdminContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const auth = useMemo(
    () => ({ withCredentials: true, headers: { aToken } }),
    [aToken]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${backendUrl}/api/orders/${encodeURIComponent(id)}`,
          auth
        );
        if (cancelled) return;
        if (data?.success && (data.data || data.order)) {
          setOrder(data.data || data.order);
        } else {
          toast.error(data?.message || "Commande introuvable.");
          navigate("/orders");
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Erreur serveur lors du chargement de la commande.";
        toast.error(msg);
        navigate("/orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, auth, id, navigate]);

  const waHref = useMemo(() => {
    if (!order) return null;
    const phone = (order.customer?.phone || "").replace(/\D/g, "");
    if (!phone) return null;
    const text = `Bonjour ${order.customer?.name || ""}, au sujet de votre commande ${order.orderNumber} (total ${formatXOF(
      order.total
    )}).`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }, [order]);

  const onSelectStatus = (next) => {
    if (!order || next === order.status) return;
    setPendingStatus(next);
    setConfirmOpen(true);
  };

  const confirmChange = async () => {
    if (!order?._id || !pendingStatus || pendingStatus === order.status) {
      setConfirmOpen(false);
      return;
    }
    try {
      setSaving(true);
      const { data } = await axios.patch(
        `${backendUrl}/api/orders/admin/${order._id}/status`,
        { status: pendingStatus },
        auth
      );
      if (data?.success) {
        const updated = data.data || {};
        setOrder((o) => ({
          ...o,
          status: updated.status ?? pendingStatus,
          updatedAt: updated.updatedAt ?? o.updatedAt,
        }));
        toast.success(`Statut mis à jour : ${statusConfig(pendingStatus).label}`);
        setConfirmOpen(false);
      } else {
        throw new Error(data?.message || "Échec de la mise à jour.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Échec de la mise à jour du statut."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ shared bits ----------------------------- */
  const cardClass = "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";
  const cardTitle =
    "mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500";

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="mb-6">
          <div className="h-4 w-44 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-7 w-56 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 lg:col-span-1" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header --------------------------- */}
        <div className="mb-6">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-primary"
          >
            <FiArrowLeft className="h-4 w-4" /> Retour aux commandes
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              {order.orderNumber}
            </h1>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ----------------------- LEFT (col-span-2) ------------------- */}
          <div className="space-y-6 lg:col-span-2">
            {/* Items table */}
            <div className={cardClass}>
              <h2 className={cardTitle}>Articles</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 pr-4">Produit</th>
                      <th className="w-24 py-2 px-4 text-center">Qté</th>
                      <th className="w-36 py-2 px-4 text-right">Prix unitaire</th>
                      <th className="w-36 py-2 pl-4 text-right">Total ligne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((it, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4 font-medium text-gray-800">
                          {it.productName}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {it.quantity}
                          {it.unit ? ` ${it.unit}` : ""}
                        </td>
                        <td className="whitespace-nowrap py-3 px-4 text-right text-gray-600">
                          {formatXOF(it.price)}
                        </td>
                        <td className="whitespace-nowrap py-3 pl-4 text-right font-medium text-gray-800">
                          {formatXOF(it.lineTotal)}
                        </td>
                      </tr>
                    ))}
                    {(!order.items || order.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          Aucun article.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals footer */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Sous-total</dt>
                    <dd className="font-medium text-gray-800">
                      {formatXOF(order.subtotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Livraison estimée</dt>
                    <dd className="font-medium text-gray-800">
                      {formatXOF(order.deliveryEstimate)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <dt className="text-base font-semibold text-gray-800">Total</dt>
                    <dd className="text-base font-semibold text-primary-700">
                      {formatXOF(order.total)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Status card */}
            <div className={cardClass}>
              <h2 className={cardTitle}>Statut de la commande</h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-xs text-gray-500">Statut actuel</p>
                  <StatusBadge status={order.status} />
                </div>
                <div className="sm:w-64">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Changer le statut
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => onSelectStatus(e.target.value)}
                    disabled={saving}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------- RIGHT (col-span-1) ------------------ */}
          <div className="space-y-6 lg:col-span-1">
            {/* Customer info */}
            <div className={cardClass}>
              <h2 className={cardTitle}>Client</h2>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <FiUser className="mt-0.5 shrink-0 text-gray-400" />
                  <span className="font-medium">{order.customer?.name || "—"}</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiPhone className="mt-0.5 shrink-0 text-gray-400" />
                  <span>{order.customer?.phone || "—"}</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiMail className="mt-0.5 shrink-0 text-gray-400" />
                  <span className="break-all">{order.customer?.email || "—"}</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiMapPin className="mt-0.5 shrink-0 text-gray-400" />
                  <span>{order.customer?.location || "—"}</span>
                </li>
                {order.customer?.note ? (
                  <li className="flex items-start gap-3">
                    <FiFileText className="mt-0.5 shrink-0 text-gray-400" />
                    <span className="text-gray-600">{order.customer.note}</span>
                  </li>
                ) : null}
              </ul>
            </div>

            {/* WhatsApp */}
            <div className={cardClass}>
              <h2 className={cardTitle}>WhatsApp</h2>
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
                >
                  <FaWhatsapp className="text-lg" /> Contacter sur WhatsApp
                </a>
              ) : (
                <p className="text-sm text-gray-400">
                  Aucun numéro de téléphone disponible.
                </p>
              )}
            </div>

            {/* Timestamps */}
            <div className={cardClass}>
              <h2 className={cardTitle}>Historique</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-3">
                  <FiClock className="shrink-0 text-gray-400" />
                  <span>
                    Créée le{" "}
                    <span className="font-medium text-gray-800">
                      {formatDate(order.createdAt)}
                    </span>
                  </span>
                </li>
                {order.updatedAt ? (
                  <li className="flex items-center gap-3">
                    <FiClock className="shrink-0 text-gray-400" />
                    <span>
                      Mise à jour{" "}
                      <span className="font-medium text-gray-800">
                        {formatDate(order.updatedAt)}
                      </span>
                    </span>
                  </li>
                ) : null}
                {order.whatsappSentAt ? (
                  <li className="flex items-center gap-3">
                    <FaWhatsapp className="shrink-0 text-gray-400" />
                    <span>
                      WhatsApp{" "}
                      <span className="font-medium text-gray-800">
                        {formatDate(order.whatsappSentAt)}
                      </span>
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Status change confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !saving && setConfirmOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Changer le statut
                </h3>
                <button
                  onClick={() => !saving && setConfirmOpen(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                  title="Fermer"
                >
                  <FiX />
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  Confirmer le changement de statut de la commande{" "}
                  <span className="font-medium text-gray-800">
                    {order.orderNumber}
                  </span>{" "}
                  :
                </p>
                <p className="flex items-center justify-center gap-3">
                  <StatusBadge status={order.status} />
                  <span className="text-gray-400">→</span>
                  <StatusBadge status={pendingStatus} />
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => !saving && setConfirmOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmChange}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Mise à jour…" : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
