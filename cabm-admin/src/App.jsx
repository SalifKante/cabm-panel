import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AdminContext } from "./context/AdminContext";
import { useContext } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Admin/Dashboard";
import AddActivity from "./pages/Admin/AddActivity";
import ActivityList from "./pages/Admin/ActivityList";

export default function App() {
  const { aToken } = useContext(AdminContext);

  return (
    <>
      {/* Global ToastContainer — never unmounted */}
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
        <div className="bg-[#F8F9FD]">
          <Navbar />
          <div className="flex items-start">
            <Sidebar />
            {/* <Routes>...</Routes> */}
            <Routes>
              <Route path="/" element={<></>} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add-activity" element={<AddActivity />} />
              <Route path="/activities" element={<ActivityList />} />
            </Routes>
          </div>
          {/* Add your protected routes here if needed */}
        </div>
      ) : (
        <>
          <Login />
          {/* no extra ToastContainer here */}
        </>
      )}
    </>
  );
}
