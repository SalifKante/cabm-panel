import { Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import { ToastContainer, toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AdminContext } from "./context/AdminContext";
import { useContext } from "react";
import Navbar from "./pages/Navbar";

export default function App() {

  const {aToken} = useContext(AdminContext);
  return aToken ? (
    <div className="bg-[#F8F9FD]">
      <ToastContainer />
      <Navbar />
    </div>
  ):(
    <>
      <Login />
      <ToastContainer />
    </>
  )
}
