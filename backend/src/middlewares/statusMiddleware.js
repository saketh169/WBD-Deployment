const { Dietitian, Organization } = require('../models/userModel');
const { authenticateJWT } = require('./authMiddleware');

// Status middleware to check verification status
// Chains after authenticateJWT — req.user is already set with decoded JWT payload
const checkVerificationStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        let userModel;
        if (req.user.role === 'dietitian') userModel = Dietitian;
        else if (req.user.role === 'organization' && req.user.orgType !== 'employee') userModel = Organization;
        else return res.status(403).json({ message: 'Invalid role for verification check' });

        const user = await userModel.findById(req.user.roleId).select('verificationStatus');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.userStatus = user.verificationStatus?.finalReport || 'Not Received';
        next();
    } catch (error) {
        console.error('Status middleware error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Combined middleware: authenticateJWT + checkVerificationStatus
const statusMiddleware = [authenticateJWT, checkVerificationStatus];

module.exports = statusMiddleware;