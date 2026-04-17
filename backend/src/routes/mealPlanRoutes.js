const express = require('express');
const router = express.Router();
const mealPlanController = require('../controllers/mealPlanController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkMealPlanLimit } = require('../middlewares/subscriptionMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateJWT);

/**
 * MEAL PLAN ROUTES
 * Base path: /api/meal-plans
 */

/**
 * @swagger
 * /api/meal-plans:
 *   post:
 *     tags: ['Meal Plans']
 *     summary: Create a new meal plan
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planName
 *               - dietType
 *               - calories
 *               - userId
 *             properties:
 *               planName:
 *                 type: string
 *               dietType:
 *                 type: string
 *               calories:
 *                 type: number
 *               notes:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               userId:
 *                 type: string
 *               meals:
 *                 type: array
 *     responses:
 *       201:
 *         description: Meal plan created
 *       429:
 *         description: Meal plan limit reached
 */
// Create a new meal plan (with subscription limit check)
router.post('/', checkMealPlanLimit, mealPlanController.createMealPlan);

/**
 * @swagger
 * /api/meal-plans/user/{userId}:
 *   get:
 *     tags: ['Meal Plans']
 *     summary: Get all meal plans for a user
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
 *         description: User's meal plans
 */
// Get all meal plans for a user
router.get('/user/:userId', mealPlanController.getUserMealPlans);

/**
 * @swagger
 * /api/meal-plans/dietitian/{dietitianId}/client/{userId}:
 *   get:
 *     tags: ['Meal Plans']
 *     summary: Get dietitian's meal plans for a specific client
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client meal plans from dietitian
 */
// Get all meal plans for a dietitian's specific client
router.get('/dietitian/:dietitianId/client/:userId', mealPlanController.getDietitianClientMealPlans);

/**
 * @swagger
 * /api/meal-plans/{planId}:
 *   get:
 *     tags: ['Meal Plans']
 *     summary: Get specific meal plan by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal plan details
 */
// Get a specific meal plan by ID
router.get('/:planId', mealPlanController.getMealPlanById);

/**
 * @swagger
 * /api/meal-plans/{planId}:
 *   put:
 *     tags: ['Meal Plans']
 *     summary: Update a meal plan
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
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
 *         description: Meal plan updated
 */
// Update a meal plan
router.put('/:planId', mealPlanController.updateMealPlan);

/**
 * @swagger
 * /api/meal-plans/{planId}/assign:
 *   post:
 *     tags: ['Meal Plans']
 *     summary: Assign meal plan to dates
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
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
 *               dates:
 *                 type: array
 *     responses:
 *       200:
 *         description: Meal plan assigned to dates
 */
// Assign meal plan to dates
router.post('/:planId/assign', mealPlanController.assignMealPlanToDates);

/**
 * @swagger
 * /api/meal-plans/{planId}/dates:
 *   delete:
 *     tags: ['Meal Plans']
 *     summary: Remove meal plan from dates
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal plan removed from dates
 */
// Remove meal plan from dates
router.delete('/:planId/dates', mealPlanController.removeMealPlanFromDates);

/**
 * @swagger
 * /api/meal-plans/{planId}:
 *   delete:
 *     tags: ['Meal Plans']
 *     summary: Delete a meal plan (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal plan deleted
 */
// Delete a meal plan (soft delete)
router.delete('/:planId', mealPlanController.deleteMealPlan);

module.exports = router;