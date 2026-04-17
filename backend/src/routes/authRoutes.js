const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const forgotPasswordController = require('../controllers/forgotPasswordController');
const upload = require('../middlewares/uploadMiddleware');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { authRateLimiter, otpRateLimiter } = require('../middlewares/securityMiddleware');

/**
 * Middleware utility to explicitly set req.params.role based on the route path.
 */
const injectRole = (role) => (req, res, next) => {
    req.params.role = role;
    next();
};

/**
 * @swagger
 * /api/signup/user:
 *   post:
 *     tags: ['Auth']
 *     summary: User registration
 *     description: Register a new user with complete profile information. All fields are required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - dob
 *               - gender
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 50
 *                 description: Full name (5-50 characters, letters/spaces/dots/underscores)
 *               email:
 *                 type: string
 *                 format: email
 *                 minLength: 10
 *                 maxLength: 50
 *                 description: Email address (10-50 characters)
 *               phone:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: 10-digit phone number
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 20
 *                 description: Password (6-20 characters)
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Date of birth (user must be at least 10 years old)
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Gender
 *               address:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 description: Address (5-200 characters)
 *           example:
 *             name: "Test User"
 *             email: "user@test.com"
 *             phone: "9876543210"
 *             password: "Password123"
 *             dob: "1990-05-15"
 *             gender: "male"
 *             address: "Chennai, India"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 name:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 role:
 *                   type: string
 *                 roleId:
 *                   type: string
 *       400:
 *         description: Invalid or missing required fields
 *       409:
 *         description: Email, phone, or name already registered
 */
// 1. User Signup Route: POST /api/signup/user
router.post('/signup/user',
    authRateLimiter,
    injectRole('user'),
    authController.signupController
);

/**
 * @swagger
 * /api/signup/admin:
 *   post:
 *     tags: ['Auth']
 *     summary: Admin registration
 *     description: Register a new admin with complete profile information. All fields are required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - dob
 *               - gender
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 50
 *                 description: Full name (5-50 characters)
 *               email:
 *                 type: string
 *                 format: email
 *                 minLength: 10
 *                 maxLength: 50
 *                 description: Email address (10-50 characters)
 *               phone:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: 10-digit phone number
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 20
 *                 description: Password (6-20 characters)
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Date of birth (minimum 10 years old)
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Gender
 *               address:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 description: Address (5-200 characters)
 *           example:
 *             name: "Super Admin"
 *             email: "admin@nutriconnect.com"
 *             phone: "9876543211"
 *             password: "Password123"
 *             dob: "1985-03-20"
 *             gender: "male"
 *             address: "Delhi, India"
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 name:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 role:
 *                   type: string
 *                 roleId:
 *                   type: string
 *       400:
 *         description: Invalid or missing required fields
 *       409:
 *         description: Email, phone, or name already registered
 */
// 2. Admin Signup Route: POST /api/signup/admin
router.post('/signup/admin',
    authRateLimiter,
    injectRole('admin'),
    authController.signupController
);

/**
 * @swagger
 * /api/signup/dietitian:
 *   post:
 *     tags: ['Auth']
 *     summary: Dietitian registration
 *     description: Register a new dietitian with credentials and license information. All fields are required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - age
 *               - password
 *               - licenseNumber
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 50
 *                 description: Full name (5-50 characters)
 *               email:
 *                 type: string
 *                 format: email
 *                 minLength: 10
 *                 maxLength: 50
 *                 description: Email address (10-50 characters)
 *               age:
 *                 type: number
 *                 minimum: 18
 *                 description: Dietitian age (minimum 18 years)
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 20
 *                 description: Password (6-20 characters)
 *               phone:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: 10-digit phone number (optional)
 *               licenseNumber:
 *                 type: string
 *                 pattern: '^DLN[0-9]{6}$'
 *                 description: 'License number format: DLN followed by 6 digits (e.g., DLN123456)'
 *           example:
 *             name: "Dr. Sarah"
 *             email: "sarah@clinic.com"
 *             age: 35
 *             password: "Password123"
 *             phone: "9876543212"
 *             licenseNumber: "DLN123456"
 *     responses:
 *       201:
 *         description: Dietitian registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 name:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 role:
 *                   type: string
 *                 roleId:
 *                   type: string
 *       400:
 *         description: Invalid or missing required fields
 *       409:
 *         description: Email, name, or license number already registered
 */
// 3. Dietitian Signup Route: POST /api/signup/dietitian
router.post('/signup/dietitian',
    authRateLimiter,
    injectRole('dietitian'),
    authController.signupController
);

