const mongoose = require('mongoose');
const { sendAccountRemovalEmail } = require('../services/emailService');
const bcrypt = require('bcryptjs');

// Escape regex special characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const {
    UserAuth,
    User,
    Admin,
    Dietitian,
    Organization
} = require('../models/userModel');

// Removed Account Schema for tracking deleted users
const RemovedAccountSchema = new mongoose.Schema({
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    role: {
        type: String,
        enum: ['user', 'dietitian', 'organization'],
        required: true
    },
    accountType: { type: String, required: true }, // Same as role but capitalized
    removedOn: { type: Date, default: Date.now },
    removedBy: { type: String }, // Admin who removed the account
    removalReason: { type: String }, // Reason provided by the admin for removal
    originalPasswordHash: { type: String }, // Store original password hash for restoration
    originalData: { type: mongoose.Schema.Types.Mixed } // Store original profile data
}, { timestamps: true });

const RemovedAccount = mongoose.model('RemovedAccount', RemovedAccountSchema);

// Helper function to get the correct model based on role
const getModelByRole = (role) => {
    const models = {
        'user': User,
        'dietitian': Dietitian,
        'organization': Organization
    };
    return models[role.toLowerCase()];
};

// Get all users by role with optional search
exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.params;
        // Remove '-list' suffix to get the actual role
        const actualRole = role.replace('-list', '');
        const { q: searchQuery, page = 1, limit = 10 } = req.query;

        // Prevent admin management
        if (actualRole.toLowerCase() === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin management is not allowed'
            });
        }

        const Model = getModelByRole(actualRole);
        if (!Model) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        let query = {};

        // Add search functionality
        if (searchQuery) {
            const safeQuery = escapeRegex(searchQuery);
            query = {
                $or: [
                    { name: { $regex: safeQuery, $options: 'i' } },
                    { email: { $regex: safeQuery, $options: 'i' } }
                ]
            };
        }

        const pageNumber = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;

        const [users, total] = await Promise.all([
            Model.find(query)
                .select('-__v -createdAt -updatedAt') // Exclude version and timestamps
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize),
            Model.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: users,
            count: users.length,
            total,
            page: pageNumber,
            limit: pageSize,
            pages: Math.ceil(total / pageSize)
        });

    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

// Get specific user details
exports.getUserDetails = async (req, res) => {
    try {
        const { role, id } = req.params;
        // Remove '-list' suffix to get the actual role
        const actualRole = role.replace('-list', '');

        // Prevent admin management
        if (actualRole.toLowerCase() === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin management is not allowed'
            });
        }

        const Model = getModelByRole(actualRole);
        if (!Model) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        const user = await Model.findById(id).select('-__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details',
            // error detail logged server-side only
        });
    }
};

// Remove a user (move to removed accounts)
exports.removeUser = async (req, res) => {
    try {
        const { role, id } = req.params;
        // Remove '-list' suffix to get the actual role
        const actualRole = role.replace('-list', '');
        // Use admin ID from JWT — never store raw tokens in the database
        const adminId = req.user?.roleId || req.user?.employeeId || req.user?.userId || 'unknown';
        const { reason } = req.body;

        // Reason is mandatory
        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: 'A reason must be provided before removing an account'
            });
        }

        // Prevent admin management
        if (actualRole.toLowerCase() === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin management is not allowed'
            });
        }

        const Model = getModelByRole(actualRole);
        if (!Model) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        // Find the user to remove
        const user = await Model.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get the original password hash from UserAuth
        const userAuth = await UserAuth.findOne({ roleId: id, role: role.toLowerCase() });
        const originalPasswordHash = userAuth ? userAuth.passwordHash : null;

        // Create removed account record
        const removedAccount = new RemovedAccount({
            originalId: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: actualRole.toLowerCase(),
            accountType: actualRole.charAt(0).toUpperCase() + actualRole.slice(1),
            removedBy: adminId,
            removalReason: reason.trim(),
            originalPasswordHash: originalPasswordHash, // Store original password hash
            originalData: user.toObject()
        });

        await removedAccount.save();

        // Remove from active users
        await Model.findByIdAndDelete(id);

        // Also remove from UserAuth if it exists
        try {
            await UserAuth.findOneAndDelete({ roleId: id, role: actualRole.toLowerCase() });
        } catch (authError) {
            console.log('UserAuth entry not found or already removed:', authError.message);
        }

        // Send notification email to removed user (non-fatal if it fails)
        try {
            await sendAccountRemovalEmail(user.email, user.name, reason.trim());
        } catch (emailError) {
            console.error('Failed to send removal notification email:', emailError.message);
        }

        res.status(200).json({
            success: true,
            message: `${actualRole.charAt(0).toUpperCase() + actualRole.slice(1)} removed successfully`
        });

    } catch (error) {
        console.error('Error removing user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove user',
            // error detail logged server-side only
        });
    }
};

