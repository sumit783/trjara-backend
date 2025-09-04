// controllers/users/userController.js
const User = require('../../models/users/User');

/**
 * Get all customers (users)
 * @route GET /api/admin/customers
 * @access Private (Admin only)
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    // Search by name or email
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (req.query.status) {
      filter.isActive = req.query.status === 'active';
    }

    // Get total count for pagination
    const totalCustomers = await User.countDocuments(filter);
    
    // Get customers with pagination
    const customers = await User.find(filter)
      .select('-password -otp -otpExpiry -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCustomers / limit);

    res.json({
      success: true,
      message: 'Customers retrieved successfully',
      data: {
        customers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCustomers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in getAllCustomers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customers',
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
