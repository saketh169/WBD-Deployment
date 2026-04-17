const bcrypt = require('bcryptjs');
const { Employee, Organization } = require('../models/userModel');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Helper function to generate unique license number for employee
 * Format: First 3 letters of org name (uppercase) + 6 random digits
 * Example: APO123456 for "Apollo Hospital"
 */
const generateLicenseNumber = async (organizationName) => {
    // Extract first 3 letters of organization name
    const prefix = organizationName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    
    // Generate 6 random digits
    let licenseNumber;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
        licenseNumber = `${prefix}${randomDigits}`;
        
        // Check if license number already exists
        const existing = await Employee.findOne({ licenseNumber });
        if (!existing) {
            return licenseNumber;
        }
        attempts++;
    }

    throw new Error('Failed to generate unique license number after multiple attempts');
};

/**
 * GET /api/organization/employees
 * Get all employees for the logged-in organization
 */
exports.getAllEmployees = async (req, res) => {
    try {
        const organizationId = req.user.roleId; // Organization ID from auth middleware
        
        const employees = await Employee.find({ 
            organizationId,
            isDeleted: false 
        })
        .select('-passwordHash') // Don't send password hash
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: employees.length,
            data: employees
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employees'
        });
    }
};

/**
 * POST /api/organization/employees/add
 * Add a single employee
 */
exports.addEmployee = async (req, res) => {
    try {
        const organizationId = req.user.roleId;
        const { name, email, password, licenseNumber: providedLicense, age, address, contact } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Validate provided license number format if given
        if (providedLicense && !/^[A-Z]{3}[0-9]{6}$/.test(providedLicense)) {
            return res.status(400).json({
                success: false,
                message: 'License number must be 3 uppercase letters followed by 6 digits (e.g. APO123456)'
            });
        }

        // Check if employee email already exists for this organization
        const existingEmployee = await Employee.findOne({ 
            organizationId, 
            email,
            isDeleted: false 
        });

        if (existingEmployee) {
            return res.status(400).json({
                success: false,
                message: 'Employee with this email already exists in your organization'
            });
        }

        // Check if provided license number is already taken
        if (providedLicense) {
            const licenseExists = await Employee.findOne({ licenseNumber: providedLicense });
            if (licenseExists) {
                return res.status(400).json({
                    success: false,
                    message: 'License number already in use. Please choose a different one.'
                });
            }
        }

        // Get organization details for license generation (fallback)
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Use provided license number or auto-generate
        const licenseNumber = providedLicense || await generateLicenseNumber(organization.name);

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create employee
        const employee = new Employee({
            name,
            email,
            passwordHash,
            licenseNumber,
            organizationId,
            status: 'active',
            age: age ? Number(age) : null,
            address: address || null,
            contact: contact || null,
            inviteSentAt: new Date(),
            activatedAt: new Date()
        });

        await employee.save();

        // Remove password hash from response
        const employeeResponse = employee.toObject();
        delete employeeResponse.passwordHash;

        res.status(201).json({
            success: true,
            message: 'Employee added successfully',
            data: employeeResponse
        });
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add employee'
        });
    }
};

/**
 * POST /api/organization/employees/bulk-upload
 * Add multiple employees from CSV file
 * CSV Format: name,email,password,age,address,contact
 */
exports.bulkUploadEmployees = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a CSV file'
            });
        }

        const organizationId = req.user.roleId;
        
        // Get organization details
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        const employees = [];
        const errors = [];
        const csvBuffer = req.file.buffer;

        // Parse CSV
        const readable = Readable.from(csvBuffer.toString());
        
        await new Promise((resolve, reject) => {
            readable
                .pipe(csv())
                .on('data', (row) => {
                    employees.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (employees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty or invalid'
            });
        }

        // Process each employee
        const addedEmployees = [];
        let skippedCount = 0;
        
        for (let i = 0; i < employees.length; i++) {
            const row = employees[i];
            const rowNum = i + 2; // +2 because of header row and 0-index
            
            try {
                // Validate required fields
                if (!row.name || !row.email || !row.password) {
                    errors.push(`Row ${rowNum}: Missing required fields (name, email, password)`);
                    continue;
                }

                // Check if employee already exists
                const existingEmployee = await Employee.findOne({
                    organizationId,
                    email: row.email.toLowerCase().trim(),
                    isDeleted: false
                });

                if (existingEmployee) {
                    skippedCount++;
                    continue; // silently skip duplicate emails
                }

                // Validate and use provided licenseNumber, or auto-generate
                let licenseNumber;
                if (row.licenseNumber) {
                    const cleaned = row.licenseNumber.trim();
                    if (!/^[A-Z]{3}[0-9]{6}$/.test(cleaned)) {
                        errors.push(`Row ${rowNum}: Invalid license number format "${cleaned}" — must be 3 uppercase letters + 6 digits`);
                        continue;
                    }
                    const licenseExists = await Employee.findOne({ licenseNumber: cleaned });
                    if (licenseExists) {
                        errors.push(`Row ${rowNum}: License number "${cleaned}" is already in use`);
                        continue;
                    }
                    licenseNumber = cleaned;
                } else {
                    licenseNumber = await generateLicenseNumber(organization.name);
                }

                // Hash password
                const passwordHash = await bcrypt.hash(row.password, 10);

                // Create employee
                const employee = new Employee({
                    name: row.name.trim(),
                    email: row.email.toLowerCase().trim(),
                    passwordHash,
                    licenseNumber,
                    organizationId,
                    status: row.status || 'active',
                    age: row.age ? Number(row.age) : null,
                    address: row.address ? row.address.trim() : null,
                    contact: row.contact ? row.contact.trim() : null,
                    inviteSentAt: new Date(),
                    activatedAt: new Date()
                });

                await employee.save();
                
                const employeeObj = employee.toObject();
                delete employeeObj.passwordHash;
                addedEmployees.push(employeeObj);

            } catch (error) {
                errors.push(`Row ${rowNum}: ${error.message}`);
            }
        }

        res.status(201).json({
            success: true,
            message: `Successfully added ${addedEmployees.length} employees${skippedCount > 0 ? `, skipped ${skippedCount} duplicates` : ''}`,
            data: {
                added: addedEmployees.length,
                skipped: skippedCount,
                errors: errors.length,
                employees: addedEmployees,
                errorDetails: errors
            }
        });

    } catch (error) {
        console.error('Error in bulk upload:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload employees'
        });
    }
};

