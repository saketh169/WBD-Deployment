import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchUserStats,
    fetchMembershipRevenue,
    fetchConsultationRevenue,
    fetchSubscriptions,
    fetchRevenueAnalytics,
    fetchDietitianRevenue,
    fetchUserRevenue,
    setExpandedSubscriptionId,
} from '../../redux/slices/analyticsSlice';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, theme }) => {
    const getPageNumbers = () => {
        const pages = [];
        const showPages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
        let endPage = Math.min(totalPages, startPage + showPages - 1);

        if (endPage - startPage < showPages - 1) {
            startPage = Math.max(1, endPage - showPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex justify-center items-center gap-2 mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
                style={{
                    backgroundColor: currentPage === 1 ? '#E0E0E0' : theme.primary,
                    color: currentPage === 1 ? '#999' : 'white',
                }}
            >
                <i className="fas fa-chevron-left"></i>
            </button>

            {getPageNumbers()[0] > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className="px-3 py-1 rounded"
                        style={{ backgroundColor: theme.lightBg, color: theme.dark }}
                    >
                        1
                    </button>
                    {getPageNumbers()[0] > 2 && <span className="px-2">...</span>}
                </>
            )}

            {getPageNumbers().map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className="px-3 py-1 rounded transition-colors"
                    style={{
                        backgroundColor: currentPage === page ? theme.primary : theme.lightBg,
                        color: currentPage === page ? 'white' : theme.dark,
                        fontWeight: currentPage === page ? 'bold' : 'normal',
                    }}
                >
                    {page}
                </button>
            ))}

            {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                <>
                    {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && <span className="px-2">...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className="px-3 py-1 rounded"
                        style={{ backgroundColor: theme.lightBg, color: theme.dark }}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
                style={{
                    backgroundColor: currentPage === totalPages ? '#E0E0E0' : theme.primary,
                    color: currentPage === totalPages ? '#999' : 'white',
                }}
            >
                <i className="fas fa-chevron-right"></i>
            </button>
        </div>
    );
};

// --- Constants ---
const THEME = {
    primary: '#27AE60',      // Primary green
    secondary: '#1E6F5C',    // Darker green
    light: '#E8F5E9',        // Light green background
    lightBg: '#F0F9F7',      // Very light green
    success: '#27AE60',      // Success green
    danger: '#DC3545',       // Red for errors
    warning: '#FFC107',      // Yellow for warning
    info: '#17A2B8',         // Blue for info
    dark: '#1A4A40',         // Dark gray
    lightGray: '#F8F9FA',    // Light gray background
    borderColor: '#E0E0E0',  // Border color
};// --- Dashboard Component ---

const Analytics = () => {
    const dispatch = useDispatch();

    // Get data from Redux state
    const {
        userStats,
        membershipRevenue,
        consultationRevenue,
        subscriptions,
        revenueAnalytics,
        dietitianRevenue,
        userRevenue,
        expandedSubscriptionId,
        isLoading,
        error: errorMessage
    } = useSelector(state => state.analytics);

    // Pagination states
    const [dietitianPage, setDietitianPage] = useState(1);
    const [userPage, setUserPage] = useState(1);
    const itemsPerPage = 10;

    const toggleDetails = (id) => {
        dispatch(setExpandedSubscriptionId(expandedSubscriptionId === id ? null : id));
    };

    const exportToCSV = (data, filename) => {
        if (!data || data.length === 0) return;
        const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object' && !k.startsWith('_'));
        const csvContent = [
            keys.join(','),
            ...data.map(item => keys.map(k => {
                let val = item[k] || '';
                if (typeof val === 'string') {
                    val = val.replace(/"/g, '""');
                    val = val.replace(/\n/g, ' ');
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

    useEffect(() => {
        // Dispatch all analytics data fetching actions
        dispatch(fetchUserStats());
        dispatch(fetchMembershipRevenue());
        dispatch(fetchConsultationRevenue());
        dispatch(fetchSubscriptions());
        dispatch(fetchRevenueAnalytics());
        dispatch(fetchDietitianRevenue());
        dispatch(fetchUserRevenue());
    }, [dispatch]);

    // State for calculated data
    const [calculatedData, setCalculatedData] = useState({
        dateWise: [],
        monthWise: [],
        yearWise: [],
        dateTotal: 0,
        monthTotal: 0,
        yearTotal: 0,
    });

    // Function to filter subscriptions based on payment dates
    const getFilteredSubscriptions = (subs) => {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        const fourYearsAgo = new Date(now);
        fourYearsAgo.setFullYear(now.getFullYear() - 4);

        const last7Days = subs.filter(sub => new Date(sub.startDate) >= sevenDaysAgo);
        const last6Months = subs.filter(sub => new Date(sub.startDate) >= sixMonthsAgo);
        const last4Years = subs.filter(sub => new Date(sub.startDate) >= fourYearsAgo);

        return { last7Days, last6Months, last4Years };
    };

    // Log month-wise subscription revenue once when data is loaded
    useEffect(() => {
        if (subscriptions.length > 0) {
            const monthWiseRevenue = subscriptions.reduce((acc, sub) => {
                const date = new Date(sub.startDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!acc[monthKey]) {
                    acc[monthKey] = 0;
                }
                acc[monthKey] += sub.revenue;
                return acc;
            }, {});

            // Calculate and show filtered subscriptions
            const filtered = getFilteredSubscriptions(subscriptions);
            const dateWiseLast7Days = filtered.last7Days.reduce((acc, sub) => {
                const dateKey = new Date(sub.startDate).toISOString().split('T')[0];
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(sub);
                return acc;
            }, {});
            const monthWiseLast6Months = filtered.last6Months.reduce((acc, sub) => {
                const date = new Date(sub.startDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!acc[monthKey]) acc[monthKey] = [];
                acc[monthKey].push(sub);
                return acc;
            }, {});
            const yearWiseLast4Years = filtered.last4Years.reduce((acc, sub) => {
                const year = new Date(sub.startDate).getFullYear();
                if (!acc[year]) acc[year] = [];
                acc[year].push(sub);
                return acc;
            }, {});

            // Generate all dates for last 7 days
            const allDates = [];
            let currentDate = new Date();
            for (let i = 0; i < 7; i++) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const displayDate = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                allDates.push({ key: dateStr, display: displayDate });
                currentDate.setDate(currentDate.getDate() - 1);
            }
            const dateWiseWithZeros = allDates.reduce((acc, dateObj) => {
                acc[dateObj.display] = (dateWiseLast7Days[dateObj.key] || []).reduce((sum, sub) => sum + sub.revenue, 0);
                return acc;
            }, {});

            // Generate all months for last 6 months
            const allMonths = [];
            let currentMonth = new Date();
            for (let i = 0; i < 6; i++) {
                const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                const displayMonth = `${currentMonth.toLocaleDateString('en-US', { month: 'long' })} ${currentMonth.getFullYear()}`;
                allMonths.push({ key: monthKey, display: displayMonth });
                currentMonth.setMonth(currentMonth.getMonth() - 1);
            }
            const monthWiseWithZeros = allMonths.reduce((acc, monthObj) => {
                acc[monthObj.display] = (monthWiseLast6Months[monthObj.key] || []).reduce((sum, sub) => sum + sub.revenue, 0);
                return acc;
            }, {});

            // Generate all years for last 4 years
            const allYears = [];
            const currentYear = new Date().getFullYear();
            for (let i = 0; i < 4; i++) {
                allYears.push(currentYear - i);
            }
            // Build year-wise array in descending order (most recent first)
            const yearWiseSorted = allYears.map(year => ({
                year: String(year),
                revenue: (yearWiseLast4Years[year] || []).reduce((sum, sub) => sum + sub.revenue, 0)
            }));


            // Prepare data for tables
            setCalculatedData({
                dateWise: Object.entries(dateWiseWithZeros).map(([displayDate, revenue]) => ({ displayDate, revenue })),
                monthWise: Object.entries(monthWiseWithZeros).map(([month, revenue]) => ({ month, revenue })),
                yearWise: yearWiseSorted,
                dateTotal: Object.values(dateWiseWithZeros).reduce((sum, val) => sum + val, 0),
                monthTotal: Object.values(monthWiseWithZeros).reduce((sum, val) => sum + val, 0),
                yearTotal: yearWiseSorted.reduce((sum, item) => sum + item.revenue, 0),
            });
        }
    }, [subscriptions]);

    // Log revenue data date-wise, month-wise, year-wise once when data is loaded
    useEffect(() => {
        if (consultationRevenue.dailyPeriods && membershipRevenue.dailyPeriods) {
        }
    }, [consultationRevenue, membershipRevenue]);

    // --- Aggregated Totals ---
    const dailyConsultationTotal = consultationRevenue.dailyPeriods ? consultationRevenue.dailyPeriods.reduce((sum, p) => sum + p.revenue, 0) : 0;
    const monthlyConsultationTotal = consultationRevenue.monthlyPeriods ? consultationRevenue.monthlyPeriods.reduce((sum, p) => sum + p.revenue, 0) : 0;
    const yearlyConsultationTotal = consultationRevenue.yearlyPeriods ? consultationRevenue.yearlyPeriods.reduce((sum, p) => sum + p.revenue, 0) : 0;

    const dailyMembershipTotal = membershipRevenue.dailyPeriods ? membershipRevenue.dailyPeriods.reduce((sum, p) => sum + p.revenue, 0) : 0;
    const monthlyMembershipTotal = membershipRevenue.monthlyPeriods ? membershipRevenue.monthlyPeriods.reduce((sum, p) => sum + p.revenue, 0) : 0;
    const yearlyMembershipTotal = membershipRevenue.yearlyPeriods ? membershipRevenue.yearlyPeriods.reduce((sum, p) => sum + p.revenue, 0) : 0;
    // Calculate total subscription amount
    const totalSubscriptionAmount = subscriptions.reduce((sum, sub) => sum + sub.revenue, 0);
    // Parse commission rates for calculations
    const consultationCommissionRate = parseFloat(revenueAnalytics.summary?.commissionRates?.consultationCommission?.replace('%', '') || 0) / 100;
    const platformShareRate = parseFloat(revenueAnalytics.summary?.commissionRates?.platformShare?.replace('%', '') || 0) / 100;


    // --- UI Renderers ---

    const RevenueTable = ({ data, periodKey, total }) => (
        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
            <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">{periodKey}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Revenue</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                    <tr key={`revenue-${periodKey}-${index}`} className="hover:bg-green-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item[periodKey]}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{item.revenue.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="bg-gray-50">
                <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Total</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">₹{total.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    );

    const renderSubscriptionTable = () => (
        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
            <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider w-48">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.map((sub, index) => (
                    <React.Fragment key={`subscription-${sub.id}-${index}`}>
                        <tr className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.startDate}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                <button
                                    style={{
                                        backgroundColor: expandedSubscriptionId === sub.id ? '#6B7280' : THEME.primary,
                                        color: 'white',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '9999px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => { if (expandedSubscriptionId !== sub.id) e.target.style.backgroundColor = THEME.secondary; }}
                                    onMouseLeave={(e) => { if (expandedSubscriptionId !== sub.id) e.target.style.backgroundColor = THEME.primary; }}
                                    onClick={() => toggleDetails(sub.id)}
                                >
                                    <i className="fas fa-eye mr-2"></i>
                                    {expandedSubscriptionId === sub.id ? 'Hide Details' : 'View Details'}
                                </button>
                            </td>
                        </tr>
                        {expandedSubscriptionId === sub.id && (
                            <tr key={`expanded-${sub.id}`}>
                                <td colSpan="3" className="px-6 py-0">
                                    <div className="bg-gray-50 p-4 border-l-4 border-green-500">
                                        <p><strong>Plan:</strong> {sub.plan} ({sub.cycle})</p>
                                        <p><strong>Revenue Generated:</strong> ₹{sub.revenue.toFixed(2)}</p>
                                        <p><strong>Mode of Payment:</strong> {sub.paymentMethod}</p>
                                        <p><strong>Expire Date:</strong> {sub.expiresAt}</p>
                                        <p><strong>Transaction ID:</strong> {sub.transactionId}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="min-h-screen p-2 sm:p-4 bg-green-50" style={{ paddingTop: '0.5rem' }}>

            <div className="max-w-7xl mx-auto">
                {/* Logo and Title */}
                <div className="flex justify-center items-center my-2">
                    <div className="flex items-center font-bold text-3xl text-gray-800">
                        <div style={{ backgroundColor: THEME.primary }} className="flex items-center justify-center w-10 h-10 rounded-full mr-2">
                            <i className="fas fa-leaf text-xl text-white"></i>
                        </div>
                        <span>
                            <span style={{ color: THEME.primary }}>N</span>utri
                            <span style={{ color: THEME.primary }}>C</span>onnect
                        </span>
                    </div>
                </div>
                <h1 style={{ color: THEME.primary }} className="text-4xl font-extrabold text-center mb-4">Analytics Dashboard</h1>

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="bg-blue-100 text-blue-700 p-3 rounded-lg text-center mb-6">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Loading analytics data...
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-6">Failed to load analytics data. Please try again.</div>
                )}

                {/* --- Card 1: User Statistics --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300">
                    <h2 style={{ color: THEME.primary }} className="text-xl font-bold mb-4">
                        <i style={{ color: THEME.primary }} className="fas fa-users mr-2"></i> User Statistics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Metric</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Count</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Registered</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{userStats.totalRegistered}</td>
                                </tr>
                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Active Clients</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{userStats.totalUsers}</td>
                                </tr>
                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Active Dietitians</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{userStats.totalDietitians}</td>
                                </tr>
                            </tbody>
                        </table>
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Metric</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Count</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Verifying Organizations</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{userStats.totalOrganizations}</td>
                                </tr>

                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Active Diet Plans</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{userStats.activeDietPlans}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* --- Card 2: Revenue from Consultations --- */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300">
                        <h2 style={{ color: THEME.primary }} className="text-xl font-bold mb-4">
                            <i style={{ color: THEME.primary }} className="fas fa-stethoscope mr-2"></i> Revenue from Consultations ({revenueAnalytics.summary?.commissionRates?.consultationCommission || '15%'})
                        </h2>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Daily Revenue (Last 7 Days)</h4>
                                <RevenueTable data={consultationRevenue.dailyPeriods || []} periodKey="displayDate" total={dailyConsultationTotal} />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Monthly Revenue (Last 6 Months)</h4>
                                <RevenueTable data={consultationRevenue.monthlyPeriods || []} periodKey="month" total={monthlyConsultationTotal} />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Yearly Revenue (Last 4 Years)</h4>
                                <RevenueTable data={consultationRevenue.yearlyPeriods || []} periodKey="year" total={yearlyConsultationTotal} />
                            </div>
                        </div>
                    </div>

                    {/* --- Card 3: Revenue from Memberships --- */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300">
                        <h2 style={{ color: THEME.primary }} className="text-xl font-bold mb-4">
                            <i style={{ color: THEME.primary }} className="fas fa-chart-line mr-2"></i> Revenue from Memberships ({revenueAnalytics.summary?.commissionRates?.platformShare || '20%'})
                        </h2>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Daily Revenue (Last 7 Days)</h4>
                                <RevenueTable data={calculatedData.dateWise} periodKey="displayDate" total={calculatedData.dateTotal} />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Monthly Revenue (Last 6 Months)</h4>
                                <RevenueTable data={calculatedData.monthWise} periodKey="month" total={calculatedData.monthTotal} />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold mb-2">Yearly Revenue (Last 4 Years)</h4>
                                <RevenueTable data={calculatedData.yearWise} periodKey="year" total={calculatedData.yearTotal} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Card 4: Combined Revenue Analytics (Full Width) --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300 mt-6">
                    <h2 className={`text-xl font-bold text-gray-700 mb-4`}>
                        <i className={`fas fa-chart-bar text-gray-700 mr-2`}></i> Platform Revenue Analytics (Membership + Consultation Fee)
                    </h2>

                    {/* Commission Rates Display */}
                    <div className="bg-green-50 p-4 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold text-green-800 mb-2">Current Commission Rates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border">
                                <span className="text-sm text-gray-600">Consultation Commission:</span>
                                <span className="text-lg font-bold text-green-600 ml-2">
                                    {revenueAnalytics.summary?.commissionRates?.consultationCommission || '15%'}
                                </span>
                            </div>
                            <div className="bg-white p-3 rounded border">
                                <span className="text-sm text-gray-600">Platform Share (Subscriptions):</span>
                                <span className="text-lg font-bold text-green-600 ml-2">
                                    {revenueAnalytics.summary?.commissionRates?.platformShare || '20%'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                            <h4 className="text-sm font-medium text-blue-800">Total Platform Revenue</h4>
                            <p className="text-2xl font-bold text-blue-600">
                                ₹{revenueAnalytics.summary?.totalRevenue?.toLocaleString() || '0'}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                            <h4 className="text-sm font-medium text-green-800">Platform Earnings</h4>
                            <p className="text-2xl font-bold text-green-600">
                                ₹{revenueAnalytics.summary?.totalPlatformEarnings?.toLocaleString() || '0'}
                            </p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                            <h4 className="text-sm font-medium text-purple-800">Dietitian Earnings</h4>
                            <p className="text-2xl font-bold text-purple-600">
                                ₹{revenueAnalytics.summary?.totalDietitianEarnings?.toLocaleString() || '0'}
                            </p>
                        </div>
                    </div>

                    {/* Monthly Breakdown */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Monthly Revenue Breakdown (Last 12 Months)</h3>
                            <button
                                onClick={() => exportToCSV(revenueAnalytics.monthlyBreakdown?.slice().reverse() || [], 'monthly_revenue_breakdown.csv')}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                            >
                                <i className="fas fa-file-csv"></i> Export CSV
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                                <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Month</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Subscription Revenue</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Consultation Revenue</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Platform Earnings</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Dietitian Earnings</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {revenueAnalytics.monthlyBreakdown?.slice().reverse().map((month, index) => (
                                        <tr key={`month-${index}`} className="hover:bg-green-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{month.subscriptionRevenue?.toFixed(2) || '0.00'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{month.consultationRevenue?.toFixed(2) || '0.00'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium text-right">₹{month.platformEarnings?.toFixed(2) || '0.00'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium text-right">₹{month.dietitianEarnings?.toFixed(2) || '0.00'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Total Platform Revenue Summary Table */}
                    <div className="revenue-table">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Total Platform Revenue Summary</h3>
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Period</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Consultation Revenue</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Membership Revenue</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Total Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total (Lifetime/Yearly Basis)</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{(yearlyConsultationTotal * consultationCommissionRate).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{(calculatedData.yearTotal * platformShareRate).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{((yearlyConsultationTotal * consultationCommissionRate) + (calculatedData.yearTotal * platformShareRate)).toFixed(2)}</td>
                                </tr>
                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Monthly (Avg./Current)</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{(monthlyConsultationTotal * consultationCommissionRate).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{(calculatedData.monthTotal * platformShareRate).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{((monthlyConsultationTotal * consultationCommissionRate) + (calculatedData.monthTotal * platformShareRate)).toFixed(2)}</td>
                                </tr>
                                <tr className="hover:bg-green-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Yearly (Current)</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{(yearlyConsultationTotal * consultationCommissionRate).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{(calculatedData.yearTotal * platformShareRate).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{((yearlyConsultationTotal * consultationCommissionRate) + (calculatedData.yearTotal * platformShareRate)).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Card 6: Revenue Distribution Analytics with Tables --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300 mt-6">
                    <h2 className={`text-xl font-bold text-gray-700 mb-6`}>
                        <i className={`fas fa-chart-pie text-gray-700 mr-2`}></i> Revenue Distribution Analytics
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Dietitian Revenue Section */}
                        <div className="bg-green-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                                Dietitian-Specific Revenue (Consultation Fees)
                            </h3>
                            <p className="text-sm text-gray-600 text-center mb-4">
                                Identify top-performing dietitians generating consultation revenue
                            </p>

                            {dietitianRevenue.data && dietitianRevenue.data.length > 0 ? (
                                <>
                                    {/* Pie Chart */}
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={(() => {
                                                    const top10 = dietitianRevenue.data.slice(0, 10);
                                                    const others = dietitianRevenue.data.slice(10);
                                                    const othersTotal = others.reduce((sum, d) => sum + d.totalRevenue, 0);

                                                    if (othersTotal > 0) {
                                                        return [...top10, { dietitianName: 'Others', totalRevenue: othersTotal }];
                                                    }
                                                    return top10;
                                                })()}
                                                dataKey="totalRevenue"
                                                nameKey="dietitianName"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ dietitianName, percent }) =>
                                                    `${dietitianName}: ${(percent * 100).toFixed(1)}%`
                                                }
                                            >
                                                {(() => {
                                                    const top10 = dietitianRevenue.data.slice(0, 10);
                                                    const others = dietitianRevenue.data.slice(10);
                                                    const totalItems = top10.length + (others.length > 0 ? 1 : 0);

                                                    return Array.from({ length: totalItems }).map((_, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={index === top10.length ? '#9CA3AF' : `hsl(${120 + index * 36}, 70%, ${50 - index * 3}%)`}
                                                        />
                                                    ));
                                                })()}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => `₹${value.toLocaleString()}`}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Summary Card */}
                                    <div className="mt-4 bg-white p-4 rounded border">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Summary:</h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700">Total Dietitians:</span>
                                                <span className="font-medium">{dietitianRevenue.totalDietitians}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700">Total Revenue:</span>
                                                <span className="font-medium text-green-600">₹{dietitianRevenue.totalRevenue.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dietitian Table with Pagination */}
                                    <div className="mt-6">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold text-sm text-gray-700">All Dietitians by Revenue:</h4>
                                            <button
                                                onClick={() => exportToCSV(dietitianRevenue.data || [], 'dietitian_revenue.csv')}
                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center gap-2 text-xs shadow-sm"
                                            >
                                                <i className="fas fa-file-csv"></i> Export CSV
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                                                <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Rank</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Dietitian Name</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Consultations</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {dietitianRevenue.data
                                                        .slice((dietitianPage - 1) * itemsPerPage, dietitianPage * itemsPerPage)
                                                        .map((dietitian, index) => {
                                                            const globalRank = (dietitianPage - 1) * itemsPerPage + index + 1;
                                                            return (
                                                                <tr key={dietitian.dietitianName || `dietitian-${index}`} className="hover:bg-green-50 transition-colors">
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                        {globalRank}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                                        {dietitian.dietitianName}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                                                                        {dietitian.consultationCount}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                                                                        ₹{dietitian.totalRevenue.toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <Pagination
                                            currentPage={dietitianPage}
                                            totalPages={Math.ceil(dietitianRevenue.data.length / itemsPerPage)}
                                            onPageChange={setDietitianPage}
                                            theme={THEME}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No dietitian revenue data available</p>
                                </div>
                            )}
                        </div>

                        {/* User Revenue Section */}
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                                User-Specific Revenue (Subscription Payments)
                            </h3>
                            <p className="text-sm text-gray-600 text-center mb-4">
                                Identify high-value users bringing maximum subscription revenue
                            </p>

                            {userRevenue.data && userRevenue.data.length > 0 ? (
                                <>
                                    {/* Pie Chart */}
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={(() => {
                                                    const top10 = userRevenue.data.slice(0, 10);
                                                    const others = userRevenue.data.slice(10);
                                                    const othersTotal = others.reduce((sum, u) => sum + u.totalRevenue, 0);

                                                    if (othersTotal > 0) {
                                                        return [...top10, { userName: 'Others', totalRevenue: othersTotal }];
                                                    }
                                                    return top10;
                                                })()}
                                                dataKey="totalRevenue"
                                                nameKey="userName"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ userName, percent }) =>
                                                    `${userName}: ${(percent * 100).toFixed(1)}%`
                                                }
                                            >
                                                {(() => {
                                                    const top10 = userRevenue.data.slice(0, 10);
                                                    const others = userRevenue.data.slice(10);
                                                    const totalItems = top10.length + (others.length > 0 ? 1 : 0);

                                                    return Array.from({ length: totalItems }).map((_, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={index === top10.length ? '#9CA3AF' : `hsl(${210 + index * 36}, 70%, ${50 - index * 3}%)`}
                                                        />
                                                    ));
                                                })()}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => `₹${value.toLocaleString()}`}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Summary Card */}
                                    <div className="mt-4 bg-white p-4 rounded border">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Summary:</h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700">Total Paying Users:</span>
                                                <span className="font-medium">{userRevenue.totalUsers}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-700">Total Revenue:</span>
                                                <span className="font-medium text-blue-600">₹{userRevenue.totalRevenue.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Table with Pagination */}
                                    <div className="mt-6">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold text-sm text-gray-700">All Users by Revenue:</h4>
                                            <button
                                                onClick={() => exportToCSV(userRevenue.data || [], 'user_revenue.csv')}
                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center gap-2 text-xs shadow-sm"
                                            >
                                                <i className="fas fa-file-csv"></i> Export CSV
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                                                <thead style={{ backgroundColor: THEME.info }} className="text-white">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Rank</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">User Name</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Subscriptions</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {userRevenue.data
                                                        .slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage)
                                                        .map((user, index) => {
                                                            const globalRank = (userPage - 1) * itemsPerPage + index + 1;
                                                            return (
                                                                <tr key={user.userName || `user-${index}`} className="hover:bg-blue-50 transition-colors">
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                        {globalRank}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                                        {user.userName}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                                                                        {user.subscriptionCount}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                                                                        ₹{user.totalRevenue.toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <Pagination
                                            currentPage={userPage}
                                            totalPages={Math.ceil(userRevenue.data.length / itemsPerPage)}
                                            onPageChange={setUserPage}
                                            theme={THEME}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No user revenue data available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Key Insights Section */}
                    <div className="mt-6 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                        <h3 className="font-semibold text-gray-800 mb-2">
                            <i className="fas fa-lightbulb text-yellow-600 mr-2"></i>
                            Key Insights for Business Growth
                        </h3>
                        <ul className="space-y-1 text-sm text-gray-700">
                            <li>• <strong>Top Dietitians:</strong> Focus on retaining and incentivizing high-performing dietitians who generate maximum consultation revenue</li>
                            <li>• <strong>High-Value Users:</strong> Identify loyal users with multiple subscriptions for targeted premium offerings and retention strategies</li>
                            <li>• <strong>Revenue Monitoring:</strong> Track individual performance to optimize resource allocation and marketing strategies</li>
                            <li>• <strong>Potential Growth:</strong> Analyze patterns from top performers to replicate success across the platform</li>
                        </ul>
                    </div>
                </div>

                {/* --- Card 7: Recent Consultations (Full Width) --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300 mt-6">
                    <h2 className={`text-xl font-bold text-gray-700 mb-4`}>
                        <i className={`fas fa-stethoscope text-gray-700 mr-2`}></i> Recent Consultations (Last 10)
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: THEME.primary }} className="text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Dietitian</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Consultation Fee</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Platform Commission</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Dietitian Earnings</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {revenueAnalytics.recentConsultations?.map((consultation, index) => (
                                    <tr key={`consultation-${index}`} className="hover:bg-green-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {new Date(consultation.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consultation.dietitian}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{consultation.amount?.toFixed(2) || '0.00'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium text-right">₹{consultation.commission?.toFixed(2) || '0.00'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium text-right">₹{consultation.dietitianEarnings?.toFixed(2) || '0.00'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Card 5: Subscriptions Detail Table (Full Width) --- */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300 mt-6 mb-8">
                    <h2 className={`text-xl font-bold text-gray-700 mb-4`}>
                        <i className={`fas fa-list-alt text-gray-700 mr-2`}></i> Users and Their Subscription Plans
                    </h2>
                    <div className="overflow-x-auto">
                        {renderSubscriptionTable()}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Analytics;
