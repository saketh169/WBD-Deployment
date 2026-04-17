const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const helmetMiddleware = helmet();

// General API rate limiter: 2000 requests per 15 minutes per IP (relaxed for testing)
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.path === '/api/health') return true;
    return false;
  },
});

// Auth-specific rate limiter: 100 attempts per 15 minutes per IP (relaxed for testing)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many authentication attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP-specific rate limiter: 30 OTP requests per 10 minutes per IP (relaxed for testing)
const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const sanitizeInput = (req, res, next) => {
  const cleanString = (str) => {
    if (typeof str !== 'string') return str;
    // Replace & first to avoid double-encoding &lt; → &amp;lt;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = cleanString(req.query[key]);
      }
    });
  }

  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = cleanString(req.body[key]);
      }
    });
  }

  if (req.params) {
    Object.keys(req.params).forEach((key) => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = cleanString(req.params[key]);
      }
    });
  }

  next();
};

module.exports = {
  helmetMiddleware,
  rateLimiter,
  authRateLimiter,
  otpRateLimiter,
  sanitizeInput,
};
