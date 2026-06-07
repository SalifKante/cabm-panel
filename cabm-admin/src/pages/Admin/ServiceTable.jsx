// src/pages/Admin/ServiceTable.jsx
import React from "react";
import axios from "axios";
import * as Lucide from "lucide-react";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import ServiceForm from "../../components/ServiceForm";

const IconCell = ({ name, className = "h-5 w-5" }) => {
  const I = Lucide[name] || Lucide.ClipboardList;
  return <I className={className} />;
};

const ServiceTable = () => {
  const { aToken, backendUrl } = React.useContext(AdminContext);

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // search & UI
  const [q, setQ] = React.useState("");

  // null = closed, {} = create, {..} = edit
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({});

  // delete popup
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmPending, setConfirmPending] = React.useState(false);
  const [target, setTarget] = React.useState(null); // row being deleted

  // toggle pending (disable button for that row)
  const [togglingId, setTogglingId] = React.useState(null);

  const auth = React.useMemo(() => ({ headers: { aToken } }), [aToken]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/admin/all-services`,
        auth
      );
      setRows(data?.items || data?.services || []);
    } catch (e) {
      toast.error("Échec du chargement des services.");
    } finally {
      setLoading(false);
    }
  }, [backendUrl, auth]);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  // --------- CRUD Helpers ----------
  const openCreate = () => {
    setForm({});
    setEditing({});
    toast.info("Formulaire de création ouvert.");
  };

  const openEdit = (row) => {
    setForm(row);
    setEditing(row);
    toast.info(`Édition : « ${row.title} »`);
  };

  // Only show toast on explicit cancel/close
  const closeModal = (opts = { toast: false }) => {
    setEditing(null);
    setForm({});
    if (opts.toast) toast.info("Modification annulée.");
  };

  const save = async () => {
    try {
      if (editing?._id) {
        await axios.patch(
          `${backendUrl}/api/admin/service/${editing._id}`,
          form,
          auth
        );
        toast.success("Service mis à jour avec succès.");
      } else {
        await axios.post(
          `${backendUrl}/api/admin/create-service`,
          form,
          auth
        );
        toast.success("Service créé avec succès.");
      }
      closeModal({ toast: false });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Échec de l’enregistrement.");
    }
  };

  // delete flow (popup like ProductList)
  const requestDelete = (row) => {
    setTarget(row);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target?._id) return;
    try {
      setConfirmPending(true);
      await axios.delete(
        `${backendUrl}/api/admin/service/${target._id}`,
        auth
      );
      toast.success("Service supprimé avec succès.");
      setRows((prev) => prev.filter((r) => r._id !== target._id));
      setConfirmOpen(false);
      setTarget(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Suppression échouée.");
    } finally {
      setConfirmPending(false);
    }
  };

  const onCancelDelete = () => {
    if (confirmPending) return;
    setConfirmOpen(false);
    setTarget(null);
    toast.info("Suppression annulée.");
  };

  // optimistic toggle (like ProductList)
  const toggleActive = async (row) => {
    if (!row?._id) return;
    const next = !row.isActive;
    setTogglingId(row._id);

    // optimistic UI
    setRows((prev) =>
      prev.map((r) => (r._id === row._id ? { ...r, isActive: next } : r))
    );

    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/service/${row._id}/status`,
        { isActive: next },
        auth
      );
      const serverIsActive =
        data?.data?.isActive ?? data?.updated?.isActive ?? next;
      setRows((prev) =>
        prev.map((r) =>
          r._id === row._id ? { ...r, isActive: serverIsActive } : r
        )
      );
      toast.success(serverIsActive ? "Service affiché." : "Service masqué.");
    } catch (e) {
      // revert on error
      setRows((prev) =>
        prev.map((r) =>
          r._id === row._id ? { ...r, isActive: !next } : r
        )
      );
      toast.error("Impossible de changer le statut.");
    } finally {
      setTogglingId(null);
    }
  };

  // filter
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r?.title?.toLowerCase().includes(s) ||
        r?.desc?.toLowerCase().includes(s)
    );
  }, [rows, q]);

  const count = filtered.length;

  /* ------------------------------ shared bits ----------------------------- */
  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15";

  /* ------------------------------ empty state ----------------------------- */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Lucide.Wrench className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-800">
        Aucun service
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Ajoutez votre premier service pour commencer.
      </p>
      <button
        onClick={openCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
      >
        <Lucide.Plus className="h-4 w-4" />
        Ajouter un service
      </button>
    </div>
  );

  /* ------------------------------- skeletons ------------------------------ */
  const TableSkeleton = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="border-t border-gray-100">
        <td className="px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-56 animate-pulse rounded bg-gray-100" />
        </td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-8 animate-pulse rounded bg-gray-100" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
        </td>
        <td className="px-4 py-3">
          <div className="ml-auto h-8 w-28 animate-pulse rounded bg-gray-100" />
        </td>
      </tr>
    ));

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="w-full">
        {/* ------------------------------ header ----------------------------- */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Services</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              {count} service{count > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Lucide.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="w-64 max-w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50"
              disabled={loading}
              title="Rafraîchir"
            >
              <Lucide.RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
            >
              <Lucide.Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter un service</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          </div>
        </div>

        {/* ------------------------------ table ------------------------------ */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 w-16">Icône</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 w-20">Ordre</th>
                  <th className="px-4 py-3 w-28">Statut</th>
                  <th className="px-4 py-3 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : count === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState />
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r._id}
                      className="border-t border-gray-100 transition hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                          <IconCell name={r.icon} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {r.title}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="line-clamp-1 max-w-md">{r.desc}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.order}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            r.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              r.isActive ? "bg-emerald-600" : "bg-gray-400"
                            }`}
                          />
                          {r.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-primary-50 hover:text-primary-700"
                            title="Éditer"
                          >
                            <Lucide.Pencil className="h-4 w-4" />
                          </button>

                          {/* Toggle status (optimistic) */}
                          <button
                            onClick={() => toggleActive(r)}
                            disabled={togglingId === r._id}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-60"
                            title={r.isActive ? "Masquer" : "Afficher"}
                          >
                            {togglingId === r._id ? (
                              <Lucide.RefreshCw className="h-4 w-4 animate-spin" />
                            ) : r.isActive ? (
                              <Lucide.Eye className="h-4 w-4" />
                            ) : (
                              <Lucide.EyeOff className="h-4 w-4" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => requestDelete(r)}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                            title="Supprimer"
                          >
                            <Lucide.Trash2 className="h-4 w-4" />
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
      </div>

      {/* ===================== Modal create/edit ===================== */}
      {editing !== null && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => closeModal({ toast: true })}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editing?._id ? "Modifier le service" : "Nouveau service"}
                </h2>
                <button
                  onClick={() => closeModal({ toast: true })}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100"
                  aria-label="Fermer"
                >
                  <Lucide.X className="h-5 w-5" />
                </button>
              </div>

              <ServiceForm value={form} onChange={setForm} inputClass={inputClass} />

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => closeModal({ toast: true })}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={save}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
                >
                  <Lucide.Save className="h-4 w-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Delete confirmation ===================== */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancelDelete}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Lucide.AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-800">
                  Supprimer le service
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer{" "}
                  <span className="font-medium text-gray-700">
                    {target?.title || "ce service"}
                  </span>{" "}
                  ? Cette action est irréversible.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={onCancelDelete}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  disabled={confirmPending}
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                  disabled={confirmPending}
                >
                  {confirmPending ? (
                    <Lucide.RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lucide.Trash2 className="h-4 w-4" />
                  )}
                  {confirmPending ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceTable;