// Get removed accounts with optional search
exports.getRemovedAccounts = async (req, res) => {
    try {
        const { q: searchQuery, page = 1, limit = 10 } = req.query;

        let query = {};

        // Add search functionality
        if (searchQuery) {
            const safeQuery = escapeRegex(searchQuery);
            query = {
                $or: [
                    { name: { $regex: safeQuery, $options: 'i' } },
                    { email: { $regex: safeQuery, $options: 'i' } }
                ]
            };
        }

        const pageNumber = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * pageSize;

        const [removedAccounts, total] = await Promise.all([
            RemovedAccount.find(query)
                .select('-__v') // Exclude version, but keep originalData for details view
                .sort({ removedOn: -1 })
                .skip(skip)
                .limit(pageSize),
            RemovedAccount.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: removedAccounts,
            count: removedAccounts.length,
            total,
            page: pageNumber,
            limit: pageSize,
            pages: Math.ceil(total / pageSize)
        });

    } catch (error) {
        console.error('Error fetching removed accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch removed accounts',
            // error detail logged server-side only
        });
    }
};

// Restore a removed account
exports.restoreAccount = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the removed account
        const removedAccount = await RemovedAccount.findById(id);
        if (!removedAccount) {
            return res.status(404).json({
                success: false,
                message: 'Removed account not found'
            });
        }

        const Model = getModelByRole(removedAccount.role);
        if (!Model) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role in removed account'
            });
        }

        // Check if email already exists
        const existingUser = await Model.findOne({ email: removedAccount.email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Create new user record with original data
        const restoredUser = new Model(removedAccount.originalData);
        restoredUser._id = undefined; // Let MongoDB generate new ID
        restoredUser.createdAt = undefined;
        restoredUser.updatedAt = undefined;

        await restoredUser.save();

        // Create UserAuth entry with original password hash
        const userAuth = new UserAuth({
            email: removedAccount.email,
            passwordHash: removedAccount.originalPasswordHash || await bcrypt.hash('TempPass123!', 12), // Use original password or temp if not available
            role: removedAccount.role,
            roleId: restoredUser._id
        });

        await userAuth.save();

        // Remove from removed accounts
        await RemovedAccount.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: `${removedAccount.accountType} restored successfully with original password.`,
            data: {
                id: restoredUser._id,
                name: restoredUser.name,
                email: restoredUser.email,
                role: removedAccount.role,
                passwordRestored: !!removedAccount.originalPasswordHash // Indicate if original password was restored
            }
        });

    } catch (error) {
        console.error('Error restoring account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore account',
            // error detail logged server-side only
        });
    }
};

// Permanently delete a removed account
exports.permanentDeleteAccount = async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete the removed account
        const removedAccount = await RemovedAccount.findByIdAndDelete(id);
        if (!removedAccount) {
            return res.status(404).json({
                success: false,
                message: 'Removed account not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `${removedAccount.accountType} permanently deleted successfully`
        });

    } catch (error) {
        console.error('Error permanently deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to permanently delete account',
            // error detail logged server-side only
        });
    }
};
