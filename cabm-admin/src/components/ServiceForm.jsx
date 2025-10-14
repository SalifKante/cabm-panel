import React from "react";
import IconPicker from "./IconPicker.jsx";
import { suggestIcon } from "../admin/utils/suggestIcon.js";

const ServiceForm = ({ value = {}, onChange }) => {
  const v = React.useMemo(
    () => ({
      title: "",
      desc: "",
      icon: "ClipboardList",
      order: 0,
      isActive: true,
      ...value,
    }),
    [value]
  );

  const set = React.useCallback(
    (k, val) => {
      if (typeof onChange === "function") onChange({ ...v, [k]: val });
    },
    [onChange, v]
  );

  // Auto-suggest icon when typing (only on create)
  React.useEffect(() => {
    if (!value?._id) {
      set("icon", suggestIcon(v.title, v.desc));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.title, v.desc]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-600">Titre</label>
        <input
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
        />
      </div>

      <div>
        <label className="text-sm text-gray-600">Description</label>
        <textarea
          value={v.desc}
          onChange={(e) => set("desc", e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          rows={2}
        />
      </div>

      <div>
        <label className="text-sm text-gray-600">Icône (Lucide)</label>
        <IconPicker value={v.icon} onChange={(name) => set("icon", name)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">Ordre</label>
          <input
            type="number"
            value={v.order}
            onChange={(e) => set("order", Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>
        <label className="flex items-end gap-2">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          <span className="text-sm text-gray-700">Actif (visible)</span>
        </label>
      </div>
    </div>
  );
};

export default ServiceForm;
