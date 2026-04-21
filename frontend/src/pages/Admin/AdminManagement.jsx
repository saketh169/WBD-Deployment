import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchUsersByRole,
    searchUsersByRole,
    fetchRemovedAccounts,
    removeUser,
    restoreAccount,
    setActiveRole,
    setRemovedRole,
    setSearchTerm,
    setRemovedSearchTerm,
    setExpandedDetails,
    setConfirmAction,
    setRemoveReason,
    clearConfirmAction,
    fetchDietitianConsultations,
    fetchUserConsultations,
    fetchOrganizationEmployees,
} from '../../redux/slices/adminSlice';

// --- Global Constants ---
// Theme colors matching NutriConnect design
const THEME = {
    primary: '#1E6F5C',      // Dark Green (primary)
    secondary: '#28B463',    // Medium Green (accent)
    light: '#E8F5E9',        // Light Green background
    lightBg: '#F0F9F7',      // Very light green
    success: '#27AE60',      // Success green
    danger: '#DC3545',       // Red for delete/remove
    warning: '#FFC107',      // Yellow for warning
    info: '#17A2B8',         // Blue for info
    dark: '#2C3E50',         // Dark gray
    lightGray: '#F8F9FA',    // Light gray background
    borderColor: '#E0E0E0',  // Border color
};

// Bootstrap-compatible color classes
const COLORS = {
    primary: '#1E6F5C',
    secondary: '#28B463',
    success: '#27AE60',
    danger: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
    light: '#F8F9FA',
    dark: '#2C3E50',
};

// --- Mock API Response Structure (To define expected data shape) ---

// --- Helper Functions ---

const handleAlert = (message) => {
    // Replaces the native alert() function
    alert(message);
};

