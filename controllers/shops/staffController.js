const Staff = require("../../models/shops/Staff");
const Role = require("../../models/shops/Role");
const User = require("../../models/users/User");
const Session = require("../../models/users/Session");
const jwt = require("jsonwebtoken");

const OTP_EXPIRY = 5 * 60 * 1000;

exports.signupStaff = async (req, res) => {
  try {
    const { shopId, userId, name, phone, email, roleId } = req.body;
    if (!shopId || !roleId || (!userId && !phone)) {
      return res.status(400).json({ error: "shopId, roleId and userId or phone are required" });
    }

    const role = await Role.findById(roleId);
    if (!role || String(role.shopId) !== String(shopId)) {
      return res.status(400).json({ error: "Invalid role for this shop" });
    }

    let user = null;
    if (userId) {
      user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
    } else {
      user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({ phone, name: name || undefined, email: email || undefined, role: "owner", verified: true });
      }
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

exports.requestStaffLoginOtp = async (req, res) => {
  try {
    const { phone, shopId } = req.body;
    if (!phone || !shopId) return res.status(400).json({ error: "phone and shopId are required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    const staff = await Staff.findOne({ userId: user._id, shopId, active: true });
    if (!staff) return res.status(403).json({ error: "Not a staff of this shop or inactive" });

    let otp = "1234";
    if (process.env.NODE_ENV === "production") {
      otp = Math.floor(1000 + Math.random() * 9000).toString();
    }
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY);
    await user.save();

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error in requestStaffLoginOtp:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.verifyStaffLoginOtp = async (req, res) => {
  try {
    const { phone, shopId, otp } = req.body;
    if (!phone || !shopId || !otp) return res.status(400).json({ error: "phone, shopId and otp are required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    const staff = await Staff.findOne({ userId: user._id, shopId, active: true }).populate("roleId");
    if (!staff) return res.status(403).json({ error: "Not a staff of this shop or inactive" });

    if (!user.otp || !user.otpExpiry) return res.status(400).json({ error: "OTP not requested" });
    if (String(user.otp) !== String(otp)) return res.status(400).json({ error: "Invalid OTP" });
    if (user.otpExpiry < Date.now()) return res.status(400).json({ error: "OTP expired" });

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const tokenPayload = { id: user._id, role: "staff", shopId, staffId: staff._id };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "7d" });

    const session = new Session({
      userId: user._id,
      deviceInfo: req.headers["user-agent"] || "unknown",
      fcmToken: req.body.fcmToken || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await session.save().catch(() => {});

    res.json({ message: "Login successful", token, user, staff });
  } catch (err) {
    console.error("Error in verifyStaffLoginOtp:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.listStaff = async (req, res) => {
  try {
    const { shopId } = req.query;
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


