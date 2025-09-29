import React, { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { NavLink } from "react-router-dom";
// Icons (React Icons)
import { FiHome, FiPlusCircle, FiList } from "react-icons/fi";

const Sidebar = () => {
  const { aToken } = useContext(AdminContext);
  if (!aToken) return null;

  // Base styles
  const baseLink =
    "group flex flex-col items-center gap-1 rounded-xl px-3 py-4 transition-all duration-200 outline-none ring-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3c388d]/50";
  const activeLink =
    "bg-primary text-white shadow-sm ring-1 ring-primary/20";
  const inactiveLink =
    "text-slate-700 hover:text-primary hover:bg-slate-50";

  const iconBase = "text-2xl transition-transform duration-200 group-hover:-translate-y-0.5";
  const labelBase = "text-sm font-medium";

  const links = [
    { to: "/dashboard", label: "Dashboard", Icon: FiHome, end: true },
    { to: "/add-activity", label: "Ajouter une Activité", Icon: FiPlusCircle },
    { to: "/activities", label: "Liste des Activités", Icon: FiList },
  ];

  return (
    <aside className="pt-4 md:pt-6">
      <nav aria-label="Sidebar">
        <ul className="space-y-2 px-2">
          {links.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `${baseLink} ${isActive ? activeLink : inactiveLink}`
                }
                aria-label={label}
              >
                <Icon className={iconBase} />
                <p className={labelBase}>{label}</p>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
