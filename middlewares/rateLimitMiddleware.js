const rateLimit = require("express-rate-limit");

const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit per IP
  message: "Too many requests from this IP, please try again later",
});

module.exports = rateLimitMiddleware;
