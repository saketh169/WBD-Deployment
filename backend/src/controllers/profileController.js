const { User, Admin, Dietitian, Organization, Employee } = require('../models/userModel');
const { uploadStreamToCloudinary } = require('../utils/cloudinary');

// Extract user ID from authenticated request (set by authenticateJWT middleware)
const getUserIdFromRequest = (req) => {
    if (req.user) {
        return req.user.roleId || req.user.employeeId || req.user.userId;
    }
    return null;
};

// Upload profile image for User
async function uploadUserProfileImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Get userId from authenticated JWT � no body/query fallback for security
        let userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required. Please provide a valid token.' });
        }

        const result = await uploadStreamToCloudinary(req.file.buffer, `profile_images/user_${userId}`);
        const user = await User.findByIdAndUpdate(
            userId,
            {
                profileImage: result.secure_url
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading user profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile photo'
        });
    }
}

// Upload profile image for Admin
async function uploadAdminProfileImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let adminId = getUserIdFromRequest(req);

        if (!adminId) {
            return res.status(400).json({ success: false, message: 'Admin ID is required. Please provide a valid token.' });
        }

        const result = await uploadStreamToCloudinary(req.file.buffer, `profile_images/admin_${adminId}`);
        const admin = await Admin.findByIdAndUpdate(
            adminId,
            {
                profileImage: result.secure_url
            },
            { new: true }
        );

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading admin profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile photo'
        });
    }
}

// Upload profile image for Dietitian
async function uploadDietitianProfileImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let dietitianId = getUserIdFromRequest(req);

        if (!dietitianId) {
            return res.status(400).json({ success: false, message: 'Dietitian ID is required. Please provide a valid token.' });
        }

        const result = await uploadStreamToCloudinary(req.file.buffer, `profile_images/dietitian_${dietitianId}`);
        const dietitian = await Dietitian.findByIdAndUpdate(
            dietitianId,
            {
                profileImage: result.secure_url
            },
            { new: true }
        );

        if (!dietitian) {
            return res.status(404).json({ success: false, message: 'Dietitian not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading dietitian profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile photo'
        });
    }
}

// Upload profile image for Organization
async function uploadOrganizationProfileImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let orgId = getUserIdFromRequest(req);

        if (!orgId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required. Please provide a valid token.' });
        }

        const result = await uploadStreamToCloudinary(req.file.buffer, `profile_images/org_${orgId}`);
        const organization = await Organization.findByIdAndUpdate(
            orgId,
            {
                profileImage: result.secure_url
            },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading organization profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile photo'
        });
    }
}


// Get profile image for User
async function getUserProfileImage(req, res) {
    try {
        let userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const user = await User.findById(userId);

        if (!user || !user.profileImage) {
            return res.status(404).json({ success: false, message: 'Profile image not found' });
        }

        res.status(200).json({
            success: true,
            profileImage: user.profileImage
        });
    } catch (error) {
        console.error('Error retrieving user profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile image'
        });
    }
}

// Get profile image for Admin
async function getAdminProfileImage(req, res) {
    try {
        let adminId = getUserIdFromRequest(req);

        if (!adminId) {
            return res.status(400).json({ success: false, message: 'Admin ID is required' });
        }

        const admin = await Admin.findById(adminId);

        if (!admin || !admin.profileImage) {
            return res.status(404).json({ success: false, message: 'Profile image not found' });
        }

        res.status(200).json({
            success: true,
            profileImage: admin.profileImage
        });
    } catch (error) {
        console.error('Error retrieving admin profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile image'
        });
    }
}

// Get profile image for Dietitian
async function getDietitianProfileImage(req, res) {
    try {
        let dietitianId = getUserIdFromRequest(req);

        if (!dietitianId) {
            return res.status(400).json({ success: false, message: 'Dietitian ID is required' });
        }

        const dietitian = await Dietitian.findById(dietitianId);

        if (!dietitian || !dietitian.profileImage) {
            return res.status(404).json({ success: false, message: 'Profile image not found' });
        }

        res.status(200).json({
            success: true,
            profileImage: dietitian.profileImage
        });
    } catch (error) {
        console.error('Error retrieving dietitian profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile image'
        });
    }
}

// Get profile image for Organization
async function getOrganizationProfileImage(req, res) {
    try {
        let orgId = getUserIdFromRequest(req);

        if (!orgId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required' });
        }

        const organization = await Organization.findById(orgId);

        if (!organization || !organization.profileImage) {
            return res.status(404).json({ success: false, message: 'Profile image not found' });
        }

        res.status(200).json({
            success: true,
            profileImage: organization.profileImage
        });
    } catch (error) {
        console.error('Error retrieving organization profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile image'
        });
    }
}


