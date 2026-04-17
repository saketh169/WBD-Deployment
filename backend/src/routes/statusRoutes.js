const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middlewares/authMiddleware');
const {
    getDietitianStatus,
    getOrganizationStatus,
    getEmployeeOrgStatus
} = require('../controllers/statusController');

// ==================== VERIFICATION STATUS ROUTES ====================

/**
 * @swagger
 * /api/status/dietitian-status:
 *   get:
 *     tags: ['Status']
 *     summary: Get dietitian verification status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dietitian status retrieved
 */
// Dietitian routes — require authentication
router.get('/dietitian-status', authenticateJWT, getDietitianStatus);

/**
 * @swagger
 * /api/status/organization-status:
 *   get:
 *     tags: ['Status']
 *     summary: Get organization verification status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organization status retrieved
 */
// Organization routes — require authentication
router.get('/organization-status', authenticateJWT, getOrganizationStatus);

/**
 * @swagger
 * /api/status/employee-org-status:
 *   get:
 *     tags: ['Status']
 *     summary: Get employee organization verification status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Employee organization status retrieved
 */
// Employee routes — check parent organization verification
router.get('/employee-org-status', authenticateJWT, getEmployeeOrgStatus);

module.exports = router;
