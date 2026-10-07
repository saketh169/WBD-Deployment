const express = require('express');
const router = express.Router();
const { Dietitian, User, Organization } = require('../models/userModel');
const { Blog } = require('../models/blogModel');
const MealPlan = require('../models/mealPlanModel');
const { optionalAuthenticateJWT } = require('../middlewares/authMiddleware');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags: ['Search']
 *     summary: Global search across dietitians, blogs, users, mealplans, and organizations
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query text
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Maximum records per category
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/', optionalAuthenticateJWT, async (req, res) => {
  try {
    const { q = '', limit = 3 } = req.query;
    const trimmed = String(q).trim();

    if (!trimmed || trimmed.length < 2) {
      return res.status(200).json({
        success: true,
        query: trimmed,
        results: {
          dietitians: [],
          blogs: [],
          users: [],
          mealplans: [],
          organizations: []
        }
      });
    }

    const maxLimit = Math.max(1, Math.min(parseInt(limit, 10) || 3, 20));
    const safeRegex = new RegExp(escapeRegex(trimmed), 'i');

    const [dietitians, blogs, users, mealplans, organizations] = await Promise.all([
      // 1. Dietitians: verified & active
      Dietitian.find({
        isDeleted: { $ne: true },
        $or: [
          { name: safeRegex },
          { specializationDomain: safeRegex },
          { specialization: safeRegex },
          { specialties: safeRegex },
          { location: safeRegex },
          { about: safeRegex }
        ]
      })
        .select('_id name specializationDomain profileImage location about')
        .limit(maxLimit)
        .lean(),

      // 2. Blogs: active/published
      Blog.find({
        isPublished: true,
        status: { $ne: 'removed' },
        $or: [
          { title: safeRegex },
          { excerpt: safeRegex },
          { category: safeRegex },
          { tags: safeRegex }
        ]
      })
        .select('_id title excerpt category views featuredImage')
        .limit(maxLimit)
        .lean(),

      // 3. Clients / Users
      User.find({
        isDeleted: { $ne: true },
        $or: [
          { name: safeRegex },
          { address: safeRegex }
        ]
      })
        .select('_id name profileImage address')
        .limit(maxLimit)
        .lean(),

      // 4. Meal Plans
      MealPlan.find({
        $or: [
          { planName: safeRegex },
          { dietType: safeRegex },
          { notes: safeRegex }
        ]
      })
        .select('_id planName dietType calories notes imageUrl')
        .limit(maxLimit)
        .lean(),

      // 5. Organizations
      Organization.find({
        isDeleted: { $ne: true },
        $or: [
          { name: safeRegex },
          { organizationType: safeRegex },
          { address: safeRegex }
        ]
      })
        .select('_id name organizationType address profileImage')
        .limit(maxLimit)
        .lean()
    ]);

    // Map fields cleanly for frontend consumers
    const formattedDietitians = (dietitians || []).map((d) => ({
      _id: d._id,
      name: d.name,
      specializationDomain: d.specializationDomain || 'Nutrition Specialist',
      profileImage: d.profileImage || null,
      location: d.location || 'Online'
    }));

    const formattedBlogs = (blogs || []).map((b) => ({
      _id: b._id,
      title: b.title,
      excerpt: b.excerpt || '',
      category: b.category || 'General',
      views: b.views || 0,
      featuredImage: b.featuredImage?.url || null
    }));

    const formattedUsers = (users || []).map((u) => ({
      _id: u._id,
      name: u.name,
      profileImage: u.profileImage || null,
      location: u.address || ''
    }));

    const formattedMealPlans = (mealplans || []).map((m) => ({
      _id: m._id,
      planName: m.planName,
      dietType: m.dietType || 'Custom',
      calories: m.calories || 0,
      notes: m.notes || '',
      imageUrl: m.imageUrl || null
    }));

    const formattedOrganizations = (organizations || []).map((o) => ({
      _id: o._id,
      organizationName: o.name,
      industry: o.organizationType || 'Healthcare',
      domain: o.address || 'Health & Nutrition',
      profileImage: o.profileImage || null
    }));

    return res.status(200).json({
      success: true,
      query: trimmed,
      results: {
        dietitians: formattedDietitians,
        blogs: formattedBlogs,
        users: formattedUsers,
        mealplans: formattedMealPlans,
        organizations: formattedOrganizations
      }
    });
  } catch (error) {
    console.error('Global search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Global search failed',
      error: error.message
    });
  }
});

module.exports = router;