/**
 * PUT /api/organization/employees/:id
 * Update an employee
 */
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.roleId;
        const { name, email, status, age, address, contact } = req.body;

        // Find employee
        const employee = await Employee.findOne({
            _id: id,
            organizationId,
            isDeleted: false
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check if email is being changed and already exists
        if (email && email !== employee.email) {
            const existingEmployee = await Employee.findOne({
                organizationId,
                email: email.toLowerCase().trim(),
                _id: { $ne: id },
                isDeleted: false
            });

            if (existingEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee with this email already exists'
                });
            }
        }

        // Update fields
        if (name) employee.name = name;
        if (email) employee.email = email.toLowerCase().trim();
        if (status) employee.status = status;
        if (age !== undefined) employee.age = age ? Number(age) : null;
        if (address !== undefined) employee.address = address || null;
        if (contact !== undefined) employee.contact = contact || null;

        await employee.save();

        // Remove password hash from response
        const employeeResponse = employee.toObject();
        delete employeeResponse.passwordHash;

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: employeeResponse
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee'
        });
    }
};

/**
 * DELETE /api/organization/employees/:id
 * Delete/deactivate an employee (soft delete)
 */
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.roleId;

        // Find employee (must belong to this org)
        const employee = await Employee.findOne({
            _id: id,
            organizationId
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Hard delete — completely remove from DB
        await Employee.deleteOne({ _id: id });

        res.status(200).json({
            success: true,
            message: 'Employee permanently deleted'
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete employee'
        });
    }
};

/**
 * PATCH /api/employees/:id/inactive
 * Mark an employee as inactive (not available, but record kept)
 */
exports.inactivateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.roleId;

        const employee = await Employee.findOne({
            _id: id,
            organizationId,
            isDeleted: false
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        employee.status = 'inactive';
        await employee.save();

        res.status(200).json({
            success: true,
            message: 'Employee marked as inactive'
        });
    } catch (error) {
        console.error('Error inactivating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to inactivate employee'
        });
    }
};

/**
 * PATCH /api/employees/:id/active
 * Mark an employee as active
 */
exports.activateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.roleId;

        const employee = await Employee.findOne({
            _id: id,
            organizationId,
            isDeleted: false
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        employee.status = 'active';
        await employee.save();

        res.status(200).json({
            success: true,
            message: 'Employee marked as active'
        });
    } catch (error) {
        console.error('Error activating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate employee'
        });
    }
};

/**
 * GET /api/organization/employees/:id
 * Get a single employee by ID
 */
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.roleId;

        const employee = await Employee.findOne({
            _id: id,
            organizationId,
            isDeleted: false
        }).select('-passwordHash');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee'
        });
    }
};

/**
 * GET /api/organization/employees/stats
 * Get employee statistics
 */
exports.getEmployeeStats = async (req, res) => {
    try {
        const organizationId = req.user.roleId;

        const totalEmployees = await Employee.countDocuments({
            organizationId,
            isDeleted: false
        });

        const activeEmployees = await Employee.countDocuments({
            organizationId,
            isDeleted: false,
            status: 'active'
        });

        const inactiveEmployees = await Employee.countDocuments({
            organizationId,
            isDeleted: false,
            status: 'inactive'
        });

        const pendingEmployees = await Employee.countDocuments({
            organizationId,
            isDeleted: false,
            status: 'pending-activation'
        });

        res.status(200).json({
            success: true,
            data: {
                total: totalEmployees,
                active: activeEmployees,
                inactive: inactiveEmployees,
                pending: pendingEmployees
            }
        });
    } catch (error) {
        console.error('Error fetching employee stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee statistics'
        });
    }
};
