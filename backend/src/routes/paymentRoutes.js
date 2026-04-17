const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

// All payment routes require authentication
router.use(authenticateJWT);

/**
 * @swagger
 * /api/payments/initialize:
 *   post:
 *     tags: ['Payments']
 *     summary: Initialize a new payment transaction
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *               - billingCycle
 *               - amount
 *               - paymentMethod
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [basic, premium, ultimate]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, netbanking, upi, emi]
 *               paymentDetails:
 *                 type: object
 *                 description: Optional method-specific details (cardLast4/cardType, bankName, upiId/upiApp, emiBank/emiTenure/emiMonthlyAmount)
 *     responses:
 *       201:
 *         description: Payment initialized successfully
 *       400:
 *         description: Invalid input
 */
router.post('/initialize', paymentController.initializePayment);

/**
 * @swagger
 * /api/payments/process/{paymentId}:
 *   post:
 *     tags: ['Payments']
 *     summary: Process a payment transaction
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Payment processing failed
 */
router.post('/process/:paymentId', paymentController.processPayment);

/**
 * @swagger
 * /api/payments/verify/{transactionId}:
 *   get:
 *     tags: ['Payments']
 *     summary: Verify payment status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verification result
 *       404:
 *         description: Transaction not found
 */
router.get('/verify/:transactionId', paymentController.verifyPayment);

/**
 * @swagger
 * /api/payments/subscription/active:
 *   get:
 *     tags: ['Payments']
 *     summary: Get active subscription for logged-in user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Active subscription details
 *       404:
 *         description: No active subscription
 */
router.get('/subscription/active', paymentController.getActiveSubscription);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     tags: ['Payments']
 *     summary: Get payment history for logged-in user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/history', paymentController.getPaymentHistory);

/**
 * @swagger
 * /api/payments/subscription/cancel:
 *   post:
 *     tags: ['Payments']
 *     summary: Cancel active subscription
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       400:
 *         description: Cancellation failed
 */
router.post('/subscription/cancel', paymentController.cancelSubscription);

/**
 * @swagger
 * /api/payments/analytics:
 *   get:
 *     tags: ['Payments']
 *     summary: Get payment analytics for logged-in user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment analytics data
 */
router.get('/analytics', paymentController.getPaymentAnalytics);

module.exports = router;
