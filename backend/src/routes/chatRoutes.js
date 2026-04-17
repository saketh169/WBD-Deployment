const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

/**
 * Chat Routes
 * Base path: /api/chat
 */

/**
 * @swagger
 * /api/chat/conversation:
 *   post:
 *     tags: ['Chat']
 *     summary: Get or create a conversation
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - dietitianId
 *             properties:
 *               clientId:
 *                 type: string
 *               dietitianId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation retrieved or created
 */
// POST /api/chat/conversation - Get or create a conversation
router.post('/conversation', authenticateJWT, chatController.getOrCreateConversation);

/**
 * @swagger
 * /api/chat/conversations/{userId}/{userType}:
 *   get:
 *     tags: ['Chat']
 *     summary: Get all conversations for a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User conversations list retrieved
 */
// GET /api/chat/conversations/:userId/:userType - Get all conversations for a user
router.get('/conversations/:userId/:userType', authenticateJWT, chatController.getUserConversations);

/**
 * @swagger
 * /api/chat/messages/{conversationId}:
 *   get:
 *     tags: ['Chat']
 *     summary: Get messages for a conversation
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation messages retrieved
 */
// GET /api/chat/messages/:conversationId - Get messages for a conversation
router.get('/messages/:conversationId', authenticateJWT, chatController.getMessages);

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     tags: ['Chat']
 *     summary: Send a message
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - senderType
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *               senderType:
 *                 type: string
 *                 enum: [client, dietitian]
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, video-link, lab-report, meal-preferences, consultation-report]
 *               videoLink:
 *                 type: string
 *               labReport:
 *                 type: object
 *               mealPreferences:
 *                 type: object
 *               consultationReport:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
// POST /api/chat/message - Send a message
router.post('/message', authenticateJWT, chatController.sendMessage);

/**
 * @swagger
 * /api/chat/message/{messageId}:
 *   put:
 *     tags: ['Chat']
 *     summary: Edit a message
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated successfully
 */
// PUT /api/chat/message/:messageId - Edit a message
router.put('/message/:messageId', authenticateJWT, chatController.editMessage);

/**
 * @swagger
 * /api/chat/message/{messageId}:
 *   delete:
 *     tags: ['Chat']
 *     summary: Delete a message
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
// DELETE /api/chat/message/:messageId - Delete a message
router.delete('/message/:messageId', authenticateJWT, chatController.deleteMessage);

/**
 * @swagger
 * /api/chat/read/{conversationId}:
 *   post:
 *     tags: ['Chat']
 *     summary: Mark messages as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
// POST /api/chat/read/:conversationId - Mark messages as read
router.post('/read/:conversationId', authenticateJWT, chatController.markAsRead);

module.exports = router;
