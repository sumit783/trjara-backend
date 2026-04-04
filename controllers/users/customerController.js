const User = require("../../models/users/User");
const AnalyticsEvent = require("../../models/logs/AnalyticsEvent");

/**
 * Get current user profile
 * @route GET /api/customer/profile
 * @access Private
 */
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-otp -otpExpiry -otpAttempts");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Update current user profile
 * @route PUT /api/customer/profile
 * @access Private
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();

        if (req.file) {
            updateData.profileImageUrl = `/uploads/${req.file.filename}`;
        }

        // If guest is updating profile, they become a customer
        if (user.role === "guest" && (name || email || req.file)) {
            updateData.role = "customer";
        }
        if(user.role === "owner" && user.isAdminVerified === "rejected"){
            updateData.isAdminVerified = "reuploaded";
        }
        // Check if email is already taken by another user
        if (email) {
            const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Email already in use" });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-otp -otpExpiry -otpAttempts");

        await AnalyticsEvent.create({
            event: "profile_updated",
            userId: userId,
            properties: { fieldsUpdated: Object.keys(updateData) },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Send OTP for phone verification
 * @route POST /api/customer/send-otp
 * @access Private
 */
exports.sendPhoneOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

        // Check if phone is already taken
        const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Phone number already in use" });
        }

        let otp = "1234"; // Default for development
        if (process.env.NODE_ENV === "production") {
            otp = Math.floor(1000 + Math.random() * 9000).toString();
            // TODO: Integrate SMS provider
        }

        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await User.findByIdAndUpdate(req.user._id, {
            otp,
            otpExpiry
        });

        await AnalyticsEvent.create({
            event: "phone_verification_otp_sent",
            userId: req.user._id,
            properties: { phone },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        console.error("Error in sendPhoneOTP:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Verify OTP and update phone
 * @route POST /api/customer/verify-otp
 * @access Private
 */
exports.verifyPhoneOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: "Phone and OTP are required" });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP expired or not requested" });
        }

        if (user.otp !== String(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // Update phone and role if guest
        const updateData = {
            phone,
            otp: null,
            otpExpiry: null,
            verified: true
        };

        if (user.role === "guest") {
            updateData.role = "customer";
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true }
        ).select("-otp -otpExpiry -otpAttempts");

        await AnalyticsEvent.create({
            event: "phone_verified",
            userId: req.user._id,
            properties: { phone, previousRole: user.role },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "Phone verified and updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Error in verifyPhoneOTP:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
