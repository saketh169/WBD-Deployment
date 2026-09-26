const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { checkChatbotLimit } = require('../middlewares/subscriptionMiddleware');
const { optionalAuthenticateJWT } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/chatbot/top-faqs:
 *   get:
 *     tags: ['Chatbot']
 *     summary: Get top 4 most clicked FAQs
 *     responses:
 *       200:
 *         description: List of top FAQs
 */
router.get('/top-faqs', chatbotController.getTopFAQs);

/**
 * @swagger
 * /api/chatbot/quick-question:
 *   post:
 *     tags: ['Chatbot']
 *     summary: Handle quick question chip click
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: FAQ answer
 */
router.post('/quick-question', chatbotController.quickQuestionClick);

/**
 * @swagger
 * /api/chatbot/message:
 *   post:
 *     tags: ['Chatbot']
 *     summary: Send a message to the chatbot
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chatbot response
 *       429:
 *         description: Daily chatbot query limit reached
 */
router.post('/message', optionalAuthenticateJWT, checkChatbotLimit, chatbotController.sendMessage);

/**
 * @swagger
 * /api/chatbot/history/{sessionId}:
 *   get:
 *     tags: ['Chatbot']
 *     summary: Get chat history for a session
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history
 */
router.get('/history/:sessionId', chatbotController.getChatHistory);

module.exports = router;
