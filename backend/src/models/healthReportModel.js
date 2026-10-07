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
    // Clinical targets & goals
    targetCalories: {
        type: Number,
        default: null
    },
    targetMacros: {
        proteinGrams: { type: Number, default: null },
        carbsGrams: { type: Number, default: null },
        fatsGrams: { type: Number, default: null }
    },
    targetHydrationLiters: {
        type: Number,
        default: null
    },
    allergies: [{
        type: String
    }],
    healthGoals: [{
        type: String
    }],
    clinicalStatus: {
        type: String,
        default: 'active'
    },
    nextFollowUpDate: {
        type: Date,
        default: null
    },
    keyBiomarkersFlagged: [{
        type: String
    }],
    // Uploaded files (PDFs, images) - optional attachments
    uploadedFiles: [{
        fieldName: { type: String },
        originalName: { type: String },
        filename: { type: String },
        data: { type: Buffer },
        size: { type: Number },
        mimetype: { type: String },
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
