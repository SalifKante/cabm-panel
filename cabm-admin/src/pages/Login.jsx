import React, { useContext, useState } from "react";
import { AdminContext } from "../context/AdminContext";
import axios from "axios";
import { toast } from "react-toastify";

const Login = () => {
  const [state, setState] = useState("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { setAToken, backendUrl } = useContext(AdminContext);

  console.log("Backend URL in Login component:", backendUrl); // Debugging line to check if the URL is accessible here

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (state === "Admin") {
      const {data} = await axios.post(`${backendUrl}/api/admin/login`, {
          email,
          password,
        });
        if (data.success) {
          // console.log("Login successful:", data.token);
          localStorage.setItem("aToken", data.token);
          setAToken(data.token);
        } else {
          console.error("Login failed:", data.message);
          toast.error(data.message || "Login failed");
        }
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="min-h-[80vh] flex items-center">
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-sm shadow-lg">
        <p className="text-2xl font-semibold m-auto">
          <span className="text-primary"> Connexion {state} </span>
        </p>

        <div className="w-full">
          <p>Email</p>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            className="border border-[#DADADA] rounded w-full p-2 mt-1"
            type="email"
            required
          />
        </div>

        <div className="w-full">
          <p>Mot de Passe</p>
          <input
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            className="border border-[#DADADA] rounded w-full p-2 mt-1"
            type="password"
            required
          />
        </div>

        <button className="bg-primary-700 text-white w-full py-2 rounded-md text-base">
          Se connecter
        </button>
      </div>
    </form>
  );
};

export default Login;
