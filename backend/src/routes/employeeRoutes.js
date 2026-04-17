const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const multer = require('multer');

// Configure multer for CSV file upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || 
            file.mimetype === 'application/csv' ||
            file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// All routes require authentication and organization role
router.use(authenticateJWT);

// Middleware to check if user is organization admin (not employee)
const requireOrganization = (req, res, next) => {
    if (req.user.role !== 'organization') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only organizations can manage employees.'
        });
    }
    // Employees have orgType: 'employee' - they should not manage other employees
    if (req.user.orgType === 'employee') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only organization admins can manage employees.'
        });
    }
    next();
};

router.use(requireOrganization);

// Employee CRUD Routes

/**
 * @swagger
 * /api/employees/stats:
 *   get:
 *     tags: ['Employee']
 *     summary: Get employee statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Employee statistics retrieved
 *       403:
 *         description: Organization admin access required
 */
// GET /api/employees/stats - Get employee statistics
router.get('/stats', employeeController.getEmployeeStats);

/**
 * @swagger
 * /api/employees:
 *   get:
 *     tags: ['Employee']
 *     summary: Get all employees for organization
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Employees list retrieved
 *       403:
 *         description: Organization admin access required
 */
// GET /api/employees - Get all employees
router.get('/', employeeController.getAllEmployees);

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     tags: ['Employee']
 *     summary: Get single employee
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee details retrieved
 *       404:
 *         description: Employee not found
 */
// GET /api/employees/:id - Get single employee
router.get('/:id', employeeController.getEmployeeById);

/**
 * @swagger
 * /api/employees/add:
 *   post:
 *     tags: ['Employee']
 *     summary: Add single employee
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Employee full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Employee email address
 *               password:
 *                 type: string
 *                 description: Employee password
 *               licenseNumber:
 *                 type: string
 *                 pattern: '^[A-Z]{3}[0-9]{6}$'
 *                 description: License number (auto-generated if not provided)
 *                 example: "ORG123456"
 *               age:
 *                 type: number
 *                 description: Employee age
 *               address:
 *                 type: string
 *                 description: Employee address
 *               contact:
 *                 type: string
 *                 description: Employee contact information (phone)
 *     responses:
 *       201:
 *         description: Employee added successfully
 *       403:
 *         description: Organization admin access required
 */
// POST /api/employees/add - Add single employee
router.post('/add', employeeController.addEmployee);

/**
 * @swagger
 * /api/employees/bulk-upload:
 *   post:
 *     tags: ['Employee']
 *     summary: Bulk upload employees from CSV
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Employees uploaded successfully
 *       400:
 *         description: Invalid CSV format
 *       403:
 *         description: Organization admin access required
 */
// POST /api/employees/bulk-upload - Bulk upload employees from CSV
router.post('/bulk-upload', upload.single('csvFile'), employeeController.bulkUploadEmployees);

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     tags: ['Employee']
 *     summary: Update employee information
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *                 description: Employee full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Employee email address
 *               licenseNumber:
 *                 type: string
 *                 pattern: '^[A-Z]{3}[0-9]{6}$'
 *                 description: License number
 *               age:
 *                 type: number
 *                 description: Employee age
 *               address:
 *                 type: string
 *                 description: Employee address
 *               contact:
 *                 type: string
 *                 description: Employee contact information (phone)
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 */
// PUT /api/employees/:id - Update employee
router.put('/:id', employeeController.updateEmployee);

/**
 * @swagger
 * /api/employees/{id}/inactive:
 *   patch:
 *     tags: ['Employee']
 *     summary: Mark employee as inactive
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee marked inactive
 *       404:
 *         description: Employee not found
 */
// PATCH /api/employees/:id/inactive - Mark employee as inactive
router.patch('/:id/inactive', employeeController.inactivateEmployee);

/**
 * @swagger
 * /api/employees/{id}/active:
 *   patch:
 *     tags: ['Employee']
 *     summary: Mark employee as active
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee marked active
 *       404:
 *         description: Employee not found
 */
// PATCH /api/employees/:id/active - Mark employee as active
router.patch('/:id/active', employeeController.activateEmployee);

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     tags: ['Employee']
 *     summary: Permanently delete employee
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
// DELETE /api/employees/:id - Permanently remove employee
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
