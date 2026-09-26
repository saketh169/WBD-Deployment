const { LabReport } = require('../models/labReportModel');
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (store files in memory as buffers)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow only PDF and image files
        if (file.mimetype === 'application/pdf' ||
            file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed!'), false);
        }
    }
});

// Middleware for handling multiple file uploads
const uploadFields = upload.fields([
    { name: 'hormonalProfileReport', maxCount: 1 },
    { name: 'endocrineReport', maxCount: 1 },
    { name: 'generalHealthReport', maxCount: 1 },
    { name: 'bloodTestReport', maxCount: 1 },
    { name: 'bloodSugarReport', maxCount: 1 },
    { name: 'diabetesReport', maxCount: 1 },
    { name: 'thyroidReport', maxCount: 1 },
    { name: 'cardiacHealthReport', maxCount: 1 },
    { name: 'cardiovascularReport', maxCount: 1 },
    { name: 'ecgReport', maxCount: 1 }
]);

// Submit lab report
const submitLabReport = async (req, res) => {
    try {
        const {
            clientName,
            clientAge,
            clientPhone,
            clientAddress,
            clientId,
            submittedCategories,
            // Hormonal Issues
            testosteroneTotal,
            dheaS,
            cortisol,
            vitaminD,
            // Fitness Metrics
            heightCm,
            currentWeight,
            bodyFatPercentage,
            activityLevel,
            additionalInfo,
            // General Reports
            dateOfReport,
            bmiValue,
            // Blood Sugar Focus
            fastingGlucose,
            hba1c,
            cholesterolTotal,
            triglycerides,
            // Thyroid
            tsh,
            freeT4,
            reverseT3,
            thyroidAntibodies,
            // Cardiovascular
            systolicBP,
            diastolicBP,
            spO2,
            restingHeartRate
        } = req.body;

        // Validate required clientId
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required'
            });
        }

        // Parse submitted categories if it's a string
        let categoriesArray = [];
        if (typeof submittedCategories === 'string') {
            try {
                categoriesArray = JSON.parse(submittedCategories);
            } catch (e) {
                // If it's a comma-separated string instead of JSON, split it manually
                if (submittedCategories.includes(',')) {
                    categoriesArray = submittedCategories.split(',').map(item => item.trim());
                } else if (submittedCategories.trim() !== '') {
                    categoriesArray = [submittedCategories.trim()];
                }
            }
        } else if (Array.isArray(submittedCategories)) {
            categoriesArray = submittedCategories;
        }

        // Prepare uploaded files data
        const uploadedFiles = [];

        if (req.files) {
            Object.keys(req.files).forEach(fieldName => {
                const file = req.files[fieldName][0];
                // Generate unique filename for reference
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const filename = fieldName + '-' + uniqueSuffix + path.extname(file.originalname);

                uploadedFiles.push({
                    fieldName,
                    originalName: file.originalname,
                    filename,
                    data: file.buffer, // Store file data as buffer
                    size: file.size,
                    mimetype: file.mimetype
                });
            });
        }

        // Create lab report data
        const labReportData = {
            userId: clientId, // Using clientId from request as userId
            clientName,
            clientAge: parseInt(clientAge),
            clientPhone,
            clientAddress,
            submittedCategories: categoriesArray,
            uploadedFiles
        };

        // Only add dietitianId if it's a valid string format (not the literal word "string" from swagger)
        if (req.body.dietitianId && req.body.dietitianId !== 'string') {
            labReportData.dietitianId = req.body.dietitianId;
        }

        // Add category-specific data
        if (categoriesArray.includes('Hormonal_Issues')) {
            labReportData.hormonalIssues = {
                testosteroneTotal: testosteroneTotal ? parseFloat(testosteroneTotal) : undefined,
                dheaS: dheaS ? parseFloat(dheaS) : undefined,
                cortisol: cortisol ? parseFloat(cortisol) : undefined,
                vitaminD: vitaminD ? parseFloat(vitaminD) : undefined
            };
        }

        if (categoriesArray.includes('Fitness_Metrics')) {
            labReportData.fitnessMetrics = {
                heightCm: heightCm ? parseFloat(heightCm) : undefined,
                currentWeight: currentWeight ? parseFloat(currentWeight) : undefined,
                bodyFatPercentage: bodyFatPercentage ? parseFloat(bodyFatPercentage) : undefined,
                activityLevel,
                additionalInfo
            };
        }

        if (categoriesArray.includes('General_Reports')) {
            labReportData.generalReports = {
                dateOfReport: dateOfReport ? new Date(dateOfReport) : undefined,
                bmiValue: bmiValue ? parseFloat(bmiValue) : undefined,
                currentWeight: currentWeight ? parseFloat(currentWeight) : undefined,
                heightCm: heightCm ? parseFloat(heightCm) : undefined
            };
        }

        if (categoriesArray.includes('Blood_Sugar_Focus')) {
            labReportData.bloodSugarFocus = {
                fastingGlucose: fastingGlucose ? parseFloat(fastingGlucose) : undefined,
                hba1c: hba1c ? parseFloat(hba1c) : undefined,
                cholesterolTotal: cholesterolTotal ? parseFloat(cholesterolTotal) : undefined,
                triglycerides: triglycerides ? parseFloat(triglycerides) : undefined
            };
        }

        if (categoriesArray.includes('Thyroid')) {
            labReportData.thyroid = {
                tsh: tsh ? parseFloat(tsh) : undefined,
                freeT4: freeT4 ? parseFloat(freeT4) : undefined,
                reverseT3: reverseT3 ? parseFloat(reverseT3) : undefined,
                thyroidAntibodies
            };
        }

        if (categoriesArray.includes('Cardiovascular')) {
            labReportData.cardiovascular = {
                systolicBP: systolicBP ? parseFloat(systolicBP) : undefined,
                diastolicBP: diastolicBP ? parseFloat(diastolicBP) : undefined,
                spO2: spO2 ? parseFloat(spO2) : undefined,
                restingHeartRate: restingHeartRate ? parseFloat(restingHeartRate) : undefined
            };
        }

        // Create and save lab report
        const labReport = new LabReport(labReportData);
        await labReport.save();

        const responseData = labReport.toObject();
        if (responseData.uploadedFiles) {
            responseData.uploadedFiles.forEach(file => {
                delete file.data;
            });
        }

        res.status(201).json({
            success: true,
            message: 'Lab report submitted successfully',
            data: responseData
        });

    } catch (error) {
        console.error('Error submitting lab report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit lab report'
        });
    }
};