// Helper function to detect role from authenticated request
const getRoleFromRequest = (req) => {
    if (!req.user) return null;
    return req.user.role;
};

/**
 * Generic function to get user details based on the role in the token
 * Works for all roles: User, Dietitian, Admin, Organization, Employee
 */
async function getUserDetailsGeneric(req, res) {
    try {
        // req.user is already set by authenticateJWT middleware
        // --- Employee path ---
        if (req.user && req.user.orgType === 'employee') {
            const employee = await Employee.findById(req.user.employeeId);
            if (!employee) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }
            const org = req.user.organizationId
                ? await Organization.findById(req.user.organizationId).select('name')
                : null;
            return res.status(200).json({
                success: true,
                role: 'organization',
                orgType: 'employee',
                id: employee._id,
                name: employee.name,
                email: employee.email,
                org_name: org ? org.name : '',
                licenseNumber: employee.licenseNumber,
                address: employee.address || '',
                phone: employee.contact || '',
            });
        }

        // --- Org admin / other roles path ---
        const userId = getUserIdFromRequest(req);
        const userRole = getRoleFromRequest(req);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token. Please provide a valid authentication token.'
            });
        }

        if (!userRole) {
            return res.status(400).json({
                success: false,
                message: 'User role not found in token.'
            });
        }

        let user = null;

        // Fetch user based on role
        switch (userRole.toLowerCase()) {
            case 'user':
                user = await User.findById(userId);
                break;
            case 'dietitian':
                user = await Dietitian.findById(userId);
                break;
            case 'admin':
                user = await Admin.findById(userId);
                break;
            case 'organization':
                user = await Organization.findById(userId);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: `Unknown role: ${userRole}`
                });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} not found`
            });
        }

        // Helper function to calculate age from DOB
        const calculateAge = (dob) => {
            if (!dob) return null;
            const today = new Date();
            const birthDate = new Date(dob);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        };

        // Prepare response with user details
        const response = {
            success: true,
            role: userRole,
            id: user._id,
            name: user.name || 'User',
            email: user.email,
            phone: user.phone || 'N/A',
        };

        // Add profile image if available
        if (user.profileImage) {
            if (typeof user.profileImage === 'string' && user.profileImage.startsWith('http')) {
                response.profileImage = user.profileImage;
            } else if (Buffer.isBuffer(user.profileImage)) {
                response.profileImage = `data:image/jpeg;base64,${user.profileImage.toString('base64')}`;
            } else {
                // For safety, only return if it looks like a URL or is a Buffer
                // Corrupted strings or local paths will fall back to default icon
                response.profileImage = null;
            }
        }

        // Add additional fields based on role
        if (userRole.toLowerCase() === 'user') {
            response.dob = user.dob ? user.dob.toISOString().split('T')[0] : null;
            response.age = calculateAge(user.dob);
            response.address = user.address;
            response.gender = user.gender;
        } else if (userRole.toLowerCase() === 'admin') {
            response.dob = user.dob ? user.dob.toISOString().split('T')[0] : null;
            response.age = calculateAge(user.dob);
            response.address = user.address;
            response.gender = user.gender;
        } else if (userRole.toLowerCase() === 'dietitian') {
            response.age = user.age || calculateAge(user.dob);
            response.specialization = user.specialization;
            response.experience = user.experience;
            response.licenseNumber = user.licenseNumber;
        } else if (userRole.toLowerCase() === 'organization') {
            response.org_name = user.name; // Primary identifier for organizations
            response.address = user.address;
            response.licenseNumber = user.licenseNumber;
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details'
        });
    }
}

// Role-specific wrapper functions that call the generic function
async function getUserDetails(req, res) {
    return getUserDetailsGeneric(req, res);
}

async function getDietitianDetails(req, res) {
    return getUserDetailsGeneric(req, res);
}

async function getAdminDetails(req, res) {
    return getUserDetailsGeneric(req, res);
}

async function getOrganizationDetails(req, res) {
    return getUserDetailsGeneric(req, res);
}



async function updateUserProfile(req, res) {
    try {
        const userId = getUserIdFromRequest(req);
        const userRole = getRoleFromRequest(req);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token. Please provide a valid authentication token.'
            });
        }

        if (!userRole) {
            return res.status(400).json({
                success: false,
                message: 'User role not found in token.'
            });
        }

        let UserModel = null;

        // Get the correct model based on role
        switch (userRole.toLowerCase()) {
            case 'user':
                UserModel = User;
                break;
            case 'dietitian':
                UserModel = Dietitian;
                break;
            case 'admin':
                UserModel = Admin;
                break;
            case 'organization':
                UserModel = Organization;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: `Unknown role: ${userRole}`
                });
        }

        // Find the user
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} not found`
            });
        }

        // Get update data from request body
        const updateData = {};
        const allowedFields = ['name', 'phone', 'address', 'dob', 'gender', 'age'];

        // Only update fields that are provided and allowed
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
                updateData[field] = req.body[field];
            }
        });

        // Validate that at least one field is being updated
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update.'
            });
        }

        // Check if name is being updated and if it conflicts with existing names
        if (updateData.name && updateData.name !== user.name) {
            const models = [User, Admin, Dietitian, Organization];
            for (const Model of models) {
                const existing = await Model.findOne({ name: updateData.name, _id: { $ne: userId } });
                if (existing) {
                    return res.status(409).json({
                        success: false,
                        message: `The name "${updateData.name}" is already in use by another profile.`
                    });
                }
            }
        }

        // Check if phone is being updated and if it conflicts
        if (updateData.phone && updateData.phone !== user.phone) {
            const models = [User, Admin, Dietitian, Organization];
            for (const Model of models) {
                const existing = await Model.findOne({ phone: updateData.phone, _id: { $ne: userId } });
                if (existing) {
                    return res.status(409).json({
                        success: false,
                        message: `The phone number "${updateData.phone}" is already registered.`
                    });
                }
            }
        }

        // Update the user
        Object.keys(updateData).forEach(key => {
            user[key] = updateData[key];
        });

        await user.save();

        // Clear dietitian cache if a dietitian updates their profile
        if (userRole.toLowerCase() === 'dietitian') {
            const { invalidateCache } = require('../utils/redisClient');
            try {
                await invalidateCache('dietitians:*');
            } catch(e) { console.error('Cache invalidation failed', e); }
        }

        // Prepare updated response
        const response = {
            success: true,
            message: 'Profile updated successfully!',
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone,
            }
        };

        // Add role-specific fields to response
        if (userRole.toLowerCase() === 'user' || userRole.toLowerCase() === 'admin') {
            response.data.address = user.address;
            response.data.gender = user.gender;
            response.data.dob = user.dob;
        } else if (userRole.toLowerCase() === 'dietitian') {
            response.data.age = user.age;
        } else if (userRole.toLowerCase() === 'organization') {
            response.data.address = user.address;
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('Error updating profile:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = {};
            for (const field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            return res.status(400).json({
                success: false,
                message: 'Validation failed.',
                errors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            let field = 'A field';
            if (error.message.includes('name')) field = 'Name';
            else if (error.message.includes('phone')) field = 'Phone';

            return res.status(409).json({
                success: false,
                message: `${field} is already in use.`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
}

// Delete/Remove profile image for User
async function deleteUserProfileImage(req, res) {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { profileImage: null },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully'
        });
    } catch (error) {
        console.error('Error removing user profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove profile photo'
        });
    }
}

// Delete/Remove profile image for Admin
async function deleteAdminProfileImage(req, res) {
    try {
        const adminId = getUserIdFromRequest(req);

        if (!adminId) {
            return res.status(400).json({ success: false, message: 'Admin ID is required' });
        }

        const admin = await Admin.findByIdAndUpdate(
            adminId,
            { profileImage: null },
            { new: true }
        );

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully'
        });
    } catch (error) {
        console.error('Error removing admin profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove profile photo'
        });
    }
}