/**
 * @swagger
 * /api/signup/organization:
 *   post:
 *     tags: ['Auth']
 *     summary: Organization registration
 *     description: Register a new organization with license and organizational details. All fields are required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - licenseNumber
 *               - organizationType
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 50
 *                 description: Organization name (5-50 characters). Note - Frontend sends as "name", not "organizationName"
 *               email:
 *                 type: string
 *                 format: email
 *                 minLength: 10
 *                 maxLength: 50
 *                 description: Email address (10-50 characters)
 *               phone:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: 10-digit phone number
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 20
 *                 description: Password (6-20 characters)
 *               licenseNumber:
 *                 type: string
 *                 pattern: '^OLN[0-9]{6}$'
 *                 description: 'Organization license number format: OLN followed by 6 digits (e.g., OLN123456)'
 *               organizationType:
 *                 type: string
 *                 enum: [private, ppo, freelancing, ngo, government, other]
 *                 description: Type of organization
 *               address:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 description: Organization address (5-200 characters)
 *           example:
 *             name: "City Hospital"
 *             email: "contact@cityhospital.com"
 *             phone: "9876543213"
 *             password: "Password123"
 *             licenseNumber: "OLN123456"
 *             organizationType: "private"
 *             address: "Mumbai, India"
 *     responses:
 *       201:
 *         description: Organization registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 name:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 role:
 *                   type: string
 *                 roleId:
 *                   type: string
 *       400:
 *         description: Invalid or missing required fields
 *       409:
 *         description: Email, name, or license number already registered
 */
// 4. Organization Signup Route: POST /api/signup/organization
router.post('/signup/organization',
    authRateLimiter,
    injectRole('organization'),
    authController.signupController
);

/**
 * @swagger
 * /api/signin/user:
 *   post:
 *     tags: ['Auth']
 *     summary: User login (Step 1 - sends OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *           example:
 *             email: "user@test.com"
 *             password: "Password123"
 *     responses:
 *       200:
 *         description: Credentials verified, OTP sent to email. Call /api/verify-login-otp/{role} to get JWT.
 *       401:
 *         description: Invalid credentials
 */
// 6. User Signin Route: POST /api/signin/user
router.post('/signin/user',
    authRateLimiter,
    injectRole('user'),
    authController.signinController
);

/**
 * @swagger
 * /api/signin/admin:
 *   post:
 *     tags: ['Auth']
 *     summary: Admin login (Step 1 - sends OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               adminKey:
 *                 type: string
 *           example:
 *             email: "admin@nutriconnect.com"
 *             password: "Password123"
 *             adminKey: "TOP_SECRET"
 *     responses:
 *       200:
 *         description: Credentials verified, OTP sent to email. Call /api/verify-login-otp/{role} to get JWT.
 *       401:
 *         description: Invalid credentials
 */
// 7. Admin Signin Route: POST /api/signin/admin
router.post('/signin/admin',
    authRateLimiter,
    injectRole('admin'),
    authController.signinController
);

/**
 * @swagger
 * /api/signin/dietitian:
 *   post:
 *     tags: ['Auth']
 *     summary: Dietitian login (Step 1 - sends OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *           example:
 *             email: "sarah@clinic.com"
 *             password: "Password123"
 *             licenseNumber: "DLN123456"
 *     responses:
 *       200:
 *         description: Credentials verified, OTP sent to email. Call /api/verify-login-otp/{role} to get JWT.
 */
// 8. Dietitian Signin Route: POST /api/signin/dietitian
router.post('/signin/dietitian',
    authRateLimiter,
    injectRole('dietitian'),
    authController.signinController
);

/**
 * @swagger
 * /api/signin/organization:
 *   post:
 *     tags: ['Auth']
 *     summary: Organization login (Step 1 - sends OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               orgType:
 *                 type: string
 *                 enum: [organization, employee]
 *           examples:
 *             organization-admin:
 *               summary: Organization Admin Signin
 *               value:
 *                 email: "contact@cityhospital.com"
 *                 password: "Password123"
 *                 licenseNumber: "OLN123456"
 *                 orgType: "organization"
 *             employee:
 *               summary: Employee Signin
 *               value:
 *                 email: "employee@cityhospital.com"
 *                 password: "EmployeePass123"
 *                 licenseNumber: "ORG123456"
 *                 orgType: "employee"
 *     responses:
 *       200:
 *         description: Credentials verified, OTP sent to email. Call /api/verify-login-otp/{role} to get JWT.
 */
// 9. Organization Signin Route: POST /api/signin/organization
router.post('/signin/organization',
    authRateLimiter,
    injectRole('organization'),
    authController.signinController
);

/**
 * @swagger
 * /api/documents/upload/dietitian:
 *   post:
 *     tags: ['Auth']
 *     summary: Upload dietitian documents (certificates, qualifications)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume/CV file (Required)
 *               degreeCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Degree certificate (Required)
 *               licenseDocument:
 *                 type: string
 *                 format: binary
 *                 description: Professional license document (Required)
 *               idProof:
 *                 type: string
 *                 format: binary
 *                 description: Government ID proof (Required)
 *               experienceCertificates:
 *                 type: string
 *                 format: binary
 *                 description: Experience certificates (Optional)
 *               specializationCertifications:
 *                 type: string
 *                 format: binary
 *                 description: Specialization certifications (Optional)
 *               internshipCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Internship certificate (Optional)
 *               researchPapers:
 *                 type: string
 *                 format: binary
 *                 description: Research papers/publications (Optional)
 *               finalReport:
 *                 type: string
 *                 format: binary
 *                 description: Final assessment report (Optional)
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 *       401:
 *         description: Unauthorized
 */
