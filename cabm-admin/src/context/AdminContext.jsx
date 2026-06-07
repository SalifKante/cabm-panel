import { createContext, useState, useEffect, useCallback } from "react";
export const AdminContext = createContext();
import axios from "axios";
import { toast } from "react-toastify";


const AdminContextProvider = (props) => {
  const [aToken, setAToken] = useState(
    localStorage.getItem("aToken") ? localStorage.getItem("aToken") : ""
  );

  const [activity, setActivity] = useState([]);

  // Admin profile (full name + avatar), shown in the navbar and editable on /profile
  const [admin, setAdmin] = useState(null);
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

  // Fetch the admin profile (used by the navbar + profile page)
  const fetchAdminProfile = useCallback(async () => {
    if (!backendUrl || !aToken) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/profile`, {
        headers: { aToken },
      });
      if (data?.success) setAdmin(data.data);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
    }
  }, [backendUrl, aToken]);

  // Load the profile whenever we have a token (login / refresh)
  useEffect(() => {
    if (aToken) fetchAdminProfile();
    else setAdmin(null);
  }, [aToken, fetchAdminProfile]);

  const value = {
    /* Add your context values here */
    aToken,
    setAToken,
    backendUrl,
    activity,
    setActivity,
    getAllActivities,
    admin,
    setAdmin,
    fetchAdminProfile,
  };

  console.log("Backend URL:", backendUrl); // Debugging line to check if the URL is loaded correctly

  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
