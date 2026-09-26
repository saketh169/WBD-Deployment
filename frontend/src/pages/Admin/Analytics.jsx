import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFullAnalyticsDashboard, setExpandedSubscriptionId } from '../../redux/slices/analyticsSlice';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const Pagination = ({ currentPage, totalPages, onPageChange, theme }) => {
    const getPageNumbers = () => {
        const showPages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
        let endPage = Math.min(totalPages, startPage + showPages - 1);
        if (endPage - startPage < showPages - 1) startPage = Math.max(1, endPage - showPages + 1);
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };
    const pages = getPageNumbers();
    return (
        <div className="flex justify-center items-center gap-2 mt-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: currentPage === 1 ? '#E0E0E0' : theme.primary, color: currentPage === 1 ? '#999' : 'white' }} aria-label="Previous page"><i className="fas fa-chevron-left" /></button>
            {pages[0] > 1 && <><button onClick={() => onPageChange(1)} className="px-3 py-1 rounded" style={{ backgroundColor: theme.lightBg, color: theme.dark }}>1</button>{pages[0] > 2 && <span className="px-2">...</span>}</>}
            {pages.map(page => <button key={page} onClick={() => onPageChange(page)} className="px-3 py-1 rounded transition-colors" style={{ backgroundColor: currentPage === page ? theme.primary : theme.lightBg, color: currentPage === page ? 'white' : theme.dark, fontWeight: currentPage === page ? 'bold' : 'normal' }}>{page}</button>)}
            {pages[pages.length - 1] < totalPages && <>{pages[pages.length - 1] < totalPages - 1 && <span className="px-2">...</span>}<button onClick={() => onPageChange(totalPages)} className="px-3 py-1 rounded" style={{ backgroundColor: theme.lightBg, color: theme.dark }}>{totalPages}</button></>}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: currentPage === totalPages ? '#E0E0E0' : theme.primary, color: currentPage === totalPages ? '#999' : 'white' }} aria-label="Next page"><i className="fas fa-chevron-right" /></button>
        </div>
    );
};

const THEME = {
    primary: '#27AE60', secondary: '#1E6F5C', light: '#E8F5E9', lightBg: '#F0F9F7',
    success: '#27AE60', danger: '#DC3545', warning: '#FFC107', info: '#17A2B8',
    dark: '#1A4A40', lightGray: '#F8F9FA', borderColor: '#E0E0E0',
};

const TH = ({ children, right }) => <th className={`px-6 py-3 text-${right ? 'right' : 'left'} text-xs font-medium text-white uppercase tracking-wider`}>{children}</th>;
const TD = ({ children, right, cls }) => <td className={`px-6 py-4 whitespace-nowrap text-sm ${cls || 'text-gray-900'} ${right ? 'text-right' : ''}`}>{children}</td>;

