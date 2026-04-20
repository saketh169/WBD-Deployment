const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- 1. CENTRAL AUTHENTICATION SCHEMA (Email is Globally Unique) ---
const UserAuthSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
        type: String,
        enum: ['user', 'admin', 'dietitian', 'organization'],
        required: true
    },
    roleId: { type: Schema.Types.ObjectId, required: true }
}, { timestamps: true });


// --- 2. ROLE-SPECIFIC PROFILE SCHEMAS (Name and License are Role-Unique) ---

// 2a. Standard User Profile
const UserSchema = new Schema({
    name: { type: String, required: true, minlength: 5, unique: true, trim: true }, // ROLE-SPECIFIC UNIQUE
    email: { type: String, required: true, lowercase: true, trim: true }, // Email from UserAuth
    phone: { type: String, required: true, minlength: 10, maxlength: 10 }, // Global check in Controller
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    address: { type: String, required: true, maxlength: 200 },
    profileImage: { type: Schema.Types.Mixed },
}, { timestamps: true });

// 2b. Admin Profile (adminKey REMOVED)
const AdminSchema = new Schema({
    name: { type: String, required: true, minlength: 5, unique: true, trim: true }, // ROLE-SPECIFIC UNIQUE
    email: { type: String, required: true, lowercase: true, trim: true }, // Email from UserAuth
    phone: { type: String, required: true, minlength: 10, maxlength: 10 }, // Global check in Controller
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    address: { type: String, required: true, maxlength: 200 },
    profileImage: { type: Schema.Types.Mixed },
}, { timestamps: true });

// 2c. Dietitian Profile
const DietitianSchema = new Schema({
    name: { type: String, required: true, minlength: 5, unique: true, trim: true }, // ROLE-SPECIFIC UNIQUE
    email: { type: String, required: true, lowercase: true, trim: true }, // Email from UserAuth
    age: { type: Number, required: true, min: 9 },
    phone: { type: String, minlength: 10, maxlength: 10 }, // Optional field
    licenseNumber: { type: String, required: true, unique: true, match: /^DLN[0-9]{6}$/ }, // ROLE-SPECIFIC UNIQUE
    interestedField: { type: String },
    degreeType: { type: String },
    licenseIssuer: { type: String },
    idProofType: { type: String },
    specializationDomain: { type: String },
    files: {
        resume: { type: String },
        degreeCertificate: { type: String },
        licenseDocument: { type: String },
        idProof: { type: String },
        experienceCertificates: { type: String },
        specializationCertifications: { type: String },
        internshipCertificate: { type: String },
        researchPapers: { type: String },
        finalReport: { type: String }
    },
    verificationStatus: {
        resume: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        degreeCertificate: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        licenseDocument: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        idProof: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        experienceCertificates: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        specializationCertifications: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        internshipCertificate: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        researchPapers: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        finalReport: { type: String, enum: ['Not Received', 'Received', 'Verified', 'Rejected'], default: 'Not Received' }
    },
    documents: { type: Schema.Types.Mixed, default: {} }, // Store document metadata
    documentUploadStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    lastDocumentUpdate: { type: Date, default: null },
    profileImage: { type: Schema.Types.Mixed },
    specialization: [{ type: String }],
    specialties: [{ type: String }],
    experience: { type: Number },
    fees: { type: Number },
    languages: [{ type: String }],
    location: { type: String },
    rating: { type: Number },
    online: { type: Boolean },
    offline: { type: Boolean },
    about: { type: String },
    education: [{ type: String }],
    bookedslots: [{
        date: { type: String },
        slots: [{ type: String }]
    }],
    isDeleted: { type: Boolean, default: false },
    title: { type: String },
    description: { type: String },
    expertise: [{ type: String }],
    certifications: [{
        name: { type: String },
        year: { type: Number },
        issuer: { type: String }
    }],
    awards: [{
        name: { type: String },
        year: { type: Number },
        description: { type: String }
    }],
    publications: [{
        title: { type: String },
        year: { type: Number },
        link: { type: String }
    }],
    testimonials: [{
        text: { type: String },
        author: { type: String },
        rating: { type: Number },
        authorId: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
    }],
    consultationTypes: [{
        type: { type: String },
        duration: { type: Number },
        fee: { type: Number }
    }],
    availability: {
        workingDays: [{ type: String }],
        workingHours: {
            start: { type: String },
            end: { type: String }
        }
    },
    socialMedia: {
        linkedin: { type: String },
        twitter: { type: String }
    }
}, { timestamps: true });

