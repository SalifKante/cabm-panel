import { createContext, useState } from "react";
export const AdminContext = createContext();

const AdminContextProvider = (props) => {
  const [aToken, setAToken] = useState("");
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const value = {
    /* Add your context values here */
    aToken,
    setAToken,
    backendUrl,
  };

  console.log("Backend URL:", backendUrl); // Debugging line to check if the URL is loaded correctly

  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
