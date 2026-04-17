import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from '../../axios';
import AuthContext from '../../contexts/AuthContext';

const EmployeeManagement = () => {
    const { user } = useContext(AuthContext);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [csvFile, setCsvFile] = useState(null);
    const [uploadResult, setUploadResult] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const tableRef = useRef(null);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Derive license prefix from org name (first 3 uppercase letters)
    const orgName = user?.org_name || '';
    const orgLicensePrefix = orgName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'EMP';

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        age: '',
        address: '',
        contact: '',
        licenseNumber: orgLicensePrefix,
        status: 'active'
    });

    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending-activation', label: 'Pending Activation' }
    ];

    // Fetch all employees
    const fetchEmployees = async () => {
        setLoading(true);
        setCurrentPage(1);
        try {
            const response = await axios.get(`/api/employees`);
            setEmployees(response.data.data);
        } catch (error) {
            setErrorMessage('Failed to fetch employees');
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Prevent removing the auto-generated prefix from licenseNumber
        if (name === 'licenseNumber') {
            if (!value.startsWith(orgLicensePrefix)) return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!showEditModal && !formData.password.trim()) newErrors.password = 'Password is required';
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (!showEditModal) {
            const licRegex = /^[A-Z]{3}[0-9]{6}$/;
            if (!licRegex.test(formData.licenseNumber)) {
                newErrors.licenseNumber = `Format must be ${orgLicensePrefix} + 6 digits (e.g. ${orgLicensePrefix}123456)`;
            }
        }
        return newErrors;
    };

    // Add employee
    const handleAddEmployee = async (e) => {
        e.preventDefault();
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `/api/employees/add`,
                formData
            );
            
            setSuccessMessage(`Employee added successfully! License Number: ${response.data.data.licenseNumber}`);
            setShowAddForm(false);
            resetForm();
            fetchEmployees();
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrorMessage('Failed to add employee');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Update employee
    const handleUpdateEmployee = async (e) => {
        e.preventDefault();
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        setLoading(true);
        try {
            const updateData = { ...formData };
            delete updateData.password; // Don't send password in update

            await axios.put(
                `/api/employees/${selectedEmployee._id}`,
                updateData
            );
            
            setSuccessMessage('Employee updated successfully!');
            setShowEditModal(false);
            resetForm();
            fetchEmployees();
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrorMessage('Failed to update employee');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Mark employee as inactive
    const handleInactivateEmployee = async (employeeId) => {
        if (!confirm('Mark this employee as inactive? They will no longer be available but the record will be kept.')) return;

        setLoading(true);
        try {
            await axios.patch(
                `/api/employees/${employeeId}/inactive`,
                {}
            );
            setSuccessMessage('Employee marked as inactive.');
            fetchEmployees();
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrorMessage('Failed to inactivate employee');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Mark employee as active
    const handleActivateEmployee = async (employeeId) => {
        setLoading(true);
        try {
            await axios.patch(
                `/api/employees/${employeeId}/active`,
                {}
            );
            setSuccessMessage('Employee marked as active.');
            fetchEmployees();
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrorMessage('Failed to activate employee');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Permanently delete employee
    const handleDeleteEmployee = async (employeeId) => {
        if (!confirm('PERMANENTLY DELETE this employee? This cannot be undone.')) return;

        setLoading(true);
        try {
            await axios.delete(
                `/api/employees/${employeeId}`
            );
            
            setSuccessMessage('Employee permanently deleted.');
            fetchEmployees();
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrorMessage('Failed to delete employee');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Handle CSV file upload
    const handleFileChange = (e) => {
        setCsvFile(e.target.files[0]);
        setUploadResult(null);
    };

    // Bulk upload employees
    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!csvFile) {
            setErrorMessage('Please select a CSV file');
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('csvFile', csvFile);

        setLoading(true);
        try {
            const response = await axios.post(
                `/api/employees/bulk-upload`,
                formDataUpload,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            setUploadResult(response.data.data);
            setSuccessMessage(`Bulk upload done! Added: ${response.data.data.added}${response.data.data.skipped > 0 ? `, Skipped duplicates: ${response.data.data.skipped}` : ''}`);
            setCsvFile(null);
            fetchEmployees();
            setTimeout(() => {
                setSuccessMessage('');
                setShowBulkUpload(false);
                setUploadResult(null);
            }, 8000);
        } catch (error) {
            setErrorMessage('Failed to upload employees');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Download employees list as CSV
    const downloadTemplate = () => {
        const headers = 'name,email,age,address,contact,licenseNumber,status';
        const rows = (employees || []).map(emp =>
            [
                `"${(emp.name || '').replace(/"/g, '""')}"`,
                `"${(emp.email || '').replace(/"/g, '""')}"`,
                emp.age || '',
                `"${(emp.address || '').replace(/"/g, '""')}"`,
                emp.contact || '',
                emp.licenseNumber || '',
                emp.status || ''
            ].join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `${orgName.replace(/\s+/g, '_') || 'org'}_employees_${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Download blank CSV template for bulk upload
    const downloadUploadTemplate = () => {
        const csvContent = 'name,email,password,age,address,contact\nJohn Doe,john@example.com,password123,28,123 Main St,9876543210\nJane Smith,jane@example.com,pass456,32,456 Park Ave,9123456780';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employee_upload_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            age: '',
            address: '',
            contact: '',
            licenseNumber: orgLicensePrefix,
            status: 'active',
        });
        setErrors({});
        setSelectedEmployee(null);
    };

    // Open edit modal
    const openEditModal = (employee) => {
        setSelectedEmployee(employee);
        setFormData({
            name: employee.name,
            email: employee.email,
            password: '',
            age: employee.age || '',
            address: employee.address || '',
            contact: employee.contact || '',
            status: employee.status
        });
        setShowEditModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-[#1A4A40] mb-2">
                        <i className="fas fa-users-cog mr-3"></i>
                        Employee Management
                    </h1>
                    <p className="text-gray-600">Add, update, and manage organization employees</p>
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
                        <i className="fas fa-check-circle mr-2"></i>{successMessage}
                    </div>
                )}
                {errorMessage && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
                        <i className="fas fa-exclamation-circle mr-2"></i>{errorMessage}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className={`${showAddForm ? 'bg-red-500 hover:bg-red-600' : 'bg-[#27AE60] hover:bg-[#1E6F5C]'} text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md`}
                        >
                            <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} mr-2`}></i>
                            {showAddForm ? 'Cancel' : 'Add Employee'}
                        </button>
                        <button
                            onClick={() => setShowBulkUpload(!showBulkUpload)}
                            className={`${showBulkUpload ? 'bg-red-500 hover:bg-red-600' : 'bg-[#2980B9] hover:bg-[#1A5276]'} text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md`}
                        >
                            <i className={`fas ${showBulkUpload ? 'fa-times' : 'fa-upload'} mr-2`}></i>
                            {showBulkUpload ? 'Cancel' : 'Bulk Upload'}
                        </button>
                        <button
                            onClick={downloadTemplate}
                            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-200 shadow-md"
                        >
                            <i className="fas fa-file-export mr-2"></i>Export Employees
                        </button>
                        <button
                            onClick={fetchEmployees}
                            className="bg-[#17A2B8] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#138496] transition-all duration-200 shadow-md"
                        >
                            <i className="fas fa-sync-alt mr-2"></i>Refresh
                        </button>
                    </div>
                </div>

                {/* Add Employee Form - Inline */}
                {showAddForm && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-[#27AE60]">
                        <h2 className="text-2xl font-bold text-[#1A4A40] mb-6">
                            <i className="fas fa-user-plus mr-3"></i>Add New Employee
                        </h2>
                        <form onSubmit={handleAddEmployee}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* LEFT — Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all ${
                                            errors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter employee name"
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                {/* RIGHT — Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all ${
                                            errors.email ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="employee@example.com"
                                    />
                                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                                </div>

                                {/* LEFT — Age */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                                    <input
                                        type="number"
                                        name="age"
                                        value={formData.age}
                                        onChange={handleInputChange}
                                        min="18" max="100"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all"
                                        placeholder="e.g. 28"
                                    />
                                </div>

                                {/* RIGHT — Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all ${
                                            errors.password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Enter password"
                                    />
                                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                                </div>

                                {/* LEFT — Contact */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact</label>
                                    <input
                                        type="tel"
                                        name="contact"
                                        value={formData.contact}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all"
                                        placeholder="e.g. 9876543210"
                                    />
                                </div>

                                {/* RIGHT — License Number */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        License Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="licenseNumber"
                                        value={formData.licenseNumber}
                                        onChange={handleInputChange}
                                        maxLength={9}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all font-mono ${
                                            errors.licenseNumber ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder={`${orgLicensePrefix}123456`}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Prefix <span className="font-semibold text-[#27AE60]">{orgLicensePrefix}</span> is fixed — enter 6 digits after it</p>
                                    {errors.licenseNumber && <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>}
                                </div>

                                {/* LEFT — Address */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all resize-none"
                                        placeholder="Enter full address"
                                    />
                                </div>

                                {/* RIGHT — Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-transparent transition-all"
                                    >
                                        {statusOptions.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                                >
                                    <i className="fas fa-times mr-2"></i>Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 bg-[#27AE60] text-white rounded-lg hover:bg-[#1E6F5C] font-semibold transition-colors disabled:opacity-50 shadow-md"
                                >
                                    {loading ? (
                                        <><i className="fas fa-spinner fa-spin mr-2"></i>Adding...</>
                                    ) : (
                                        <><i className="fas fa-user-plus mr-2"></i>Add Employee</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bulk Upload Form - Inline */}
                {showBulkUpload && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-[#2980B9]">
                        <h2 className="text-2xl font-bold text-[#1A4A40] mb-6">
                            <i className="fas fa-file-upload mr-3"></i>Bulk Upload Employees
                        </h2>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
                            <h3 className="font-semibold text-blue-900 mb-2">CSV Format Instructions:</h3>
                            <ul className="text-sm text-blue-800 space-y-1 ml-4">
                                <li>• Headers: name, email, password, age, address, contact</li>
                                <li>• Required: name, email, password — age/address/contact are optional</li>
                                <li>• Duplicate emails are automatically skipped</li>
                                <li>• Download the template below for reference</li>
                            </ul>
                        </div>

                        <form onSubmit={handleBulkUpload}>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select CSV File <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2980B9] focus:border-transparent"
                                />
                                {csvFile && (
                                    <p className="text-sm text-green-600 mt-2">
                                        <i className="fas fa-check-circle mr-1"></i>
                                        {csvFile.name}
                                    </p>
                                )}
                            </div>

                            {uploadResult && (
                                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h4 className="font-semibold text-gray-900 mb-3">Upload Results:</h4>
                                    <div className="space-y-2">
                                        <p className="text-green-600">
                                            <i className="fas fa-check-circle mr-2"></i>
                                            Successfully added: {uploadResult.added} employees
                                        </p>
                                        {uploadResult.skipped > 0 && (
                                            <p className="text-yellow-600">
                                                <i className="fas fa-forward mr-2"></i>
                                                Skipped (already exist): {uploadResult.skipped}
                                            </p>
                                        )}
                                        {uploadResult.errors > 0 && (
                                            <div>
                                                <p className="text-red-600">
                                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                                    Errors: {uploadResult.errors}
                                                </p>
                                                <div className="ml-6 mt-2 text-sm text-red-700 max-h-40 overflow-y-auto">
                                                    {uploadResult.errorDetails.map((error, index) => (
                                                        <p key={`upload-err-${index}`}>• {error}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between gap-4 mt-4">
                                <button
                                    type="button"
                                    onClick={downloadUploadTemplate}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors shadow-md"
                                >
                                    <i className="fas fa-download mr-2"></i>Download Template
                                </button>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBulkUpload(false);
                                            setCsvFile(null);
                                            setUploadResult(null);
                                        }}
                                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                                    >
                                        <i className="fas fa-times mr-2"></i>Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !csvFile}
                                        className="px-6 py-3 bg-[#2980B9] text-white rounded-lg hover:bg-[#1A5276] font-semibold transition-colors disabled:opacity-50 shadow-md"
                                    >
                                        {loading ? (
                                            <><i className="fas fa-spinner fa-spin mr-2"></i>Uploading...</>
                                        ) : (
                                            <><i className="fas fa-upload mr-2"></i>Upload & Add</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Employees Table */}
                <div ref={tableRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-[#1A4A40]">
                            All Employees ({employees?.length || 0})
                        </h2>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <i className="fas fa-spinner fa-spin text-4xl text-[#27AE60]"></i>
                            <p className="mt-4 text-gray-600">Loading employees...</p>
                        </div>
                    ) : !employees || employees.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-users text-6xl text-gray-300 mb-4"></i>
                            <p className="text-gray-500 text-lg">No employees found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-green-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase tracking-wider">Age</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase tracking-wider">License Number</th>

                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-[#1A4A40] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {employees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((employee) => (
                                        <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{employee.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {employee.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {employee.contact || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {employee.age || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">
                                                    {employee.licenseNumber}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                    employee.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    employee.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {employee.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(employee)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    {employee.status !== 'inactive' && (
                                                        <button
                                                            onClick={() => handleInactivateEmployee(employee._id)}
                                                            className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                                                            title="Mark Inactive"
                                                        >
                                                            <i className="fas fa-user-slash"></i>
                                                        </button>
                                                    )}
                                                    {employee.status === 'inactive' && (
                                                        <button
                                                            onClick={() => handleActivateEmployee(employee._id)}
                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                            title="Mark Active"
                                                        >
                                                            <i className="fas fa-user-check"></i>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteEmployee(employee._id)}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Permanently Delete"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Pagination */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
                                    <p className="text-sm text-gray-600">
                                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, employees.length)} of {employees.length} employees
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handlePageChange(1)}
                                            disabled={currentPage === 1}
                                            className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                                        >«</button>
                                        <button
                                            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                                        >‹</button>
                                        {Array.from({ length: Math.ceil(employees.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                                            .filter(p => p === 1 || p === Math.ceil(employees.length / ITEMS_PER_PAGE) || Math.abs(p - currentPage) <= 1)
                                            .reduce((acc, p, idx, arr) => {
                                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((p, i) => p === '...' ? (
                                                <span key={`ellipsis-${i}`} className="px-2 py-1 text-gray-400">…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => handlePageChange(p)}
                                                    className={`px-3 py-1 rounded text-sm border ${
                                                        currentPage === p
                                                            ? 'bg-[#27AE60] text-white border-[#27AE60]'
                                                            : 'border-gray-300 hover:bg-gray-100'
                                                    }`}
                                                >{p}</button>
                                            ))
                                        }
                                        <button
                                            onClick={() => handlePageChange(Math.min(currentPage + 1, Math.ceil(employees.length / ITEMS_PER_PAGE)))}
                                            disabled={currentPage === Math.ceil(employees.length / ITEMS_PER_PAGE)}
                                            className="px-3 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                                        >›</button>
                                        <button
                                            onClick={() => handlePageChange(Math.ceil(employees.length / ITEMS_PER_PAGE))}
                                            disabled={currentPage === Math.ceil(employees.length / ITEMS_PER_PAGE)}
                                            className="px-2 py-1 rounded text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                                        >»</button>
                                    </div>
                                </div>
                        </div>
                    )}
                </div>

                {/* Edit Employee Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="bg-[#2980B9] text-white p-6 rounded-t-lg">
                                <h2 className="text-2xl font-bold">
                                    <i className="fas fa-user-edit mr-2"></i>Edit Employee
                                </h2>
                            </div>
                            <form onSubmit={handleUpdateEmployee} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2980B9] focus:border-transparent ${
                                                errors.name ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2980B9] focus:border-transparent ${
                                                errors.email ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                                        <input
                                            type="number"
                                            name="age"
                                            value={formData.age}
                                            onChange={handleInputChange}
                                            min="18" max="100"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2980B9] focus:border-transparent"
                                            placeholder="e.g. 28"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Contact</label>
                                        <input
                                            type="tel"
                                            name="contact"
                                            value={formData.contact}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2980B9] focus:border-transparent"
                                            placeholder="e.g. 9876543210"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                                        <textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2980B9] focus:border-transparent resize-none"
                                            placeholder="Enter full address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2980B9] focus:border-transparent"
                                        >
                                            {statusOptions.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            resetForm();
                                        }}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2 bg-[#2980B9] text-white rounded-lg hover:bg-[#1A5276] transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Updating...' : 'Update Employee'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default EmployeeManagement;