// 2d. Organization Profile
const OrganizationSchema = new Schema({
    name: { type: String, required: true, minlength: 5, unique: true, trim: true }, // ROLE-SPECIFIC UNIQUE
    email: { type: String, required: true, lowercase: true, trim: true }, // Email from UserAuth
    phone: { type: String, required: true, minlength: 10, maxlength: 10 }, // Global check in Controller
    licenseNumber: { type: String, required: true, unique: true, match: /^OLN[0-9]{6}$/ }, // ROLE-SPECIFIC UNIQUE
    address: { type: String, required: true, maxlength: 200 },
    organizationType: {
        type: String,
        enum: ['private', 'ppo', 'freelancing', 'ngo', 'government', 'other'],
        required: true
    },
    legalDocumentType: { type: String },
    taxDocumentType: { type: String },
    businessLicenseType: { type: String },
    authorizedRepIdType: { type: String },
    addressProofType: { type: String },
    bankDocumentType: { type: String },
    files: {
        orgLogo: { type: String },
        orgBrochure: { type: String },
        legalDocument: { type: String },
        taxDocument: { type: String },
        addressProof: { type: String },
        businessLicense: { type: String },
        authorizedRepId: { type: String },
        bankDocument: { type: String },
        finalReport: { type: String }
    },
    verificationStatus: {
        orgLogo: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        orgBrochure: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        legalDocument: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        taxDocument: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        addressProof: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        businessLicense: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        authorizedRepId: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        bankDocument: { type: String, enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected'], default: 'Not Uploaded' },
        finalReport: { type: String, enum: ['Not Received', 'Received', 'Verified', 'Rejected'], default: 'Not Received' }
    },
    documents: { type: Schema.Types.Mixed, default: {} }, // Store document metadata
    documentUploadStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    lastDocumentUpdate: { type: Date, default: null },
    profileImage: { type: Schema.Types.Mixed },
}, { timestamps: true });

// 2e. Employee Profile (Organization Employee)
const EmployeeSchema = new Schema({
    name: { type: String, required: true, minlength: 3, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Format: first 3 letters of org name (uppercase) + 6 digits e.g. APO123456
    licenseNumber: { type: String, required: true, unique: true, match: /^[A-Z]{3}[0-9]{6}$/ },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending-activation'],
        default: 'pending-activation'
    },
    age: { type: Number, default: null },
    address: { type: String, default: null, trim: true },
    contact: { type: String, default: null, trim: true },
    inviteSentAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Index for faster queries
EmployeeSchema.index({ organizationId: 1, email: 1 }, { unique: true, sparse: true });

UserSchema.index({ createdAt: 1 });
UserSchema.index({ name: 'text' }); // Text index for user search
DietitianSchema.index({ 'verificationStatus.finalReport': 1, isDeleted: 1 });
DietitianSchema.index({ createdAt: 1 });
DietitianSchema.index({ name: 'text', specializationDomain: 'text', about: 'text', location: 'text' }); // Text index for dietitian search
OrganizationSchema.index({ documentUploadStatus: 1 });
OrganizationSchema.index({ createdAt: 1 });
UserAuthSchema.index({ role: 1 });

module.exports = {
    UserAuth: mongoose.model('UserAuth', UserAuthSchema),
    User: mongoose.model('User', UserSchema),
    Admin: mongoose.model('Admin', AdminSchema),
    Dietitian: mongoose.model('Dietitian', DietitianSchema),
    Organization: mongoose.model('Organization', OrganizationSchema),
    Employee: mongoose.model('Employee', EmployeeSchema)
};