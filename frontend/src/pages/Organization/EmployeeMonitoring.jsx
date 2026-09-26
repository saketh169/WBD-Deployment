import React, { useState, useEffect, useRef, useContext } from 'react';
import { getEmployeeMonitoringDashboard, getEmployees, getTeamboardPosts, createTeamboardPost, deleteTeamboardPost, replyToQuery, getEmployeeWorkSummary } from '../../services/organization/organizationService';
import AuthContext from '../../contexts/AuthContext';
import {
    LoggedInTodayCard, PendingQueriesCard, ResolvedQueriesSection,
    TeamBoardSection, EmployeeWorkSummarySection, EmployeeActivityLogTable
} from './EmployeeMonitoringSections';

const EmployeeMonitoring = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');

    const queriesContainerRef = useRef(null);
    const resolvedContainerRef = useRef(null);
    const boardContainerRef = useRef(null);

    const orgName = user?.org_name || 'Organization';

    const [boardPosts, setBoardPosts] = useState([]);
    const [boardMsg, setBoardMsg] = useState('');
    const [boardError, setBoardError] = useState('');
    const [boardLoading, setBoardLoading] = useState(false);
    const [boardPosting, setBoardPosting] = useState(false);

    const [pendingQueries, setPendingQueries] = useState([]);
    const [queriesLoading, setQueriesLoading] = useState(false);

    const [allQueries, setAllQueries] = useState([]);
    const [resolvedPage, setResolvedPage] = useState(1);
    const itemsPerPage = 10;

    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);

    const [workSummary, setWorkSummary] = useState([]);
    const [workLoading, setWorkLoading] = useState(false);
    const [expandedEmployee, setExpandedEmployee] = useState(null);
    const [workTab, setWorkTab] = useState({});

    const loadMonitoringDashboard = async () => {
        setLoading(true);
        setBoardLoading(true);
        setQueriesLoading(true);
        setWorkLoading(true);
        try {
            const res = await getEmployeeMonitoringDashboard(orgName);
            if (res && !res.isError && res.data) {
                const { stats: sData, employees: eData, boardPosts: bData, pendingQueries: pData, resolvedQueries: rData, workSummary: wData } = res.data;
                setStats(sData || null);
                setEmployees(eData || []);
                setBoardPosts(bData || []);
                setPendingQueries(pData || []);
                const sortedResolved = [...(rData || [])].sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));
                setAllQueries(sortedResolved);
                setWorkSummary(wData || []);
            }
        } catch (err) {
            console.error('Error loading monitoring dashboard:', err);
        } finally {
            setLoading(false);
            setBoardLoading(false);
            setQueriesLoading(false);
            setWorkLoading(false);
        }
    };

    useEffect(() => { loadMonitoringDashboard(); }, [orgName]);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await getTeamboardPosts(orgName);
                if (res && !res.isError && res.success) setBoardPosts(res.data || []);
            } catch {}
        }, 15000);
        return () => clearInterval(interval);
    }, [orgName]);

    useEffect(() => {
        if (queriesContainerRef.current) {
            setTimeout(() => { queriesContainerRef.current.scrollTop = queriesContainerRef.current.scrollHeight; }, 100);
        }
    }, [pendingQueries]);

    useEffect(() => {
        if (resolvedContainerRef.current) {
            setTimeout(() => { resolvedContainerRef.current.scrollTop = resolvedContainerRef.current.scrollHeight; }, 100);
        }
    }, [resolvedPage, allQueries]);

    useEffect(() => {
        if (boardContainerRef.current) {
            setTimeout(() => { boardContainerRef.current.scrollTop = boardContainerRef.current.scrollHeight; }, 50);
        }
    }, [boardPosts]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const response = await getEmployees();
            setEmployees(response && !response.isError && response.success ? response.data : []);
        } catch {
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkSummary = async () => {
        setWorkLoading(true);
        try {
            const response = await getEmployeeWorkSummary();
            setWorkSummary(response && !response.isError && response.success ? response.data || [] : []);
        } catch {
            setWorkSummary([]);
        } finally {
            setWorkLoading(false);
        }
    };

    const handleBoardPost = async () => {
        if (!boardMsg.trim()) { setBoardError('Message cannot be empty'); return; }
        setBoardError('');
        setBoardPosting(true);
        try {
            const res = await createTeamboardPost({ orgName, author: user?.name || orgName, email: user?.email || '', message: boardMsg.trim(), isOrg: true });
            if (res && !res.isError && res.success) {
                setBoardPosts(prev => [res.data, ...prev]);
                setBoardMsg('');
            } else {
                setBoardError(res?.message || 'Failed to post message.');
            }
        } catch {
            setBoardError('Failed to post message.');
        } finally {
            setBoardPosting(false);
        }
    };

    const handleDeletePost = async (id) => {
        try {
            const res = await deleteTeamboardPost(id, user?.email || '', true);
            if (res && !res.isError) setBoardPosts(prev => prev.filter(p => p._id !== id));
        } catch {}
    };

    const handleSendReply = async (queryId) => {
        if (!replyText.trim()) { alert('Please enter a reply.'); return; }
        setIsSendingReply(true);
        try {
            const response = await replyToQuery(queryId, replyText);
            if (response && !response.isError && response.success) {
                setPendingQueries(prev => prev.filter(q => q._id !== queryId));
                alert('Reply sent successfully!');
                setReplyingTo(null);
                setReplyText('');
            } else {
                alert(response?.message || 'Failed to send reply.');
            }
        } catch {
            alert('Failed to send reply.');
        } finally {
            setIsSendingReply(false);
        }
    };

    const todayStr = new Date().toDateString();
    const loggedInToday = (employees || []).filter(emp => emp.lastLogin && new Date(emp.lastLogin).toDateString() === todayStr);
    const filteredEmployees = (employees || [])
        .filter(emp => filter === 'all' || emp.status === filter)
        .sort((a, b) => {
            if (!a.lastLogin && !b.lastLogin) return 0;
            if (!a.lastLogin) return 1;
            if (!b.lastLogin) return -1;
            return new Date(b.lastLogin) - new Date(a.lastLogin);
        });

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-[#1A4A40] mb-2"><i className="fas fa-chart-line mr-3" />Staff Overview</h1>
                    <p className="text-gray-600">Track employee activity, performance, team board and today's work</p>
                </div>

                {loading && !stats ? (
                    <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-4xl text-[#27AE60]" /><p className="mt-4 text-gray-600">Loading statistics...</p></div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <LoggedInTodayCard loggedInToday={loggedInToday} />
                            <PendingQueriesCard
                                pendingQueries={pendingQueries} queriesLoading={queriesLoading} queriesContainerRef={queriesContainerRef}
                                replyingTo={replyingTo} setReplyingTo={setReplyingTo} replyText={replyText} setReplyText={setReplyText}
                                isSendingReply={isSendingReply} handleSendReply={handleSendReply}
                            />
                        </div>

                        <ResolvedQueriesSection
                            queriesLoading={queriesLoading} allQueries={allQueries} itemsPerPage={itemsPerPage}
                            resolvedPage={resolvedPage} setResolvedPage={setResolvedPage} resolvedContainerRef={resolvedContainerRef}
                        />

                        <TeamBoardSection
                            orgName={orgName} boardMsg={boardMsg} setBoardMsg={setBoardMsg} boardError={boardError}
                            boardPosting={boardPosting} handleBoardPost={handleBoardPost} boardLoading={boardLoading}
                            boardPosts={boardPosts} boardContainerRef={boardContainerRef} handleDeletePost={handleDeletePost}
                        />

                        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex-1 min-w-50">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status</label>
                                    <select value={filter} onChange={e => setFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="all">All Status</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                        <option value="pending-activation">Pending Only</option>
                                    </select>
                                </div>
                                <div className="flex-1 min-w-50 flex items-end">
                                    <button onClick={() => { setFilter('all'); loadMonitoringDashboard(); }} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                                        <i className="fas fa-redo mr-2" />Reset & Refresh
                                    </button>
                                </div>
                            </div>
                        </div>

                        <EmployeeWorkSummarySection
                            workLoading={workLoading} workSummary={workSummary} fetchWorkSummary={fetchWorkSummary}
                            expandedEmployee={expandedEmployee} setExpandedEmployee={setExpandedEmployee} workTab={workTab} setWorkTab={setWorkTab}
                        />

                        <EmployeeActivityLogTable
                            filteredEmployees={filteredEmployees} loading={loading} fetchEmployees={fetchEmployees}
                            todayStr={todayStr} formatDate={formatDate}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default EmployeeMonitoring;
