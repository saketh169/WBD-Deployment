const { Dietitian, Organization } = require('../models/userModel');

// Combined controller: Get dietitian name, verification status, and files
// Requires authenticateJWT middleware on the route
exports.getDietitianStatus = async (req, res) => {
    try {
        if (req.user.role !== 'dietitian') {
            return res.status(403).json({ message: 'Access denied. Dietitian role required.' });
        }

        const dietitian = await Dietitian.findById(req.user.roleId).select('name verificationStatus files documentUploadStatus');
        if (!dietitian) {
            return res.status(404).json({ message: 'Dietitian not found' });
        }

        const responseData = {
            name: dietitian.name,
            verificationStatus: {
                ...dietitian.verificationStatus,
                finalReport: dietitian.documentUploadStatus || 'pending'
            },
            finalReport: null
        };

        if (dietitian.files && dietitian.files.finalReport &&
            (dietitian.verificationStatus.finalReport === 'Verified' ||
                dietitian.verificationStatus.finalReport === 'Received')) {
            responseData.finalReport = {
                url: dietitian.files.finalReport,
                mime: 'application/pdf',
                name: `Dietitian_Report_${dietitian._id}.pdf`
            };
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching dietitian status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Combined controller: Get organization name, verification status, and files
// Requires authenticateJWT middleware on the route
exports.getOrganizationStatus = async (req, res) => {
    try {
        if (req.user.role !== 'organization' || req.user.orgType === 'employee') {
            return res.status(403).json({ message: 'Access denied. Organization admin role required.' });
        }

        const organization = await Organization.findById(req.user.roleId).select('name verificationStatus files documentUploadStatus');
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        const responseData = {
            name: organization.name,
            verificationStatus: {
                ...organization.verificationStatus,
                finalReport: organization.documentUploadStatus || 'pending'
            },
            finalReport: null
        };

        if (organization.files && organization.files.finalReport &&
            (organization.verificationStatus.finalReport === 'Verified' ||
                organization.verificationStatus.finalReport === 'Received')) {
            responseData.finalReport = {
                url: organization.files.finalReport,
                mime: 'application/pdf',
                name: `Organization_Report_${organization._id}.pdf`
            };
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching organization status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get organization verification status for employee
// Requires authenticateJWT middleware on the route
exports.getEmployeeOrgStatus = async (req, res) => {
    try {
        // Employee tokens have orgType: 'employee' and organizationId
        if (req.user.orgType !== 'employee' || !req.user.organizationId) {
            return res.status(403).json({ message: 'Access denied. Employee role required.' });
        }

        const organization = await Organization.findById(req.user.organizationId).select('name documentUploadStatus');
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.status(200).json({
            organizationName: organization.name,
            verificationStatus: {
                finalReport: organization.documentUploadStatus || 'pending'
            }
        });
    } catch (error) {
        console.error('Error fetching employee org status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
