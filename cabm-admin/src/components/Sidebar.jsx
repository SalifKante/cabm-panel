import React, { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiPlusCircle,
  FiList,
  FiPackage,
  FiShoppingCart,
  FiFileText,
  FiMessageSquare,
  FiTool,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";

/**
 * Sidebar props:
 *  - isOpen: boolean     → mobile off-canvas open state
 *  - onClose: function   → close mobile off-canvas
 *  - collapsed: boolean  → desktop icon-only mode (persisted in localStorage by App)
 *  - onToggleCollapse: function → toggle desktop collapse
 */
const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { aToken, setAToken } = useContext(AdminContext);
  if (!aToken) return null;

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
        { to: "/products/add", label: "Ajouter un Produit", Icon: FiPlusCircle },
        { to: "/products", label: "Liste des Produits", Icon: FiPackage, end: true },
      ],
    },
    {
      title: "Commandes",
      items: [{ to: "/orders", label: "Commandes", Icon: FiShoppingCart }],
    },
    {
      title: "Blog",
      items: [
        { to: "/blog", label: "Articles", Icon: FiFileText },
        { to: "/comments", label: "Commentaires", Icon: FiMessageSquare },
      ],
    },
    {
      title: "Services",
      items: [{ to: "/services", label: "Liste des Services", Icon: FiTool, end: true }],
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("aToken");
    setAToken("");
    window.location.reload();
  };

  // Each nav link
  const linkClass = ({ isActive }) =>
    [
      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 outline-none",
      "border-l-4",
      collapsed ? "md:justify-center md:px-0" : "",
      isActive
        ? "bg-primary-800 text-white border-accent shadow-sm"
        : "text-green-100/80 border-transparent hover:bg-primary-800/60 hover:text-white",
    ].join(" ");

  const labelClass = [
    "whitespace-nowrap text-sm font-medium transition-all duration-200",
    collapsed ? "md:hidden" : "opacity-100",
  ].join(" ");

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed left-0 top-16 bottom-0 z-40 flex flex-col",
          "bg-primary-900 text-white shadow-xl",
          "transition-[width,transform] duration-300 ease-in-out",
          // width: mobile always full sidebar; desktop respects collapsed
          "w-64",
          collapsed ? "md:w-[72px]" : "md:w-64",
          // mobile off-canvas; always visible on desktop
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        role="navigation"
        aria-label="Barre latérale"
      >
        {/* Header: logo + brand + collapse toggle */}
        <div
          className={[
            "flex shrink-0 items-center gap-3 border-b border-white/10 px-4 h-16",
            collapsed ? "md:justify-center md:px-2" : "justify-between",
          ].join(" ")}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/logo/logo1.jpg"
              alt="CABM"
              className="h-10 w-10 shrink-0 rounded-full border-2 border-white/80 object-cover"
            />
            <span
              className={[
                "text-base font-bold tracking-wide whitespace-nowrap",
                collapsed ? "md:hidden" : "",
              ].join(" ")}
            >
              CABM Admin
            </span>
          </div>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={[
              "hidden md:flex items-center justify-center rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white",
              collapsed ? "md:absolute md:-right-3 md:top-5 md:bg-primary-900 md:border md:border-white/15 md:shadow" : "",
            ].join(" ")}
            aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
            title={collapsed ? "Déployer" : "Réduire"}
          >
            {collapsed ? <FiChevronRight className="text-lg" /> : <FiChevronLeft className="text-lg" />}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden flex items-center justify-center rounded-lg p-2 text-white/80 hover:bg-white/10"
            aria-label="Fermer le menu"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((sec) => (
            <div key={sec.title} className="mb-5">
              <p
                className={[
                  "px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-green-200/50",
                  collapsed ? "md:hidden" : "",
                ].join(" ")}
              >
                {sec.title}
              </p>
              <ul className="space-y-1">
                {sec.items.map(({ to, label, Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={!!end}
                      onClick={onClose}
                      className={linkClass}
                      title={collapsed ? label : undefined}
                      aria-label={label}
                    >
                      <Icon className="shrink-0 text-xl transition-transform duration-200 group-hover:scale-110" />
                      <span className={labelClass}>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom: logout */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={[
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              "text-green-100/80 transition-all duration-200 hover:bg-red-500/90 hover:text-white",
              collapsed ? "md:justify-center md:px-0" : "",
            ].join(" ")}
            title={collapsed ? "Déconnexion" : undefined}
            aria-label="Déconnexion"
          >
            <FiLogOut className="shrink-0 text-xl transition-transform duration-200 group-hover:translate-x-0.5" />
            <span className={labelClass}>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
