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

  // ---- button styles (premium) ----
  const btnBase =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors";
  const btnGhost = "border-slate-200 hover:bg-slate-50 text-slate-700";
  const btnPrimary = "border-primary/20 bg-primary text-white hover:opacity-95";
  const btnWarn = "border-amber-200 text-amber-700 hover:bg-amber-50 bg-amber-25";
  const btnDanger = "border-red-200 text-red-600 hover:bg-red-50 bg-red-25";

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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header: title + search + refresh */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Services</h1>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (titre ou description)…"
                className="w-72 max-w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3c388d]/20"
              />
            </div>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className={`${btnBase} ${btnGhost}`}
              disabled={loading}
              title="Rafraîchir"
            >
              <Lucide.RefreshCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
              <span className="hidden sm:inline">Rafraîchir</span>
            </button>

            <button
              onClick={openCreate}
              className={`${btnBase} ${btnPrimary}`}
              aria-label="Créer un nouveau service"
            >
              <Lucide.Plus className="h-4 w-4" />
              Nouveau
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3 w-16">Icône</th>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 w-20">Ordre</th>
                <th className="px-4 py-3 w-28">Statut</th>
                <th className="px-4 py-3 w-56 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-600">
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-600">
                    Aucun service
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <IconCell name={r.icon} />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.title}</td>
                    <td className="px-4 py-3 text-slate-600">{r.desc}</td>
                    <td className="px-4 py-3">{r.order}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] border ${
                          r.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.isActive ? "bg-emerald-600" : "bg-slate-500"
                          }`}
                        />
                        {r.isActive ? "Visible" : "Masqué"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle status (optimistic) */}
                        <button
                          onClick={() => toggleActive(r)}
                          className={`${btnBase} ${btnWarn}`}
                          disabled={togglingId === r._id}
                          title={r.isActive ? "Masquer" : "Afficher"}
                        >
                          {togglingId === r._id ? (
                            <>
                              <Lucide.RefreshCw className="h-4 w-4 animate-spin" />
                              …
                            </>
                          ) : r.isActive ? (
                            <>
                              <Lucide.EyeOff className="h-4 w-4" />
                              Masquer
                            </>
                          ) : (
                            <>
                              <Lucide.Eye className="h-4 w-4" />
                              Afficher
                            </>
                          )}
                        </button>

                        {/* Edit = open modal */}
                        <button
                          onClick={() => openEdit(r)}
                          className={`${btnBase} ${btnGhost}`}
                          title="Éditer"
                        >
                          <Lucide.Pencil className="h-4 w-4" />
                          Éditer
                        </button>

                        {/* Delete = popup */}
                        <button
                          onClick={() => requestDelete(r)}
                          className={`${btnBase} ${btnDanger}`}
                          title="Supprimer"
                        >
                          <Lucide.Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal create/edit */}
        {editing !== null && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editing?._id ? "Modifier le service" : "Nouveau service"}
                </h2>
                {/* explicit cancel -> show toast */}
                <button
                  onClick={() => closeModal({ toast: true })}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                  aria-label="Fermer"
                >
                  <Lucide.X className="h-4 w-4" />
                  Fermer
                </button>
              </div>

              <ServiceForm value={form} onChange={setForm} />

              <div className="mt-6 flex justify-end gap-2">
                {/* explicit cancel -> show toast */}
                <button
                  onClick={() => closeModal({ toast: true })}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  <Lucide.X className="h-4 w-4" />
                  Annuler
                </button>
                <button
                  onClick={save}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary px-3 py-1.5 text-sm text-white hover:opacity-95"
                >
                  <Lucide.Save className="h-4 w-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation (same visual language as ProductList) */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={onCancelDelete}
            />
            <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-4">
              <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-gray-200">
                <div className="flex items-center justify-between p-3 sm:p-4 border-b">
                  <div className="flex items-center gap-2 text-red-600">
                    <Lucide.AlertTriangle className="h-5 w-5" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Supprimer le service
                    </h3>
                  </div>
                  <button
                    onClick={onCancelDelete}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Fermer"
                    disabled={confirmPending}
                  >
                    <Lucide.X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-3 sm:p-4 space-y-1.5">
                  <p className="text-gray-700 text-sm">
                    Êtes-vous sûr de vouloir supprimer{" "}
                    <span className="font-medium">
                      {target?.title || "ce service"}
                    </span>{" "}
                    ?
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Cette action est irréversible.
                  </p>
                </div>

                <div className="p-3 sm:p-4 flex items-center justify-end gap-2 sm:gap-3 border-t">
                  <button
                    onClick={onCancelDelete}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
                    disabled={confirmPending}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={onConfirmDelete}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 text-sm"
                    disabled={confirmPending}
                  >
                    <Lucide.Trash2 className="h-4 w-4" />
                    {confirmPending ? "Suppression…" : "Supprimer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceTable;
