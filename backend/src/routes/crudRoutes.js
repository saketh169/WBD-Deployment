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

// Get all consultations for a dietitian (admin view)
router.get('/crud/admin/dietitian/:dietitianId/consultations', ...adminAuth, async (req, res) => {
  try {
    const { dietitianId } = req.params;
    const mongoose = require('mongoose');
    const BookingModel = require('../models/bookingModel');
    
    // Validate if dietitianId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(dietitianId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dietitian ID'
      });
    }

    const consultations = await BookingModel.find({ dietitianId: new mongoose.Types.ObjectId(dietitianId) })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    if (!consultations || consultations.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No consultations found for this dietitian'
      });
    }

    return res.json({
      success: true,
      data: consultations,
      count: consultations.length
    });
  } catch (error) {
    console.error('Error fetching dietitian consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consultations'
    });
  }
});

/**
 * @swagger
 * /api/crud/admin/user/{userId}/consultations:
 *   get:
 *     tags: ['Crud Admin']
 *     summary: Get all consultations for a user (Admin view)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User consultations retrieved
 *       403:
 *         description: Admin access required
 */
// Get all consultations for a user (admin view)
router.get('/crud/admin/user/:userId/consultations', ...adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const mongoose = require('mongoose');
    const BookingModel = require('../models/bookingModel');
    
    // Validate if userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const consultations = await BookingModel.find({ userId: new mongoose.Types.ObjectId(userId) })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    if (!consultations || consultations.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No consultations found for this user'
      });
    }

    return res.json({
      success: true,
      data: consultations,
      count: consultations.length
    });
  } catch (error) {
    console.error('Error fetching user consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consultations'
    });
  }
});

/**
 * @swagger
 * /api/crud/admin/organization/{organizationId}/employees:
 *   get:
 *     tags: ['Crud Admin']
 *     summary: Get all employees for an organization (Admin view)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization employees retrieved
 *       403:
 *         description: Admin access required
 */
// Get all employees for an organization (admin view)
router.get('/crud/admin/organization/:organizationId/employees', ...adminAuth, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const mongoose = require('mongoose');
    const { Employee } = require('../models/userModel');
    const BookingModel = require('../models/bookingModel');
    const { Blog } = require('../models/blogModel');
    
    // Validate if organizationId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization ID'
      });
    }
    
    // Get all employees for this organization
    const employees = await Employee.find({ 
      organizationId: new mongoose.Types.ObjectId(organizationId),
      isDeleted: false 
    })
      .select('name email contact licenseNumber status')
      .lean();

    if (!employees || employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No employees found for this organization'
      });
    }

    // Get ActivityLog for tracking employee work
    const ActivityLog = require('../models/activityLogModel');

    // Get detailed info for each employee including their verification and blog moderation work
    const employeeDetails = await Promise.all(
      employees.map(async (employee) => {
        try {
          // Count verifications done by this employee (verification_approved + verification_rejected)
          const verificationsCount = await ActivityLog.countDocuments({
            employeeId: employee._id,
            activityType: { $in: ['verification_approved', 'verification_rejected'] }
          });
          
          // Count blog moderations done by this employee (blog_approved + blog_rejected + blog_flagged)
          const blogModerationsCount = await ActivityLog.countDocuments({
            employeeId: employee._id,
            activityType: { $in: ['blog_approved', 'blog_rejected', 'blog_flagged'] }
          });

          return {
            ...employee,
            verificationsCount,
            blogModerationsCount,
            verificationStatus: {
              finalReport: employee.status === 'active' ? 'Verified' : employee.status === 'inactive' ? 'Rejected' : 'Pending'
            }
          };
        } catch (err) {
          console.error('Error fetching employee details:', err);
          return {
            ...employee,
            verificationsCount: 0,
            blogModerationsCount: 0,
            verificationStatus: {
              finalReport: 'Unknown'
            }
          };
        }
      })
    );

    return res.json({
      success: true,
      data: employeeDetails,
      count: employeeDetails.length
    });
  } catch (error) {
    console.error('Error fetching organization employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees'
    });
  }
});

module.exports = router;