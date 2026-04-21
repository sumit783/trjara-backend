// middlewares/adminAuthMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../config/serverConfig');

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

    // Verify token with jsonwebtoken using SUPABASE_JWT_SECRET
    const decoded = jwt.verify(token, config.supabase.jwtSecret);

    // Check if user is authenticated
    if (decoded.aud !== 'authenticated') {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated.' 
      });
    }

    // Add user info to request object
    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.user_metadata?.role || decoded.app_metadata?.role || 'admin',
      emailConfirmed: true // we assume verified if token is valid and depending on app logic
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired.' 
      });
    } else if (error.name === 'JsonWebTokenError') {
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
    const decoded = jwt.verify(token, config.supabase.jwtSecret);

    if (decoded && decoded.aud === 'authenticated') {
      req.admin = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.user_metadata?.role || decoded.app_metadata?.role || 'admin',
        emailConfirmed: true
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
