import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React, { useContext, useState, useEffect } from "react";

import { AdminContext } from "./context/AdminContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Admin/Dashboard";
import AddActivity from "./pages/Admin/AddActivity";
import ActivityList from "./pages/Admin/ActivityList";
import AddProduct from "./pages/Admin/AddProduct";
import ProductList from "./pages/Admin/ProductList";
import EditProduct from "./pages/Admin/EditProduct ";

// (Optional placeholders for products)

export default function App() {
  const { aToken } = useContext(AdminContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close the mobile sidebar on resize to md+ (prevents overlap)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setIsSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <ToastContainer
        position="top-right"
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        limit={3}
      />

      {aToken ? (
        // Protected layout
        <div className="min-h-screen bg-[#F8F9FD]">
          <Navbar onToggleSidebar={() => setIsSidebarOpen((v) => !v)} />

          {/* Content area is pushed below fixed navbar */}
          <div className="pt-16 flex">
            {/* Sidebar */}
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main */}
            <main className="flex-1 px-3 sm:px-6 py-4">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/add-activity" element={<AddActivity />} />
                <Route path="/activities" element={<ActivityList />} />
                {/* Products */}
                <Route path="/products/add" element={<AddProduct />} />
                <Route path="/products" element={<ProductList />} />
                <Route
                  path="/edit-product/:id"
                  element={<EditProduct />}
                />{" "}
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        // Public (login)
        <Login />
      )}
    </>
  );
}
