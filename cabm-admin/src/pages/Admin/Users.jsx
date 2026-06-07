import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import {
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiShield,
  FiUser,
  FiUsers,
  FiCheck,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";

/* -------------------------------- helpers -------------------------------- */
const PAGE_SIZE = 12;

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

// Default avatar shown when a user has no profile picture (or it fails to load).
const DefaultAvatar = ({ className = "h-10 w-10" }) => (
  <div
    className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400`}
  >
    <FiUser className="h-1/2 w-1/2" />
  </div>
);

const RoleBadge = ({ role }) =>
  role === "admin" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-medium text-primary-700">
      <FiShield className="h-3 w-3" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
      <FiUser className="h-3 w-3" /> Utilisateur
    </span>
  );

const VerifiedBadge = ({ ok }) =>
  ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
      <FiCheck className="h-3 w-3" /> Vérifié
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
      <FiAlertTriangle className="h-3 w-3" /> Non vérifié
    </span>
  );

const Avatar = ({ user, className = "h-10 w-10" }) => {
  const [errored, setErrored] = useState(false);
  const showPhoto = user?.avatar && !errored;

  return showPhoto ? (
    <img
      src={user.avatar}
      alt={user.name || "avatar"}
      onError={() => setErrored(true)}
      className={`${className} shrink-0 rounded-full bg-gray-100 object-cover`}
    />
  ) : (
    <DefaultAvatar className={className} />
  );
};

const StatCard = ({ label, value, Icon, iconBg, iconColor }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

/* --------------------------------- page ---------------------------------- */
const Users = () => {
  const { backendUrl, aToken } = useContext(AdminContext);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [role, setRole] = useState(""); // "" | user | admin
  const [verified, setVerified] = useState(""); // "" | true | false
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [busyId, setBusyId] = useState(null);

  // Delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(null);

  const headers = useMemo(() => ({ headers: { aToken } }), [aToken]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, role, verified]);

  // Load stats (independent of filters)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/admin/users/stats`, headers);
        if (!cancelled && data?.success) setStats(data.data);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, headers, refreshKey]);

  // Load users
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
        if (role) params.set("role", role);
        if (verified) params.set("verified", verified);

        const { data } = await axios.get(
          `${backendUrl}/api/admin/users?${params.toString()}`,
          headers
        );
        if (cancelled) return;
        if (data?.success) {
          setUsers(Array.isArray(data.data) ? data.data : []);
          setPagination(data.pagination || { page, totalPages: 1, total: 0 });
        } else {
          toast.error(data?.message || "Impossible de charger les utilisateurs.");
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            "Erreur serveur pendant le chargement des utilisateurs."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [backendUrl, headers, page, debouncedQ, role, verified, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  /* ------------------------------- actions ------------------------------- */
  const onToggleRole = async (u) => {
    const nextRole = u.role === "admin" ? "user" : "admin";
    setBusyId(u._id);
    setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, role: nextRole } : x)));
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/users/${u._id}/role`,
        { role: nextRole },
        headers
      );
      if (!data?.success) throw new Error(data?.message);
      toast.success(data.message || "Rôle mis à jour.");
      refresh();
    } catch (err) {
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, role: u.role } : x)));
      toast.error(err?.response?.data?.message || err?.message || "Échec de la mise à jour.");
    } finally {
      setBusyId(null);
    }
  };

  const onToggleVerify = async (u) => {
    const next = !u.isVerified;
    setBusyId(u._id);
    setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isVerified: next } : x)));
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/users/${u._id}/verify`,
        { isVerified: next },
        headers
      );
      if (!data?.success) throw new Error(data?.message);
      toast.success(data.message || "Statut mis à jour.");
      refresh();
    } catch (err) {
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isVerified: u.isVerified } : x)));
      toast.error(err?.response?.data?.message || err?.message || "Échec de la mise à jour.");
    } finally {
      setBusyId(null);
    }
  };

  const requestDelete = (u) => {
    setTarget(u);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target?._id) return;
    try {
      setPending(true);
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/users/${target._id}`,
        headers
      );
      if (data?.success) {
        toast.success("Utilisateur supprimé.");
        setUsers((list) => list.filter((x) => x._id !== target._id));
        setConfirmOpen(false);
        setTarget(null);
        refresh();
      } else {
        toast.error(data?.message || "Échec de la suppression.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Erreur serveur pendant la suppression."
      );
    } finally {
      setPending(false);
    }
  };

  const total = pagination.total ?? users.length;
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = pagination.page || page;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  /* ------------------------------ row actions ----------------------------- */
  const RowActions = ({ u }) => {
    const locked = u.isPrimaryAdmin; // primary admin: protected
    const busy = busyId === u._id;
    return (
      <div className="flex items-center justify-end gap-1">
        {/* Role toggle */}
        <button
          onClick={() => onToggleRole(u)}
          disabled={locked || busy}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          title={
            locked
              ? "Administrateur principal protégé"
              : u.role === "admin"
              ? "Rétrograder en utilisateur"
              : "Promouvoir administrateur"
          }
        >
          {busy ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiShield className="h-4 w-4" />}
        </button>

        {/* Verify toggle */}
        <button
          onClick={() => onToggleVerify(u)}
          disabled={locked || busy}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          title={u.isVerified ? "Annuler la vérification" : "Marquer comme vérifié"}
        >
          {u.isVerified ? <FiX className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
        </button>

        {/* Delete */}
        <button
          onClick={() => requestDelete(u)}
          disabled={locked}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          title={locked ? "Administrateur principal protégé" : "Supprimer"}
        >
          <FiTrash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <FiUsers className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-800">Aucun utilisateur</h3>
      <p className="mt-1 text-sm text-gray-500">
        Aucun utilisateur ne correspond aux filtres actuels.
      </p>
    </div>
  );

  const TableSkeleton = () =>
    Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-t border-gray-100">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </td>
        <td className="px-4 py-3"><div className="h-3.5 w-40 animate-pulse rounded bg-gray-100" /></td>
        <td className="px-4 py-3"><div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" /></td>
        <td className="px-4 py-3"><div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" /></td>
        <td className="px-4 py-3"><div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" /></td>
        <td className="px-4 py-3"><div className="h-3.5 w-20 animate-pulse rounded bg-gray-100" /></td>
        <td className="px-4 py-3"><div className="ml-auto h-8 w-24 animate-pulse rounded bg-gray-100" /></td>
      </tr>
    ));

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header ----------------------------- */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Utilisateurs</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              {total} compte{total > 1 ? "s" : ""}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={stats ? stats.total : "—"} Icon={FiUsers} iconBg="bg-primary-100" iconColor="text-primary-700" />
            <StatCard label="Administrateurs" value={stats ? stats.admins : "—"} Icon={FiShield} iconBg="bg-violet-100" iconColor="text-violet-700" />
            <StatCard label="Vérifiés" value={stats ? stats.verified : "—"} Icon={FiCheckCircle} iconBg="bg-emerald-100" iconColor="text-emerald-700" />
            <StatCard label="Non vérifiés" value={stats ? stats.unverified : "—"} Icon={FiAlertTriangle} iconBg="bg-amber-100" iconColor="text-amber-700" />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, email ou téléphone…"
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-64"
            />
          </div>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">Tous les rôles</option>
            <option value="user">Utilisateurs</option>
            <option value="admin">Administrateurs</option>
          </select>

          <select
            value={verified}
            onChange={(e) => setVerified(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Vérifiés</option>
            <option value="false">Non vérifiés</option>
          </select>

          <button
            onClick={refresh}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50"
            disabled={loading}
            title="Rafraîchir"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm" />
            ))
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <EmptyState />
            </div>
          ) : (
            users.map((u) => (
              <div key={u._id} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar user={u} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">{u.name}</p>
                    <p className="truncate text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={u.role} />
                  <VerifiedBadge ok={u.isVerified} />
                  <span className="text-xs text-gray-400">Inscrit le {formatDate(u.createdAt)}</span>
                </div>
                <div className="border-t border-gray-100 pt-1">
                  <RowActions u={u} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table */}
        <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 w-36">Téléphone</th>
                  <th className="px-4 py-3 w-32">Rôle</th>
                  <th className="px-4 py-3 w-32">Statut</th>
                  <th className="px-4 py-3 w-32">Inscrit le</th>
                  <th className="px-4 py-3 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : users.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState /></td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="border-t border-gray-100 transition hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} className="h-9 w-9" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-gray-800">{u.name}</div>
                            {u.isPrimaryAdmin && (
                              <div className="text-[11px] font-medium text-primary-700">Admin principal</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3"><VerifiedBadge ok={u.isVerified} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3"><RowActions u={u} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gray-500">
              Affichage {rangeStart}-{rangeEnd} sur {total} compte{total > 1 ? "s" : ""}
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
                const show = n === 1 || n === totalPages || (n >= currentPage - 1 && n <= currentPage + 1);
                if (!show) {
                  if (n === currentPage - 2 || n === currentPage + 2) {
                    return <span key={n} className="px-2 text-sm text-gray-400 select-none">…</span>;
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
                <h3 className="mt-4 text-lg font-semibold text-gray-800">Supprimer l'utilisateur</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-medium text-gray-700">{target?.name || "ce compte"}</span> ?
                  Ses commentaires seront aussi supprimés. Cette action est irréversible.
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
                  {pending ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiTrash2 className="h-4 w-4" />}
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

export default Users;
