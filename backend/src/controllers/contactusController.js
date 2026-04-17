const Query = require('../models/contactusModel');
const EmployeeQuery = require('../models/employeeQueryModel');
const { Employee } = require('../models/userModel');
const { sendContactConfirmationEmail, sendContactReplyEmail } = require('../services/contactService');

exports.submitContact = async (req, res) => {
  const { name, email, role, query } = req.body;


  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email is required.' });
  }

  try {
    const newQuery = new Query({
      name,
      email,
      role,
      query,
    });
    await newQuery.save();


    // Send confirmation email to the user
    try {
      await sendContactConfirmationEmail({
        name,
        email,
        role,
        query
      });
    } catch (emailErr) {
      console.error('Error sending confirmation email:', emailErr);
      // Don't fail the request if email fails, just log it
    }

    res.status(200).json({
      success: true,
      message: 'Query submitted successfully. You will receive a confirmation email shortly.',
      id: newQuery._id
    });
  } catch (err) {
    console.error('Error saving query:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
  }
};

/**
 * POST /api/contact/employee/submit
 * Employee submits query to their organization
 * Requires: JWT token (employee auth)
 * Uses: EmployeeQuery model (separate from admin queries)
 */
exports.submitEmployeeContact = async (req, res) => {
  const { subject, message, category } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Subject and message are required.' });
  }

  try {
    // Get employee details from JWT token
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(403).json({ success: false, message: 'Employee authentication required.' });
    }

    const employee = await Employee.findById(employeeId).select('name email organizationId');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const catLabel = category || 'General';

    // Create in EmployeeQuery collection instead of Query collection
    const newQuery = new EmployeeQuery({
      employeeId,
      organizationId: employee.organizationId,
      name: employee.name,
      email: employee.email,
      subject: subject.trim(),
      query: message.trim(),
      category: catLabel
    });
    await newQuery.save();

    // Send confirmation email
    try {
      await sendContactConfirmationEmail({
        name: employee.name,
        email: employee.email,
        role: 'Employee',
        query: `[${catLabel}] ${subject.trim()}\n\n${message.trim()}`,
      });
    } catch (emailErr) {
      console.error('Error sending confirmation email:', emailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Query submitted successfully. You will receive a confirmation email shortly.',
      id: newQuery._id,
    });
  } catch (err) {
    console.error('Error saving employee query:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
  }
}

exports.replyToQuery = async (req, res) => {
  const { queryId, replyMessage } = req.body;

  if (!queryId || !replyMessage) {
    return res.status(400).json({ success: false, message: 'Query ID and reply message are required.' });
  }

  try {
    // Admin replies to public user queries only (Query model)
    const query = await Query.findById(queryId);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Public user query not found.' });
    }

    // Update the query
    query.admin_reply = replyMessage;
    query.replied_at = new Date();
    query.status = 'replied';
    await query.save();

    // Send email to the user
    try {
      await sendContactReplyEmail(query, replyMessage);
    } catch (emailErr) {
      console.error('Error sending reply email:', emailErr);
      return res.status(500).json({ success: false, message: 'Query updated but failed to send email.' });
    }

    res.status(200).json({ success: true, message: 'Reply sent successfully.' });
  } catch (err) {
    console.error('Error sending reply:', err);
    res.status(500).json({ success: false, message: 'Failed to send reply.' });
  }
};

/**
 * POST /api/contact/employee-reply
 * Organization admin replies to employee query
 * Requires: authenticateJWT + requireOrganization
 */
exports.replyToEmployeeQuery = async (req, res) => {
  const { queryId, replyMessage } = req.body;

  if (!queryId || !replyMessage) {
    return res.status(400).json({ success: false, message: 'Query ID and reply message are required.' });
  }

  try {
    // Org admin replies to employee queries only (EmployeeQuery model)
    const organizationId = req.user.roleId;
    const query = await EmployeeQuery.findById(queryId);
    
    if (!query) {
      return res.status(404).json({ success: false, message: 'Employee query not found.' });
    }

    // Verify the query belongs to this organization
    if (query.organizationId.toString() !== organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot reply to queries from other organizations.' });
    }

    // Update the query
    query.admin_reply = replyMessage;
    query.replied_at = new Date();
    query.status = 'replied';
    await query.save();

    // Send email to the employee
    try {
      await sendContactReplyEmail(query, replyMessage);
    } catch (emailErr) {
      console.error('Error sending reply email:', emailErr);
      return res.status(500).json({ success: false, message: 'Query updated but failed to send email.' });
    }

    res.status(200).json({ success: true, message: 'Reply sent successfully.' });
  } catch (err) {
    console.error('Error sending reply to employee:', err);
    res.status(500).json({ success: false, message: 'Failed to send reply.' });
  }
};

