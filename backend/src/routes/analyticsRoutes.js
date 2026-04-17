const express = require('express');
const router = express.Router();
const {
    getUsersList,
    getUserGrowth,
    getDietitiansList,
    getVerifyingOrganizations,
    getAllOrganizations,
    getActiveDietPlans,
    getSubscriptions,
    getMembershipRevenue,
    getConsultationRevenue,
    getRevenueAnalytics,
    getDietitianRevenue,
    getUserRevenue
} = require('../controllers/analyticsController');
const { authenticateJWT, ensureAdminAuthenticated } = require('../middlewares/authMiddleware');

const adminAuth = [authenticateJWT, ensureAdminAuthenticated];

// ==================== ADMIN ANALYTICS ROUTES ====================

/**
 * @swagger
 * /api/users-list:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get total count of all registered users
 *     description: Returns the total number of registered users in the system
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Total user count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of registered users
 *                   example: 150
 *       401:
 *         description: Unauthorized - Valid JWT token required
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
// Analytics routes
router.get('/users-list', ...adminAuth, getUsersList);

/**
 * @swagger
 * /api/user-growth:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get user growth statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User growth data
 */
router.get('/user-growth', ...adminAuth, getUserGrowth);

/**
 * @swagger
 * /api/dietitian-list:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get list of all dietitians
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dietitians list
 */
router.get('/dietitian-list', ...adminAuth, getDietitiansList);

/**
 * @swagger
 * /api/verifying-organizations:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get organizations pending verification
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organizations pending verification
 */
router.get('/verifying-organizations', ...adminAuth, getVerifyingOrganizations);

/**
 * @swagger
 * /api/organizations-list:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get list of all organizations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organizations list
 */
router.get('/organizations-list', ...adminAuth, getAllOrganizations);

/**
 * @swagger
 * /api/active-diet-plans:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get active diet plans statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Active diet plans data
 */
router.get('/active-diet-plans', ...adminAuth, getActiveDietPlans);

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get all subscriptions/memberships with user details
 *     description: Lists all active subscriptions with user info, plan type, dates, and payment status. Use for displaying membership data.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of subscription records with user and payment details
 *       401:
 *         description: Unauthorized - Valid JWT token required
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/subscriptions', ...adminAuth, getSubscriptions);

// Membership revenue endpoint - removed from swagger
router.get('/membership-revenue', ...adminAuth, getMembershipRevenue);

/**
 * @swagger
 * /api/consultation-revenue:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get consultation revenue analytics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Consultation revenue data
 */
router.get('/consultation-revenue', ...adminAuth, getConsultationRevenue);

/**
 * @swagger
 * /api/revenue-analytics:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get overall revenue analytics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue analytics
 */
router.get('/revenue-analytics', ...adminAuth, getRevenueAnalytics);

/**
 * @swagger
 * /api/dietitian-revenue:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get dietitian revenue breakdown
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dietitian revenue data
 */
router.get('/dietitian-revenue', ...adminAuth, getDietitianRevenue);

/**
 * @swagger
 * /api/user-revenue:
 *   get:
 *     tags: ['Analytics']
 *     summary: Get user (subscription) revenue
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User revenue data
 */
router.get('/user-revenue', ...adminAuth, getUserRevenue);

module.exports = router;
