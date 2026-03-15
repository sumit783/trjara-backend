const User = require("../../models/users/User");
const Shop = require("../../models/shops/Store");

/**
 * Get store owner profile (user details + owned shops)
 * @route GET /api/owner/profile
 * @access Private (Owner)
 */
exports.getOwnerProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch user details
        const user = await User.findById(userId).select("-otp -otpExpiry -otpAttempts");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Fetch owned shops
        const shops = await Shop.find({ owner: userId });

        res.status(200).json({
            success: true,
            data: {
                user,
                shops
            }
        });
    } catch (error) {
        console.error("Error fetching owner profile:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