// Get lab reports for a client (filtered by client and dietitian)
const getClientLabReports = async (req, res) => {
    try {
        const { clientId, dietitianId } = req.params;

        // Build query to fetch reports
        const query = {};
        if (clientId) query.userId = clientId;
        if (dietitianId) {
            // Find reports specifically tagged for this dietitian OR reports that have no dietitian tagged (general client uploads)
            query.$or = [
                { dietitianId: dietitianId },
                { dietitianId: { $exists: false } },
                { dietitianId: null }
            ];
        }

        const labReports = await LabReport.find(query)
            .select('-uploadedFiles.data')
            .sort({ createdAt: -1 })
            .populate('dietitianId', 'name')
            .populate('reviewedBy.dietitianId', 'name');

        res.json({
            success: true,
            data: labReports
        });

    } catch (error) {
        console.error('Error fetching lab reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lab reports'
        });
    }
};

// Get lab reports for a specific client (for dietitians)
const getLabReportsByClient = async (req, res) => {
    try {
        const { clientId } = req.params;

        const labReports = await LabReport.find({ userId: clientId })
            .select('-uploadedFiles.data')
            .sort({ createdAt: -1 })
            .populate('reviewedBy.dietitianId', 'name');

        res.json({
            success: true,
            data: labReports
        });

    } catch (error) {
        console.error('Error fetching lab reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lab reports'
        });
    }
};

// Update lab report status and add feedback (for dietitians)
const updateLabReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, feedback } = req.body;

        const updateData = {
            status,
            notes: feedback
        };

        if (status === 'reviewed') {
            // Use roleId from JWT token (profile document ID)
            const reviewerId = req.user?.roleId;
            // Fetch dietitian name from DB since JWT doesn't contain name
            let reviewerName = req.body.dietitianName || 'Unknown Dietitian';
            if (reviewerId) {
                try {
                    const { Dietitian } = require('../models/userModel');
                    const dietitian = await Dietitian.findById(reviewerId).select('name');
                    if (dietitian) reviewerName = dietitian.name;
                } catch (e) { /* use fallback name */ }
            }
            updateData.reviewedBy = {
                dietitianId: reviewerId,
                dietitianName: reviewerName,
                reviewedAt: new Date()
            };
        }

        const labReport = await LabReport.findByIdAndUpdate(
            reportId,
            updateData,
            { new: true }
        ).select('-uploadedFiles.data');

        if (!labReport) {
            return res.status(404).json({
                success: false,
                message: 'Lab report not found'
            });
        }

        res.json({
            success: true,
            message: 'Lab report updated successfully',
            data: labReport
        });

    } catch (error) {
        console.error('Error updating lab report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update lab report'
        });
    }
};

module.exports = {
    submitLabReport,
    getClientLabReports,
    getLabReportsByClient,
    updateLabReportStatus,
    uploadFields
};