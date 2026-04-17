const express = require('express');
const router = express.Router();
const { getPosts, createPost, deletePost } = require('../controllers/teamBoardController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

// All team board routes require a valid JWT
router.use(authenticateJWT);

// ==================== TEAM BOARD COLLABORATION ====================

/**
 * @swagger
 * /api/teamboard:
 *   get:
 *     tags: ['TeamBoard']
 *     summary: Get team board posts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orgName
 *         schema:
 *           type: string
 *         description: Organization name to filter posts
 *     responses:
 *       200:
 *         description: Team board posts retrieved
 */
// GET /api/teamboard?orgName=XYZ   — fetch posts for an org
router.get('/', getPosts);

/**
 * @swagger
 * /api/teamboard:
 *   post:
 *     tags: ['TeamBoard']
 *     summary: Create new team board post (employees and org admins only)
 *     description: Post to organization team board. orgName, author, email are automatically fetched from JWT token.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Great work on the new updates!"
 *                 description: The message content (required, 1-1000 characters)
 *               isOrg:
 *                 type: boolean
 *                 example: false
 *                 description: Set to true if posting as org admin, false if employee
 *     responses:
 *       201:
 *         description: Post created successfully. orgName, author, and email are populated from JWT token.
 *       400:
 *         description: Bad request - missing message or user is not employee/org admin
 *       401:
 *         description: Unauthorized - valid JWT token required
 *       403:
 *         description: Forbidden - isOrg flag does not match user type
 *       404:
 *         description: Employee or organization not found
 *       500:
 *         description: Server error creating post
 */
// POST /api/teamboard              — create a new post
router.post('/', createPost);

/**
 * @swagger
 * /api/teamboard/{id}:
 *   delete:
 *     tags: ['TeamBoard']
 *     summary: Delete team board post (owner or org admin only)
 *     description: Delete a post. Identity comes from JWT token.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team board post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized - valid JWT token required
 *       403:
 *         description: Forbidden - only post owner or org admin can delete
 *       404:
 *         description: Post not found or user profile not found
 *       500:
 *         description: Server error deleting post
 */
// DELETE /api/teamboard/:id        — delete a post (owner or org admin)
router.delete('/:id', deletePost);

module.exports = router;
