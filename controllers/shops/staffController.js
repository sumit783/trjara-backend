const Staff = require("../../models/shops/Staff");
const Role = require("../../models/shops/Role");
const User = require("../../models/users/User");

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).sort({ createdAt: -1 });
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.signupStaff = async (req, res) => {
  try {
    const {shopId, name, phone, email, roleId } = req.body;
    
    if (!shopId || !roleId || !phone) {
      return res.status(400).json({ error: "shopId, roleId and phone are required" });
    }
    

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Find user by phone, create if not found
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ 
        phone, 
        name: name || undefined, 
        email: email || undefined, 
        role: "staff", 
        verified: true,
        isAdminVerified:"verified"
      });
    }

    const existingStaff = await Staff.findOne({ shopId, userId: user._id });
    if (existingStaff) {
      return res.status(409).json({ error: "Staff already exists for this shop" });
    }

    const staff = await Staff.create({
      shopId,
      userId: user._id,
      name: name || user.name || "",
      phone: phone || user.phone,
      email: email || user.email,
      roleId,
    });

    res.status(201).json(staff);
  } catch (err) {
    console.error("Error in signupStaff:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.listStaff = async (req, res) => {
  try {
    const shopId = req.shopId; // Get shopId from middleware (JWT token)
    const filter = shopId ? { shopId } : {};
    const staff = await Staff.find(filter).populate("roleId").sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    console.error("Error in listStaff:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const updates = {};
    const allowed = ["name", "phone", "email", "roleId", "active"];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const staff = await Staff.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!staff) return res.status(404).json({ error: "Staff not found" });
    res.json(staff);
  } catch (err) {
    console.error("Error in updateStaff:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ error: "Staff not found" });
    res.json({ message: "Staff deleted" });
  } catch (err) {
    console.error("Error in deleteStaff:", err);
    res.status(500).json({ error: "Server error" });
  }
};


