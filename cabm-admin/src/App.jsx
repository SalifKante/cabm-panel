// src/App.jsx
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
import EditProduct from "./pages/Admin/EditProduct.jsx"; // ← fixed trailing space

// Orders (Admin)
import OrderList from "./pages/Admin/OrderList";
import OrderDetail from "./pages/Admin/OrderDetail";

// Blog (Admin)
import PostList from "./pages/Admin/PostList";
import PostEditor from "./pages/Admin/PostEditor";
import CommentModeration from "./pages/Admin/CommentModeration";

// Services (Admin)
import ServiceTable from "./pages/Admin/ServiceTable"; // ← add this page

// Profile (Admin)
import Profile from "./pages/Admin/Profile";

// Users (Admin)
import Users from "./pages/Admin/Users";

export default function App() {
  const { aToken } = useContext(AdminContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Desktop collapse state, persisted across reloads
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

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

          {/* Sidebar (fixed overlay on mobile, fixed rail on desktop) */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />

          {/* Main respects sidebar width on desktop, with smooth transition */}
          <main
            className={[
              "px-3 py-4 sm:px-6 transition-[margin] duration-300 ease-in-out",
              collapsed ? "md:ml-[72px]" : "md:ml-64",
            ].join(" ")}
          >
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Activities */}
                <Route path="/add-activity" element={<AddActivity />} />
                <Route path="/activities" element={<ActivityList />} />

                {/* Products */}
                <Route path="/products/add" element={<AddProduct />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/edit-product/:id" element={<EditProduct />} />

                {/* Orders */}
                <Route path="/orders" element={<OrderList />} />
                <Route path="/orders/:id" element={<OrderDetail />} />

                {/* Blog */}
                <Route path="/blog" element={<PostList />} />
                <Route path="/blog/new" element={<PostEditor />} />
                <Route path="/blog/:id/edit" element={<PostEditor />} />
                <Route path="/comments" element={<CommentModeration />} />

                {/* Services (Admin) */}
                <Route path="/services" element={<ServiceTable />} />

                {/* Profile (Admin) */}
                <Route path="/profile" element={<Profile />} />

                {/* Users (Admin) */}
                <Route path="/users" element={<Users />} />
                {/* If you later want dedicated pages:
                    <Route path="/services/new" element={<ServiceCreate />} />
                    <Route path="/services/:id/edit" element={<ServiceEdit />} />
                 */}
              </Routes>
            </main>
        </div>
      ) : (
        // Public (login)
        <Login />
      )}
    </>
  );
}
