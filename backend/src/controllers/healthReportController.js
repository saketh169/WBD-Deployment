const { HealthReport } = require('../models/healthReportModel');
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const uploadHealthReport = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed!'), false);
        }
    }
});

// Middleware for file uploads (up to 3 attachments)
const healthReportUploadFields = uploadHealthReport.fields([
    { name: 'healthReportFile1', maxCount: 1 },
    { name: 'healthReportFile2', maxCount: 1 },
    { name: 'healthReportFile3', maxCount: 1 }
]);

// Create a new health report (dietitian sends to client)
const createHealthReport = async (req, res) => {
    try {
        const {
            dietitianId,
            dietitianName,
            clientId,
            clientName,
            title,
            diagnosis,
            findings,
            dietaryRecommendations,
            lifestyleRecommendations,
            supplements,
            followUpInstructions,
            additionalNotes
        } = req.body;

        if (!dietitianId || !clientId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Dietitian ID, Client ID, and Title are required'
            });
        }

        // Prepare uploaded files
        const uploadedFiles = [];
        if (req.files) {
            Object.keys(req.files).forEach(fieldName => {
                const file = req.files[fieldName][0];
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const filename = fieldName + '-' + uniqueSuffix + path.extname(file.originalname);

                uploadedFiles.push({
                    fieldName,
                    originalName: file.originalname,
                    filename,
                    data: file.buffer,
                    size: file.size,
                    mimetype: file.mimetype
                });
            });
        }

        const healthReport = new HealthReport({
            dietitianId,
            dietitianName: dietitianName || 'Dietitian',
            clientId,
            clientName: clientName || 'Client',
            title,
            diagnosis: diagnosis || '',
            findings: findings || '',
            dietaryRecommendations: dietaryRecommendations || '',
            lifestyleRecommendations: lifestyleRecommendations || '',
            supplements: supplements || '',
            followUpInstructions: followUpInstructions || '',
            additionalNotes: additionalNotes || '',
            uploadedFiles,
            status: 'draft'
        });

        await healthReport.save();

        const responseData = healthReport.toObject();
        if (responseData.uploadedFiles) {
            responseData.uploadedFiles.forEach(file => {
                delete file.data;
            });
        }

        res.status(201).json({
            success: true,
            message: 'Health report sent successfully',
            data: responseData
        });

    } catch (error) {
        console.error('Error creating health report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create health report'
        });
    }
};

// Get health reports for a client from a specific dietitian
const getHealthReports = async (req, res) => {
    try {
        const { clientId, dietitianId } = req.params;

        const query = {};
        if (clientId) query.clientId = clientId;
        if (dietitianId) query.dietitianId = dietitianId;

        const reports = await HealthReport.find(query)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Error fetching health reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch health reports'
        });
    }
};

// Get all health reports sent by a dietitian to a specific client
const getDietitianHealthReports = async (req, res) => {
    try {
        const { dietitianId, clientId } = req.params;

        const query = { dietitianId };
        if (clientId) query.clientId = clientId;

        const reports = await HealthReport.find(query)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Error fetching dietitian health reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch health reports'
        });
    }
};

// Get all health reports for a client (from all dietitians)
const getClientHealthReports = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { dietitianId } = req.query;

        const query = { clientId };
        if (dietitianId) query.dietitianId = dietitianId;

        const reports = await HealthReport.find(query)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Error fetching client health reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch health reports'
        });
    }
};

// Mark health report as viewed
const markHealthReportViewed = async (req, res) => {
    try {
        const { reportId } = req.params;

        const report = await HealthReport.findByIdAndUpdate(
            reportId,
            { status: 'viewed' },
            { new: true }
        ).select('-uploadedFiles.data');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Health report not found'
            });
        }

        res.json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('Error updating health report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update health report'
        });
    }
};

module.exports = {
    createHealthReport,
    getHealthReports,
    getDietitianHealthReports,
    getClientHealthReports,
    markHealthReportViewed,
    healthReportUploadFields
};
