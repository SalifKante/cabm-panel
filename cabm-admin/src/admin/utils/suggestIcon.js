export function suggestIcon(title = "", desc = "") {
  const t = `${title} ${desc}`.toLowerCase();
  const rules = [
    { keys: ["irrig", "goutte", "eau", "arros"], icon: "Droplets" },
    { keys: ["visite", "conseil", "appui", "diagnostic", "rdv"], icon: "MessageSquare" },
    { keys: ["plan", "business", "financ", "banq", "budget"], icon: "BarChart3" },
    { keys: ["formation", "former", "atelier", "capacitation"], icon: "GraduationCap" },
    { keys: ["étude", "etude", "rapport", "audit"], icon: "ClipboardList" },
    { keys: ["maintenance", "réparation", "outil"], icon: "Wrench" },
    { keys: ["sécurité", "protection"], icon: "Shield" },
    { keys: ["agri", "champ", "culture"], icon: "Sprout" },
    { keys: ["machine", "tract"], icon: "Tractor" },
  ];
  for (const r of rules) if (r.keys.some(k => t.includes(k))) return r.icon;
  return "ClipboardList";
}