const Analytics = () => {
    const dispatch = useDispatch();
    const { userStats, consultationRevenue, subscriptions, revenueAnalytics, dietitianRevenue, userRevenue, expandedSubscriptionId, isLoading, error: errorMessage } = useSelector(s => s.analytics);

    const [dietitianPage, setDietitianPage] = useState(1);
    const [userPage, setUserPage] = useState(1);
    const itemsPerPage = 10;

    const toggleDetails = (id) => dispatch(setExpandedSubscriptionId(expandedSubscriptionId === id ? null : id));

    const exportToCSV = (data, filename) => {
        if (!data?.length) return;
        const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object' && !k.startsWith('_'));
        const csv = [keys.join(','), ...data.map(item => keys.map(k => { let v = item[k] || ''; if (typeof v === 'string') { v = v.replace(/"/g, '""').replace(/\n/g, ' '); } return `"${v}"`; }).join(','))].join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    useEffect(() => { dispatch(fetchFullAnalyticsDashboard()); }, [dispatch]);

    const [calculatedData, setCalculatedData] = useState({ dateWise: [], monthWise: [], yearWise: [], dateTotal: 0, monthTotal: 0, yearTotal: 0 });

    const consultationBarPalette = ['#27AE60', '#2ECC71', '#16A085', '#1ABC9C', '#3CB371'];
    const membershipBarPalette = ['#1E6F5C', '#0E7490', '#0EA5A4', '#0891B2', '#22C55E'];

    useEffect(() => {
        if (!subscriptions.length) return;
        const now = new Date();
        const ago = (days, months, years) => { const d = new Date(now); if (days) d.setDate(now.getDate() - days); if (months) d.setMonth(now.getMonth() - months); if (years) d.setFullYear(now.getFullYear() - years); return d; };
        const last7 = subscriptions.filter(s => new Date(s.startDate) >= ago(7));
        const last6m = subscriptions.filter(s => new Date(s.startDate) >= ago(0, 6));
        const last4y = subscriptions.filter(s => new Date(s.startDate) >= ago(0, 0, 4));

        const groupBy = (arr, keyFn) => arr.reduce((acc, s) => { const k = keyFn(s); if (!acc[k]) acc[k] = []; acc[k].push(s); return acc; }, {});

        const d7 = groupBy(last7, s => new Date(s.startDate).toISOString().split('T')[0]);
        const m6 = groupBy(last6m, s => { const d = new Date(s.startDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
        const y4 = groupBy(last4y, s => new Date(s.startDate).getFullYear());

        const allDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(now.getDate() - i); return { key: d.toISOString().split('T')[0], display: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) }; });
        const allMonths = Array.from({ length: 6 }, (_, i) => { const d = new Date(now); d.setMonth(now.getMonth() - i); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; return { key: k, display: `${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}` }; });
        const allYears = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

        const dw = allDates.reduce((a, { key, display }) => { a[display] = (d7[key] || []).reduce((s, x) => s + x.revenue, 0); return a; }, {});
        const mw = allMonths.reduce((a, { key, display }) => { a[display] = (m6[key] || []).reduce((s, x) => s + x.revenue, 0); return a; }, {});
        const yw = allYears.map(y => ({ year: String(y), revenue: (y4[y] || []).reduce((s, x) => s + x.revenue, 0) }));

        setCalculatedData({
            dateWise: Object.entries(dw).map(([displayDate, revenue]) => ({ displayDate, revenue })),
            monthWise: Object.entries(mw).map(([month, revenue]) => ({ month, revenue })),
            yearWise: yw,
            dateTotal: Object.values(dw).reduce((s, v) => s + v, 0),
            monthTotal: Object.values(mw).reduce((s, v) => s + v, 0),
            yearTotal: yw.reduce((s, i) => s + i.revenue, 0),
        });
    }, [subscriptions]);

    const dailyConsultationTotal = (consultationRevenue.dailyPeriods || []).reduce((s, p) => s + p.revenue, 0);
    const monthlyConsultationTotal = (consultationRevenue.monthlyPeriods || []).reduce((s, p) => s + p.revenue, 0);
    const yearlyConsultationTotal = (consultationRevenue.yearlyPeriods || []).reduce((s, p) => s + p.revenue, 0);
    const consultationCommissionRate = parseFloat(revenueAnalytics.summary?.commissionRates?.consultationCommission?.replace('%', '') || 0) / 100;
    const platformShareRate = parseFloat(revenueAnalytics.summary?.commissionRates?.platformShare?.replace('%', '') || 0) / 100;

    const userStatsRows = [
        { label: 'Total Registered', value: userStats.totalRegistered },
        { label: 'Active Clients', value: userStats.totalUsers },
        { label: 'Active Dietitians', value: userStats.totalDietitians },
        { label: 'Verifying Organizations', value: userStats.totalOrganizations },
        { label: 'Active Diet Plans', value: userStats.activeDietPlans },
    ];

    const RevenueTable = ({ data, periodKey, total }) => (
        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
            <thead style={{ backgroundColor: THEME.primary }}><tr><TH>{periodKey}</TH><TH right>Revenue</TH></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, i) => <tr key={i} className="hover:bg-green-50 transition-colors"><TD>{item[periodKey]}</TD><TD right>₹{item.revenue.toFixed(2)}</TD></tr>)}
            </tbody>
            <tfoot className="bg-gray-50"><tr><TD>Total</TD><TD right>₹{total.toFixed(2)}</TD></tr></tfoot>
        </table>
    );

    const ExportBtn = ({ onClick }) => <button onClick={onClick} className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm shadow-sm"><i className="fas fa-file-csv" /> Export CSV</button>;
    const Card = ({ children, className = '' }) => <div className={`bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500 hover:shadow-2xl transition-all duration-300 ${className}`}>{children}</div>;
    const CardHeader = ({ icon, title, onExport }) => (
        <div className="flex justify-between items-center mb-4">
            <h2 style={{ color: THEME.primary }} className="text-xl font-bold"><i style={{ color: THEME.primary }} className={`fas ${icon} mr-2`} />{title}</h2>
            {onExport && <ExportBtn onClick={onExport} />}
        </div>
    );

    const renderPieSection = ({ data, nameKey, colorBase, totalLabel, countLabel, page, setPage, csvData, csvFile, metricKey }) => {
        if (!data?.length) return <div className="text-center py-8 text-gray-500"><p>No data available</p></div>;
        const top10 = data.slice(0, 10);
        const others = data.slice(10);
        const othersTotal = others.reduce((s, d) => s + d.totalRevenue, 0);
        const pieData = othersTotal > 0 ? [...top10, { [nameKey]: 'Others', totalRevenue: othersTotal }] : top10;
        const totalItems = top10.length + (others.length > 0 ? 1 : 0);
        return (
            <>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart><Pie data={pieData} dataKey="totalRevenue" nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} label={({ [nameKey]: n, percent }) => `${n}: ${(percent * 100).toFixed(1)}%`}>
                        {Array.from({ length: totalItems }).map((_, i) => <Cell key={i} fill={i === top10.length ? '#9CA3AF' : `hsl(${colorBase + i * 36}, 70%, ${50 - i * 3}%)`} />)}
                    </Pie><Tooltip formatter={v => `₹${v.toLocaleString()}`} /><Legend /></PieChart>
                </ResponsiveContainer>
                <div className="mt-4 bg-white p-4 rounded border">
                    <div className="flex justify-between text-sm"><span className="text-gray-700">{totalLabel}:</span><span className="font-medium">{data[0] ? data.length + others.length : 0}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-700">Total Revenue:</span><span className={`font-medium text-${colorBase === 120 ? 'green' : 'blue'}-600`}>₹{data.reduce((s, d) => s + d.totalRevenue, 0).toLocaleString()}</span></div>
                </div>
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-sm text-gray-700">All {totalLabel} by Revenue:</h4>
                        <button onClick={() => exportToCSV(csvData, csvFile)} className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2 text-xs shadow-sm"><i className="fas fa-file-csv" /> Export CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: colorBase === 120 ? THEME.primary : THEME.info }}><tr><TH>Rank</TH><TH>{totalLabel.replace('Total ', '')}</TH><TH right>{countLabel}</TH><TH right>Revenue</TH></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((item, i) => (
                                    <tr key={i} className={`hover:bg-${colorBase === 120 ? 'green' : 'blue'}-50 transition-colors`}>
                                        <TD>{(page - 1) * itemsPerPage + i + 1}</TD>
                                        <TD>{item[nameKey]}</TD>
                                        <TD right>{item[metricKey]}</TD>
                                        <TD right cls={`font-medium text-${colorBase === 120 ? 'green' : 'blue'}-600`}>₹{item.totalRevenue.toLocaleString()}</TD>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={page} totalPages={Math.ceil(data.length / itemsPerPage)} onPageChange={setPage} theme={THEME} />
                </div>
            </>
        );
    };

    return (
        <div className="min-h-screen p-2 sm:p-4 bg-green-50" style={{ paddingTop: '0.5rem' }}>
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-center items-center my-2">
                    <div className="flex items-center font-bold text-3xl text-gray-800">
                        <div style={{ backgroundColor: THEME.primary }} className="flex items-center justify-center w-10 h-10 rounded-full mr-2"><i className="fas fa-leaf text-xl text-white" /></div>
                        <span><span style={{ color: THEME.primary }}>N</span>utri<span style={{ color: THEME.primary }}>C</span>onnect</span>
                    </div>
                </div>
                <h1 style={{ color: THEME.primary }} className="text-4xl font-extrabold text-center mb-4">Analytics Dashboard</h1>
                {isLoading && <div className="bg-blue-100 text-blue-700 p-3 rounded-lg text-center mb-6"><i className="fas fa-spinner fa-spin mr-2" />Loading analytics data...</div>}
                {errorMessage && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center mb-6">Failed to load analytics data. Please try again.</div>}

                <Card>
                    <CardHeader icon="fa-users" title="User Statistics" onExport={() => exportToCSV(userStatsRows.map(r => ({ metric: r.label, count: r.value || 0 })), 'user_statistics.csv')} />
                    <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                        <thead style={{ backgroundColor: THEME.primary }}><tr><TH>Metric</TH><TH right>Count</TH></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {userStatsRows.map(r => <tr key={r.label} className="hover:bg-green-50 transition-colors"><TD font-medium>{r.label}</TD><TD right>{r.value}</TD></tr>)}
                        </tbody>
                    </table>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <Card>
                        <CardHeader icon="fa-stethoscope" title={`Revenue from Consultations (${revenueAnalytics.summary?.commissionRates?.consultationCommission || '15%'})`} onExport={() => exportToCSV([...(consultationRevenue.dailyPeriods||[]).map(i=>({periodType:'Daily',period:i.displayDate,revenue:i.revenue||0})),...(consultationRevenue.monthlyPeriods||[]).map(i=>({periodType:'Monthly',period:i.month,revenue:i.revenue||0})),...(consultationRevenue.yearlyPeriods||[]).map(i=>({periodType:'Yearly',period:i.year,revenue:i.revenue||0}))], 'consultation_revenue.csv')} />
                        <div className="grid grid-cols-1 gap-6">
                            <div><h4 className="text-lg font-semibold mb-2">Daily Revenue (Last 7 Days)</h4><RevenueTable data={consultationRevenue.dailyPeriods||[]} periodKey="displayDate" total={dailyConsultationTotal} /></div>
                            <div><h4 className="text-lg font-semibold mb-2">Monthly Revenue (Last 6 Months)</h4><RevenueTable data={consultationRevenue.monthlyPeriods||[]} periodKey="month" total={monthlyConsultationTotal} /></div>
                            <div><h4 className="text-lg font-semibold mb-2">Yearly Revenue (Last 4 Years)</h4><RevenueTable data={consultationRevenue.yearlyPeriods||[]} periodKey="year" total={yearlyConsultationTotal} /></div>
                        </div>
                    </Card>
                    <Card>
                        <CardHeader icon="fa-chart-line" title={`Revenue from Memberships (${revenueAnalytics.summary?.commissionRates?.platformShare || '20%'})`} onExport={() => exportToCSV([...calculatedData.dateWise.map(i=>({periodType:'Daily',period:i.displayDate,revenue:i.revenue||0})),...calculatedData.monthWise.map(i=>({periodType:'Monthly',period:i.month,revenue:i.revenue||0})),...calculatedData.yearWise.map(i=>({periodType:'Yearly',period:i.year,revenue:i.revenue||0}))], 'membership_revenue.csv')} />
                        <div className="grid grid-cols-1 gap-6">
                            <div><h4 className="text-lg font-semibold mb-2">Daily Revenue (Last 7 Days)</h4><RevenueTable data={calculatedData.dateWise} periodKey="displayDate" total={calculatedData.dateTotal} /></div>
                            <div><h4 className="text-lg font-semibold mb-2">Monthly Revenue (Last 6 Months)</h4><RevenueTable data={calculatedData.monthWise} periodKey="month" total={calculatedData.monthTotal} /></div>
                            <div><h4 className="text-lg font-semibold mb-2">Yearly Revenue (Last 4 Years)</h4><RevenueTable data={calculatedData.yearWise} periodKey="year" total={calculatedData.yearTotal} /></div>
                        </div>
                    </Card>
                </div>

                <Card className="mt-6">
                    <h2 className="text-xl font-bold text-gray-700 mb-4"><i className="fas fa-chart-bar text-gray-700 mr-2" />Platform Revenue Analytics</h2>
                    <div className="bg-green-50 p-4 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold text-green-800 mb-2">Current Commission Rates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border"><span className="text-sm text-gray-600">Consultation Commission:</span><span className="text-lg font-bold text-green-600 ml-2">{revenueAnalytics.summary?.commissionRates?.consultationCommission || '15%'}</span></div>
                            <div className="bg-white p-3 rounded border"><span className="text-sm text-gray-600">Platform Share (Subscriptions):</span><span className="text-lg font-bold text-green-600 ml-2">{revenueAnalytics.summary?.commissionRates?.platformShare || '20%'}</span></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {[{ bg: 'blue', label: 'Total Platform Revenue', val: revenueAnalytics.summary?.totalRevenue }, { bg: 'green', label: 'Platform Earnings', val: revenueAnalytics.summary?.totalPlatformEarnings }, { bg: 'purple', label: 'Dietitian Earnings', val: revenueAnalytics.summary?.totalDietitianEarnings }].map(({ bg, label, val }) => (
                            <div key={label} className={`bg-${bg}-50 p-4 rounded-lg border-l-4 border-${bg}-500`}><h4 className={`text-sm font-medium text-${bg}-800`}>{label}</h4><p className={`text-2xl font-bold text-${bg}-600`}>₹{val?.toLocaleString() || '0'}</p></div>
                        ))}
                    </div>
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Peak Revenue Hours</h3>
                            <ExportBtn onClick={() => exportToCSV([...(revenueAnalytics.peakHours?.consultation||[]).map(i=>({stream:'Consultation',hour:i.hourLabel,revenue:i.revenue||0,transactions:i.transactions||0})),...(revenueAnalytics.peakHours?.membership||[]).map(i=>({stream:'Membership',hour:i.hourLabel,revenue:i.revenue||0,transactions:i.transactions||0}))], 'peak_revenue_hours.csv')} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {[{ key: 'consultation', label: 'Consultation Revenue Peak Hours', palette: consultationBarPalette }, { key: 'membership', label: 'Membership Revenue Peak Hours', palette: membershipBarPalette }].map(({ key, label, palette }) => (
                                <div key={key}>
                                    <h4 className="text-base font-semibold mb-2">{label}</h4>
                                    {(revenueAnalytics.peakHours?.[key]||[]).length > 0 ? (
                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                            <ResponsiveContainer width="100%" height={280}>
                                                <BarChart data={revenueAnalytics.peakHours?.[key]||[]}>
                                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hourLabel" /><YAxis />
                                                    <Tooltip formatter={v => [`₹${Number(v||0).toFixed(2)}`, 'Revenue']} />
                                                    <Bar dataKey="revenue" radius={[6,6,0,0]}>{(revenueAnalytics.peakHours?.[key]||[]).map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}</Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : <div className="px-4 py-4 text-sm text-gray-500 text-center bg-white rounded-lg border border-gray-200">No data available.</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Monthly Revenue Breakdown (Last 12 Months)</h3>
                            <ExportBtn onClick={() => exportToCSV(revenueAnalytics.monthlyBreakdown?.slice().reverse()||[], 'monthly_revenue_breakdown.csv')} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                                <thead style={{ backgroundColor: THEME.primary }}><tr><TH>Month</TH><TH right>Subscription Revenue</TH><TH right>Consultation Revenue</TH><TH right>Platform Earnings</TH><TH right>Dietitian Earnings</TH></tr></thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {revenueAnalytics.monthlyBreakdown?.slice().reverse().map((m, i) => (
                                        <tr key={i} className="hover:bg-green-50 transition-colors">
                                            <TD>{m.month}</TD><TD right>₹{m.subscriptionRevenue?.toFixed(2)||'0.00'}</TD><TD right>₹{m.consultationRevenue?.toFixed(2)||'0.00'}</TD>
                                            <TD right cls="text-green-600 font-medium">₹{m.platformEarnings?.toFixed(2)||'0.00'}</TD><TD right cls="text-purple-600 font-medium">₹{m.dietitianEarnings?.toFixed(2)||'0.00'}</TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Total Platform Revenue Summary</h3>
                            <ExportBtn onClick={() => exportToCSV([{period:'Total',consultationRevenue:(yearlyConsultationTotal*consultationCommissionRate).toFixed(2),membershipRevenue:(calculatedData.yearTotal*platformShareRate).toFixed(2),totalRevenue:((yearlyConsultationTotal*consultationCommissionRate)+(calculatedData.yearTotal*platformShareRate)).toFixed(2)},{period:'Monthly',consultationRevenue:(monthlyConsultationTotal*consultationCommissionRate).toFixed(2),membershipRevenue:(calculatedData.monthTotal*platformShareRate).toFixed(2),totalRevenue:((monthlyConsultationTotal*consultationCommissionRate)+(calculatedData.monthTotal*platformShareRate)).toFixed(2)}], 'total_revenue_summary.csv')} />
                        </div>
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: THEME.primary }}><tr><TH>Period</TH><TH right>Consultation Revenue</TH><TH right>Membership Revenue</TH><TH right>Total Revenue</TH></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {[{ period: 'Total (Lifetime/Yearly Basis)', cR: yearlyConsultationTotal, mR: calculatedData.yearTotal }, { period: 'Monthly (Avg./Current)', cR: monthlyConsultationTotal, mR: calculatedData.monthTotal }, { period: 'Yearly (Current)', cR: yearlyConsultationTotal, mR: calculatedData.yearTotal }].map(({ period, cR, mR }) => (
                                    <tr key={period} className="hover:bg-green-50 transition-colors">
                                        <TD>{period}</TD><TD right>₹{(cR*consultationCommissionRate).toFixed(2)}</TD><TD right>₹{(mR*platformShareRate).toFixed(2)}</TD><TD right>₹{((cR*consultationCommissionRate)+(mR*platformShareRate)).toFixed(2)}</TD>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="mt-6">
                    <h2 className="text-xl font-bold text-gray-700 mb-6"><i className="fas fa-chart-pie text-gray-700 mr-2" />Revenue Distribution Analytics</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-green-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Dietitian-Specific Revenue (Consultation Fees)</h3>
                            {renderPieSection({ data: dietitianRevenue.data, nameKey: 'dietitianName', colorBase: 120, totalLabel: 'Dietitians', countLabel: 'Consultations', page: dietitianPage, setPage: setDietitianPage, csvData: dietitianRevenue.data||[], csvFile: 'dietitian_revenue.csv', metricKey: 'consultationCount' })}
                        </div>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">User-Specific Revenue (Subscription Payments)</h3>
                            {renderPieSection({ data: userRevenue.data, nameKey: 'userName', colorBase: 210, totalLabel: 'Users', countLabel: 'Subscriptions', page: userPage, setPage: setUserPage, csvData: userRevenue.data||[], csvFile: 'user_revenue.csv', metricKey: 'subscriptionCount' })}
                        </div>
                    </div>
                    <div className="mt-6 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                        <h3 className="font-semibold text-gray-800 mb-2"><i className="fas fa-lightbulb text-yellow-600 mr-2" />Key Insights for Business Growth</h3>
                        <ul className="space-y-1 text-sm text-gray-700">
                            <li>• <strong>Top Dietitians:</strong> Focus on retaining and incentivizing high-performing dietitians</li>
                            <li>• <strong>High-Value Users:</strong> Identify loyal users with multiple subscriptions for premium offerings</li>
                            <li>• <strong>Revenue Monitoring:</strong> Track individual performance to optimize resource allocation</li>
                            <li>• <strong>Potential Growth:</strong> Analyze patterns from top performers to replicate success</li>
                        </ul>
                    </div>
                </Card>

                <Card className="mt-6">
                    <CardHeader icon="fa-stethoscope" title="Recent Consultations (Last 10)" onExport={() => exportToCSV((revenueAnalytics.recentConsultations||[]).map(c=>({date:new Date(c.date).toLocaleDateString(),dietitian:c.dietitian||'',consultationFee:c.amount||0,platformCommission:c.commission||0,dietitianEarnings:c.dietitianEarnings||0})), 'recent_consultations.csv')} />
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: THEME.primary }}><tr><TH>Date</TH><TH>Dietitian</TH><TH right>Consultation Fee</TH><TH right>Platform Commission</TH><TH right>Dietitian Earnings</TH></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {revenueAnalytics.recentConsultations?.map((c, i) => (
                                    <tr key={i} className="hover:bg-green-50 transition-colors">
                                        <TD>{new Date(c.date).toLocaleDateString()}</TD><TD>{c.dietitian}</TD><TD right>₹{c.amount?.toFixed(2)||'0.00'}</TD>
                                        <TD right cls="text-green-600 font-medium">₹{c.commission?.toFixed(2)||'0.00'}</TD><TD right cls="text-purple-600 font-medium">₹{c.dietitianEarnings?.toFixed(2)||'0.00'}</TD>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="mt-6 mb-8">
                    <CardHeader icon="fa-list-alt" title="Users and Their Subscription Plans" onExport={() => exportToCSV((subscriptions||[]).map(s=>({name:s.name||'',plan:s.plan||'',cycle:s.cycle||'',startDate:s.startDate||'',expireDate:s.expiresAt||'',revenueGenerated:s.revenue||0,paymentMethod:s.paymentMethod||'',transactionId:s.transactionId||''})), 'subscription_plans.csv')} />
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden border-collapse">
                            <thead style={{ backgroundColor: THEME.primary }}><tr><TH>Name</TH><TH>Start Date</TH><TH>Actions</TH></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {subscriptions.map((sub, i) => (
                                    <React.Fragment key={i}>
                                        <tr className="hover:bg-green-50 transition-colors">
                                            <TD>{sub.name}</TD><TD>{sub.startDate}</TD>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <button style={{ backgroundColor: expandedSubscriptionId === sub.id ? '#6B7280' : THEME.primary, color: 'white', padding: '0.5rem 0.75rem', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
                                                    onMouseEnter={e => { if (expandedSubscriptionId !== sub.id) e.target.style.backgroundColor = THEME.secondary; }}
                                                    onMouseLeave={e => { if (expandedSubscriptionId !== sub.id) e.target.style.backgroundColor = THEME.primary; }}
                                                    onClick={() => toggleDetails(sub.id)}>
                                                    <i className="fas fa-eye mr-2" />{expandedSubscriptionId === sub.id ? 'Hide Details' : 'View Details'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedSubscriptionId === sub.id && (
                                            <tr><td colSpan="3" className="px-6 py-0"><div className="bg-gray-50 p-4 border-l-4 border-green-500">
                                                <p><strong>Plan:</strong> {sub.plan} ({sub.cycle})</p>
                                                <p><strong>Revenue Generated:</strong> ₹{sub.revenue.toFixed(2)}</p>
                                                <p><strong>Mode of Payment:</strong> {sub.paymentMethod}</p>
                                                <p><strong>Expire Date:</strong> {sub.expiresAt}</p>
                                                <p><strong>Transaction ID:</strong> {sub.transactionId}</p>
                                            </div></td></tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Analytics;
