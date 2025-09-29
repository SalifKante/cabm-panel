import React, { useContext } from "react";
import { AdminContext } from "../context/AdminContext";

const Navbar = () => {
  const { aToken } = useContext(AdminContext);
  const logout = () => {
    localStorage.removeItem("aToken");
    window.location.reload();
  };

  return (
    <div className="flex justify-between items-center px-4 sm:px-10 py-3 border-b bg-[#F8F9FD]">
      <div className="flex items-center gap-2 bg-[#F8F9FD] p-1 rounded">
        <img className="cursor-pointer" src="/logo/logo1.jpg" alt="Logo" style={{ height: "40px" }} />
        <p className="border  px-2.5 py-0.5 rounded-full border-gray-500 text-gray-600">{aToken ? "Administrateur" : ""}</p>
      </div>

      <button onClick={logout} className="bg-primary-800 text-white text-sm px-10 py-2 rounded-full">Se déconnecter</button>
    </div>
  );
};

export default Navbar;
