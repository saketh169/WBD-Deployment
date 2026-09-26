import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logActivity } from '../../services/organization/organizationService';
import moment from 'moment';
import { FaTrash, FaEye, FaExclamationTriangle, FaUser, FaCheck } from 'react-icons/fa';

import {
    fetchReportedBlogs,
    deleteBlog,
    dismissReports,
    hydrateReportedBlogs,
    selectReportedBlogs,
    selectIsLoading,
    selectError,
    selectSuccessMessage,
    clearError,
    clearSuccessMessage
} from '../../redux/slices/blogSlice';

const getCategoryColor = (category) => {
    const colors = {
        'Nutrition Tips': 'bg-green-100 text-green-800',
        'Weight Management': 'bg-blue-100 text-blue-800',
        'Healthy Recipes': 'bg-yellow-100 text-yellow-800',
        'Fitness & Exercise': 'bg-red-100 text-red-800',
        'Mental Health & Wellness': 'bg-purple-100 text-purple-800',
        'Disease Management': 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
};

const getRoleBadgeColor = (role) => (role === 'dietitian' ? 'bg-[#1E6F5C] text-white' : 'bg-[#E8B86D] text-gray-800');

const getRoleLabel = (role) => {
    const roleLabels = { user: 'Client', dietitian: 'Dietitian', admin: 'Admin', organization: 'Organization', employee: 'Employee' };
    return roleLabels[role] || 'Unknown';
};

const stripHtmlTags = (html) => {
    if (!html || typeof html !== 'string') return '';
    try {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    } catch {
        return '';
    }
};

const ReportDetailsModal = ({ selectedBlog, onClose, onDismiss, onDelete, userRole, navigate }) => {
    if (!selectedBlog) return null;
    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 px-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">Report Details</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-bold text-lg text-gray-800 mb-2">{selectedBlog.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>By: {selectedBlog.author?.name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(selectedBlog.author?.role)}`}>
                            {getRoleLabel(selectedBlog.author?.role)}
                        </span>
                        <span>{moment(selectedBlog.createdAt).format('MMM DD, YYYY')}</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getCategoryColor(selectedBlog.category)}`}>
                            {selectedBlog.category}
                        </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                        {selectedBlog.excerpt || stripHtmlTags(selectedBlog.content).substring(0, 200)}...
                    </p>
                    <button
                        onClick={() => navigate(`/${userRole}/blog/${selectedBlog._id}`)}
                        className="mt-3 text-[#1E6F5C] hover:text-green-700 text-sm font-medium"
                    >
                        View Full Blog Post →
                    </button>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-gray-800 mb-4">Reports ({selectedBlog.reports?.length || 0})</h4>
                    <div className="space-y-3">
                        {(selectedBlog.reports || []).map((report, index) => (
                            <div key={report._id || index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-semibold text-gray-800">{report.reporterName}</p>
                                        <p className="text-sm text-gray-500">{moment(report.reportedAt).format('MMM DD, YYYY HH:mm')}</p>
                                    </div>
                                    <FaExclamationTriangle className="text-red-600" />
                                </div>
                                <p className="text-gray-700">{report.reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={() => onDismiss(selectedBlog._id)}
                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <FaCheck /> Dismiss Reports
                    </button>
                    <button
                        onClick={() => onDelete(selectedBlog._id)}
                        className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <FaTrash /> Delete Blog Post
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, btnText, btnColor, icon }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <div className="flex items-center mb-4">
                    <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-gray-100">
                        {icon}
                    </div>
                    <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                </div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex items-center gap-3">
                    <button onClick={onConfirm} className={`flex-1 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${btnColor}`}>
                        {btnText}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors cursor-pointer">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const BlogModeration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const reportedBlogs = useSelector(selectReportedBlogs);
    const loading = useSelector(selectIsLoading);
    const reduxError = useSelector(selectError);
    const reduxSuccessMessage = useSelector(selectSuccessMessage);

    const [selectedBlog, setSelectedBlog] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState('');
    const [showErrorMessage, setShowErrorMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [blogToDelete, setBlogToDelete] = useState(null);
    const [showDismissConfirm, setShowDismissConfirm] = useState(false);
    const [blogToDismiss, setBlogToDismiss] = useState(null);

    const getRoleFromPath = useCallback(() => {
        const path = location.pathname;
        if (path.startsWith('/user')) return 'user';
        if (path.startsWith('/dietitian')) return 'dietitian';
        if (path.startsWith('/organization')) return 'organization';
        if (path.startsWith('/admin')) return 'admin';
        if (path.startsWith('/employee')) return 'employee';
        return 'organization';
    }, [location.pathname]);

    useEffect(() => {
        window.scrollTo(0, 0);
        const roleFromUrl = getRoleFromPath();

        try {
            const cached = sessionStorage.getItem('reportedBlogsCache');
            if (cached) dispatch(hydrateReportedBlogs(JSON.parse(cached)));
        } catch (_) {}

        dispatch(fetchReportedBlogs({ page: 1, role: roleFromUrl, limit: 100 }));

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchReportedBlogs({ page: 1, role: roleFromUrl, limit: 100 }));
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [dispatch, getRoleFromPath]);

    useEffect(() => {
        if (reduxSuccessMessage) {
            setShowSuccessMessage(reduxSuccessMessage);
            const timer = setTimeout(() => {
                setShowSuccessMessage('');
                dispatch(clearSuccessMessage());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [reduxSuccessMessage, dispatch]);

    useEffect(() => {
        if (reduxError) {
            setShowErrorMessage(reduxError);
            const timer = setTimeout(() => {
                setShowErrorMessage('');
                dispatch(clearError());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [reduxError, dispatch]);

    const confirmDeleteBlog = async () => {
        if (!blogToDelete) return;
        const roleFromUrl = getRoleFromPath();
        const result = await dispatch(deleteBlog({ blogId: blogToDelete, role: roleFromUrl }));

        if (deleteBlog.fulfilled.match(result)) {
            const blog = reportedBlogs.find(b => b._id === blogToDelete);
            const empToken = localStorage.getItem('authToken_employee');
            if (blog && empToken) {
                logActivity({
                    activityType: 'blog_rejected',
                    targetId: blogToDelete,
                    targetType: 'blog',
                    targetName: blog.title,
                    status: 'rejected',
                    notes: `Deleted blog: ${blog.title}`
                }).catch(err => console.warn('Activity log failed:', err));
            }
            setSelectedBlog(null);
        }
        setShowDeleteConfirm(false);
        setBlogToDelete(null);
    };

    const confirmDismissReports = async () => {
        if (!blogToDismiss) return;
        const roleFromUrl = getRoleFromPath();
        const result = await dispatch(dismissReports({ blogId: blogToDismiss, role: roleFromUrl }));

        if (dismissReports.fulfilled.match(result)) {
            const blog = reportedBlogs.find(b => b._id === blogToDismiss);
            const empToken = localStorage.getItem('authToken_employee');
            if (blog && empToken) {
                logActivity({
                    activityType: 'blog_approved',
                    targetId: blogToDismiss,
                    targetType: 'blog',
                    targetName: blog.title,
                    status: 'approved',
                    notes: `Approved blog and dismissed reports: ${blog.title}`
                }).catch(err => console.warn('Activity log failed:', err));
            }
            setSelectedBlog(null);
        }
        setShowDismissConfirm(false);
        setBlogToDismiss(null);
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-red-50 to-white p-6">
            {showSuccessMessage && (
                <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
                    <p className="font-bold">Success!</p>
                    <p className="text-sm">{showSuccessMessage}</p>
                </div>
            )}
            {showErrorMessage && (
                <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
                    <p className="font-bold">Error!</p>
                    <p className="text-sm">{showErrorMessage}</p>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <FaExclamationTriangle className="text-red-600 text-3xl" />
                        <h1 className="text-4xl font-bold text-gray-800">Blog Moderation</h1>
                    </div>
                    <p className="text-gray-600">Review and manage reported blog posts</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Reported Blogs</p>
                            <p className="text-3xl font-bold text-red-600">{reportedBlogs.length}</p>
                        </div>
                        <div className="bg-red-100 p-4 rounded-full">
                            <FaExclamationTriangle className="text-red-600 text-2xl" />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E6F5C]"></div>
                        <p className="mt-4 text-gray-600">Loading reported blogs...</p>
                    </div>
                ) : reportedBlogs.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FaExclamationTriangle className="text-gray-300 text-6xl mx-auto mb-4" />
                        <p className="text-xl text-gray-600">No reported blogs</p>
                        <p className="text-gray-500 mt-2">All clear! No blog posts have been reported.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {['Blog Post', 'Author', 'Category', 'Reports', 'Status', 'Actions'].map((header) => (
                                            <th key={header} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reportedBlogs.map((blog) => (
                                        <tr key={blog._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs">
                                                    <p className="font-semibold text-gray-800 truncate">{blog.title}</p>
                                                    <p className="text-sm text-gray-500 truncate">{stripHtmlTags(blog.content).substring(0, 60)}...</p>
                                                    <p className="text-xs text-gray-400 mt-1">{moment(blog.createdAt).format('MMM DD, YYYY')}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FaUser className="text-gray-400" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">{blog.author?.name}</p>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(blog.author?.role)}`}>
                                                            {getRoleLabel(blog.author?.role)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getCategoryColor(blog.category)}`}>
                                                    {blog.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                                                    <FaExclamationTriangle />
                                                    {blog.reports?.length || 0} Report{(blog.reports?.length || 0) !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${blog.status === 'flagged' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                                    {(blog.status || '').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedBlog(blog)}
                                                        className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium inline-flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <FaEye /> Details
                                                    </button>
                                                    <button
                                                        onClick={() => { setBlogToDismiss(blog._id); setShowDismissConfirm(true); }}
                                                        className="bg-green-100 text-green-600 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium inline-flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <FaCheck /> Dismiss
                                                    </button>
                                                    <button
                                                        onClick={() => { setBlogToDelete(blog._id); setShowDeleteConfirm(true); }}
                                                        className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium inline-flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <FaTrash /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <ReportDetailsModal
                selectedBlog={selectedBlog}
                onClose={() => setSelectedBlog(null)}
                onDismiss={(id) => { setBlogToDismiss(id); setShowDismissConfirm(true); }}
                onDelete={(id) => { setBlogToDelete(id); setShowDeleteConfirm(true); }}
                userRole={getRoleFromPath()}
                navigate={navigate}
            />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setBlogToDelete(null); }}
                onConfirm={confirmDeleteBlog}
                title="Delete Blog Post"
                message="Are you sure you want to delete this blog post? This action cannot be undone."
                btnText="Delete Post"
                btnColor="bg-red-600 hover:bg-red-700"
                icon={<FaTrash className="text-red-600 text-xl" />}
            />

            <ConfirmModal
                isOpen={showDismissConfirm}
                onClose={() => { setShowDismissConfirm(false); setBlogToDismiss(null); }}
                onConfirm={confirmDismissReports}
                title="Dismiss Reports"
                message="Are you sure you want to dismiss all reports for this blog post? The blog will remain active."
                btnText="Dismiss Reports"
                btnColor="bg-green-600 hover:bg-green-700"
                icon={<FaCheck className="text-green-600 text-xl" />}
            />
        </div>
    );
};

export default BlogModeration;