// Delete/Remove profile image for Dietitian
async function deleteDietitianProfileImage(req, res) {
    try {
        const dietitianId = getUserIdFromRequest(req);

        if (!dietitianId) {
            return res.status(400).json({ success: false, message: 'Dietitian ID is required' });
        }

        const dietitian = await Dietitian.findByIdAndUpdate(
            dietitianId,
            { profileImage: null },
            { new: true }
        );

        if (!dietitian) {
            return res.status(404).json({ success: false, message: 'Dietitian not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully'
        });
    } catch (error) {
        console.error('Error removing dietitian profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove profile photo'
        });
    }
}

// Delete/Remove profile image for Organization
async function deleteOrganizationProfileImage(req, res) {
    try {
        const orgId = getUserIdFromRequest(req);

        if (!orgId) {
            return res.status(400).json({ success: false, message: 'Organization ID is required' });
        }

        const org = await Organization.findByIdAndUpdate(
            orgId,
            { profileImage: null },
            { new: true }
        );

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully'
        });
    } catch (error) {
        console.error('Error removing organization profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove profile photo'
        });
    }
}

module.exports = {
    uploadUserProfileImage,
    uploadAdminProfileImage,
    uploadDietitianProfileImage,
    uploadOrganizationProfileImage,
    deleteUserProfileImage,
    deleteAdminProfileImage,
    deleteDietitianProfileImage,
    deleteOrganizationProfileImage,
    getUserProfileImage,
    getAdminProfileImage,
    getDietitianProfileImage,
    getOrganizationProfileImage,
    getUserDetails,
    getDietitianDetails,
    getAdminDetails,
    getOrganizationDetails,
    updateUserProfile
};
