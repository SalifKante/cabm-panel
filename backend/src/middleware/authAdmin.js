import jwt from "jsonwebtoken";

// Admin Authentication Middleware

const authAdmin = async (req, res, next) => {
  try {
    const { atoken } = req.headers;
    if (!atoken) return res.json({ success: false, message: "Unauthorized" });
    const decoded = jwt.verify(atoken, process.env.JWT_SECRET);
    if (decoded !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
      return res.json({ success: false, message: "Unauthorized" });
    }
    next();
  } catch (error) {
    console.log("Error in authAdmin middleware:", error);
    return res.json({
      success: false,
      message: error?.message || "Unauthorized",
    });
  }
};

export default authAdmin;