// controllers/users/userController.js
const User = require('../../models/users/User');

/**
 * Get all users with search, role filtering and pagination
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, role } = req.query;

    // Build filter object
    const filter = { isDeleted: false };
    
    // Search by name, email, phone or customId
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customId: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-otp -otpExpiry -otpAttempts')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

/**
 * Get customer by ID
 * @route GET /api/admin/customers/:id
 * @access Private (Admin only)
 */
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format'
      });
    }

    const customer = await User.findById(id)
      .select('-password -otp -otpExpiry -refreshToken');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer
    });

  } catch (error) {
    console.error('Error in getCustomerById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer',
      error: error.message
    });
  }
};

/**
 * Verify user (Admin)
 * @route PUT /api/admin/users/:id/verify
 * @access Private (Admin only)
 */
exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, role } = req.body;

    const validStatuses = ["pending", "verified", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isAdminVerified = status;
    
    if (status === "verified") {
      user.isActive = true;
      // If a role is provided and it's a valid transition, update it
      if (role && ["owner", "rider", "staff"].includes(role)) {
        user.role = role;
      }
    } else if (status === "rejected") {
      user.isActive = false;
      user.adminNote = reason;
    }

    // You might want to store the reason somewhere if you add a field for it in User model
    // For now, let's just save the status and active state

    await user.save();

    res.status(200).json({
      success: true,
      message: `User verification status updated to ${status}`,
      data: user,
    });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
