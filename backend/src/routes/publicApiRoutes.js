const express = require('express');
const router = express.Router();
const { Dietitian } = require('../models/userModel');
const { Blog } = require('../models/blogModel');
const { cacheOrFetch } = require('../utils/redisClient');

/**
 * @swagger
 * /api/v1/public/dietitians:
 *   get:
 *     tags: ['B2B Public API']
 *     summary: List all verified dietitians (B2B endpoint)
 *     description: >
 *       Public API for partner applications to fetch available dietitians.
 *       No authentication required. Supports pagination, filtering by
 *       specialization and location.
 *     parameters:
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization domain
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
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
 *           maximum: 50
 *         description: Number of results per page (max 50)
 *     responses:
 *       200:
 *         description: Paginated list of dietitians
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
 *                       name:
 *                         type: string
 *                       specialization:
 *                         type: array
 *                         items:
 *                           type: string
 *                       experience:
 *                         type: number
 *                       fees:
 *                         type: number
 *                       location:
 *                         type: string
 *                       rating:
 *                         type: number
 *                       languages:
 *                         type: array
 *                         items:
 *                           type: string
 *                       about:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/dietitians', async (req, res) => {
  try {
    const { specialization, location, page = 1, limit = 10 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);
    const parsedPage = parseInt(page) || 1;

    const filter = { isDeleted: { $ne: true } };
    if (specialization) filter.specializationDomain = new RegExp(specialization, 'i');
    if (location) filter.location = new RegExp(location, 'i');

    const cacheKey = `public:dietitians:${specialization || ''}:${location || ''}:${parsedPage}:${parsedLimit}`;

    const result = await cacheOrFetch(cacheKey, 300, async () => {
      const dietitians = await Dietitian.find(filter)
        .select('name specialization experience fees location rating languages about profileImage')
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean();
      const total = await Dietitian.countDocuments(filter);

      return {
        data: dietitians,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          pages: Math.ceil(total / parsedLimit)
        }
      };
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Public API - Get dietitians error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dietitians', error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/public/blogs:
 *   get:
 *     tags: ['B2B Public API']
 *     summary: List published blog posts (B2B endpoint)
 *     description: >
 *       Public API for partner applications to fetch published blog content.
 *       No authentication required. Supports filtering by category.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: ['Nutrition Tips', 'Weight Management', 'Healthy Recipes', 'Fitness & Exercise', 'Mental Health & Wellness', 'Disease Management']
 *         description: Filter by blog category
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
 *           maximum: 50
 *         description: Number of results per page (max 50)
 *     responses:
 *       200:
 *         description: Paginated list of published blogs
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
 *                       title:
 *                         type: string
 *                       excerpt:
 *                         type: string
 *                       category:
 *                         type: string
 *                       author:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       views:
 *                         type: number
 *                       likesCount:
 *                         type: number
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get('/blogs', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);
    const parsedPage = parseInt(page) || 1;

    const filter = { isPublished: true, status: 'active' };
    if (category) filter.category = category;

    const cacheKey = `public:blogs:${category || 'all'}:${parsedPage}:${parsedLimit}`;

    const result = await cacheOrFetch(cacheKey, 300, async () => {
      const blogs = await Blog.find(filter)
        .select('title excerpt category author.name tags createdAt views likesCount featuredImage')
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean();
      const total = await Blog.countDocuments(filter);

      return {
        data: blogs,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          pages: Math.ceil(total / parsedLimit)
        }
      };
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Public API - Get blogs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blogs', error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/public/stats:
 *   get:
 *     tags: ['B2B Public API']
 *     summary: Platform statistics (B2B endpoint)
 *     description: Public API endpoint providing high-level platform metrics.
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalDietitians:
 *                       type: integer
 *                     totalBlogs:
 *                       type: integer
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await cacheOrFetch('public:stats', 600, async () => {
      const [totalDietitians, totalBlogs] = await Promise.all([
        Dietitian.countDocuments({ isDeleted: { $ne: true } }),
        Blog.countDocuments({ isPublished: true, status: 'active' })
      ]);

      return {
        totalDietitians,
        totalBlogs,
        categories: [
          'Nutrition Tips', 'Weight Management', 'Healthy Recipes',
          'Fitness & Exercise', 'Mental Health & Wellness', 'Disease Management'
        ]
      };
    });

    res.status(200).json({ success: true, stats: result });
  } catch (error) {
    console.error('Public API - Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
});

module.exports = router;
