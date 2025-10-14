import serviceModel from "../models/serviceModel.js";


// PUBLIC — active only
const listPublicServices = async (req, res) => {
  const items = await serviceModel.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, items });
};

// ADMIN — list all
const listAllServices = async (req, res) => {
  const items = await serviceModel.find().sort({ order: 1, createdAt: 1 });
  res.json({ success: true, items });
};

// ADMIN — create
const createService = async (req, res) => {
  const payload = req.body; // { title, desc, icon, order?, isActive? }
  const item = await serviceModel.create(payload);
  res.status(201).json({ success: true, item });
};

// ADMIN — update
const updateService = async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const item = await serviceModel.findByIdAndUpdate(id, payload, { new: true });
  res.json({ success: true, item });
};

// ADMIN — delete
const deleteService = async (req, res) => {
  const { id } = req.params;
  await serviceModel.findByIdAndDelete(id);
  res.json({ success: true });
};

// ADMIN — mask/unmask
const setServiceStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ success: false, message: "isActive boolean required" });
  }
  const item = await serviceModel.findByIdAndUpdate(id, { isActive }, { new: true });
  res.json({ success: true, item });
};

const countServices = async (req, res) => {

    try {
        const count = await serviceModel.countDocuments();
        res.json({ success: true, count });
        
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
        console.error("Error counting services:", error);
    }  
}

export {
  listPublicServices,
  listAllServices,
  createService,
  updateService,
  deleteService,
  setServiceStatus,
  countServices
};
