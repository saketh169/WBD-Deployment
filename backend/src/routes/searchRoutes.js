const express = require('express');
const router = express.Router();
const { Dietitian, User, Organization } = require('../models/userModel');
const { Blog } = require('../models/blogModel');
const MealPlan = require('../models/mealPlanModel');
const { searchElastic } = require('../utils/elasticClient');

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags: ['Search']
 *     summary: Global search across dietitians, users, and blogs
 *     description: >
 *       Full-text search powered by MongoDB text indexes.
 *       Searches across dietitian profiles (name, specialization, about, location)
 *       and blog posts (title, content, tags).
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query string (minimum 2 characters)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, dietitians, blogs, users, mealplans, organizations]
 *           default: all
 *         description: Filter results by entity type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 query:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     dietitians:
 *                       type: array
 *                       items:
 *                         type: object
 *                     blogs:
 *                       type: array
 *                       items:
 *                         type: object
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                     mealplans:
 *                       type: array
 *                       items:
 *                         type: object
 *                     organizations:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Search query too short
 */
const { authenticateJWT } = require('../middlewares/authMiddleware');

router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 10 } = req.query;
    const requestingUserId = req.user?.roleId || req.user?.userId;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchOptions = { limit, requestingUserId };
    
    // Execute search through Elasticsearch directly
    let results = {
      dietitians: [],
      blogs: [],
      users: [],
      mealplans: [],
      organizations: [],
      payments: [],
      labreports: [],
      healthreports: []
    };

    const searchTasks = [];

    if (type === 'all' || type === 'dietitians') {
      searchTasks.push(searchElastic(q, 'dietitians', searchOptions, skip).then(res => { if(res) results.dietitians = res; }));
    }
    if (type === 'all' || type === 'blogs') {
      searchTasks.push(searchElastic(q, 'blogs', searchOptions, skip).then(res => { if(res) results.blogs = res; }));
    }
    if (type === 'all' || type === 'users') {
      searchTasks.push(searchElastic(q, 'users', searchOptions, skip).then(res => { if(res) results.users = res; }));
    }
    if (type === 'all' || type === 'mealplans') {
      searchTasks.push(searchElastic(q, 'mealplans', searchOptions, skip).then(res => { if(res) results.mealplans = res; }));
    }
    if (type === 'all' || type === 'organizations') {
      searchTasks.push(searchElastic(q, 'organizations', searchOptions, skip).then(res => { if(res) results.organizations = res; }));
    }
    if (type === 'all' || type === 'payments') {
      searchTasks.push(searchElastic(q, 'payments', searchOptions, skip).then(res => { if(res) results.payments = res; }));
    }
    if (type === 'all' || type === 'labreports') {
      searchTasks.push(searchElastic(q, 'labreports', searchOptions, skip).then(res => { if(res) results.labreports = res; }));
    }
    if (type === 'all' || type === 'healthreports') {
      searchTasks.push(searchElastic(q, 'healthreports', searchOptions, skip).then(res => { if(res) results.healthreports = res; }));
    }

    await Promise.all(searchTasks);

    // Map properties for existing types
    results.dietitians = results.dietitians.map(d => ({ _id: d.entityId, name: d.title, specializationDomain: d.tags, about: d.description, profileImage: d.imageUrl, location: d.metadata }));
    results.blogs = results.blogs.map(b => ({ _id: b.entityId, title: b.title, excerpt: b.description, tags: [b.tags], featuredImage: b.imageUrl, category: b.metadata.split(' ')[0] }));
    results.users = results.users.map(u => ({ _id: u.entityId, name: u.title, location: u.description, profileImage: u.imageUrl }));
    results.mealplans = results.mealplans.map(m => ({ _id: m.entityId, planName: m.title, dietType: m.tags, notes: m.description, imageUrl: m.imageUrl, calories: m.metadata.split(' ')[0] }));
    results.organizations = results.organizations.map(o => ({ _id: o.entityId, organizationName: o.title, industry: o.tags, domain: o.description, profileImage: o.imageUrl, location: o.metadata }));
    
    // Private record mapping
    results.payments = results.payments.map(p => ({ _id: p.entityId, title: p.title, status: p.description, transactionId: p.tags, orderId: p.metadata }));
    results.labreports = results.labreports.map(lr => ({ _id: lr.entityId, title: lr.title, notes: lr.description, categories: lr.tags, status: lr.metadata }));
    results.healthreports = results.healthreports.map(hr => ({ _id: hr.entityId, title: hr.title, diagnosis: hr.description, status: hr.tags, info: hr.metadata }));

    res.status(200).json({
      success: true,
      query: q,
      type,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

module.exports = router;
