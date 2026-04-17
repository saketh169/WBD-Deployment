const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { checkChatbotLimit } = require('../middlewares/subscriptionMiddleware');
const { optionalAuthenticateJWT } = require('../middlewares/authMiddleware');

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
// 1. Send Message Route: POST /api/chatbot/message (with subscription limit check)
// optionalAuthenticateJWT decodes JWT if present so checkChatbotLimit sees the real plan
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
// 2. Get Chat History Route: GET /api/chatbot/history/:sessionId
// Retrieves chat history for a specific session
router.get('/history/:sessionId', chatbotController.getChatHistory);

module.exports = router;
