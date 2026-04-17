const mongoose = require('mongoose');

const employeeQuerySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required']
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  query: {
    type: String,
    required: [true, 'Query message is required'],
    trim: true,
    minlength: [10, 'Query must be at least 10 characters long']
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  admin_reply: {
    type: String,
    trim: true
  },
  replied_at: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'replied'],
    default: 'pending'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = mongoose.model('EmployeeQuery', employeeQuerySchema);
