const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    validateDietitianObjectId,
    validateOrganizationObjectId,
    handleMulterError,
    ensureOrganizationAuthenticated,
    authenticateJWT,
    requireRole
} = require('../middlewares/authMiddleware');
const {
    getDietitians,
    getDietitianFile,
    approveDietitianDocument,
    disapproveDietitianDocument,
    finalApproveDietitian,
    finalDisapproveDietitian,
    uploadDietitianFinalReport,
    getCurrentDietitian,
    checkDietitianStatus,
    getOrganizations,
    getOrganizationFile,
    approveOrganizationDocument,
    disapproveOrganizationDocument,
    finalApproveOrganization,
    finalDisapproveOrganization,
    uploadOrganizationFinalReport,
    getCurrentOrganization,
    checkOrganizationStatus
} = require('../controllers/verifyController');

// Multer configuration for final report upload
const reportUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF is allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only one file allowed
    }
}).single('finalReport');


// Multer configuration for organization final report upload
const orgReportUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF is allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only one file allowed
    }
}).single('finalReport');


// Dietitian Routes (protected by organization authentication — allows org admins and employees)
/**
 * @swagger
 * /api/verify/dietitians:
 *   get:
 *     tags: ['Verify']
 *     summary: Get list of dietitians for verification
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dietitians list retrieved
 */
router.get('/dietitians', authenticateJWT, requireRole('organization'), getDietitians);

/**
 * @swagger
 * /api/verify/files/{dietitianId}/{field}:
 *   get:
 *     tags: ['Verify']
 *     summary: Get dietitian verification file
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: field
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File retrieved
 */
router.get('/files/:dietitianId/:field', authenticateJWT, requireRole('organization'), validateDietitianObjectId, getDietitianFile);

/**
 * @swagger
 * /api/verify/{dietitianId}/approve:
 *   post:
 *     tags: ['Verify']
 *     summary: Approve dietitian document
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: Document field to approve (resume, degreeCertificate, licenseDocument, idProof, experienceCertificates, specializationCertifications, internshipCertificate, researchPapers)
 *     responses:
 *       200:
 *         description: Document approved
 */
router.post('/:dietitianId/approve', authenticateJWT, requireRole('organization'), validateDietitianObjectId, approveDietitianDocument);

/**
 * @swagger
 * /api/verify/{dietitianId}/disapprove:
 *   post:
 *     tags: ['Verify']
 *     summary: Disapprove dietitian document
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: Document field to disapprove (resume, degreeCertificate, licenseDocument, idProof, experienceCertificates, specializationCertifications, internshipCertificate, researchPapers)
 *     responses:
 *       200:
 *         description: Document disapproved
 */
router.post('/:dietitianId/disapprove', authenticateJWT, requireRole('organization'), validateDietitianObjectId, disapproveDietitianDocument);

/**
 * @swagger
 * /api/verify/{dietitianId}/final-approve:
 *   post:
 *     tags: ['Verify']
 *     summary: Final approve dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian approved
 */
router.post('/:dietitianId/final-approve', authenticateJWT, requireRole('organization'), validateDietitianObjectId, finalApproveDietitian);

/**
 * @swagger
 * /api/verify/{dietitianId}/final-disapprove:
 *   post:
 *     tags: ['Verify']
 *     summary: Final disapprove dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian disapproved
 */
router.post('/:dietitianId/final-disapprove', authenticateJWT, requireRole('organization'), validateDietitianObjectId, finalDisapproveDietitian);

/**
 * @swagger
 * /api/verify/{dietitianId}/upload-report:
 *   post:
 *     tags: ['Verify']
 *     summary: Upload dietitian final report
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               finalReport:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Report uploaded
 */
router.post('/:dietitianId/upload-report', authenticateJWT, requireRole('organization'), validateDietitianObjectId, reportUpload, handleMulterError, uploadDietitianFinalReport);

/**
 * @swagger
 * /api/verify/me:
 *   get:
 *     tags: ['Verify']
 *     summary: Get current dietitian profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current dietitian profile retrieved
 */
router.get('/me', authenticateJWT, getCurrentDietitian);

/**
 * @swagger
 * /api/verify/check-status:
 *   get:
 *     tags: ['Verify']
 *     summary: Check dietitian verification status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved
 */
router.get('/check-status', authenticateJWT, checkDietitianStatus);

// ==================== ORGANIZATION VERIFICATION ROUTES ====================

/**
 * @swagger
 * /api/verify/organizations:
 *   get:
 *     tags: ['Verify']
 *     summary: Get list of organizations for verification
 *     responses:
 *       200:
 *         description: Organizations list retrieved
 */
router.get('/organizations', getOrganizations);

/**
 * @swagger
 * /api/verify/org/files/{orgId}/{field}:
 *   get:
 *     tags: ['Verify']
 *     summary: Get organization verification file
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: field
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File retrieved
 */
router.get('/org/files/:orgId/:field', validateOrganizationObjectId, getOrganizationFile);

/**
 * @swagger
 * /api/verify/org/{orgId}/approve:
 *   post:
 *     tags: ['Verify']
 *     summary: Approve organization document
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: Document field to approve (orgLogo, orgBrochure, legalDocument, taxDocument, addressProof, businessLicense, authorizedRepId, bankDocument)
 *     responses:
 *       200:
 *         description: Document approved
 */
router.post('/org/:orgId/approve', validateOrganizationObjectId, approveOrganizationDocument);

/**
 * @swagger
 * /api/verify/org/{orgId}/disapprove:
 *   post:
 *     tags: ['Verify']
 *     summary: Disapprove organization document
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: Document field to disapprove (orgLogo, orgBrochure, legalDocument, taxDocument, addressProof, businessLicense, authorizedRepId, bankDocument)
 *     responses:
 *       200:
 *         description: Document disapproved
 */
router.post('/org/:orgId/disapprove', validateOrganizationObjectId, disapproveOrganizationDocument);

/**
 * @swagger
 * /api/verify/org/{orgId}/final-approve:
 *   post:
 *     tags: ['Verify']
 *     summary: Final approve organization
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization approved
 */
router.post('/org/:orgId/final-approve', validateOrganizationObjectId, finalApproveOrganization);

/**
 * @swagger
 * /api/verify/org/{orgId}/final-disapprove:
 *   post:
 *     tags: ['Verify']
 *     summary: Final disapprove organization
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization disapproved
 */
router.post('/org/:orgId/final-disapprove', validateOrganizationObjectId, finalDisapproveOrganization);

/**
 * @swagger
 * /api/verify/org/{orgId}/upload-report:
 *   post:
 *     tags: ['Verify']
 *     summary: Upload organization final report
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               finalReport:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Report uploaded
 */
router.post('/org/:orgId/upload-report', validateOrganizationObjectId, orgReportUpload, handleMulterError, uploadOrganizationFinalReport);

/**
 * @swagger
 * /api/verify/org/me:
 *   get:
 *     tags: ['Verify']
 *     summary: Get current organization profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current organization profile retrieved
 */
router.get('/org/me', authenticateJWT, getCurrentOrganization);

/**
 * @swagger
 * /api/verify/org/check-status:
 *   get:
 *     tags: ['Verify']
 *     summary: Check organization verification status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved
 */
router.get('/org/check-status', authenticateJWT, checkOrganizationStatus);


module.exports = router;