// 11. Dietitian Document Upload: POST /api/documents/upload/dietitian
router.post('/documents/upload/dietitian',
    authenticateJWT,
    injectRole('dietitian'),
    upload.any(),
    authController.docUploadController
);

/**
 * @swagger
 * /api/documents/upload/organization:
 *   post:
 *     tags: ['Auth']
 *     summary: Upload organization documents (registration, certifications)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               orgLogo:
 *                 type: string
 *                 format: binary
 *                 description: Organization logo (Required)
 *               orgBrochure:
 *                 type: string
 *                 format: binary
 *                 description: Organization brochure (Optional)
 *               legalDocument:
 *                 type: string
 *                 format: binary
 *                 description: Legal registration document (Required)
 *               taxDocument:
 *                 type: string
 *                 format: binary
 *                 description: Tax certificate/document (Required)
 *               addressProof:
 *                 type: string
 *                 format: binary
 *                 description: Address proof document (Optional)
 *               businessLicense:
 *                 type: string
 *                 format: binary
 *                 description: Business license (Required)
 *               authorizedRepId:
 *                 type: string
 *                 format: binary
 *                 description: Authorized representative ID (Required)
 *               bankDocument:
 *                 type: string
 *                 format: binary
 *                 description: Bank account document (Optional)
 *               finalReport:
 *                 type: string
 *                 format: binary
 *                 description: Final verification report (Optional)
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 */
// 12. Organization Document Upload: POST /api/documents/upload/organization
router.post('/documents/upload/organization',
    authenticateJWT,
    injectRole('organization'),
    upload.any(),
    authController.docUploadController
);

/**
 * @swagger
 * /api/verify-token:
 *   get:
 *     tags: ['Auth']
 *     summary: Verify if JWT token is valid
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Valid"
 *                 userId:
 *                   type: string
 *                   description: User ID from token
 *                   example: "507f1f77bcf86cd799439011"
 *                 role:
 *                   type: string
 *                   enum: [user, admin, dietitian, organization]
 *                   description: User role from token
 *                   example: "user"
 *       401:
 *         description: Token is invalid or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   enum: [Expired, Invalid]
 *                   example: "Expired"
 */
// 14. Verify Token: GET /api/verify-token (Check if JWT is valid/expired)
router.get('/verify-token', authController.verifyTokenController);

/**
 * @swagger
 * /api/change-password:
 *   post:
 *     tags: ['Auth']
 *     summary: Change user password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Unauthorized or old password incorrect
 */
// 15. Change Password: POST /api/change-password (Requires authenticated user)
router.post('/change-password', authenticateJWT, authController.changePasswordController);

/**
 * @swagger
 * /api/forgot-password/{role}:
 *   post:
 *     tags: ['Auth']
 *     summary: Request password reset via OTP
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user, admin, dietitian, organization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email
 */
// 16. Forgot Password: POST /api/forgot-password/:role (Send OTP to email for specific role)
router.post('/forgot-password/:role', otpRateLimiter, forgotPasswordController.forgotPasswordController);

/**
 * @swagger
 * /api/reset-password/{role}:
 *   post:
 *     tags: ['Auth']
 *     summary: Reset password using OTP
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [user, admin, dietitian, organization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
// 17. Reset Password: POST /api/reset-password/:role (Reset password with OTP for specific role)
router.post('/reset-password/:role', authRateLimiter, forgotPasswordController.resetPasswordController);

/**
 * @swagger
 * /api/verify-login-otp/{role}:
 *   post:
 *     tags: ['Auth']
 *     summary: Verify OTP for 2FA login (Step 2 - returns JWT)
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *               orgType:
 *                 type: string
 *                 enum: [organization, employee]
 *     responses:
 *       200:
 *         description: OTP verified, JWT token returned
 */
// 18. Verify Login OTP: POST /api/verify-login-otp/:role (2FA - verify OTP and get JWT)
router.post('/verify-login-otp/:role', authRateLimiter, authController.verifyLoginOTPController);

/**
 * @swagger
 * /api/resend-login-otp:
 *   post:
 *     tags: ['Auth']
 *     summary: Resend OTP for login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin, dietitian, organization]
 *     responses:
 *       200:
 *         description: OTP resent to email
 */
// 19. Resend Login OTP: POST /api/resend-login-otp (2FA - resend OTP, rate limited)
router.post('/resend-login-otp', otpRateLimiter, authController.resendLoginOTPController);

/**
 * @swagger
 * /api/refresh-token:
 *   post:
 *     tags: ['Auth']
 *     summary: Refresh JWT token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: New JWT token returned
 *       401:
 *         description: Unauthorized
 */
// 20. Refresh Token: POST /api/refresh-token (requires valid JWT)
router.post('/refresh-token', authenticateJWT, authController.refreshTokenController);

module.exports = router;
