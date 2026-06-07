import React from "react";
import IconPicker from "./IconPicker.jsx";
import { suggestIcon } from "../admin/utils/suggestIcon.js";

const DEFAULT_INPUT =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15";

const ServiceForm = ({ value = {}, onChange, inputClass = DEFAULT_INPUT }) => {
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

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Titre</label>
        <input
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={v.desc}
          onChange={(e) => set("desc", e.target.value)}
          className={`${inputClass} resize-y`}
          rows={3}
        />
      </div>

      <div>
        <label className={labelClass}>Icône (Lucide)</label>
        <IconPicker value={v.icon} onChange={(name) => set("icon", name)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Ordre</label>
          <input
            type="number"
            value={v.order}
            onChange={(e) => set("order", Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <label className="flex items-end gap-2 pb-2.5">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-gray-700">Actif (visible)</span>
        </label>
      </div>
    </div>
  );
};

export default ServiceForm;
