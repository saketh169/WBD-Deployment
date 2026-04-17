const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../utils/jwtConfig');

// Core JWT authentication — extracts and verifies token, sets req.user
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(403).json({ success: false, message });
    }
    req.user = decoded;
    next();
  });
}

// Optional JWT — sets req.user if token is present and valid, but does NOT reject anonymous requests
function optionalAuthenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // No token — continue as anonymous
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) {
      req.user = decoded;
    }
    next(); // Always continue, even if token is invalid
  });
}

// Factory: creates role-checking middleware (must be used AFTER authenticateJWT)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `${allowedRoles.join(' or ')} access required`,
      });
    }
    next();
  };
}

// Convenience: authenticate + dietitian role in one step
function ensureDietitianAuthenticated(req, res, next) {
  authenticateJWT(req, res, (err) => {
    if (err) return;
    requireRole('dietitian')(req, res, next);
  });
}

// Convenience: authenticate + organization role (excludes employees)
function ensureOrganizationAuthenticated(req, res, next) {
  authenticateJWT(req, res, (err) => {
    if (err) return;
    if (req.user.role !== 'organization') {
      return res.status(403).json({ success: false, message: 'Organization access required' });
    }
    // Block employees from org-admin-only endpoints
    if (req.user.orgType === 'employee') {
      return res.status(403).json({ success: false, message: 'Organization admin access required' });
    }
    next();
  });
}

// Convenience: authenticate + admin role in one step
function ensureAdminAuthenticated(req, res, next) {
  authenticateJWT(req, res, (err) => {
    if (err) return;
    requireRole('admin')(req, res, next);
  });
}

// Middleware to validate MongoDB ObjectId for dietitian
function validateDietitianObjectId(req, res, next) {
  const { dietitianId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(dietitianId)) {
    return res.status(400).json({ success: false, message: 'Invalid dietitian ID' });
  }
  next();
}

// Middleware to validate MongoDB ObjectId for organization
function validateOrganizationObjectId(req, res, next) {
  const { orgId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    return res.status(400).json({ success: false, message: 'Invalid organization ID' });
  }
  next();
}
function handleMulterError(err, req, res, next) {
  if (err instanceof require('multer').MulterError) {
    console.error('Multer Error:', err);
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Unexpected field: ${err.field}. Expected fields: resume, degreeCertificate, licenseDocument, idProof, experienceCertificates, specializationCertifications, internshipCertificate, researchPapers, finalReport`,
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size allowed is ${err.field === 'finalReport' ? '5MB' : '5MB'}.`,
      });
    }
    return res.status(400).json({
      success: false,
      message: `Multer error: ${err.message}`,
    });
  } else if (err.message === 'Invalid file type. Only PDF is allowed.') {
    console.error('File type error:', err.message);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next(err);
}

module.exports = {
  authenticateJWT,
  optionalAuthenticateJWT,
  requireRole,
  ensureDietitianAuthenticated,
  ensureOrganizationAuthenticated,
  ensureAdminAuthenticated,
  validateDietitianObjectId,
  validateOrganizationObjectId,
  handleMulterError
};