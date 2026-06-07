import React, { useContext, useEffect, useRef, useState } from "react";
import { AdminContext } from "../context/AdminContext";
import { useLocation, Link } from "react-router-dom";
import { FiMenu, FiUser, FiLogOut, FiChevronDown } from "react-icons/fi";

const NAVBAR_HEIGHT = "h-16"; // keep navbar height consistent everywhere

// Exact-path titles
const TITLES = {
  "/": "Vue d'ensemble",
  "/dashboard": "Vue d'ensemble",
  "/activities": "Gestion des activités",
  "/add-activity": "Nouvelle activité",
  "/products": "Gestion des produits",
  "/products/add": "Nouveau produit",
  "/orders": "Gestion des commandes",
  "/blog": "Gestion du blog",
  "/blog/new": "Nouvel article",
  "/comments": "Modération des commentaires",
  "/services": "Gestion des services",
  "/users": "Gestion des utilisateurs",
  "/profile": "Mon profil",
};

const resolveTitle = (pathname) => {
  if (TITLES[pathname]) return TITLES[pathname];

  // Param routes — match by prefix/pattern
  if (pathname.startsWith("/edit-product/")) return "Modifier le produit";
  if (/^\/blog\/[^/]+\/edit$/.test(pathname)) return "Modifier l'article";
  if (pathname.startsWith("/orders/")) return "Détail de la commande";

  return "Administration CABM";
};

const initials = (admin) => {
  const f = (admin?.firstName || "").trim();
  const l = (admin?.lastName || "").trim();
  const fromName = `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  if (fromName) return fromName;
  return "AD";
};

const fullName = (admin) => {
  const name = `${admin?.firstName || ""} ${admin?.lastName || ""}`.trim();
  return name || "Administrateur";
};

const Navbar = ({ onToggleSidebar }) => {
  const { aToken, admin, setAToken, setAdmin } = useContext(AdminContext);
  const { pathname } = useLocation();
  const title = resolveTitle(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the dropdown on outside click / Escape
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!aToken) return null;

  const logout = () => {
    setMenuOpen(false);
    localStorage.removeItem("aToken");
    setAToken("");
    if (setAdmin) setAdmin(null);
    window.location.reload();
  };

  const Avatar = ({ size = "h-9 w-9" }) =>
    admin?.avatar ? (
      <img
        src={admin.avatar}
        alt={fullName(admin)}
        className={`${size} rounded-full object-cover ring-2 ring-white shadow-sm`}
      />
    ) : (
      <div
        className={`${size} flex items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm`}
      >
        {initials(admin)}
      </div>
    );

  return (
    <header
      className={`sticky top-0 z-50 border-b border-gray-200 bg-white ${NAVBAR_HEIGHT}`}
      role="banner"
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left: mobile menu toggle + page title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden inline-flex items-center justify-center rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Ouvrir le menu"
          >
            <FiMenu className="text-xl" />
          </button>

          <h1 className="text-base font-semibold text-gray-800 sm:text-lg">
            {title}
          </h1>
        </div>

        {/* Right: online dot + profile dropdown */}
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 sm:flex">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
          </span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full p-1 pr-1 transition hover:bg-gray-100 sm:pr-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar />
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-tight text-gray-800">
                  {fullName(admin)}
                </span>
                <span className="block text-xs leading-tight text-gray-400">
                  Administrateur
                </span>
              </span>
              <FiChevronDown
                className={`hidden text-gray-400 transition sm:block ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
              >
                {/* Header inside menu */}
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                  <Avatar size="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {fullName(admin)}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {admin?.email || "—"}
                    </p>
                  </div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  role="menuitem"
                >
                  <FiUser className="text-gray-400" /> Mon profil
                </Link>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                  role="menuitem"
                >
                  <FiLogOut /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