/**
 * GET /api/contact/queries-list
 * Fetch admin queries - ONLY public user queries (from /submit endpoint)
 * Uses: Query model (separate from EmployeeQuery model)
 */
exports.getAllQueries = async (req, res) => {
  try {
    // Support optional email filter
    const filter = {};
    if (req.query.email) {
      filter.email = req.query.email.toLowerCase();
    }
    const queries = await Query.find(filter).sort({ created_at: -1 });
    // Transform the data to match frontend expectations
    const transformedQueries = queries.map(query => ({
      _id: query._id,
      name: query.name,
      email: query.email,
      role: query.role.toLowerCase().replace(' ', ''),
      query: query.query,
      status: query.status,
      admin_reply: query.admin_reply,
      replied_at: query.replied_at,
      emp_reply: query.emp_reply,
      emp_replied_at: query.emp_replied_at,
      created_at: query.created_at
    }));

    res.status(200).json({ success: true, data: transformedQueries });
  } catch (err) {
    console.error('Error fetching queries:', err.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch queries.' });
  }
};

/**
 * GET /api/contact/employee-queries
 * Fetch pending queries submitted by employees of the authenticated organisation.
 * Requires: authenticateJWT + requireOrganization (applied in route)
 * Uses: EmployeeQuery model (separate from admin queries)
 */
exports.getEmployeeQueries = async (req, res) => {
  try {
    const organizationId = req.user.roleId;

    // Fetch pending employee queries for this organization
    const queries = await EmployeeQuery.find({
      organizationId,
      status: 'pending'
    }).sort({ created_at: -1 });

    const result = queries.map(q => ({
      _id: q._id,
      name: q.name,
      email: q.email,
      subject: q.subject,
      category: q.category,
      query: q.query,
      status: q.status,
      created_at: q.created_at,
    }));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('getEmployeeQueries error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch employee queries.' });
  }
};

/**
 * GET /api/contact/employee-resolved-queries
 * Fetch RESOLVED queries from the authenticated organisation's employees.
 * Shows only queries that have been answered by the organization admin.
 * Requires: authenticateJWT + requireOrganization
 * Uses: EmployeeQuery model (separate from admin queries)
 */
exports.getEmployeeResolvedQueries = async (req, res) => {
  try {
    const organizationId = req.user.roleId;

    // Fetch RESOLVED employee queries only (status: 'replied' and has admin_reply)
    const queries = await EmployeeQuery.find({
      organizationId,
      status: 'replied',
      admin_reply: { $exists: true, $ne: null }
    }).sort({ replied_at: -1 });

    const result = queries.map(q => ({
      _id: q._id,
      name: q.name,
      email: q.email,
      subject: q.subject,
      category: q.category,
      query: q.query,
      admin_reply: q.admin_reply,
      status: q.status,
      created_at: q.created_at,
      replied_at: q.replied_at
    }));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('getEmployeeResolvedQueries error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch resolved employee queries.' });
  }
};

/**
 * GET /api/contact/my-queries
 * Fetch queries submitted by the authenticated individual employee
 * Shows both pending and resolved queries, sorted by most recent first
 * Requires: authenticateJWT (employee)
 * Uses: EmployeeQuery model
 */
exports.getMyQueries = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(403).json({ success: false, message: 'Employee authentication required.' });
    }

    // Fetch all queries (both pending and replied) for this employee
    const queries = await EmployeeQuery.find({ employeeId }).sort({ created_at: -1 });

    const result = queries.map(q => ({
      _id: q._id,
      name: q.name,
      email: q.email,
      subject: q.subject,
      category: q.category,
      query: q.query,
      admin_reply: q.admin_reply,
      status: q.status,
      created_at: q.created_at,
      replied_at: q.replied_at
    }));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('getMyQueries error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch your queries.' });
  }
};


