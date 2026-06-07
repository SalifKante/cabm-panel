// src/pages/Admin/Dashboard.jsx
import React, { useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import {
  FiRefreshCw,
  FiList,
  FiPackage,
  FiTool,
  FiShoppingCart,
  FiDollarSign,
  FiClock,
  FiTruck,
  FiFileText,
  FiPlusCircle,
  FiArrowRight,
} from "react-icons/fi";
import { formatXOF, formatDate, StatusBadge } from "./OrderList";

/* ------------------------------- Stat card ------------------------------- */
const StatCard = ({ label, value, Icon, iconBg, iconColor }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
    <div className="flex items-center gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

/* ----------------------------- Quick action ------------------------------ */
const QuickAction = ({ to, label, Icon, cardBg, cardBorder, iconColor }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 rounded-xl border ${cardBorder} ${cardBg} p-4 transition hover:shadow-md`}
  >
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 ${iconColor}`}
    >
      <Icon className="h-5 w-5" />
    </div>
    <span className="text-sm font-semibold text-gray-800">{label}</span>
    <FiArrowRight className="ml-auto h-4 w-4 text-gray-400" />
  </Link>
);

const Dashboard = () => {
  const { backendUrl, aToken } = useContext(AdminContext);

  const [activitiesCount, setActivitiesCount] = useState(null);
  const [productsCount, setProductsCount] = useState(null);
  const [servicesCount, setServicesCount] = useState(null);

  // Order stats (Phase 7)
  const [orderStats, setOrderStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  // Recent orders (for the mini table)
  const [recentOrders, setRecentOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchData = useCallback(async () => {
    if (!backendUrl || !aToken) return;
    setLoading(true);
    setErr("");
    setStatsError(false);

    const headers = { headers: { aToken } };
    // Order routes are protected by the auth cookie.
    const credHeaders = { withCredentials: true, headers: { aToken } };

    const [actRes, prodRes, servRes, statsRes, ordersRes] =
      await Promise.allSettled([
        axios.get(`${backendUrl}/api/admin/activities-count`, headers),
        axios.get(`${backendUrl}/api/admin/products-count`, headers),
        axios.get(`${backendUrl}/api/admin/services-count`, headers),
        axios.get(`${backendUrl}/api/orders/admin/stats`, credHeaders),
        axios.get(`${backendUrl}/api/orders/admin?limit=5`, credHeaders),
      ]);

    // ---- counts ----
    setActivitiesCount(
      actRes.status === "fulfilled" ? actRes.value?.data?.count ?? 0 : 0
    );
    setProductsCount(
      prodRes.status === "fulfilled" ? prodRes.value?.data?.count ?? 0 : 0
    );
    setServicesCount(
      servRes.status === "fulfilled" ? servRes.value?.data?.count ?? 0 : 0
    );

    if (
      actRes.status === "rejected" &&
      prodRes.status === "rejected" &&
      servRes.status === "rejected"
    ) {
      setErr("Impossible de charger les statistiques. Réessayez.");
    }

    // ---- order stats (defensive about response shape) ----
    if (statsRes.status === "fulfilled") {
      const s = statsRes.value?.data?.data || statsRes.value?.data || {};
      const byStatus = s.byStatus || {};
      setOrderStats({
        totalOrders: s.totalOrders ?? 0,
        totalRevenue: s.totalRevenue ?? s.revenue ?? 0,
        pending: byStatus.pending ?? 0,
        delivered: byStatus.delivered ?? 0,
      });
    } else {
      setOrderStats(null);
      setStatsError(true);
    }

    // ---- recent orders (defensive about response shape) ----
    if (ordersRes.status === "fulfilled") {
      const d = ordersRes.value?.data || {};
      const items = d.data || d.orders || [];
      setRecentOrders(Array.isArray(items) ? items.slice(0, 5) : []);
    } else {
      setRecentOrders([]);
    }

    setLoading(false);
  }, [backendUrl, aToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!aToken) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-3 text-gray-600">
          Veuillez vous connecter pour voir les statistiques.
        </p>
      </div>
    );
  }

  const orderValue = (v) => (loading || !orderStats ? "—" : v);

  return (
    <div className="flex flex-col gap-6 p-6 pt-8">
      {/* ---------------- Welcome banner ---------------- */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-600 p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bonjour, Administrateur 👋
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Voici un résumé de votre activité.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* ---------------- Order stats ---------------- */}
      {statsError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Les statistiques des commandes sont indisponibles (session requise).
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total commandes"
          value={orderValue(orderStats?.totalOrders)}
          Icon={FiShoppingCart}
          iconBg="bg-primary-100"
          iconColor="text-primary-700"
        />
        <StatCard
          label="Revenu total"
          value={orderValue(formatXOF(orderStats?.totalRevenue))}
          Icon={FiDollarSign}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-700"
        />
        <StatCard
          label="Commandes en attente"
          value={orderValue(orderStats?.pending)}
          Icon={FiClock}
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
        />
        <StatCard
          label="Commandes livrées"
          value={orderValue(orderStats?.delivered)}
          Icon={FiTruck}
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
        />
      </div>

      {/* ---------------- Catalogue ---------------- */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Activités (total)"
          value={loading ? "—" : activitiesCount}
          Icon={FiList}
          iconBg="bg-violet-100"
          iconColor="text-violet-700"
        />
        <StatCard
          label="Produits (total)"
          value={loading ? "—" : productsCount}
          Icon={FiPackage}
          iconBg="bg-primary-100"
          iconColor="text-primary-700"
        />
        <StatCard
          label="Services (total)"
          value={loading ? "—" : servicesCount}
          Icon={FiTool}
          iconBg="bg-amber-100"
          iconColor="text-amber-700"
        />
      </div>

      {/* ---------------- Recent orders ---------------- */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">
            Commandes récentes
          </h2>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Voir tout <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            Chargement…
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            Aucune commande pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-3 font-medium">N° commande</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr
                    key={o._id || o.orderNumber}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-gray-800">
                      {o.orderNumber || "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {o.customer?.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-gray-800">
                      {formatXOF(o.total)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                      {formatDate(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- Quick actions ---------------- */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAction
          to="/products/add"
          label="Ajouter un produit"
          Icon={FiPlusCircle}
          cardBg="bg-primary-50"
          cardBorder="border-primary-100"
          iconColor="text-primary-700"
        />
        <QuickAction
          to="/blog/new"
          label="Nouvel article"
          Icon={FiFileText}
          cardBg="bg-blue-50"
          cardBorder="border-blue-100"
          iconColor="text-blue-700"
        />
        <QuickAction
          to="/orders"
          label="Voir les commandes"
          Icon={FiShoppingCart}
          cardBg="bg-amber-50"
          cardBorder="border-amber-100"
          iconColor="text-amber-700"
        />
      </div>
    </div>
  );
};

export default Dashboard;
