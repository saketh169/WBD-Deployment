const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, sendPolicyEmail } = require('../controllers/settingsController');
const { authenticateJWT, ensureAdminAuthenticated } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/settings:
 *   get:
 *     tags: ['Settings']
 *     summary: Get platform settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Platform settings retrieved
 *       401:
 *         description: Authentication required
 */
router.get('/', authenticateJWT, getSettings);

/**
 * @swagger
 * /api/settings:
 *   put:
 *     tags: ['Settings']
 *     summary: Update platform settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       403:
 *         description: Admin access required
 */
router.put('/', authenticateJWT, ensureAdminAuthenticated, updateSettings);

/**
 * @swagger
 * /api/settings/send-email:
 *   post:
 *     tags: ['Settings']
 *     summary: Send policy email
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailType:
 *                 type: string
 *               recipients:
 *                 type: array
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       403:
 *         description: Admin access required
 */
router.post('/send-email', authenticateJWT, ensureAdminAuthenticated, sendPolicyEmail);

module.exports = router;