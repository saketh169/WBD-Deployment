const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const {
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
} = require('../controllers/profileController');

/**
 * @swagger
 * /api/uploaduser:
 *   post:
 *     tags: ['Profile']
 *     summary: Upload user profile image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 */
// Profile Image Upload Routes — require authentication
router.post('/uploaduser', authenticateJWT, upload.single('profileImage'), uploadUserProfileImage);

/**
 * @swagger
 * /api/uploadadmin:
 *   post:
 *     tags: ['Profile']
 *     summary: Upload admin profile image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Admin profile image uploaded
 */
router.post('/uploadadmin', authenticateJWT, upload.single('profileImage'), uploadAdminProfileImage);

/**
 * @swagger
 * /api/uploaddietitian:
 *   post:
 *     tags: ['Profile']
 *     summary: Upload dietitian profile image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Dietitian profile image uploaded
 */
router.post('/uploaddietitian', authenticateJWT, upload.single('profileImage'), uploadDietitianProfileImage);

/**
 * @swagger
 * /api/uploadorganization:
 *   post:
 *     tags: ['Profile']
 *     summary: Upload organization profile image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Organization profile image uploaded
 */
router.post('/uploadorganization', authenticateJWT, upload.single('profileImage'), uploadOrganizationProfileImage);

/**
 * @swagger
 * /api/deleteuser:
 *   delete:
 *     tags: ['Profile']
 *     summary: Delete user profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile image deleted
 */
// Profile Image Delete Routes — require authentication
router.delete('/deleteuser', authenticateJWT, deleteUserProfileImage);

/**
 * @swagger
 * /api/deleteadmin:
 *   delete:
 *     tags: ['Profile']
 *     summary: Delete admin profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile image deleted
 */
router.delete('/deleteadmin', authenticateJWT, deleteAdminProfileImage);

/**
 * @swagger
 * /api/deletedietitian:
 *   delete:
 *     tags: ['Profile']
 *     summary: Delete dietitian profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dietitian profile image deleted
 */
router.delete('/deletedietitian', authenticateJWT, deleteDietitianProfileImage);

/**
 * @swagger
 * /api/deleteorganization:
 *   delete:
 *     tags: ['Profile']
 *     summary: Delete organization profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organization profile image deleted
 */
router.delete('/deleteorganization', authenticateJWT, deleteOrganizationProfileImage);

/**
 * @swagger
 * /api/getuser:
 *   get:
 *     tags: ['Profile']
 *     summary: Get user profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile image
 */
// Profile Image Retrieval Routes — require authentication
router.get('/getuser', authenticateJWT, getUserProfileImage);

/**
 * @swagger
 * /api/getadmin:
 *   get:
 *     tags: ['Profile']
 *     summary: Get admin profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile image
 */
router.get('/getadmin', authenticateJWT, getAdminProfileImage);

/**
 * @swagger
 * /api/getdietitian:
 *   get:
 *     tags: ['Profile']
 *     summary: Get dietitian profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dietitian profile image
 */
router.get('/getdietitian', authenticateJWT, getDietitianProfileImage);

/**
 * @swagger
 * /api/getorganization:
 *   get:
 *     tags: ['Profile']
 *     summary: Get organization profile image
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organization profile image
 */
router.get('/getorganization', authenticateJWT, getOrganizationProfileImage);

/**
 * @swagger
 * /api/getuserdetails:
 *   get:
 *     tags: ['Profile']
 *     summary: Get user profile details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 */
// Unified User Details Routes — require authentication
router.get('/getuserdetails', authenticateJWT, getUserDetails);

/**
 * @swagger
 * /api/getdietitiandetails:
 *   get:
 *     tags: ['Profile']
 *     summary: Get dietitian profile details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dietitian profile details
 */
router.get('/getdietitiandetails', authenticateJWT, getDietitianDetails);

/**
 * @swagger
 * /api/getadmindetails:
 *   get:
 *     tags: ['Profile']
 *     summary: Get admin profile details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile details
 */
router.get('/getadmindetails', authenticateJWT, getAdminDetails);

/**
 * @swagger
 * /api/getorganizationdetails:
 *   get:
 *     tags: ['Profile']
 *     summary: Get organization profile details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organization profile details
 */
router.get('/getorganizationdetails', authenticateJWT, getOrganizationDetails);

/**
 * @swagger
 * /api/update-profile:
 *   put:
 *     tags: ['Profile']
 *     summary: Update user profile information
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
// Update Profile Route — require authentication
router.put('/update-profile', authenticateJWT, updateUserProfile);

/**
 * @swagger
 * /api/subscription-status:
 *   get:
 *     tags: ['Profile']
 *     summary: Get user subscription status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status information
 */
// Subscription Status Route
const { getSubscriptionStatus } = require('../middlewares/subscriptionMiddleware');
router.get('/subscription-status', authenticateJWT, getSubscriptionStatus);


module.exports = router;
