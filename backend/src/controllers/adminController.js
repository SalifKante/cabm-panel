


// API for admin activity
const createActivity = async (req, res) => {
  try {
    const { title, date, place, description, tags } = req.body;
    const image = req.file?.path; // Access the uploaded file path
    
    console.log(req.body, req.file);

    // Basic validation
    // if (!title || !date || !place || !description || !tags || !image) {
    //   return res.status(400).json({ message: "All fields are required." });
    // }
    
  } catch (error) {}
};

export { createActivity };
