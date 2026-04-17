const mongoose = require('mongoose');

const teamBoardSchema = new mongoose.Schema({
  orgName: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    index: true,
  },
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  isOrg: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [1, 'Message cannot be empty'],
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
  },
  postedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for fetch-by-org sorted by newest first
teamBoardSchema.index({ orgName: 1, postedAt: -1 });

const TeamBoard = mongoose.model('TeamBoard', teamBoardSchema);

module.exports = TeamBoard;
