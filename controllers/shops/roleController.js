const Role = require("../../models/shops/Role");

exports.createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const existing = await Role.findOne({ name });
    if (existing) {
      return res.status(409).json({ error: "Role with this name already exists" });
    }

    const role = await Role.create({ name, permissions: permissions || {} });
    res.status(201).json(role);
  } catch (err) {
    console.error("Error creating role:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).sort({ createdAt: -1 });
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role);
  } catch (err) {
    console.error("Error fetching role:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.permissions !== undefined) updates.permissions = req.body.permissions;

    const role = await Role.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json(role);
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.json({ message: "Role deleted" });
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).json({ error: "Server error" });
  }
};


