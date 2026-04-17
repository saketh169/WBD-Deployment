// Role-based authorization middleware for blog routes
// JWT authentication is handled by authMiddleware (authenticateJWT / optionalAuthenticateJWT)

// Middleware to ensure only users and dietitians can create blogs
const canCreateBlog = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!['user', 'dietitian'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Only users and dietitians can create blog posts'
        });
    }

    next();
};

// Middleware to ensure only organization can access moderation features
const isOrganization = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const allowedRoles = ['organization', 'employee'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Organization or Employee access required for this action'
        });
    }

    next();
};

module.exports = {
    canCreateBlog,
    isOrganization
};
