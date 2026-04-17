const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HealthReportSchema = new Schema({
    // The dietitian who prepared this report
    dietitianId: {
        type: Schema.Types.ObjectId,
        ref: 'Dietitian',
        required: true
    },
    dietitianName: {
        type: String,
        required: true
    },
    // The client this report is for
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientName: {
        type: String,
        required: true
    },
    // Report title
    title: {
        type: String,
        required: true,
        trim: true
    },
    // Diagnosis / Chief Complaint
    diagnosis: {
        type: String,
        trim: true
    },
    // Detailed assessment / findings
    findings: {
        type: String,
        trim: true
    },
    // Dietary recommendations
    dietaryRecommendations: {
        type: String,
        trim: true
    },
    // Lifestyle recommendations
    lifestyleRecommendations: {
        type: String,
        trim: true
    },
    // Medications / Supplements suggested
    supplements: {
        type: String,
        trim: true
    },
    // Follow-up instructions
    followUpInstructions: {
        type: String,
        trim: true
    },
    // Additional notes
    additionalNotes: {
        type: String,
        trim: true
    },
    // Uploaded files (PDFs, images)
    uploadedFiles: [{
        fieldName: { type: String, required: true },
        originalName: { type: String, required: true },
        filename: { type: String, required: true },
        data: { type: Buffer, required: true },
        size: { type: Number, required: true },
        mimetype: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    // Status
    status: {
        type: String,
        enum: ['draft', 'sent', 'viewed'],
        default: 'sent'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
HealthReportSchema.index({ dietitianId: 1 });
HealthReportSchema.index({ clientId: 1 });
HealthReportSchema.index({ clientId: 1, dietitianId: 1 });
HealthReportSchema.index({ createdAt: -1 });

// Virtual for formatted date
HealthReportSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

const HealthReport = mongoose.model('HealthReport', HealthReportSchema);

module.exports = { HealthReport };
