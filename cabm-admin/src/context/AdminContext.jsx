import { createContext, useState } from "react";
export const AdminContext = createContext();
import axios from "axios";
import { toast } from "react-toastify"; 


const AdminContextProvider = (props) => {
  const [aToken, setAToken] = useState(
    localStorage.getItem("aToken") ? localStorage.getItem("aToken") : ""
  );

  const [activity, setActivity] = useState([]);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const getAllActivities = async () => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/all-activities`,
        {},
        {
          headers: { aToken },
        }
      );
      if (data?.success) {
        setActivity(data.activities);
      }else
      { 
        toast.error(data?.message || "Failed to fetch activities");
        setActivity([]);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };
  const value = {
    /* Add your context values here */
    aToken,
    setAToken,
    backendUrl,
    activity,
    setActivity,
    getAllActivities,
  };

  console.log("Backend URL:", backendUrl); // Debugging line to check if the URL is loaded correctly

  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
