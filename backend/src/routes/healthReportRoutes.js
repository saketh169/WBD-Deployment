const express = require('express');
const router = express.Router();
const {
    createHealthReport,
    getHealthReports,
    getDietitianHealthReports,
    getClientHealthReports,
    markHealthReportViewed,
    healthReportUploadFields
} = require('../controllers/healthReportController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/health-reports/create:
 *   post:
 *     tags: ['Health Reports']
 *     summary: Create health report (dietitian to client)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - dietitianId
 *               - clientId
 *               - title
 *             properties:
 *               dietitianId:
 *                 type: string
 *               dietitianName:
 *                 type: string
 *               clientId:
 *                 type: string
 *               clientName:
 *                 type: string
 *               title:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               findings:
 *                 type: string
 *               dietaryRecommendations:
 *                 type: string
 *               lifestyleRecommendations:
 *                 type: string
 *               supplements:
 *                 type: string
 *               followUpInstructions:
 *                 type: string
 *               additionalNotes:
 *                 type: string
 *               healthReportFile1:
 *                 type: string
 *                 format: binary
 *               healthReportFile2:
 *                 type: string
 *                 format: binary
 *               healthReportFile3:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Health report created
 */
// Create health report (dietitian sends to client)
router.post('/create', authenticateJWT, healthReportUploadFields, createHealthReport);

/**
 * @swagger
 * /api/health-reports/client/{clientId}/dietitian/{dietitianId}:
 *   get:
 *     tags: ['Health Reports']
 *     summary: Get health reports for client from dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Health reports
 */
// Get health reports for a client from a specific dietitian
router.get('/client/:clientId/dietitian/:dietitianId', authenticateJWT, getHealthReports);

/**
 * @swagger
 * /api/health-reports/dietitian/{dietitianId}/client/{clientId}:
 *   get:
 *     tags: ['Health Reports']
 *     summary: Get all health reports sent by dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian's health reports
 */
// Get all health reports sent by a dietitian (optionally filtered by clientId)
router.get('/dietitian/:dietitianId/client/:clientId', authenticateJWT, getDietitianHealthReports);

/**
 * @swagger
 * /api/health-reports/client/{clientId}:
 *   get:
 *     tags: ['Health Reports']
 *     summary: Get all health reports for a client
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client health reports
 */
// Get all health reports for a client
router.get('/client/:clientId', authenticateJWT, getClientHealthReports);

/**
 * @swagger
 * /api/health-reports/{reportId}/viewed:
 *   put:
 *     tags: ['Health Reports']
 *     summary: Mark health report as viewed by client
 *     description: Changes health report status from 'sent' to 'viewed' when client opens it. Status flow - 'draft' (created) → 'sent' (shared) → 'viewed' (opened)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report marked as viewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: ['draft', 'sent', 'viewed']
 *                       example: 'viewed'
 *                       description: Report status (draft=created, sent=shared, viewed=opened)
 *       404:
 *         description: Health report not found
 *       401:
 *         description: Unauthorized - Valid JWT token required
 *       500:
 *         description: Internal server error
 */
// Mark report as viewed
router.put('/:reportId/viewed', authenticateJWT, markHealthReportViewed);

module.exports = router;
