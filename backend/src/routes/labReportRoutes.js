const express = require('express');
const router = express.Router();
const {
    submitLabReport,
    getClientLabReports,
    getLabReportsByClient,
    updateLabReportStatus,
    uploadFields
} = require('../controllers/labReportController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/lab-reports/lab/submit:
 *   post:
 *     tags: ['Lab Reports']
 *     summary: Submit lab report
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - submittedCategories
 *             properties:
 *               clientName:
 *                 type: string
 *               clientAge:
 *                 type: number
 *               clientPhone:
 *                 type: string
 *               clientAddress:
 *                 type: string
 *               clientId:
 *                 type: string
 *               dietitianId:
 *                 type: string
 *               submittedCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *               hormonalProfileReport:
 *                 type: string
 *                 format: binary
 *               endocrineReport:
 *                 type: string
 *                 format: binary
 *               generalHealthReport:
 *                 type: string
 *                 format: binary
 *               bloodTestReport:
 *                 type: string
 *                 format: binary
 *               bloodSugarReport:
 *                 type: string
 *                 format: binary
 *               diabetesReport:
 *                 type: string
 *                 format: binary
 *               thyroidReport:
 *                 type: string
 *                 format: binary
 *               cardiacHealthReport:
 *                 type: string
 *                 format: binary
 *               cardiovascularReport:
 *                 type: string
 *                 format: binary
 *               ecgReport:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Lab report submitted
 */
// Submit lab report (client)
router.post('/lab/submit', authenticateJWT, uploadFields, submitLabReport);

/**
 * @swagger
 * /api/lab-reports/client/{clientId}/dietitian/{dietitianId}:
 *   get:
 *     tags: ['Lab Reports']
 *     summary: Get lab reports for client from dietitian
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
 *         description: Lab reports
 */
// Get lab reports for a client (filtered by client and dietitian)
router.get('/client/:clientId/dietitian/:dietitianId', authenticateJWT, getClientLabReports);

/**
 * @swagger
 * /api/lab-reports/lab/client/{clientId}:
 *   get:
 *     tags: ['Lab Reports']
 *     summary: Get lab reports for a specific client
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
 *         description: Client lab reports
 */
// Get lab reports for a specific client (for dietitians)
router.get('/lab/client/:clientId', authenticateJWT, getLabReportsByClient);

/**
 * @swagger
 * /api/lab-reports/lab/{reportId}/status:
 *   put:
 *     tags: ['Lab Reports']
 *     summary: Update lab report status (dietitian only)
 *     description: |
 *       Update the status of a lab report. Valid status values are:
 *       - 'submitted': Initial status when lab report is first created
 *       - 'pending_review': Report is waiting for dietitian review
 *       - 'reviewed': Report has been reviewed by a dietitian. When status is set to 'reviewed', the system automatically records the dietitian who reviewed it with timestamp.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lab report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['submitted', 'pending_review', 'reviewed']
 *                 description: New status for the lab report
 *               feedback:
 *                 type: string
 *                 description: Optional feedback or notes from dietitian (stored in 'notes' field)
 *     responses:
 *       200:
 *         description: Lab report status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Lab report updated successfully"
 *                 data:
 *                   type: object
 *                   description: Updated lab report object with reviewedBy field populated when status is 'reviewed'
 *       404:
 *         description: Lab report not found
 *       401:
 *         description: Unauthorized - JWT token required
 */
// Update lab report status (for dietitians) - requires authentication
router.put('/lab/:reportId/status', authenticateJWT, updateLabReportStatus);

module.exports = router;