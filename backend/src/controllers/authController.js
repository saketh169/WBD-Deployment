const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Mongoose Models
const { UserAuth, User, Admin, Dietitian, Organization, Employee } = require('../models/userModel');
const otpService = require('../services/otpService');
const { JWT_SECRET, ADMIN_SIGNIN_KEY } = require('../utils/jwtConfig');

const PROFILE_MODELS = {
    user: User,
    admin: Admin,
    dietitian: Dietitian,
    organization: Organization,
};

const checkGlobalConflict = async (field, value, errorMessage) => {
    const models = [User, Admin, Dietitian, Organization];

    if (!value) return null;

    const query = { [field]: value };
    const results = await Promise.all(
        models.map(Model => Model.findOne(query).lean())
    );

    if (results.some(result => result !== null)) {
        return { message: errorMessage };
    }
    return null;
};

exports.signupController = async (req, res) => {
    const role = req.params.role;
    const { email, password, licenseNumber, ...profileData } = req.body;

    const ProfileModel = PROFILE_MODELS[role];
    if (!ProfileModel) {
        return res.status(400).json({ message: 'Invalid signup role specified.' });
    }

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const { name, phone } = profileData;

        // 1. Check Name (Global Conflict)
        if (name) {
            const nameConflict = await checkGlobalConflict('name', name,
                `The Name "${name}" is already in use by another profile.`);
            if (nameConflict) return res.status(409).json(nameConflict);
        }

        // 2. Check Phone Number (Global Conflict)
        if (phone) {
            const phoneConflict = await checkGlobalConflict('phone', phone,
                `The Phone Number "${phone}" is already registered globally.`);
            if (phoneConflict) return res.status(409).json(phoneConflict);
        }

        // 3. Check Email (Auth Conflict)
        const existingUser = await UserAuth.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email address is already registered.' });
        }

        // 4. Check License Number (Required Field Check)
        const rolesWithLicense = ['dietitian', 'organization'];
        if (rolesWithLicense.includes(role) && !licenseNumber) {
            return res.status(400).json({ message: 'License Number is required for this role.' });
        }

        // 4b. Check organizationType is provided for organization role
        if (role === 'organization' && !profileData.organizationType) {
            return res.status(400).json({ message: 'Organization type is required.' });
        }

        // 6. HASH PASSWORD AND SAVE
        const hashedPassword = await bcrypt.hash(password, 12);

        // Save the Role-Specific Profile with email
        const profile = new ProfileModel({ ...profileData, email, licenseNumber });
        await profile.save();

        // Create Central Authentication Record 
        const authUser = new UserAuth({
            email,
            passwordHash: hashedPassword,
            role,
            roleId: profile._id
        });
        await authUser.save();

        // 7. GENERATE JWT AND RESPOND
        const token = jwt.sign(
            { userId: authUser._id, role: authUser.role, roleId: authUser.roleId },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        const registeredName = profile.name || 'New Member';

        return res.status(201).json({
            message: 'Registration successful! Proceed to the next step.',
            name: registeredName,
            token,
            role: role,
            roleId: profile._id // Include roleId for document upload
        });

    } catch (error) {
        console.error(`Error during ${role} signup:`, error);

        // 7. ERROR HANDLING

        // Mongoose Validation Error
        if (error.name === 'ValidationError') {
            const errors = {};
            for (const field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            return res.status(400).json({ message: 'Validation failed.', errors });
        }

        // MongoDB Unique Index Errors (Code 11000)
        if (error.code === 11000) {
            let uniqueField = 'A role-specific unique field';
            const match = error.message.match(/index: (.*) dup key/);
            const indexName = match ? match[1] : '';

            if (indexName.includes('name')) uniqueField = 'Name';
            else if (indexName.includes('email')) uniqueField = 'Email';
            else if (indexName.includes('licenseNumber')) uniqueField = 'License Number';

            return res.status(409).json({ message: `${uniqueField} is already registered.` });
        }

        res.status(500).json({ message: 'Internal Server Error during registration.' });
    }
};

