const TeamBoard = require('../models/teamBoardModel');
const { Employee, Organization, UserAuth } = require('../models/userModel');

/**
 * GET /api/teamboard?orgName=XYZ&limit=100
 * Fetch posts for an organisation, newest first.
 */
exports.getPosts = async (req, res) => {
  const { orgName, limit = 100 } = req.query;

  if (!orgName || !orgName.trim()) {
    return res.status(400).json({ success: false, message: 'orgName query parameter is required.' });
  }

  try {
    const posts = await TeamBoard.find({ orgName: orgName.trim() })
      .sort({ postedAt: -1 })
      .limit(Number(limit));

    res.status(200).json({ success: true, data: posts });
  } catch (err) {
    console.error('TeamBoard getPosts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch team board posts.' });
  }
};

/**
 * POST /api/teamboard
 * Create a new board post.
 * Body: { message, isOrg? }
 * orgName, author, and email come from JWT token (authenticated user)
 */
exports.createPost = async (req, res) => {
  const { message, isOrg } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Message is required.',
    });
  }

  if (message.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
  }

  try {
    // Validate that isOrg flag matches user type
    const isOrgFlag = Boolean(isOrg);
    const isEmployee = !!req.user.employeeId;
    const isOrgAdmin = req.user.roleId && req.user.role === 'organization';

    if (isOrgFlag && !isOrgAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not an organization admin. Set isOrg to false.',
      });
    }

    if (!isOrgFlag && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: 'You are not an employee. Set isOrg to true.',
      });
    }

    // Fetch orgName, author name, and email from database
    let orgName, author, email;

    if (isEmployee) {
      // Employee token - fetch org from organizationId and employee details
      const orgId = req.user.organizationId;
      const organization = await Organization.findById(orgId).select('name');
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }
      orgName = organization.name;

      const employee = await Employee.findById(req.user.employeeId).select('name email');
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
      author = employee.name;
      email = employee.email;
    } else if (isOrgAdmin) {
      // Organization admin token - fetch from Organization model
      const organization = await Organization.findById(req.user.roleId).select('name email');
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }
      orgName = organization.name;
      author = organization.name;
      email = organization.email;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Only employees and organization admins can post to team board.',
      });
    }

    const post = new TeamBoard({
      orgName: orgName.trim(),
      author: author.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      isOrg: Boolean(isOrg),
      postedAt: new Date(),
    });

    await post.save();
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    console.error('TeamBoard createPost error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Failed to create team board post.' });
  }
};

/**
 * DELETE /api/teamboard/:id
 * Delete a board post.
 * Only the post owner or an organization admin can delete.
 * Identity comes from JWT token.
 */
exports.deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await TeamBoard.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Determine user type and get their email from JWT + database
    const isEmployee = !!req.user.employeeId;
    const isOrgAdmin = req.user.roleId && req.user.role === 'organization';
    let requesterEmail;

    if (isEmployee) {
      const employee = await Employee.findById(req.user.employeeId).select('email');
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
      requesterEmail = employee.email.toLowerCase();
    } else if (isOrgAdmin) {
      const organization = await Organization.findById(req.user.roleId).select('email');
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found.' });
      }
      requesterEmail = organization.email.toLowerCase();
    } else {
      return res.status(403).json({ success: false, message: 'Not authorised to delete posts.' });
    }

    // Allow deletion if: it's the post owner (same email) OR the requester is an org admin
    const isOwner = post.email.toLowerCase() === requesterEmail;
    const canDelete = isOwner || isOrgAdmin;

    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this post.' });
    }

    await TeamBoard.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Post deleted successfully.' });
  } catch (err) {
    console.error('TeamBoard deletePost error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
};
