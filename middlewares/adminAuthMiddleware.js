// middlewares/adminAuthMiddleware.js
const supabase = require('../config/supabaseClient');

/**
 * Admin Authentication Middleware
 * Validates Supabase JWT tokens and ensures user has admin privileges
 */
const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token.' 
      });
    }

    // Check if user is authenticated
    if (user.aud !== 'authenticated') {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated.' 
      });
    }

    // Check if user email is confirmed
    if (!user.email_confirmed_at) {
      return res.status(401).json({ 
        success: false,
        message: 'Email not confirmed. Please verify your email first.' 
      });
    }

    // Check if user has admin role (you can customize this based on your needs)
    // Option 1: Check user metadata for admin role
    // if (user.user_metadata && user.user_metadata.role !== 'admin') {
    //   return res.status(403).json({ 
    //     success: false,
    //     message: 'Access denied. Admin privileges required.' 
    //   });
    // }

    // Option 2: Check specific admin emails (alternative approach)
    // const adminEmails = ['admin@example.com', 'superadmin@example.com'];
    // if (!adminEmails.includes(user.email)) {
    //   return res.status(403).json({ 
    //     success: false,
    //     message: 'Access denied. Admin privileges required.' 
    //   });
    // }

    // Add user info to request object
    req.admin = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'admin',
      emailConfirmed: !!user.email_confirmed_at
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    
    // Handle specific Supabase errors
    if (error.message && error.message.includes('JWT')) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format.' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error during authentication.' 
    });
  }
};

/**
 * Optional: Middleware to check if user is admin without blocking
 * Useful for routes that work for both admin and regular users
 */
const optionalAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.admin = null;
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user && user.aud === 'authenticated' && user.email_confirmed_at) {
      req.admin = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'admin',
        emailConfirmed: !!user.email_confirmed_at
      };
    } else {
      req.admin = null;
    }

    next();
  } catch (error) {
    req.admin = null;
    next();
  }
};

module.exports = {
  adminAuthMiddleware,
  optionalAdminAuth
};
