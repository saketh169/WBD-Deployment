const { Blog } = require('../models/blogModel');
const { User, Dietitian, Admin, Organization, Employee } = require('../models/userModel');
const { cacheOrFetch, invalidateCache } = require('../utils/redisClient');
const { searchElastic } = require('../utils/elasticClient');

// Helper: extract profile ID from JWT payload
const getProfileId = (user) => user.roleId || user.employeeId;

// Helper: look up user's display name from DB
const getUserName = async (user) => {
    try {
        let Model;
        const profileId = getProfileId(user);
        if (user.employeeId) {
            Model = Employee;
        } else {
            const models = { user: User, dietitian: Dietitian, admin: Admin, organization: Organization };
            Model = models[user.role];
        }
        if (!Model || !profileId) return 'Unknown';
        const doc = await Model.findById(profileId).select('name');
        return doc ? doc.name : 'Unknown';
    } catch {
        return 'Unknown';
    }
};
// CREATE BLOG POST
exports.createBlog = async (req, res) => {
    try {
        const { title, content, category, tags, excerpt } = req.body;
        const userId = getProfileId(req.user);
        const userRole = req.user.role;

        // Validate that only users and dietitians can create blogs
        if (!['user', 'dietitian'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Only users and dietitians can create blog posts'
            });
        }

        const userName = await getUserName(req.user);

        // Handle featured image from request
        let featuredImage = null;
        if (req.cloudinaryResult) {
            featuredImage = {
                url: req.cloudinaryResult.secure_url,
                publicId: req.cloudinaryResult.public_id
            };
        }

        // Create new blog
        const newBlog = new Blog({
            title,
            content,
            excerpt,
            category,
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
            author: {
                userId,
                name: userName,
                role: userRole
            },
            featuredImage
        });

        await newBlog.save();

        // Invalidate blog cache on create
        await invalidateCache('blogs:*');

        res.status(201).json({
            success: true,
            message: 'Blog post created successfully',
            blog: newBlog
        });
    } catch (error) {
        console.error('Create blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create blog post'
        });
    }
};
// GET ALL BLOGS (with filters)
exports.getAllBlogs = async (req, res) => {
    try {
        const {
            category,
            search,
            sortBy = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        // Build filter query
        const filter = {
            isPublished: true,
            status: 'active'
        };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (search) {
            // Use high-performance Elasticsearch instead of MongoDB text search
            const elasticResults = await searchElastic(search, 'blogs', { 
                limit: 100, 
                requestingUserId: req.user ? getProfileId(req.user) : null 
            });

            if (elasticResults && elasticResults.length > 0) {
                const elasticIds = elasticResults.map(doc => doc.entityId);
                filter._id = { $in: elasticIds };
            } else if (elasticResults === null) {
                // Fallback to MongoDB regex if Elastic is down
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } }
                ];
            } else {
                // Elastic is up but no results found
                filter._id = { $in: [] }; // Force empty result
            }
        }

        // Sorting
        const sortOptions = {};
        sortOptions[sortBy] = order === 'asc' ? 1 : -1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Redis cache key based on query parameters
        const cacheKey = `blogs:list:${category || 'all'}:${search || ''}:${sortBy}:${order}:${page}:${limit}`;

        const result = await cacheOrFetch(cacheKey, 300, async () => {
            const blogs = await Blog.find(filter)
                .sort(sortOptions)
                .limit(parseInt(limit))
                .skip(skip)
                .select('-reports') // Don't include reports in public view
                .lean();

            const total = await Blog.countDocuments(filter);

            return {
                blogs,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get blogs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog posts'
        });
    }
};
// GET SINGLE BLOG BY ID
exports.getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate MongoDB ObjectId
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID format'
            });
        }

        const blog = await Blog.findById(id)
            .select('-reports'); // Don't include reports in public view

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Check if blog is accessible
        if (!blog.isPublished || blog.status !== 'active') {
            // Only author can view unpublished or removed blogs
            if (req.user && getProfileId(req.user)?.toString() === blog.author.userId.toString()) {
                // Allow author to view
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'This blog post is not available'
                });
            }
        }

        // Increment view count
        blog.views += 1;
        await blog.save();

        res.status(200).json({
            success: true,
            blog
        });
    } catch (error) {
        console.error('Get blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog post'
        });
    }
};
// UPDATE BLOG POST
exports.updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, tags, excerpt, isPublished } = req.body;
        const userId = getProfileId(req.user);
        
        // Validate MongoDB ObjectId
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID format'
            });
        }

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Check if user is the author
        if (blog.author.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to edit this blog post'
            });
        }

        // Update fields
        if (title) blog.title = title;
        if (content) blog.content = content;
        if (category) blog.category = category;
        if (excerpt !== undefined) blog.excerpt = excerpt;
        if (isPublished !== undefined) blog.isPublished = isPublished;
        if (tags) {
            blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }

        // Handle new featured image
        if (req.cloudinaryResult) {
            blog.featuredImage = {
                url: req.cloudinaryResult.secure_url,
                publicId: req.cloudinaryResult.public_id
            };
        }

        await blog.save();

        // Invalidate blog cache on update
        await invalidateCache('blogs:*');

        res.status(200).json({
            success: true,
            message: 'Blog post updated successfully',
            blog
        });
    } catch (error) {
        console.error('Update blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update blog post'
        });
    }
};
// DELETE BLOG POST
exports.deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getProfileId(req.user);
        const userRole = req.user.role;
        
        // Validate MongoDB ObjectId
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blog ID format'
            });
        }

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Check if user is the author or an organization (for moderation)
        const isAuthor = blog.author.userId.toString() === userId.toString();
        const isOrganization = ['organization', 'employee'].includes(userRole);

        if (!isAuthor && !isOrganization) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this blog post'
            });
        }

        await Blog.findByIdAndDelete(id);

        // Invalidate blog cache on delete
        await invalidateCache('blogs:*');

        res.status(200).json({
            success: true,
            message: 'Blog post deleted successfully'
        });
    } catch (error) {
        console.error('Delete blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete blog post'
        });
    }
};
// LIKE/UNLIKE BLOG POST
exports.toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getProfileId(req.user);

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Check if user already liked the blog
        const likeIndex = blog.likes.findIndex(
            like => like.userId.toString() === userId.toString()
        );

        if (likeIndex > -1) {
            // Unlike
            blog.likes.splice(likeIndex, 1);
            await blog.save();

            return res.status(200).json({
                success: true,
                message: 'Blog post unliked',
                liked: false,
                likesCount: blog.likesCount
            });
        } else {
            // Like
            blog.likes.push({ userId });
            await blog.save();

            return res.status(200).json({
                success: true,
                message: 'Blog post liked',
                liked: true,
                likesCount: blog.likesCount
            });
        }
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process like'
        });
    }
};
// ADD COMMENT TO BLOG POST
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = getProfileId(req.user);
        const userRole = req.user.role;
        const userName = await getUserName(req.user);

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        const newComment = {
            userId,
            userName,
            userRole,
            content: content.trim()
        };

        blog.comments.push(newComment);
        await blog.save();

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: blog.comments[blog.comments.length - 1],
            commentsCount: blog.commentsCount
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment'
        });
    }
};
// DELETE COMMENT
exports.deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const userId = getProfileId(req.user);
        const userRole = req.user.role;

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user is the comment author, blog author, or organization
        const isCommentAuthor = comment.userId.toString() === userId.toString();
        const isBlogAuthor = blog.author.userId.toString() === userId.toString();
        const isOrganization = ['organization', 'employee'].includes(userRole);

        if (!isCommentAuthor && !isBlogAuthor && !isOrganization) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this comment'
            });
        }

        blog.comments.pull(commentId);
        await blog.save();

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully',
            commentsCount: blog.commentsCount
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
        });
    }
};
// REPORT BLOG POST
exports.reportBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = getProfileId(req.user);
        const userName = await getUserName(req.user);

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Report reason is required'
            });
        }

        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Check if user already reported this blog
        const alreadyReported = blog.reports.some(
            report => report.reportedBy.toString() === userId.toString()
        );

        if (alreadyReported) {
            return res.status(400).json({
                success: false,
                message: 'You have already reported this blog post'
            });
        }

        const newReport = {
            reportedBy: userId,
            reporterName: userName,
            reason: reason.trim()
        };

        blog.reports.push(newReport);

        // If multiple reports, flag the blog
        if (blog.reports.length >= 3) {
            blog.status = 'flagged';
        }

        await blog.save();

        res.status(200).json({
            success: true,
            message: 'Blog post reported successfully. Organization will review it.'
        });
    } catch (error) {
        console.error('Report blog error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report blog post'
        });
    }
};
// GET REPORTED BLOGS (Organization Only)
exports.getReportedBlogs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const filter = { isReported: true };
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const blogs = await Blog.find(filter)
            .sort({ 'reports.reportedAt': -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .lean();

        const total = await Blog.countDocuments(filter);

        res.status(200).json({
            success: true,
            blogs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get reported blogs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reported blogs'
        });
    }
};
// DISMISS REPORTS (Organization only)
exports.dismissReports = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getProfileId(req.user);

        // Find the blog
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Clear all reports and reset isReported flag
        blog.reports = [];
        blog.isReported = false;
        blog.status = 'active'; // Reset status to active

        await blog.save();

        res.status(200).json({
            success: true,
            message: 'Reports dismissed successfully',
            blog: {
                _id: blog._id,
                title: blog.title,
                reports: blog.reports,
                isReported: blog.isReported,
                status: blog.status
            }
        });
    } catch (error) {
        console.error('Dismiss reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to dismiss reports'
        });
    }
};
// GET USER'S OWN BLOGS
exports.getMyBlogs = async (req, res) => {
    try {
        const userId = getProfileId(req.user);
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const blogs = await Blog.find({ 'author.userId': userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .select('-reports')
            .lean();

        const total = await Blog.countDocuments({ 'author.userId': userId });

        res.status(200).json({
            success: true,
            blogs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get my blogs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your blogs'
        });
    }
};
// GET BLOG CATEGORIES
exports.getCategories = async (req, res) => {
    try {
        const categories = [
            'Nutrition Tips',
            'Weight Management',
            'Healthy Recipes',
            'Fitness & Exercise',
            'Mental Health & Wellness',
            'Disease Management'
        ];

        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

