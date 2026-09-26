const express = require('express');
const router = express.Router();
const {
    getUsersByRole,
    removeUser,
    getRemovedAccounts,
    restoreAccount,
    getUserDetails,
    permanentDeleteAccount
} = require('../controllers/crudController');
const { authenticateJWT, ensureAdminAuthenticated } = require('../middlewares/authMiddleware');

const adminAuth = [authenticateJWT, ensureAdminAuthenticated];

/**
 * @swagger
 * /api/crud/{role}-list:
 *   get:
 *     tags: ['Crud']
 *     summary: Get all users by role
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['user', 'admin', 'dietitian', 'organization', 'employee']
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users list retrieved
 *       403:
 *         description: Admin access required
 */
// Get all users by role (with optional search)
router.get('/crud/:role-list', ...adminAuth, getUsersByRole);

/**
 * @swagger
 * /api/crud/{role}-list/search:
 *   get:
 *     tags: ['Crud']
 *     summary: Search users by role
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/crud/:role-list/search', ...adminAuth, getUsersByRole);

/**
 * @swagger
 * /api/crud/{role}-list/{id}:
 *   get:
 *     tags: ['Crud']
 *     summary: Get user details by role and ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved
 *       404:
 *         description: User not found
 */
// Get user details
router.get('/crud/:role-list/:id', ...adminAuth, getUserDetails);

/**
 * @swagger
 * /api/crud/{role}-list/{id}:
 *   delete:
 *     tags: ['Crud']
 *     summary: Soft delete user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Admin access required
 */
// Remove a user
router.delete('/crud/:role-list/:id', ...adminAuth, removeUser);

/**
 * @swagger
 * /api/crud/removed-accounts:
 *   get:
 *     tags: ['Crud']
 *     summary: Get removed user accounts
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Removed accounts retrieved
 *       403:
 *         description: Admin access required
 */
// Get removed accounts
router.get('/crud/removed-accounts', ...adminAuth, getRemovedAccounts);

/**
 * @swagger
 * /api/crud/removed-accounts/search:
 *   get:
 *     tags: ['Crud']
 *     summary: Search removed accounts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results retrieved
 *       403:
 *         description: Admin access required
 */
router.get('/crud/removed-accounts/search', ...adminAuth, getRemovedAccounts);

/**
 * @swagger
 * /api/crud/removed-accounts/{id}/restore:
 *   post:
 *     tags: ['Crud']
 *     summary: Restore removed account
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
 *         description: Account restored
 *       403:
 *         description: Admin access required
 */
// Restore a removed account
router.post('/crud/removed-accounts/:id/restore', ...adminAuth, restoreAccount);

/**
 * @swagger
 * /api/crud/removed-accounts/{id}:
 *   delete:
 *     tags: ['Crud']
 *     summary: Permanently delete removed account
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
 *         description: Account permanently deleted
 *       403:
 *         description: Admin access required
 */
// Permanently delete a removed account
router.delete('/crud/removed-accounts/:id', ...adminAuth, permanentDeleteAccount);

module.exports = router;