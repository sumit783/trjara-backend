// controllers/auth/authController.js
const User = require("../../models/users/User");
const Session = require("../../models/users/Session");
const jwt = require("jsonwebtoken");

const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

// 📍 Step 1: Request OTP
exports.requestOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    let user = await User.findOne({ phone });

    // If user not exists, create a new one
    if (!user) {
      user = new User({ phone, role: role || "customer", verified: false });
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

    // if (process.env.NODE_ENV === "development") {
    //   console.log(`📌 OTP for ${phone}: ${otp}`);
    // }

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error in requestOtp:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 📍 Cleanup expired sessions (can be called periodically)
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

// 📍 Step 2: Verify OTP
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
    
    // if (process.env.NODE_ENV === "development") {
    //   console.log(`🔍 OTP Comparison:`, {
    //     receivedOtp: otp,
    //     receivedOtpType: typeof otp,
    //     storedOtp: user.otp,
    //     storedOtpType: typeof user.otp,
    //     otpString: otpString,
    //     isMatch: user.otp === otpString
    //   });
    // }
    
    if (user.otp !== otpString) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // Clear OTP after verification
    user.verified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Create JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
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
      
    //   if (process.env.NODE_ENV === "development") {
    //     console.log(`📱 Session created:`, {
    //       sessionId: session._id,
    //       userId: session.userId,
    //       deviceInfo: session.deviceInfo,
    //       expiresAt: session.expiresAt
    //     });
    //   }
      
      res.json({ 
        message: "Login successful", 
        token, 
        user,
        sessionId: session._id // Include session ID for logout
      });
    } catch (sessionError) {
      console.error("Error creating session:", sessionError);
      // Still return success but without session
      res.json({ 
        message: "Login successful (session creation failed)", 
        token, 
        user 
      });
    }
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 📍 Step 3: Logout
exports.logout = async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    if (!sessionId) return res.status(400).json({ error: "Session ID required" });

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await Session.findByIdAndDelete(sessionId);
    
    // if (process.env.NODE_ENV === "development") {
    //   console.log(`🚪 User logged out, session deleted:`, sessionId);
    // }
    
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Error in logout:", err);
    res.status(500).json({ error: "Server error" });
  }
};
