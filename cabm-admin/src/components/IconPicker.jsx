import React from "react";
import * as Lucide from "lucide-react";

const ALL = Object.keys(Lucide).filter(k => /^[A-Z]/.test(k));

export default function IconPicker({ value, onChange, allow = ALL }) {
  const [q, setQ] = React.useState("");
  const list = allow
    .filter(k => k.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 400);

  const Preview = Lucide[value] || Lucide.ClipboardList;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          placeholder="Rechercher une icône…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full rounded-xl border px-3 py-2"
        />
        <div className="inline-flex items-center gap-2 rounded-xl border px-3 py-2">
          <Preview className="h-5 w-5" />
          <span className="text-sm">{value || "ClipboardList"}</span>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-auto border rounded-xl p-2">
        {list.map(name => {
          const I = Lucide[name];
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`grid place-items-center rounded-lg border px-2 py-3 hover:bg-gray-50 ${
                value === name ? "ring-2 ring-primary/60" : ""
              }`}
              title={name}
            >
              <I className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
