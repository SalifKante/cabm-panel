import React, { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { useNavigate } from "react-router-dom";
import { FiMenu, FiLogOut } from "react-icons/fi";

const NAVBAR_HEIGHT = "h-16"; // keep navbar height consistent everywhere

const Navbar = ({ onToggleSidebar }) => {
  const { aToken } = useContext(AdminContext);
  const navigate = useNavigate();

  const logout = () => {
    navigate("/");
    localStorage.removeItem("aToken");
    window.location.reload();
  };

  if (!aToken) return null;

  return (
    <header
      className={`sticky top-0 z-50 bg-[#F8F9FD] border-b ${NAVBAR_HEIGHT}`}
      role="banner"
    >
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        {/* Left: brand + role */}
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden inline-flex items-center justify-center rounded-xl p-2 hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3c388d]/50"
            aria-label="Ouvrir le menu"
          >
            <FiMenu className="text-xl" />
          </button>

          <div className="flex items-center gap-2 bg-[#F8F9FD]">
            <img
              src="/logo/logo1.jpg"
              alt="CABM"
              className="h-10 w-auto cursor-pointer rounded"
            />
            <span className="hidden sm:inline-block rounded-full border border-gray-400 px-3 py-1 text-sm text-gray-700">
              Administrateur
            </span>
          </div>
        </div>

        {/* Right: logout */}
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-white px-4 sm:px-5 py-2 text-sm font-medium shadow hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <FiLogOut className="text-base" />
          <span className="hidden xs:inline">Se déconnecter</span>
          <span className="xs:hidden">Quitter</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
