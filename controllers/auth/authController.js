// controllers/auth/authController.js
const User = require("../../models/users/User");
const Session = require("../../models/users/Session");
const Staff = require("../../models/shops/Staff");
const Shop = require("../../models/shops/Store");
const AnalyticsEvent = require("../../models/logs/AnalyticsEvent");
const jwt = require("jsonwebtoken");

const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Step 1a: Request OTP (For existing users / Login)
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    let user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: "User not found. Please create an account first." });
    }

    // Fixed OTP for development, Random OTP for production
    let otp = "1234";
    if (process.env.NODE_ENV === "production") {
      otp = Math.floor(1000 + Math.random() * 9000).toString();
      // TODO: Integrate SMS provider here (Twilio, MSG91, etc.)
    }

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY);
    await user.save();

    await AnalyticsEvent.create({
      event: "otp_requested",
      userId: user._id,
      properties: { phone: user.phone },
      source: req.headers["x-source"] && ["web", "android", "ios", "admin"].includes(req.headers["x-source"]) ? req.headers["x-source"] : "web"
    });

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error in sendOtp:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Step 1b: Create Account (For new users / Signup)
exports.createAccount = async (req, res) => {
  try {
    const { phone, role, name, email, profileImageUrl } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    let user = await User.findOne({ phone });

    if (user) {
      return res.status(400).json({ error: "User already exists with this phone number." });
    }

    user = new User({
      phone,
      role: role || "guest",
      name,
      email,
      profileImageUrl,
      verified: false
    });

    let otp = "1234";
    if (process.env.NODE_ENV === "production") {
      otp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY);
    await user.save();
    if (user.role === "customer") {
      user.isAdminVerified = "verified";
      await user.save();
    }

    await AnalyticsEvent.create({
      event: "user_registered",
      userId: user._id,
      properties: { phone: user.phone, role: user.role, email: user.email },
      source: req.headers["x-source"] && ["web", "android", "ios", "admin"].includes(req.headers["x-source"]) ? req.headers["x-source"] : "web"
    });

    return res.status(201).json({ message: "Account created and OTP sent successfully" });
  } catch (err) {
    console.error("Error in createAccount:", err);
    res.status(500).json({ error: "Server error" });
  }
};

//Cleanup expired sessions (can be called periodically)
exports.cleanupExpiredSessions = async () => {
  try {
    const result = await Session.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    // if (process.env.NODE_ENV === "development" && result.deletedCount > 0) {
    //   console.log(`🧹 Cleaned up ${result.deletedCount} expired sessions`);
    // }

    return result.deletedCount;
  } catch (err) {
    console.error("Error cleaning up expired sessions:", err);
    return 0;
  }
};

// Step 2: Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: "OTP not requested" });
    }

    // Convert OTP to string for comparison
    const otpString = String(otp);

    if (user.otp !== otpString) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // Clear OTP after verification
    user.verified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    // If user is staff, fetch staff data with populated role
    let staffData = null;
    if (user.role === "staff") {
      staffData = await Staff.findOne({ userId: user._id, active: true })
        .populate("roleId", "name permissions")
        .populate("shopId", "name");

      if (!staffData) {
        return res.status(403).json({ error: "Staff record not found or inactive" });
      }
    }

    // If user is owner, fetch owned shop(s)
    let ownerShops = null;
    if (user.role === "owner") {
      ownerShops = await Shop.find({ ownerUserId: user._id })
        .select("name type businessType phone email gstin status logoUrl coverImageUrl");
    }

    // Create JWT token with additional staff info if applicable
    const tokenPayload = {
      id: user._id,
      role: user.role,
      ...(staffData && {
        staffId: staffData._id,
        shopId: staffData.shopId._id
      })
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Save session
    const session = new Session({
      userId: user._id,
      deviceInfo: req.headers["user-agent"] || "unknown",
      fcmToken: req.body.fcmToken || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    try {
      await session.save();

      await AnalyticsEvent.create({
        event: "user_login",
        userId: user._id,
        sessionId: session._id,
        properties: { role: user.role },
        source: req.headers["x-source"] && ["web", "android", "ios", "admin"].includes(req.headers["x-source"]) ? req.headers["x-source"] : "web"
      });

      //   if (process.env.NODE_ENV === "development") {
      //     console.log(`📱 Session created:`, {
      //       sessionId: session._id,
      //       userId: session.userId,
      //       deviceInfo: session.deviceInfo,
      //       expiresAt: session.expiresAt
      //     });
      //   }

      const responseData = {
        message: "Login successful",
        token,
        user,
        sessionId: session._id // Include session ID for logout
      };

      // Include staff data if user is staff
      if (staffData) {
        responseData.staff = staffData;
      }

      // Include owner shops if user is owner
      if (ownerShops) {
        responseData.shops = ownerShops;
      }

      res.json(responseData);
    } catch (sessionError) {
      console.error("Error creating session:", sessionError);
      // Still return success but without session
      const responseData = {
        message: "Login successful (session creation failed)",
        token,
        user
      };

      // Include staff data if user is staff
      if (staffData) {
        responseData.staff = staffData;
      }

      // Include owner shops if user is owner
      if (ownerShops) {
        responseData.shops = ownerShops;
      }

      res.json(responseData);
    }
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Step 3: Logout
exports.logout = async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    if (!sessionId) return res.status(400).json({ error: "Session ID required" });

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const userId = session.userId;

    await Session.findByIdAndDelete(sessionId);

    await AnalyticsEvent.create({
      event: "user_logout",
      userId: userId,
      sessionId: sessionId,
      source: req.headers["x-source"] && ["web", "android", "ios", "admin"].includes(req.headers["x-source"]) ? req.headers["x-source"] : "web"
    });

    // if (process.env.NODE_ENV === "development") {
    //   console.log(`🚪 User logged out, session deleted:`, sessionId);
    // }

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Error in logout:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Step 4: Create Guest User
exports.createGuestUser = async (req, res) => {
  try {
    const user = new User({
      role: "guest",
      verified: false
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);

    // Save session
    const session = new Session({
      userId: user._id,
      deviceInfo: req.headers["user-agent"] || "unknown",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await session.save();

    await AnalyticsEvent.create({
      event: "guest_user_created",
      userId: user._id,
      source: req.headers["x-source"] || "web"
    });

    return res.status(201).json({
      success: true,
      message: "Guest user created successfully",
      token,
      user,
      sessionId: session._id
    });
  } catch (err) {
    console.error("Error in createGuestUser:", err);
    res.status(500).json({ error: "Server error" });
  }
};
