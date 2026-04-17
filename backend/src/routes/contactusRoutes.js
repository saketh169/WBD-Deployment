const express = require('express');
const router = express.Router();
const {
  submitContact,
  submitEmployeeContact,
  getAllQueries,
  replyToQuery,
  replyToEmployeeQuery,
  getEmployeeQueries,
  getEmployeeResolvedQueries,
  getMyQueries,
} = require('../controllers/contactusController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

// Middleware to restrict to organisation admin role (not employees)
const requireOrganization = (req, res, next) => {
  if (req.user.role !== 'organization') {
    return res.status(403).json({ success: false, message: 'Access denied. Organizations only.' });
  }
  if (req.user.orgType === 'employee') {
    return res.status(403).json({ success: false, message: 'Access denied. Organization admins only.' });
  }
  next();
};

/**
 * @swagger
 * /api/contact/submit:
 *   post:
 *     tags: ['ContactUs']
 *     summary: "[PUBLIC USERS] Submit contact query to admin"
 *     description: "Unauthenticated endpoint for public users (registered users, dietitians, organizations) to submit queries to global admin."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *               - query
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               role:
 *                 type: string
 *                 enum: [User, Dietitian, Certifying Organization, Others]
 *                 example: "User"
 *               query:
 *                 type: string
 *                 example: "[Verification Issue] Need help with license\n\nPlease assist with verification process"
 *     responses:
 *       200:
 *         description: Query submitted successfully
 *       400:
 *         description: Validation error - missing required fields
 *       500:
 *         description: Server error
 */
// POST route for submitting contact queries
router.post('/submit', submitContact);

/**
 * @swagger
 * /api/contact/employee/submit:
 *   post:
 *     tags: ['ContactUs']
 *     summary: "[EMPLOYEE] Submit query to organization admin"
 *     description: "Authenticated endpoint for employees to submit queries to their own organization admin. Employee identity verified via JWT token."
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "License verification pending"
 *               message:
 *                 type: string
 *                 example: "I submitted my license on March 15, 2026 but haven't received confirmation yet."
 *               category:
 *                 type: string
 *                 example: "Verification Issue"
 *                 description: Query category (optional, default is General)
 *     responses:
 *       200:
 *         description: Query submitted successfully
 *       400:
 *         description: Missing subject or message
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Employee authentication required
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
// POST route for employees to submit query to their organization
router.post('/employee/submit', authenticateJWT, submitEmployeeContact);

/**
 * @swagger
 * /api/contact/queries-list:
 *   get:
 *     tags: ['ContactUs']
 *     summary: "[ADMIN] View all public user queries"
 *     description: "Admin fetches all queries from public users (via /submit endpoint). Returns user/dietitian/organization queries only, excludes employee queries."
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin queries retrieved
 *       401:
 *         description: Authentication required
 */
// GET route for fetching admin queries (public user submissions only)
router.get('/queries-list', authenticateJWT, getAllQueries);

/**
 * @swagger
 * /api/contact/reply:
 *   post:
 *     tags: ['ContactUs']
 *     summary: "[ADMIN] Reply to public user query"
 *     description: "Admin sends reply to public user (via /submit endpoint) queries only."
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queryId
 *               - replyMessage
 *             properties:
 *               queryId:
 *                 type: string
 *                 example: "65a1b2c3d4e5f6g7h8i9j0k1"
 *               replyMessage:
 *                 type: string
 *                 example: "Thank you for your inquiry. Your license verification is in progress and should be completed by March 31, 2026."
 *     responses:
 *       200:
 *         description: Reply sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reply sent successfully."
 *       400:
 *         description: Missing queryId or replyMessage
 *       401:
 *         description: Admin authentication required
 *       404:
 *         description: Public user query not found
 *       500:
 *         description: Server error or email sending failed
 */
// POST route for admin to reply to public user queries
router.post('/reply', authenticateJWT, replyToQuery);

/**
 * @swagger
 * /api/contact/employee-reply:
 *   post:
 *     tags: ['ContactUs']
 *     summary: "[ORG ADMIN] Reply to employee query"
 *     description: "Organization admin sends reply to employee queries. Can only reply to queries from their own organization."
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queryId
 *               - replyMessage
 *             properties:
 *               queryId:
 *                 type: string
 *                 example: "65a1b2c3d4e5f6g7h8i9j0k1"
 *               replyMessage:
 *                 type: string
 *                 example: "Your license verification is complete. Please check your email for details."
 *     responses:
 *       200:
 *         description: Reply sent successfully to employee
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reply sent successfully."
 *       400:
 *         description: Missing queryId or replyMessage
 *       401:
 *         description: Authentication required
 *       403:
 *         description: "Organization admin access required or query from different organization"
 *       404:
 *         description: Employee query not found
 *       500:
 *         description: Server error or email sending failed
 */
// POST route for org admin to reply to employee queries
router.post('/employee-reply', authenticateJWT, requireOrganization, replyToEmployeeQuery);



/**
 * @swagger
 * /api/contact/employee-queries:
 *   get:
 *     tags: ['ContactUs']
 *     summary: "[ORG ADMIN] View pending employee queries"
 *     description: "Organization admin fetches only pending queries from their own employees. Shows queries awaiting organization admin's response."
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pending employee queries retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       category:
 *                         type: string
 *                       query:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *       403:
 *         description: Organization admin access required
 */
// GET route for org to fetch pending employee queries
router.get('/employee-queries', authenticateJWT, requireOrganization, getEmployeeQueries);

/**
 * @swagger
 * /api/contact/employee-resolved-queries:
 *   get:
 *     tags: ['ContactUs']
 *     summary: "[ORG ADMIN] View resolved employee queries"
 *     description: "Organization admin fetches resolved queries from their own employees. Shows only queries that have been answered by the admin."
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Resolved employee queries retrieved
 *       403:
 *         description: Organization admin access required
 */
// GET route for org to fetch RESOLVED employee queries
router.get('/employee-resolved-queries', authenticateJWT, requireOrganization, getEmployeeResolvedQueries);

/**
 * @swagger
 * /api/contact/my-queries:
 *   get:
 *     tags: ['ContactUs']
 *     summary: "[EMPLOYEE] View my submitted queries"
 *     description: "Employee fetches all their own submitted queries (pending and resolved). Shows admin replies when available."
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Employee's queries retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       category:
 *                         type: string
 *                       query:
 *                         type: string
 *                       admin_reply:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       replied_at:
 *                         type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Employee authentication required
 */
// GET route for individual employee to fetch their own queries
router.get('/my-queries', authenticateJWT, getMyQueries);

module.exports = router;