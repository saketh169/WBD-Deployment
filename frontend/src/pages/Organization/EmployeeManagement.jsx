import React, { useState, useEffect, useRef, useContext } from 'react';
import { getEmployees, addEmployee, updateEmployee, removeEmployee, bulkImportEmployees, inactivateEmployee, activateEmployee } from '../../services/organization/organizationService';
import AuthContext from '../../contexts/AuthContext';
const AddEmployeeForm = ({
    formData, handleInputChange, errors, orgLicensePrefix,
    statusOptions, handleAddEmployee, loading, setShowAddForm, resetForm
}) => (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-[#27AE60]">
        <h2 className="text-2xl font-bold text-[#1A4A40] mb-6">
            <i className="fas fa-user-plus mr-3" />Add New Employee
        </h2>
        <form onSubmit={handleAddEmployee}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] ${errors.name ? 'border-red-500' : 'border-gray-300'}`} placeholder="Enter employee name" />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] ${errors.email ? 'border-red-500' : 'border-gray-300'}`} placeholder="employee@example.com" />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                    <input type="number" name="age" value={formData.age} onChange={handleInputChange} min="18" max="100" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60]" placeholder="e.g. 28" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] ${errors.password ? 'border-red-500' : 'border-gray-300'}`} placeholder="Enter password" />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact</label>
                    <input type="tel" name="contact" value={formData.contact} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60]" placeholder="e.g. 9876543210" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">License Number <span className="text-red-500">*</span></label>
                    <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} maxLength={9} className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#27AE60] font-mono ${errors.licenseNumber ? 'border-red-500' : 'border-gray-300'}`} placeholder={`${orgLicensePrefix}123456`} />
                    <p className="text-xs text-gray-400 mt-1">Prefix <span className="font-semibold text-[#27AE60]">{orgLicensePrefix}</span> is fixed — enter 6 digits after it</p>
                    {errors.licenseNumber && <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] resize-none" placeholder="Enter full address" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27AE60]">
                        {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"><i className="fas fa-times mr-2" />Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-3 bg-[#27AE60] text-white rounded-lg hover:bg-[#1E6F5C] font-semibold disabled:opacity-50 shadow-md">
                    {loading ? <><i className="fas fa-spinner fa-spin mr-2" />Adding...</> : <><i className="fas fa-user-plus mr-2" />Add Employee</>}
                </button>
            </div>
        </form>
    </div>
);

const BulkUploadSection = ({
    handleBulkUpload, handleFileChange, csvFile, uploadResult,
    downloadUploadTemplate, setShowBulkUpload, setCsvFile, setUploadResult, loading
}) => (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-[#2980B9]">
        <h2 className="text-2xl font-bold text-[#1A4A40] mb-6"><i className="fas fa-file-upload mr-3" />Bulk Upload Employees</h2>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded text-sm text-blue-800 space-y-1">
            <h3 className="font-semibold text-blue-900 mb-2">CSV Format Instructions:</h3>
            <p>• Headers: name, email, password, age, address, contact</p>
            <p>• Required: name, email, password — age/address/contact optional</p>
            <p>• Duplicate emails automatically skipped</p>
        </div>
        <form onSubmit={handleBulkUpload}>
            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select CSV File <span className="text-red-500">*</span></label>
                <input type="file" accept=".csv" onChange={handleFileChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2980B9]" />
                {csvFile && <p className="text-sm text-green-600 mt-2"><i className="fas fa-check-circle mr-1" />{csvFile.name}</p>}
            </div>
            {uploadResult && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                    <p className="text-green-600"><i className="fas fa-check-circle mr-2" />Added: {uploadResult.added}</p>
                    {uploadResult.skipped > 0 && <p className="text-yellow-600"><i className="fas fa-forward mr-2" />Skipped: {uploadResult.skipped}</p>}
                    {uploadResult.errors > 0 && <p className="text-red-600"><i className="fas fa-exclamation-circle mr-2" />Errors: {uploadResult.errors}</p>}
                </div>
            )}
            <div className="flex justify-between gap-4 mt-4">
                <button type="button" onClick={downloadUploadTemplate} className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold shadow-md"><i className="fas fa-download mr-2" />Template</button>
                <div className="flex gap-4">
                    <button type="button" onClick={() => { setShowBulkUpload(false); setCsvFile(null); setUploadResult(null); }} className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"><i className="fas fa-times mr-2" />Cancel</button>
                    <button type="submit" disabled={loading || !csvFile} className="px-6 py-3 bg-[#2980B9] text-white rounded-lg hover:bg-[#1A5276] font-semibold disabled:opacity-50 shadow-md">
                        {loading ? <><i className="fas fa-spinner fa-spin mr-2" />Uploading...</> : <><i className="fas fa-upload mr-2" />Upload & Add</>}
                    </button>
                </div>
            </div>
        </form>
    </div>
);

