const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkProgressLimit, getUserSubscription, PROGRESS_PLAN_ACCESS } = require('../middlewares/subscriptionMiddleware');

/**
 * @swagger
 * /api/user-progress:
 *   get:
 *     tags: ['Progress']
 *     summary: Get all progress entries for user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User progress entries
 */
// GET all progress entries
router.get('/user-progress', authenticateJWT, progressController.getProgressController);

/**
 * @swagger
 * /api/user-progress/filter:
 *   get:
 *     tags: ['Progress']
 *     summary: Get progress entries filtered by plan
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Filtered progress entries
 */
// GET progress by plan filter
router.get('/user-progress/filter', authenticateJWT, progressController.getProgressByPlanController);

/**
 * @swagger
 * /api/user-progress/stats:
 *   get:
 *     tags: ['Progress']
 *     summary: Get statistics for a specific plan
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Plan statistics
 */
// GET stats for a specific plan
router.get('/user-progress/stats', authenticateJWT, progressController.getPlanStatsController);

/**
 * @swagger
 * /api/user-progress/subscription-info:
 *   get:
 *     tags: ['Progress']
 *     summary: Get subscription info and accessible plans
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription and plan access information
 */
// GET subscription info for progress - returns accessible plans
router.get('/user-progress/subscription-info', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;
    const subscriptionInfo = await getUserSubscription(userId);
    
    // Get accessible plans based on subscription tier
    const accessiblePlans = subscriptionInfo.limits.progressPlans || PROGRESS_PLAN_ACCESS.free;
    
    // Get count of user's progress entries
    const Progress = require('../models/progressModel');
    const totalEntries = await Progress.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        planType: subscriptionInfo.planType,
        hasSubscription: subscriptionInfo.hasSubscription,
        accessiblePlans: accessiblePlans,
        allPlans: PROGRESS_PLAN_ACCESS,
        totalEntries: totalEntries
      }
    });
  } catch (error) {
    console.error('Error fetching progress subscription info:', error);
    res.status(500).json({ success: false, message: 'Error fetching subscription info' });
  }
});

/**
 * @swagger
 * /api/user-progress:
 *   post:
 *     tags: ['Progress']
 *     summary: Create new progress entry
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *               - goal
 *               - days
 *             properties:
 *               plan:
 *                 type: string
 *               weight:
 *                 type: number
 *               waterIntake:
 *                 type: number
 *               calories:
 *                 type: number
 *               steps:
 *                 type: number
 *               goal:
 *                 type: string
 *               days:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Progress entry created
 *       429:
 *         description: Progress entry limit reached
 */
// POST create new progress entry (with subscription check)
router.post('/user-progress', authenticateJWT, checkProgressLimit, progressController.createProgressController);

/**
 * @swagger
 * /api/user-progress/{id}:
 *   delete:
 *     tags: ['Progress']
 *     summary: Delete a progress entry
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
 *         description: Progress entry deleted
 */
// DELETE progress entry
router.delete('/user-progress/:id', authenticateJWT, progressController.deleteProgressController);

module.exports = router;
