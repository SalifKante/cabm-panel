import React, { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiPlusCircle,
  FiList,
  FiPackage,
  FiX,
} from "react-icons/fi";

/**
 * Sidebar props:
 *  - isOpen: boolean (mobile off-canvas)
 *  - onClose: function
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { aToken } = useContext(AdminContext);
  if (!aToken) return null;

  // Base styles
  const baseLink =
    "group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 outline-none ring-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3c388d]/50";
  const activeLink = "bg-primary text-white shadow-sm ring-1 ring-primary/20";
  const inactiveLink = "text-slate-700 hover:text-primary hover:bg-slate-50";

  const iconBase =
    "text-xl shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5";
  const labelBase = "text-sm font-medium truncate";

  const sections = [
    {
      title: "Général",
      items: [
        { to: "/dashboard", label: "Dashboard", Icon: FiHome, end: true },
        { to: "/add-activity", label: "Ajouter une Activité", Icon: FiPlusCircle },
        { to: "/activities", label: "Liste des Activités", Icon: FiList },
      ],
    },
    {
      title: "Produits",
      items: [
        // keep partial match for /products/add
        { to: "/products/add", label: "Ajouter un Produit", Icon: FiPlusCircle },
        // IMPORTANT: exact match so it doesn't highlight when on /products/add
        { to: "/products", label: "Liste des Produits", Icon: FiPackage, end: true },
      ],
    },
    {
      title: "Services",
      items: [
        // We manage create/edit in the table modal, so one entry is enough
        { to: "/services", label: "Liste des Services", Icon: FiList, end: true },
        // If you later add a dedicated create route, uncomment below:
        // { to: "/services/new", label: "Ajouter un Service", Icon: FiPlusCircle },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      {/* Sidebar panel */}
      <aside
        className={[
          // base
          "z-50 w-72 bg-white border-r shadow-sm",
          // desktop: sticky under navbar (navbar is h-16)
          "md:sticky md:top-16 md:h-[calc(100vh-4rem)]",
          // mobile: off-canvas anchored under navbar
          "fixed md:relative top-16 left-0 h-[calc(100vh-4rem)] md:translate-x-0 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        role="navigation"
        aria-label="Barre latérale"
      >
        {/* Mobile close */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold text-slate-700">Menu</span>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
            aria-label="Fermer le menu"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="px-3 py-4 md:py-6 overflow-y-auto h-full">
          {sections.map((sec) => (
            <div key={sec.title} className="mb-6">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {sec.title}
              </p>
              <ul className="space-y-2">
                {sec.items.map(({ to, label, Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={!!end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `${baseLink} ${isActive ? activeLink : inactiveLink}`
                      }
                      aria-label={label}
                    >
                      <Icon className={iconBase} />
                      <span className={labelBase}>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