const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
        handleAlert('No data to export.');
        return;
    }

    // Extract simple fields
    const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object' && !k.startsWith('_'));

    const csvContent = [
        keys.join(','),
        ...data.map(item => keys.map(k => {
            let val = item[k] || '';
            if (typeof val === 'string') {
                val = val.replace(/"/g, '""'); // escape quotes
                val = val.replace(/\n/g, ' '); // remove newlines
            }
            return `"${val}"`;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// --- UI Components ---

// Component for rendering a single table row's actions
const UserActions = ({ id, type, onView, onShowRemove, onSoftDelete, onViewConsultations, onViewEmployees }) => (
    <td className="text-center px-4">
        <div className="flex items-center justify-center space-x-2">
            {/* View Button */}
            <button
                className="group relative p-2 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => onView(id, type)}
                title="View Details"
            >
                <i className="fas fa-eye text-green-600 group-hover:text-green-700 text-sm"></i>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    View Details
                </div>
            </button>

            {/* View Consultations Button - for Dietitian and User */}
            {(type === 'dietitian' || type === 'user') && (
                <button
                    className="group relative p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => onViewConsultations(id, type)}
                    title={type === 'dietitian' ? 'View Consultations' : 'View My Consultations'}
                >
                    <i className="fas fa-calendar-check text-blue-600 group-hover:text-blue-700 text-sm"></i>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        {type === 'dietitian' ? 'View Consultations' : 'View Consultations'}
                    </div>
                </button>
            )}

            {/* View Employees Button - for Organization */}
            {type === 'organization' && (
                <button
                    className="group relative p-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => onViewEmployees(id)}
                    title="View Employees"
                >
                    <i className="fas fa-users text-purple-600 group-hover:text-purple-700 text-sm"></i>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        View Employees
                    </div>
                </button>
            )}

            {/* Soft Delete Button */}
            <button
                className="group relative p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => onSoftDelete(id, type)}
                title="Soft Delete"
                aria-label="Soft Delete"
            >
                <i className="fas fa-archive text-emerald-600 group-hover:text-emerald-700 text-sm"></i>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Soft Delete
                </div>
            </button>

            {/* Remove Button */}
            <button
                className="group relative p-2 mr-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => onShowRemove(id, type)}
                title="Remove Account"
                aria-label="Remove Account"
            >
                <i className="fas fa-trash-alt text-red-600 group-hover:text-red-700 text-sm"></i>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Remove Account
                </div>
            </button>
        </div>
    </td>
);

// Component for rendering a removed account's actions
const RemovedActions = ({ id, type, onView, onShowRestore }) => (
    <td className="text-center px-4">
        <div className="flex items-center justify-center space-x-2">
            {/* View Button */}
            <button
                className="group relative p-2 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => onView(id, type)}
                title="View Details"
                aria-label="View Details"
            >
                <i className="fas fa-eye text-green-600 group-hover:text-green-700 text-sm"></i>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    View Details
                </div>
            </button>

            {/* Restore Button */}
            <button
                className="group relative p-2 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 hover:border-teal-300 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => onShowRestore(id, type)}
                title="Restore Account"
                aria-label="Restore Account"
            >
                <i className="fas fa-undo text-teal-600 group-hover:text-teal-700 text-sm"></i>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    Restore Account
                </div>
            </button>
        </div>
    </td>
);

// Component for displaying consultations
const ConsultationsDetail = ({ consultations, type }) => {
    if (!consultations || consultations.length === 0) {
        return (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-700 text-sm">No consultations found for this {type}.</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">
                {type === 'dietitian' ? 'Dietitian Consultations' : 'User Consultations'} ({consultations.length})
            </h3>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                    <thead className="bg-blue-200">
                        <tr>
                            <th className="px-3 py-2 text-left">{type === 'dietitian' ? 'Patient' : 'Dietitian'}</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Amount</th>
                            <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-100">
                        {consultations.map((consultation, idx) => (
                            <tr key={consultation._id || idx} className="hover:bg-blue-100">
                                <td className="px-3 py-2">{type === 'dietitian' ? consultation.username : consultation.dietitianName}</td>
                                <td className="px-3 py-2">{new Date(consultation.date).toLocaleDateString()}</td>
                                <td className="px-3 py-2">{consultation.consultationType}</td>
                                <td className="px-3 py-2">₹{consultation.amount}</td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        consultation.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        consultation.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                        consultation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {consultation.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Component for displaying employees
const EmployeesDetail = ({ employees, sortBy = 'name' }) => {
    if (!employees || employees.length === 0) {
        return (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-purple-700 text-sm">No employees found for this organization.</p>
            </div>
        );
    }

    // Sort employees based on sortBy parameter
    const sortedEmployees = [...employees].sort((a, b) => {
        if (sortBy === 'verifications') {
            return (b.verificationsCount || 0) - (a.verificationsCount || 0);
        } else if (sortBy === 'moderations') {
            return (b.blogModerationsCount || 0) - (a.blogModerationsCount || 0);
        } else {
            return a.name.localeCompare(b.name);
        }
    });

    return (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-3">Organization Employees ({employees.length})</h3>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                    <thead className="bg-purple-200">
                        <tr>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-center">Verifications Done</th>
                            <th className="px-3 py-2 text-center">Blog Moderations Done</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-purple-100">
                        {sortedEmployees.map((employee, idx) => (
                            <tr key={employee._id || idx} className="hover:bg-purple-100">
                                <td className="px-3 py-2 font-medium">{employee.name}</td>
                                <td className="px-3 py-2 text-gray-600">{employee.email}</td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        employee.verificationStatus?.finalReport === 'Verified' ? 'bg-green-100 text-green-800' :
                                        employee.verificationStatus?.finalReport === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                        employee.verificationStatus?.finalReport === 'Rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {employee.verificationStatus?.finalReport || 'Pending'}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center font-medium text-blue-600">{employee.verificationsCount || 0}</td>
                                <td className="px-3 py-2 text-center font-medium text-green-600">{employee.blogModerationsCount || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Pagination Component extracted for reuse
const Pagination = ({ currentPage, totalPages, onPageChange, theme }) => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    const handlePageChange = (newPage) => {
        // Scroll to top of the table
        const tableContainer = document.querySelector('.overflow-x-auto');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        onPageChange(newPage);
    };

    return (
        <div className="flex justify-center items-center space-x-2 mt-4 pb-4">
            <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
            >
                Prev
            </button>

            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => handlePageChange(number)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === number ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                    style={currentPage === number ? { backgroundColor: theme } : {}}
                >
                    {number}
                </button>
            ))}

            <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
            >
                Next
            </button>
        </div>
    );
};

// --- Main Component ---
const AdminManagement = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Redux state
    const {
        users,
        usersPagination,
        removedAccounts,
        removedAccountsPagination,
        activeRole,
        removedRole,
        searchTerm,
        removedSearchTerm,
        expandedDetails,
        confirmAction,
        removeReason,
        isLoading,
        error,
        dietitianConsultations,
        userConsultations,
        organizationEmployees,
    } = useSelector((state) => state.admin);

    const activeRolesList = useMemo(() => ['user', 'dietitian', 'organization'], []);
    const removedRolesList = useMemo(() => ['user', 'dietitian', 'organization'], []);

    // Local state for sorting and pagination display
    const [sortConfig, setSortConfig] = useState({
        user: 'name',
        dietitian: 'name',
        organization: 'name'
    });

    // Local state for display pagination (not API pagination)
    const [displayPage, setDisplayPage] = useState({
        user: 1,
        dietitian: 1,
        organization: 1
    });

    // --- Data Fetching Logic ---

    // Fetch all active users (real API calls)
    const fetchAllActiveUsers = useCallback(async () => {
        // Fetch with high limit to get ALL records for proper sorting across pages
        await Promise.all([
            dispatch(fetchUsersByRole({ role: 'user', page: 1, limit: 1000 })),
            dispatch(fetchUsersByRole({ role: 'dietitian', page: 1, limit: 1000 })),
            dispatch(fetchUsersByRole({ role: 'organization', page: 1, limit: 1000 })),
        ]);
    }, [dispatch]);

    // Fetch removed accounts (real API call)
    const fetchRemovedAccountsData = useCallback(async (page = 1) => {
        await dispatch(fetchRemovedAccounts({ page, limit: 10 }));
    }, [dispatch]);

    useEffect(() => {
        fetchAllActiveUsers();
        fetchRemovedAccountsData();
    }, [fetchAllActiveUsers, fetchRemovedAccountsData]);

    // --- Action Handlers ---

    const handleActionConfirm = (id, type, action) => {
        dispatch(setConfirmAction({ id, type, action }));
    };

    const handleActionExecute = async () => {
        if (!confirmAction) return;

        const { action, type, id } = confirmAction;
        let successMessage = '';

        if (action === 'remove') {
            if (!removeReason.trim()) {
                handleAlert('Please provide a reason for removing this account.');
                return;
            }
            await dispatch(removeUser({ role: type, id, reason: removeReason.trim() }));
            successMessage = `${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully!`;
        } else if (action === 'restore') {
            const result = await dispatch(restoreAccount(id));
            const passwordMsg = result.payload.data.passwordRestored
                ? ' Original password has been restored.'
                : ' A temporary password has been set.';
            successMessage = `${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully!${passwordMsg}`;
        }

        dispatch(clearConfirmAction());
        handleAlert(successMessage);

        // Refresh data
        await Promise.all([fetchAllActiveUsers(), fetchRemovedAccountsData()]);
    };

    const handleActionCancel = () => {
        dispatch(clearConfirmAction());
    };

    const handleViewDetails = (id, type) => {
        const key = type.startsWith('removed-') ? `removed-${id}` : `${type}-${id}`;
        dispatch(setExpandedDetails(key));
    };

    const handleSoftDelete = (id, type) => {
        handleActionConfirm(id, type, 'remove');
    };

    const handleViewConsultations = async (id, type) => {
        if (type === 'dietitian') {
            await dispatch(fetchDietitianConsultations(id));
            dispatch(setExpandedDetails(`${type}-consultations-${id}`));
        } else if (type === 'user') {
            await dispatch(fetchUserConsultations(id));
            dispatch(setExpandedDetails(`${type}-consultations-${id}`));
        }
    };

    const handleViewEmployees = async (id) => {
        await dispatch(fetchOrganizationEmployees(id));
        dispatch(setExpandedDetails(`organization-employees-${id}`));
    };

    // --- Search and Filter Logic ---

    // Sort users based on sortConfig
    const getSortedUsers = (userList, role) => {
        if (!userList || !Array.isArray(userList)) return [];
        
        const sortBy = sortConfig[role] || 'name';
        const sorted = [...userList];

        if (sortBy === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'consultations') {
            // Sort by consultation count (DESCENDING - highest count FIRST)
            sorted.sort((a, b) => {
                const aCount = Number(a.consultationCount ?? 0);
                const bCount = Number(b.consultationCount ?? 0);
                // For descending: if b > a, return negative (b comes first)
                // if b < a, return positive (a comes first)
                // if b = a, return 0 (no change)
                return bCount - aCount;
            });
        } else if (sortBy === 'clients') {
            // Sort by client count (DESCENDING - highest count FIRST, push 0s to end)
            const withClients = [];
            const noClients = [];
            
            sorted.forEach(item => {
                const count = Number(item.clientCount ?? 0);
                if (count > 0) {
                    withClients.push(item);
                } else {
                    noClients.push(item);
                }
            });
            
            // Sort items with clients in descending order
            withClients.sort((a, b) => {
                const aCount = Number(a.clientCount ?? 0);
                const bCount = Number(b.clientCount ?? 0);
                return bCount - aCount;
            });
            
            // Sort items with no clients by name
            noClients.sort((a, b) => a.name.localeCompare(b.name));
            
            // Combine: clients first, then no clients
            return [...withClients, ...noClients];
        } else if (sortBy === 'employees') {
            // Sort by employee count (DESCENDING - highest count FIRST)
            sorted.sort((a, b) => {
                const aCount = Number(a.employeeCount ?? 0);
                const bCount = Number(b.employeeCount ?? 0);
                return bCount - aCount;
            });
        }

        return sorted;
    };

    // Handle sort change for active users
    const handleSortChange = (role, sortType) => {
        setSortConfig(prev => ({
            ...prev,
            [role]: sortType
        }));
    };

    // Handle search for active users
    const handleActiveSearch = async () => {
        if (!searchTerm.trim()) {
            await fetchAllActiveUsers();
            return;
        }

        await Promise.all([
            dispatch(searchUsersByRole({ role: 'user', query: searchTerm, page: 1, limit: 10 })),
            dispatch(searchUsersByRole({ role: 'dietitian', query: searchTerm, page: 1, limit: 10 })),
            dispatch(searchUsersByRole({ role: 'organization', query: searchTerm, page: 1, limit: 10 })),
        ]);
    };

    // Handle search for removed accounts
    const handleRemovedSearch = async () => {
        await dispatch(fetchRemovedAccounts({ query: removedSearchTerm, page: 1, limit: 10 }));
    };

    // Handle page change for active users
    const handleActivePageChange = (newPage) => {
        // Just update the display page - don't re-fetch from API
        // This keeps the global sort intact across all pages
        setDisplayPage(prev => ({
            ...prev,
            [activeRole]: newPage
        }));
    };

    // Handle page change for removed accounts
    const handleRemovedPageChange = (newPage) => {
        dispatch(fetchRemovedAccounts({ query: removedSearchTerm, page: newPage, limit: 10 }));
    };

    const filteredActiveUsers = users;
    const filteredRemovedAccounts = removedAccounts;


    // --- UI Renderers ---

    const renderUserTable = (data, type) => {
        const RoleDetails = ({ user }) => (
            <div className="p-3 text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                {type === 'user' && <><p><strong>DOB:</strong> {user.dob ? user.dob.split('T')[0] : 'N/A'}</p><p><strong>Gender:</strong> {user.gender || 'N/A'}</p></>}
                {type !== 'user' && <><p><strong>Age:</strong> {user.age || 'N/A'}</p></>}
                {type === 'dietitian' && <p><strong>License:</strong> {user.licenseNumber}</p>}
                {(type === 'organization') && <p><strong>License:</strong> {user.licenseNumber}</p>}
                {(type === 'organization') && <p><strong>Address:</strong> {user.address || 'N/A'}</p>}
            </div>
        );

        return (
            <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-r border-gray-300">Name / ID</th>
                        <th className="pl-2 pr-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider w-48">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.length === 0 ? (
                        <tr><td colSpan="2" className="px-6 py-4 text-center text-gray-500">No active {type} accounts found.</td></tr>
                    ) : (
                        data.map((user) => {
                            const isExpanded = expandedDetails === `${type}-${user._id}`;
                            const isConsultationsExpanded = expandedDetails === `${type}-consultations-${user._id}`;
                            const isEmployeesExpanded = expandedDetails === `organization-employees-${user._id}`;
                            const isConfirm = confirmAction && confirmAction.id === user._id && confirmAction.type === type;
                            return (
                                <React.Fragment key={user._id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">{user.name}</td>
                                        <UserActions
                                            id={user._id}
                                            type={type}
                                            onView={handleViewDetails}
                                            onShowRemove={(id, type) => handleActionConfirm(id, type, 'remove')}
                                            onSoftDelete={handleSoftDelete}
                                            onViewConsultations={handleViewConsultations}
                                            onViewEmployees={handleViewEmployees}
                                        />
                                    </tr>
                                    {isExpanded && (
                                        <tr><td colSpan="2" className="px-6 py-0"><RoleDetails user={user} /></td></tr>
                                    )}
                                    {isConsultationsExpanded && type === 'dietitian' && (
                                        <tr><td colSpan="2" className="px-6 py-0">
                                            <ConsultationsDetail consultations={dietitianConsultations[user._id] || []} type="dietitian" />
                                        </td></tr>
                                    )}
                                    {isConsultationsExpanded && type === 'user' && (
                                        <tr><td colSpan="2" className="px-6 py-0">
                                            <ConsultationsDetail consultations={userConsultations[user._id] || []} type="user" />
                                        </td></tr>
                                    )}
                                    {isEmployeesExpanded && type === 'organization' && (
                                        <tr><td colSpan="2" className="px-6 py-0">
                                            <EmployeesDetail employees={organizationEmployees[user._id] || []} />
                                        </td></tr>
                                    )}
                                    {isConfirm && confirmAction?.action === 'remove' && (
                                        <tr>
                                            <td colSpan="2" className="px-6 py-2">
                                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm">
                                                    <div className="flex items-start gap-3">
                                                        <i className="fas fa-exclamation-triangle text-red-500 text-lg mt-1 shrink-0"></i>
                                                        <div className="flex-1">
                                                            <p className="text-red-700 text-sm font-semibold mb-2">Remove this account? Please provide a reason:</p>
                                                            <textarea
                                                                rows={2}
                                                                placeholder="Enter reason for removal (required)..."
                                                                value={removeReason}
                                                                onChange={(e) => dispatch(setRemoveReason(e.target.value))}
                                                                className="w-full p-2 text-sm border border-red-300 rounded-md focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end space-x-2 mt-2">
                                                        <button
                                                            onClick={handleActionCancel}
                                                            className="px-3 py-1.5 text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-md text-xs font-medium transition-colors duration-200"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleActionExecute}
                                                            disabled={!removeReason.trim()}
                                                            className="px-3 py-1.5 text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs font-medium transition-colors duration-200"
                                                        >
                                                            <i className="fas fa-trash-alt mr-1"></i>
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
            </table>
        );
    };

    const renderRemovedTable = (data, type) => {
        const TypeDetails = ({ account }) => {
            // Use originalData if available, otherwise fall back to account data
            const originalData = account.originalData || account;

            return (
                <div className="p-3 text-sm text-gray-700 bg-red-50 rounded-lg border border-red-200">
                    <p><strong>Email:</strong> {account.email}</p>
                    <p><strong>Phone:</strong> {account.phone || 'N/A'}</p>
                    {type === 'user' && originalData.dob && <p><strong>DOB:</strong> {originalData.dob ? originalData.dob.split('T')[0] : 'N/A'}</p>}
                    {type === 'user' && originalData.gender && <p><strong>Gender:</strong> {originalData.gender || 'N/A'}</p>}
                    {type !== 'user' && originalData.age && <p><strong>Age:</strong> {originalData.age || 'N/A'}</p>}
                    {type === 'dietitian' && originalData.licenseNumber && <p><strong>License:</strong> {originalData.licenseNumber}</p>}
                    {(type === 'organization') && originalData.licenseNumber && <p><strong>License:</strong> {originalData.licenseNumber}</p>}
                    {(type === 'organization') && originalData.address && <p><strong>Address:</strong> {originalData.address || 'N/A'}</p>}
                    <p><strong>Removed On:</strong> {account.removedOn}</p>
                    <p><strong>Account Type:</strong> {account.accountType}</p>
                    {account.removalReason && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                            <p><strong className="text-red-700">Removal Reason:</strong> {account.removalReason}</p>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <table className="min-w-full divide-y divide-red-200 shadow-md rounded-lg overflow-hidden border-collapse">
                <thead style={{ backgroundColor: THEME.danger }} className="text-white">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-r border-gray-300">Name</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider w-32 border-r border-gray-300">Removed On</th>
                        <th className="pl-2 pr-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider w-48">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-red-200">
                    {data.filter(a => a.accountType.toLowerCase() === type).length === 0 ? (
                        <tr><td colSpan="3" className="px-6 py-4 text-center text-gray-500">No removed {type} accounts found.</td></tr>
                    ) : (
                        data.filter(a => a.accountType.toLowerCase() === type).map((account) => {
                            const isExpanded = expandedDetails === `removed-${account._id}`;
                            const isConfirm = confirmAction && confirmAction.id === account._id && confirmAction.type === type;
                            return (
                                <React.Fragment key={account._id}>
                                    <tr className="hover:bg-red-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">{account.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center border-r border-gray-200">{account.removedOn}</td>
                                        <RemovedActions
                                            id={account._id}
                                            type={type}
                                            onView={(id, type) => handleViewDetails(id, `removed-${type}`)}
                                            onShowRestore={(id, type) => handleActionConfirm(id, type, 'restore')}
                                        />
                                    </tr>
                                    {isExpanded && (
                                        <tr><td colSpan="3" className="px-6 py-0"><TypeDetails account={account} /></td></tr>
                                    )}
                                    {isConfirm && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-2">
                                                <div className="bg-lime-50 border border-lime-200 p-4 rounded-lg shadow-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <i className="fas fa-undo text-lime-600 mr-3 text-lg"></i>
                                                            <p className="text-lime-700 text-sm font-medium">Are you sure you want to restore this account?</p>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={handleActionCancel}
                                                                className="px-3 py-1.5 text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-md text-xs font-medium transition-colors duration-200"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleActionExecute}
                                                                className="px-3 py-1.5 text-white bg-lime-600 hover:bg-lime-700 rounded-md text-xs font-medium transition-colors duration-200"
                                                            >
                                                                <i className="fas fa-undo mr-1"></i>
                                                                Restore
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
            </table>
        );
    };

    // --- Main Render ---
    return (
        <div className={`min-h-screen p-4 sm:p-8 bg-gray-100`}>
            {/* Back Button */}
            <button onClick={() => navigate(-1)} style={{ color: THEME.primary, cursor: 'pointer' }} className="fixed top-4 left-4 text-4xl hover:opacity-80 transition-opacity" aria-label="Close" onMouseEnter={(e) => e.currentTarget.style.color = THEME.dark} onMouseLeave={(e) => e.currentTarget.style.color = THEME.primary}>
                <i className="fa-solid fa-xmark"></i>
            </button>

            <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-6">Something went wrong. Please try again.</div>
                )}

                {/* --- 1. Active Users Container --- */}
                <div style={{ borderTopColor: THEME.primary }} className="bg-white p-6 rounded-xl shadow-2xl border-t-4 mb-8">
                    <h2 style={{ color: THEME.primary }} className="text-2xl font-bold mb-4">Active Accounts</h2>

                    {/* Search Bar */}
                    <div className="flex justify-center gap-4 mb-4">
                        <input
                            type="text"
                            placeholder={`Search by name or email...`}
                            value={searchTerm}
                            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                            className="w-full max-w-lg p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors"
                        />
                        <button
                            onClick={handleActiveSearch}
                            style={{ backgroundColor: THEME.primary }}
                            className="text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-semibold"
                        >
                            <i className="fas fa-search"></i> Search
                        </button>
                        {users._isSearchResult && searchTerm && (
                            <button
                                onClick={() => {
                                    dispatch(setSearchTerm(''));
                                    fetchAllActiveUsers();
                                }}
                                className="text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg transition-colors font-semibold"
                            >
                                <i className="fas fa-times"></i> Clear
                            </button>
                        )}
                    </div>

                    {/* Active Role Button Group */}
                    <div className="flex flex-wrap items-center justify-between mb-6">
                        <div className="flex gap-2">
                            {activeRolesList.map(role => (
                                <button
                                    key={role}
                                    onClick={() => {
                                        dispatch(setActiveRole(role));
                                        setDisplayPage(prev => ({
                                            ...prev,
                                            [role]: 1
                                        }));
                                    }}
                                    style={activeRole === role ? {
                                        backgroundColor: THEME.primary,
                                        color: 'white',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                    } : {
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        borderColor: '#D1D5DB'
                                    }}
                                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border hover:bg-gray-100"
                                >
                                    {role.charAt(0).toUpperCase() + role.slice(1)}s
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => exportToCSV(filteredActiveUsers[activeRole] || [], `active_${activeRole}s.csv`)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm"
                        >
                            <i className="fas fa-file-csv"></i> Export CSV
                        </button>
                    </div>

                    {/* Total Count */}
                    <div className="text-center text-base font-medium text-gray-600 mb-4">
                        {activeRolesList.map(role => (
                            <span key={role} className="mx-2">
                                Total {role.charAt(0).toUpperCase() + role.slice(1)}s:
                                <span className="font-bold text-gray-900 ml-1">
                                    {(filteredActiveUsers[role] || []).length}
                                </span>
                                {users._isSearchResult && searchTerm && (
                                    <span className="text-sm text-blue-600 ml-1">(filtered)</span>
                                )}
                            </span>
                        ))}
                    </div>

                    {/* Sort Controls */}
                    <div className="flex flex-wrap gap-2 mb-4 items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">Sort by:</span>
                        <button
                            onClick={() => handleSortChange(activeRole, 'name')}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                sortConfig[activeRole] === 'name'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <i className="fas fa-sort-alpha-down mr-1"></i> Name
                        </button>
                        {activeRole === 'user' && (
                            <button
                                onClick={() => handleSortChange(activeRole, 'consultations')}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    sortConfig[activeRole] === 'consultations'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <i className="fas fa-chart-bar mr-1"></i> Consultations
                            </button>
                        )}
                        {activeRole === 'dietitian' && (
                            <button
                                onClick={() => handleSortChange(activeRole, 'clients')}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    sortConfig[activeRole] === 'clients'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <i className="fas fa-users mr-1"></i> Clients
                            </button>
                        )}
                        {activeRole === 'organization' && (
                            <button
                                onClick={() => handleSortChange(activeRole, 'employees')}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    sortConfig[activeRole] === 'employees'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <i className="fas fa-users mr-1"></i> Employees
                            </button>
                        )}
                    </div>

                    {/* Dynamic Active User Table */}
                    {isLoading ? (
                        <div className="text-center p-10 text-xl text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Loading Active Accounts...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            {(() => {
                                // Get full sorted list
                                const fullSortedList = getSortedUsers(filteredActiveUsers[activeRole] || [], activeRole);
                                const itemsPerPage = 10;
                                const currentPage = displayPage[activeRole] || 1;
                                const totalItems = fullSortedList.length;
                                const totalPages = Math.ceil(totalItems / itemsPerPage);
                                
                                // Slice for current page
                                const startIdx = (currentPage - 1) * itemsPerPage;
                                const endIdx = startIdx + itemsPerPage;
                                const paginatedList = fullSortedList.slice(startIdx, endIdx);
                                
                                return (
                                    <>
                                        {renderUserTable(paginatedList, activeRole)}
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={handleActivePageChange}
                                            theme={THEME.primary}
                                        />
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* --- 2. Removed Users Container --- */}
                <div style={{ borderTopColor: THEME.danger }} className="bg-white p-6 rounded-xl shadow-2xl border-t-4 mb-8">
                    <h2 style={{ color: THEME.danger }} className="text-2xl font-bold mb-4">Removed Accounts</h2>

                    {/* Search Bar for Removed Users */}
                    <div className="flex justify-center gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Search removed users..."
                            value={removedSearchTerm}
                            onChange={(e) => dispatch(setRemovedSearchTerm(e.target.value))}
                            className="w-full max-w-lg p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-colors"
                        />
                        <button
                            onClick={handleRemovedSearch}
                            style={{ backgroundColor: THEME.danger }}
                            className="text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-semibold"
                        >
                            <i className="fas fa-search"></i> Search
                        </button>
                        {removedSearchTerm && (
                            <button
                                onClick={() => {
                                    dispatch(setRemovedSearchTerm(''));
                                    fetchRemovedAccountsData();
                                }}
                                className="text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg transition-colors font-semibold"
                            >
                                <i className="fas fa-times"></i> Clear
                            </button>
                        )}
                    </div>

                    {/* Removed Role Button Group */}
                    <div className="flex flex-wrap items-center justify-between mb-6">
                        <div className="flex gap-2">
                            {removedRolesList.map(role => (
                                <button
                                    key={`removed-${role}`}
                                    onClick={() => {
                                        dispatch(setRemovedRole(role));
                                    }}
                                    style={removedRole === role ? {
                                        backgroundColor: THEME.danger,
                                        color: 'white',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                    } : {
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        borderColor: '#D1D5DB'
                                    }}
                                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border hover:bg-gray-100"
                                >
                                    Removed {role.charAt(0).toUpperCase() + role.slice(1)}s
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => exportToCSV(filteredRemovedAccounts.filter(a => a.accountType.toLowerCase() === removedRole), `removed_${removedRole}s.csv`)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm"
                        >
                            <i className="fas fa-file-csv"></i> Export CSV
                        </button>
                    </div>

                    {/* Total Removed Count */}
                    <div className="text-center text-base font-medium text-gray-600 mb-4">
                        <span className="mx-2">
                            Total Removed Accounts:
                            <span className="font-bold text-red-600 ml-1">
                                {removedAccountsPagination?.total || 0}
                            </span>
                        </span>
                    </div>

                    {/* Dynamic Removed User Table */}
                    {isLoading ? (
                        <div className="text-center p-10 text-xl text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> Loading Removed Accounts...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            {renderRemovedTable(filteredRemovedAccounts, removedRole)}
                            <Pagination
                                currentPage={removedAccountsPagination?.page || 1}
                                totalPages={removedAccountsPagination?.pages || 1}
                                onPageChange={handleRemovedPageChange}
                                theme={THEME.danger}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* API Route References (Commented for clarity) */}
            {/*
                // User/Client: /crud/users-list, /crud/users-list/search?q=..., /crud/users-list/:id (DELETE)
                // Dietitian: /crud/dietitian-list, /crud/dietitian-list/search?q=..., /crud/dietitian-list/:id (DELETE)
                // Admin/Org/Corp: Similar structure if deletion is required
                // Removed: /crud/removed-accounts, /crud/removed-accounts/search?q=..., /crud/removed-accounts/:id/restore (POST)
            */}
        </div>
    );
};

export default AdminManagement;
