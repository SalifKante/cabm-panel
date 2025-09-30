import React, { useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { AdminContext } from "../../context/AdminContext";
import { FiRefreshCw, FiList } from "react-icons/fi";

const StatCard = ({ label, value, Icon }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className="rounded-xl bg-gray-100 p-3">
        <Icon className="h-6 w-6 text-[#3c388d]" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchCount = useCallback(async () => {
    if (!backendUrl || !aToken) return;
    setLoading(true);
    setErr("");
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/activities-count`, {
        headers: {aToken },
      });
      setCount(data?.count ?? 0);
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to fetch count.");
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, aToken]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

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

  return (
    <div className="p-6 pt-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <button
          onClick={fetchCount}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:opacity-95"
        >
          <FiRefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Activités (total)"
          value={loading ? "—" : count}
          Icon={FiList}
        />
        {/* Ajoutez d’autres cartes ici (utilisateurs, messages, etc.) si besoin */}
      </div>
    </div>
  );
};

export default Dashboard;