exports.signinController = async (req, res) => {
    const role = req.params.role;
    const { email, password, licenseNumber, adminKey, rememberMe, orgType } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // --- EMPLOYEE SIGNIN: check email + password + licenseNumber against Employee model ---
        if (role === 'organization' && orgType === 'employee') {
            if (!licenseNumber) {
                return res.status(400).json({ message: 'Employee License Number is required.' });
            }

            const employee = await Employee.findOne({ email, isDeleted: false });
            if (!employee) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            if (employee.licenseNumber !== licenseNumber) {
                return res.status(401).json({ message: 'Invalid Employee License Number.' });
            }

            const isMatch = await bcrypt.compare(password, employee.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid password.' });
            }

            if (employee.status !== 'active') {
                return res.status(403).json({ message: 'Your account is not active. Contact your organization admin.' });
            }

            employee.lastLogin = new Date();
            await employee.save();

            // 2FA: Send login OTP instead of returning token directly
            const otpResult = await otpService.sendLoginOTP(employee.email, 'Organization Employee');
            if (!otpResult.success) {
                console.error('Login OTP sending failed for employee:', otpResult.error);
                return res.status(500).json({ message: 'Failed to send verification OTP. Please try again.' });
            }

            return res.status(200).json({
                message: 'Credentials verified! An OTP has been sent to your email for verification.',
                requires2FA: true,
                email: employee.email,
                role: 'organization',
                orgType: 'employee',
                rememberMe: rememberMe || false
            });
        }
        // 1. Find user in central Auth collection
        const authUser = await UserAuth.findOne({ email });
        if (!authUser || authUser.role !== role) {
            return res.status(401).json({ message: 'Invalid credentials or role mismatch.' });
        }

        // 2. Check Password
        const isMatch = await bcrypt.compare(password, authUser.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        // 3. Handle Role-Specific Credentials
        const ProfileModel = PROFILE_MODELS[role];
        if (ProfileModel) {
            const profile = await ProfileModel.findById(authUser.roleId);

            if (!profile) {
                return res.status(404).json({ message: 'User profile not found.' });
            }

            // Role-specific validation for signin
            switch (role) {
                case 'dietitian':
                case 'organization':
                    if (!licenseNumber || profile.licenseNumber !== licenseNumber) {
                        return res.status(401).json({ message: `Invalid ${role} License Number.` });
                    }
                    break;
                case 'admin':
                    // **NEW: Validate Admin Key from environment variable**
                    if (!adminKey || adminKey !== ADMIN_SIGNIN_KEY) {
                        return res.status(401).json({ message: 'Invalid Admin Key.' });
                    }
                    break;
            }
        }

        // 4. 2FA: Send login OTP instead of returning token directly
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        const otpResult = await otpService.sendLoginOTP(email, roleLabel);
        if (!otpResult.success) {
            console.error(`Login OTP sending failed for ${role}:`, otpResult.error);
            return res.status(500).json({ message: 'Failed to send verification OTP. Please try again.' });
        }

        // 5. Respond with 2FA required (no token yet)
        return res.status(200).json({
            message: 'Credentials verified! An OTP has been sent to your email for verification.',
            requires2FA: true,
            email: email,
            role: authUser.role,
            rememberMe: rememberMe || false
        });

    } catch (error) {
        console.error(`Error during ${role} signin:`, error);
        res.status(500).json({ message: 'Internal Server Error during login.' });
    }
};

const { uploadStreamToCloudinary } = require('../utils/cloudinary');
exports.docUploadController = async (req, res) => {
    try {
        const { role } = req.params;
        const userId = req.user?.roleId; // From authenticated token only

        if (!role || !userId) {
            return res.status(400).json({
                message: 'Role and User ID are required.'
            });
        }

        const ProfileModel = PROFILE_MODELS[role];
        if (!ProfileModel) {
            return res.status(400).json({
                message: 'Invalid role specified.'
            });
        }

        // Find the user profile
        const userProfile = await ProfileModel.findById(userId);
        if (!userProfile) {
            return res.status(404).json({
                message: 'User profile not found.'
            });
        }

        // Create document object from uploaded files with buffers
        const documents = {};
        const filesUpdate = {};
        const verificationStatusUpdate = {};

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fieldName = file.fieldname;

                try {
                    const result = await uploadStreamToCloudinary(file.buffer, `user_docs/${role}_${userId}`);

                    if (role === 'dietitian') {
                        filesUpdate[fieldName] = result.secure_url;
                        verificationStatusUpdate[fieldName] = 'Pending';
                    } else {
                        documents[fieldName] = {
                            filename: file.originalname,
                            mimetype: file.mimetype,
                            size: file.size,
                            url: result.secure_url,
                            uploadedAt: new Date()
                        };
                    }
                } catch (uploadErr) {
                    console.error('Cloudinary upload error:', uploadErr);
                    return res.status(500).json({ message: 'Error uploading file to secure storage' });
                }
            }
        }

        // Update user profile based on role
        if (role === 'dietitian') {
            // Update files and verificationStatus for dietitian
            if (Object.keys(filesUpdate).length > 0) {
                userProfile.files = userProfile.files || {};
                Object.keys(filesUpdate).forEach(key => {
                    userProfile.files[key] = filesUpdate[key];
                });

                userProfile.verificationStatus = userProfile.verificationStatus || {};
                Object.keys(verificationStatusUpdate).forEach(key => {
                    userProfile.verificationStatus[key] = verificationStatusUpdate[key];
                });

                // Set final report status to "Not Received" when new docs are uploaded
                userProfile.verificationStatus.finalReport = 'Not Received';
            }
        } else {
            // For other roles, use the documents object
            userProfile.documents = {
                ...userProfile.documents,
                ...documents
            };

            // Set verification status to 'Pending' for uploaded documents
            userProfile.verificationStatus = userProfile.verificationStatus || {};
            Object.keys(documents).forEach(field => {
                userProfile.verificationStatus[field] = 'Pending';
            });
        }

        userProfile.documentUploadStatus = 'pending';
        userProfile.lastDocumentUpdate = new Date();

        await userProfile.save();

        res.status(200).json({
            message: 'Documents uploaded successfully!',
            data: {
                userId,
                role,
                documents: Object.keys(role === 'dietitian' ? filesUpdate : documents),
                verificationStatus: role === 'dietitian' ? userProfile.verificationStatus : undefined,
                uploadedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Document Upload Error:', error);
        res.status(500).json({
            message: 'Error uploading documents. Please try again.'
        });
    }
};

// VERIFY TOKEN CONTROLLER
exports.verifyTokenController = async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });

        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({ message: 'Valid', userId: decoded.userId, role: decoded.role });
    } catch (error) {
        res.status(401).json({ message: error.name === 'TokenExpiredError' ? 'Expired' : 'Invalid' });
    }
};