const EditEmployeeModal = ({
    showEditModal, handleUpdateEmployee, formData, handleInputChange,
    errors, statusOptions, setShowEditModal, resetForm, loading
}) => {
    if (!showEditModal) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-[#2980B9] text-white p-6 rounded-t-lg"><h2 className="text-2xl font-bold"><i className="fas fa-user-edit mr-2" />Edit Employee</h2></div>
                <form onSubmit={handleUpdateEmployee} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                            <input type="number" name="age" value={formData.age} onChange={handleInputChange} min="18" max="100" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Contact</label>
                            <input type="tel" name="contact" value={formData.contact} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                            <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={() => { setShowEditModal(false); resetForm(); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-[#2980B9] text-white rounded-lg hover:bg-[#1A5276] disabled:opacity-50">{loading ? 'Updating...' : 'Update Employee'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending-activation', label: 'Pending Activation' }
];

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

    const handlePageChange = (page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const orgName = user?.org_name || '';
    const orgLicensePrefix = orgName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'EMP';

    const [formData, setFormData] = useState({ name: '', email: '', password: '', age: '', address: '', contact: '', licenseNumber: orgLicensePrefix, status: 'active' });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchEmployees = async () => {
        setLoading(true);
        setCurrentPage(1);
        try {
            const response = await getEmployees();
            setEmployees(response && !response.isError && response.success ? response.data || [] : []);
        } catch {
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'licenseNumber' && !value.startsWith(orgLicensePrefix)) return;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!showEditModal && !formData.password.trim()) newErrors.password = 'Password is required';
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!showEditModal && !/^[A-Z]{3}[0-9]{6}$/.test(formData.licenseNumber)) {
            newErrors.licenseNumber = `Format: ${orgLicensePrefix} + 6 digits`;
        }
        return newErrors;
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', age: '', address: '', contact: '', licenseNumber: orgLicensePrefix, status: 'active' });
        setErrors({});
        setSelectedEmployee(null);
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return; }
        setLoading(true);
        try {
            const res = await addEmployee(formData);
            if (res && !res.isError && res.success) {
                setSuccessMessage(`Employee added successfully!`);
                setShowAddForm(false);
                resetForm();
                fetchEmployees();
                setTimeout(() => setSuccessMessage(''), 5000);
            } else {
                setErrorMessage(res?.message || 'Failed to add employee');
                setTimeout(() => setErrorMessage(''), 5000);
            }
        } catch {
            setErrorMessage('Failed to add employee');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEmployee = async (e) => {
        e.preventDefault();
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return; }
        setLoading(true);
        try {
            const updateData = { ...formData };
            delete updateData.password;
            const res = await updateEmployee(selectedEmployee._id, updateData);
            if (res && !res.isError && res.success) {
                setSuccessMessage('Employee updated successfully!');
                setShowEditModal(false);
                resetForm();
                fetchEmployees();
                setTimeout(() => setSuccessMessage(''), 5000);
            } else {
                setErrorMessage(res?.message || 'Failed to update employee');
                setTimeout(() => setErrorMessage(''), 5000);
            }
        } catch {
            setErrorMessage('Failed to update employee');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleInactivateEmployee = async (id) => {
        if (!confirm('Mark this employee as inactive?')) return;
        setLoading(true);
        try {
            const res = await inactivateEmployee(id);
            if (res && !res.isError && res.success) {
                setSuccessMessage('Employee marked as inactive.');
                fetchEmployees();
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch {} finally { setLoading(false); }
    };

    const handleActivateEmployee = async (id) => {
        setLoading(true);
        try {
            const res = await activateEmployee(id);
            if (res && !res.isError && res.success) {
                setSuccessMessage('Employee marked as active.');
                fetchEmployees();
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch {} finally { setLoading(false); }
    };

    const handleDeleteEmployee = async (id) => {
        if (!confirm('PERMANENTLY DELETE this employee?')) return;
        setLoading(true);
        try {
            const res = await removeEmployee(id);
            if (res && !res.isError && res.success) {
                setSuccessMessage('Employee permanently deleted.');
                fetchEmployees();
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch {} finally { setLoading(false); }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!csvFile) return;
        setLoading(true);
        try {
            const res = await bulkImportEmployees(csvFile);
            if (res && !res.isError && res.success) {
                setUploadResult(res.data);
                setSuccessMessage(`Bulk upload completed!`);
                setCsvFile(null);
                fetchEmployees();
                setTimeout(() => { setSuccessMessage(''); setShowBulkUpload(false); setUploadResult(null); }, 8000);
            }
        } catch {} finally { setLoading(false); }
    };

    const downloadTemplate = () => {
        const rows = (employees || []).map(emp => [emp.name, emp.email, emp.age, emp.address, emp.contact, emp.licenseNumber, emp.status].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
        const blob = new Blob([['name,email,age,address,contact,licenseNumber,status', ...rows].join('\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const downloadUploadTemplate = () => {
        const blob = new Blob(['name,email,password,age,address,contact\nJohn Doe,john@example.com,pass123,28,Main St,9876543210'], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = 'employee_template.csv';
        a.click();
    };

    const openEditModal = (employee) => {
        setSelectedEmployee(employee);
        setFormData({ name: employee.name, email: employee.email, password: '', age: employee.age || '', address: employee.address || '', contact: employee.contact || '', status: employee.status });
        setShowEditModal(true);
    };

    const totalPages = Math.ceil((employees?.length || 0) / ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-[#1A4A40] mb-2"><i className="fas fa-users-cog mr-3" />Employee Management</h1>
                    <p className="text-gray-600">Add, update, and manage organization employees</p>
                </div>

                {successMessage && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded"><i className="fas fa-check-circle mr-2" />{successMessage}</div>}
                {errorMessage && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded"><i className="fas fa-exclamation-circle mr-2" />{errorMessage}</div>}

                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 flex flex-wrap gap-4">
                    <button onClick={() => setShowAddForm(!showAddForm)} className={`${showAddForm ? 'bg-red-500 hover:bg-red-600' : 'bg-[#27AE60] hover:bg-[#1E6F5C]'} text-white px-6 py-3 rounded-lg font-semibold shadow-md`}>
                        <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} mr-2`} />{showAddForm ? 'Cancel' : 'Add Employee'}
                    </button>
                    <button onClick={() => setShowBulkUpload(!showBulkUpload)} className={`${showBulkUpload ? 'bg-red-500 hover:bg-red-600' : 'bg-[#2980B9] hover:bg-[#1A5276]'} text-white px-6 py-3 rounded-lg font-semibold shadow-md`}>
                        <i className={`fas ${showBulkUpload ? 'fa-times' : 'fa-upload'} mr-2`} />{showBulkUpload ? 'Cancel' : 'Bulk Upload'}
                    </button>
                    <button onClick={downloadTemplate} className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 shadow-md">
                        <i className="fas fa-file-export mr-2" />Export
                    </button>
                    <button onClick={fetchEmployees} className="bg-[#17A2B8] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#138496] shadow-md">
                        <i className="fas fa-sync-alt mr-2" />Refresh
                    </button>
                </div>

                {showAddForm && <AddEmployeeForm formData={formData} handleInputChange={handleInputChange} errors={errors} orgLicensePrefix={orgLicensePrefix} statusOptions={statusOptions} handleAddEmployee={handleAddEmployee} loading={loading} setShowAddForm={setShowAddForm} resetForm={resetForm} />}
                {showBulkUpload && <BulkUploadSection handleBulkUpload={handleBulkUpload} handleFileChange={(e) => setCsvFile(e.target.files[0])} csvFile={csvFile} uploadResult={uploadResult} downloadUploadTemplate={downloadUploadTemplate} setShowBulkUpload={setShowBulkUpload} setCsvFile={setCsvFile} setUploadResult={setUploadResult} loading={loading} />}

                <div ref={tableRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-[#1A4A40]">All Employees ({employees?.length || 0})</h2>
                    </div>

                    {loading ? (
                        <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-4xl text-[#27AE60]" /><p className="mt-4 text-gray-600">Loading employees...</p></div>
                    ) : !employees?.length ? (
                        <div className="text-center py-12"><i className="fas fa-users text-6xl text-gray-300 mb-4" /><p className="text-gray-500 text-lg">No employees found</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-green-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Contact</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Age</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">License Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-[#1A4A40] uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {employees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((employee) => (
                                        <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{employee.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.contact || '—'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{employee.age || '—'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">{employee.licenseNumber}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${employee.status === 'active' ? 'bg-green-100 text-green-800' : employee.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {employee.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button onClick={() => openEditModal(employee)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Edit"><i className="fas fa-edit" /></button>
                                                    {employee.status !== 'inactive' ? (
                                                        <button onClick={() => handleInactivateEmployee(employee._id)} className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100" title="Mark Inactive"><i className="fas fa-user-slash" /></button>
                                                    ) : (
                                                        <button onClick={() => handleActivateEmployee(employee._id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Mark Active"><i className="fas fa-user-check" /></button>
                                                    )}
                                                    <button onClick={() => handleDeleteEmployee(employee._id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Delete"><i className="fas fa-trash" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
                                    <p className="text-sm text-gray-600">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, employees.length)} of {employees.length}</p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handlePageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 rounded text-sm border disabled:opacity-40">‹</button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => handlePageChange(p)} className={`px-3 py-1 rounded text-sm border ${currentPage === p ? 'bg-[#27AE60] text-white' : 'border-gray-300'}`}>{p}</button>
                                        ))}
                                        <button onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 rounded text-sm border disabled:opacity-40">›</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <EditEmployeeModal showEditModal={showEditModal} handleUpdateEmployee={handleUpdateEmployee} formData={formData} handleInputChange={handleInputChange} errors={errors} statusOptions={statusOptions} setShowEditModal={setShowEditModal} resetForm={resetForm} loading={loading} />
            </div>
        </div>
    );
};

export default EmployeeManagement;
