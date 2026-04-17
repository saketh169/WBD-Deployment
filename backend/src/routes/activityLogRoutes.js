const express = require('express');
const router = express.Router();
const { ensureOrganizationAuthenticated, authenticateJWT } = require('../middlewares/authMiddleware');
const {
    logActivityFromFrontend,
    getEmployeeWorkSummary,
    getEmployeeActivities
} = require('../controllers/activityLogController');

/**
 * @swagger
 * /api/organization/log-activity:
 *   post:
 *     tags: ['ActivityLog']
 *     summary: Log user activity (employees only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activityType
 *               - targetId
 *               - targetType
 *               - targetName
 *               - status
 *             properties:
 *               activityType:
 *                 type: string
 *                 example: "blog_approved"
 *                 description: Type of activity (blog_approved, blog_rejected, verification_approved, verification_rejected)
 *               targetId:
 *                 type: string
 *                 example: "69c2cd872d49535fc169108f"
 *                 description: ID of the target (blog or dietitian)
 *               targetType:
 *                 type: string
 *                 example: "blog"
 *                 enum: [blog, dietitian]
 *               targetName:
 *                 type: string
 *                 example: "Healthy Eating Habits"
 *                 description: Display name of target
 *               status:
 *                 type: string
 *                 example: "approved"
 *                 enum: [approved, rejected, verified, flagged]
 *               notes:
 *                 type: string
 *                 example: "Approved blog and dismissed reports"
 *                 description: Additional notes (optional)
 *     responses:
 *       201:
 *         description: Activity logged successfully
 *       403:
 *         description: Only employees can log activities
 *       400:
 *         description: Missing organizationId or employeeId in token
 *       500:
 *         description: Failed to log activity
 */
// POST /api/organization/log-activity - Log an activity (employees can call this)
router.post('/log-activity', authenticateJWT, logActivityFromFrontend);

// Routes requiring organization authentication
router.use(ensureOrganizationAuthenticated);

/**
 * @swagger
 * /api/organization/employee-work-summary:
 *   get:
 *     tags: ['ActivityLog']
 *     summary: Get employee work summary
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Employee work summary retrieved
 *       403:
 *         description: Organization authentication required
 */
// GET /api/organization/employee-work-summary - Get summary of all employee work
router.get('/employee-work-summary', getEmployeeWorkSummary);

/**
 * @swagger
 * /api/organization/employee/{employeeId}/activities:
 *   get:
 *     tags: ['ActivityLog']
 *     summary: Get employee activities
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee activities retrieved
 *       403:
 *         description: Organization authentication required
 */
// GET /api/organization/employee/:employeeId/activities - Get detailed activities for specific employee
router.get('/employee/:employeeId/activities', getEmployeeActivities);

module.exports = router;
