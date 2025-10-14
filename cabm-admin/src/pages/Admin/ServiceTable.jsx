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

// Small reusable confirm dialog
function ConfirmDialog({ open, title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onCancel} className="rounded-lg border px-2.5 py-1 hover:bg-gray-50">
            <Lucide.X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
        <div className="flex items-center justify-end gap-2 px-5 pb-4">
          <button onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
            <Lucide.X className="h-4 w-4" />
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-25 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            <Lucide.Trash2 className="h-4 w-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const ServiceTable = () => {
  const { aToken, backendUrl } = React.useContext(AdminContext);

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // null = closed, {} = create, {..} = edit
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({});

  // deletion confirm
  const [confirmRow, setConfirmRow] = React.useState(null);

  const auth = React.useMemo(() => ({ headers: { aToken } }), [aToken]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/all-services`, auth);
      setRows(data?.items || data?.services || []);
    } catch (e) {
      toast.error("Échec du chargement des services.");
    } finally {
      setLoading(false);
    }
  }, [backendUrl, auth]);

  React.useEffect(() => {
    load();
  }, [load]);

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

  // ✅ Only show toast on explicit cancel/close
  const closeModal = (opts = { toast: false }) => {
    setEditing(null);
    setForm({});
    if (opts.toast) toast.info("Modification annulée.");
  };

  const save = async () => {
    try {
      if (editing?._id) {
        await axios.patch(`${backendUrl}/api/admin/service/${editing._id}`, form, auth);
        toast.success("Service mis à jour avec succès.");
      } else {
        await axios.post(`${backendUrl}/api/admin/create-service`, form, auth);
        toast.success("Service créé avec succès.");
      }
      closeModal({ toast: false }); // <-- silent close after save
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Échec de l’enregistrement.");
    }
  };

  const askDelete = (row) => setConfirmRow(row);

  const confirmDelete = async () => {
    if (!confirmRow) return;
    try {
      await axios.delete(`${backendUrl}/api/admin/service/${confirmRow._id}`, auth);
      toast.success("Service supprimé.");
      setConfirmRow(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Suppression échouée.");
    }
  };

  const cancelDelete = () => {
    setConfirmRow(null);
    toast.info("Suppression annulée.");
  };

  const toggleActive = async (row) => {
    try {
      await axios.patch(
        `${backendUrl}/api/admin/service/${row._id}/status`,
        { isActive: !row.isActive },
        auth
      );
      toast.success(row.isActive ? "Service masqué." : "Service affiché.");
      load();
    } catch (e) {
      toast.error("Impossible de changer le statut.");
    }
  };

  // ---- button styles (premium) ----
  const btnBase =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors cursor-pointer";
  const btnGhost = "border-slate-200 hover:bg-slate-50 text-slate-700";
  const btnPrimary = "border-primary/20 bg-primary text-white hover:opacity-95";
  const btnWarn = "border-amber-200 text-amber-700 hover:bg-amber-50 bg-amber-25";
  const btnDanger = "border-red-200 text-red-600 hover:bg-red-50 bg-red-25";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services</h1>
        <button
          onClick={openCreate}
          className={`${btnBase} ${btnPrimary}`}
          aria-label="Créer un nouveau service"
        >
          <Lucide.Plus className="h-4 w-4" />
          Nouveau
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Icône</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Titre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ordre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td className="p-6 text-sm text-gray-600" colSpan={7}>
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-6 text-sm text-gray-600" colSpan={7}>
                  Aucun service
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3"><IconCell name={r.icon} /></td>
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-gray-600">{r.desc}</td>
                  <td className="px-4 py-3">{r.order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs border ${
                        r.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          r.isActive ? "bg-emerald-600" : "bg-gray-500"
                        }`}
                      />
                      {r.isActive ? "Visible" : "Masqué"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(r)}
                        className={`${btnBase} ${btnWarn}`}
                        title={r.isActive ? "Masquer" : "Afficher"}
                      >
                        {r.isActive ? (
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

                      <button
                        onClick={() => openEdit(r)}
                        className={`${btnBase} ${btnGhost}`}
                        title="Éditer"
                      >
                        <Lucide.Pencil className="h-4 w-4" />
                        Éditer
                      </button>

                      <button
                        onClick={() => setConfirmRow(r)}
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

      {/* Confirm deletion popup */}
      <ConfirmDialog
        open={!!confirmRow}
        title="Supprimer le service"
        message={
          <>
            Êtes-vous sûr de vouloir supprimer&nbsp;
            <span className="font-medium">« {confirmRow?.title} »</span> ?
            Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default ServiceTable;
