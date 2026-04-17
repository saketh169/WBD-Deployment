const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Activity Log Schema - tracks employee actions
const ActivityLogSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    employeeName: {
        type: String,
        required: true
    },
    employeeEmail: {
        type: String,
        required: true
    },
    activityType: {
        type: String,
        enum: ['verification_approved', 'verification_rejected', 'blog_approved', 'blog_rejected', 'blog_flagged'],
        required: true
    },
    targetId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    targetType: {
        type: String,
        enum: ['dietitian', 'organization', 'blog'],
        required: true
    },
    targetName: {
        type: String // Name of dietitian/org, or blog title
    },
    status: {
        type: String,
        enum: ['verified', 'rejected', 'flagged', 'approved', 'pending'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
ActivityLogSchema.index({ organizationId: 1, employeeId: 1, createdAt: -1 });
ActivityLogSchema.index({ organizationId: 1, activityType: 1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
