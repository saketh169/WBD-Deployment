const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

/**
 * NOTIFICATION/ANALYTICS ROUTES
 * Base path: /api/analytics
 */

/**
 * @swagger
 * /api/analytics/user/{userId}:
 *   get:
 *     tags: ['Notifications']
 *     summary: Get user dashboard data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User dashboard data retrieved
 */
// GET /api/analytics/user/:userId
router.get('/user/:userId', authenticateJWT, notificationController.getUserDashboardData);

/**
 * @swagger
 * /api/analytics/user/{userId}/activities:
 *   get:
 *     tags: ['Notifications']
 *     summary: Get all user activities
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activities list retrieved
 */
// GET /api/analytics/user/:userId/activities
router.get('/user/:userId/activities', authenticateJWT, notificationController.getUserAllActivities);

/**
 * @swagger
 * /api/analytics/dietitian/{dietitianId}:
 *   get:
 *     tags: ['Notifications']
 *     summary: Get dietitian dashboard data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian dashboard data retrieved
 */
// GET /api/analytics/dietitian/:dietitianId
router.get('/dietitian/:dietitianId', authenticateJWT, notificationController.getDietitianDashboardData);

/**
 * @swagger
 * /api/analytics/dietitian/{dietitianId}/activities:
 *   get:
 *     tags: ['Notifications']
 *     summary: Get all dietitian activities
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian activities list retrieved
 */
// GET /api/analytics/dietitian/:dietitianId/activities
router.get('/dietitian/:dietitianId/activities', authenticateJWT, notificationController.getDietitianAllActivities);

module.exports = router;