exports.changePasswordController = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Old password and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    try {
        // Employees use a separate model (Employee) with their own passwordHash
        const isEmployee = req.user.orgType === 'employee';
        let account;

        if (isEmployee) {
            account = await Employee.findById(req.user.employeeId);
        } else {
            account = await UserAuth.findById(req.user.userId);
        }

        if (!account) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, account.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        // Check if new password is same as old password
        const isSameAsOld = await bcrypt.compare(newPassword, account.passwordHash);
        if (isSameAsOld) {
            return res.status(400).json({ message: 'New password must be different from the current password.' });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        account.passwordHash = hashedPassword;
        await account.save();

        return res.status(200).json({
            message: 'Password changed successfully!',
            success: true
        });

    } catch (error) {
        console.error('Error during password change:', error);
        res.status(500).json({ message: 'Internal Server Error during password change.' });
    }
};

// VERIFY LOGIN OTP CONTROLLER (2FA Step 2)
exports.verifyLoginOTPController = async (req, res) => {
    const role = req.params.role;
    const { email, otp, rememberMe, orgType } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    try {
        // 1. Verify the OTP
        const otpVerification = otpService.verifyOTP(email, otp);
        if (!otpVerification.success) {
            return res.status(400).json({ message: otpVerification.message });
        }

        // 2. Handle Employee login OTP verification
        if (role === 'organization' && orgType === 'employee') {
            const employee = await Employee.findOne({ email, isDeleted: false });
            if (!employee) {
                return res.status(404).json({ message: 'Employee not found.' });
            }

            const expiresIn = rememberMe ? '7d' : '1d';
            const token = jwt.sign(
                { employeeId: employee._id, organizationId: employee.organizationId, role: 'organization', orgType: 'employee' },
                JWT_SECRET,
                { expiresIn }
            );

            return res.status(200).json({
                message: 'Login successful!',
                token,
                role: 'organization',
                orgType: 'employee',
                roleId: employee._id,
                name: employee.name,
                email: employee.email,
                expiresIn
            });
        }

        // 3. Handle regular user/admin/dietitian/organization login OTP verification
        const authUser = await UserAuth.findOne({ email, role });
        if (!authUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Fetch profile to get name for response
        const ProfileModel = PROFILE_MODELS[role];
        const profile = ProfileModel ? await ProfileModel.findById(authUser.roleId) : null;

        const expiresIn = rememberMe ? '7d' : '1d';
        const token = jwt.sign(
            { userId: authUser._id, role: authUser.role, roleId: authUser.roleId },
            JWT_SECRET,
            { expiresIn }
        );

        return res.status(200).json({
            message: 'Login successful!',
            token,
            role: authUser.role,
            roleId: authUser.roleId,
            name: profile?.name || '',
            email: authUser.email,
            expiresIn
        });

    } catch (error) {
        console.error(`Error during ${role} login OTP verification:`, error);
        res.status(500).json({ message: 'Internal Server Error during OTP verification.' });
    }
};

// RESEND LOGIN OTP CONTROLLER (2FA - Resend)
exports.resendLoginOTPController = async (req, res) => {
    const { email, role } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        const roleLabel = role ? (role.charAt(0).toUpperCase() + role.slice(1)) : '';
        const otpResult = await otpService.sendLoginOTP(email, roleLabel);

        if (otpResult.success) {
            return res.status(200).json({
                message: 'A new OTP has been sent to your email.',
                email: email
            });
        } else {
            console.error('Resend login OTP failed:', otpResult.error);
            return res.status(500).json({ message: 'Failed to resend OTP. Please try again.' });
        }
    } catch (error) {
        console.error('Error resending login OTP:', error);
        res.status(500).json({ message: 'Internal server error. Please try again.' });
    }
};

// REFRESH TOKEN CONTROLLER
// Issues a new JWT when the current one is still valid but close to expiry
exports.refreshTokenController = async (req, res) => {
    try {
        // req.user is set by authenticateJWT middleware
        const { userId, role, roleId, employeeId, organizationId, orgType } = req.user;

        // Issue a new token with same claims
        const payload = employeeId
            ? { employeeId, organizationId, role, orgType }
            : { userId, role, roleId };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        return res.status(200).json({
            success: true,
            token,
            message: 'Token refreshed successfully.'
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ message: 'Internal server error during token refresh.' });
    }
};
