const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for OTP requests
 * Limit: 3 requests per 1 minute per IP
 */
const otpRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // limit each IP to 3 requests per windowMs
    message: {
        success: false,
        message: "Too many OTP requests from this IP, please try again after a minute"
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = otpRateLimiter;
