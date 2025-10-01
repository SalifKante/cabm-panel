import jwt from "jsonwebtoken";



// API for admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(email + password, process.env.JWT_SECRET);
      res.json({
        success: true,
        token,
      });
    } else {
      res.json({
        success: false,
        message: "E-mail ou Mot de Passe non valide",
      });
    }
  } catch (error) {
    console.log("Error during admin login:", error);
    res.json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};


export {  adminLogin };
