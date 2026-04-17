const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticateJWT, optionalAuthenticateJWT } = require('../middlewares/authMiddleware');
const { 
    canCreateBlog, 
    isOrganization 
} = require('../middlewares/blogMiddleware');
const { 
    uploadBlogImage, 
    uploadToCloudinary 
} = require('../middlewares/cloudinaryMiddleware');
const { checkBlogLimit } = require('../middlewares/subscriptionMiddleware');

/**
 * @swagger
 * /api/blogs/categories:
 *   get:
 *     tags: ['Blog']
 *     summary: Get all blog categories
 *     responses:
 *       200:
 *         description: List of blog categories
 */
// Get all blog categories
router.get('/categories', blogController.getCategories);

/**
 * @swagger
 * /api/blogs:
 *   get:
 *     tags: ['Blog']
 *     summary: Get all blogs with optional filters
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of blogs
 */
// Get all blogs (with filters) - Optional auth to check likes
router.get('/', optionalAuthenticateJWT, blogController.getAllBlogs);

/**
 * @swagger
 * /api/blogs/moderation/reported:
 *   get:
 *     tags: ['Blog']
 *     summary: Get reported blogs (organization only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of reported blogs
 *       403:
 *         description: Forbidden - organization access required
 */
// Get reported blogs (organization/employee only) — keep above dynamic :id route to avoid shadowing
router.get('/moderation/reported', authenticateJWT, isOrganization, blogController.getReportedBlogs);

/**
 * @swagger
 * /api/blogs:
 *   post:
 *     tags: ['Blog']
 *     summary: Create new blog post
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               excerpt:
 *                 type: string
 *               featuredImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Blog created successfully
 *       429:
 *         description: Blog creation limit reached
 */
// Create new blog post (only users and dietitians with subscription check)
router.post(
    '/', 
    authenticateJWT,
    canCreateBlog,
    checkBlogLimit,
    uploadBlogImage.single('featuredImage'),
    uploadToCloudinary,
    blogController.createBlog
);

/**
 * @swagger
 * /api/blogs/my/blogs:
 *   get:
 *     tags: ['Blog']
 *     summary: Get current user's blogs
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's blogs
 */
// Get user's own blogs
router.get('/my/blogs', authenticateJWT, blogController.getMyBlogs);

/**
 * @swagger
 * /api/blogs/{id}:
 *   put:
 *     tags: ['Blog']
 *     summary: Update blog post (author only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Blog updated successfully
 *       403:
 *         description: Not authorized to update
 */
// Update blog post (only author)
router.put(
    '/:id', 
    authenticateJWT,
    uploadBlogImage.single('featuredImage'),
    uploadToCloudinary,
    blogController.updateBlog
);

/**
 * @swagger
 * /api/blogs/{id}:
 *   delete:
 *     tags: ['Blog']
 *     summary: Delete blog post (author or organization)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog deleted
 */
// Delete blog post (author or organization)
router.delete('/:id', authenticateJWT, blogController.deleteBlog);

/**
 * @swagger
 * /api/blogs/{id}/like:
 *   post:
 *     tags: ['Blog']
 *     summary: Like/Unlike blog post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like status toggled
 */
// Like/Unlike blog post
router.post('/:id/like', authenticateJWT, blogController.toggleLike);

/**
 * @swagger
 * /api/blogs/{id}/comments:
 *   post:
 *     tags: ['Blog']
 *     summary: Add comment to blog post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *       201:
 *         description: Comment added
 */
// Add comment to blog post
router.post('/:id/comments', authenticateJWT, blogController.addComment);

/**
 * @swagger
 * /api/blogs/{id}/comments/{commentId}:
 *   delete:
 *     tags: ['Blog']
 *     summary: Delete comment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 */
// Delete comment
router.delete('/:id/comments/:commentId', authenticateJWT, blogController.deleteComment);

/**
 * @swagger
 * /api/blogs/{id}/report:
 *   post:
 *     tags: ['Blog']
 *     summary: Report blog post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Blog reported
 */
// Report blog post
router.post('/:id/report', authenticateJWT, blogController.reportBlog);

/**
 * @swagger
 * /api/blogs/{id}/moderation/dismiss:
 *   put:
 *     tags: ['Blog']
 *     summary: Dismiss reports for a blog (organization only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reports dismissed
 */
// Dismiss reports for a blog (organization/employee)
router.put('/:id/moderation/dismiss', authenticateJWT, isOrganization, blogController.dismissReports);

/**
 * @swagger
 * /api/blogs/{id}:
 *   get:
 *     tags: ['Blog']
 *     summary: Get single blog by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog details
 */
// Get single blog by ID - Optional auth to check likes (keep after more specific routes)
router.get('/:id', optionalAuthenticateJWT, blogController.getBlogById);

// Delete reported blog (organization only) - Uses same delete endpoint
// Organization role is checked in the controller

module.exports = router;
