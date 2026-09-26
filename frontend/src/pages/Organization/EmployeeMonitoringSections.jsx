import React from 'react';

export const LoggedInTodayCard = ({ loggedInToday }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <i className="fas fa-sign-in-alt text-emerald-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-[#1A4A40]">Logged In Today</h2>
                <p className="text-xs text-gray-400">{new Date().toDateString()}</p>
            </div>
            <span className="ml-auto bg-emerald-100 text-emerald-700 text-sm font-bold px-3 py-1 rounded-full">
                {loggedInToday.length}
            </span>
        </div>
        {loggedInToday.length === 0 ? (
            <div className="text-center py-10">
                <i className="fas fa-moon text-3xl text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">No employees logged in today yet</p>
            </div>
        ) : (
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {loggedInToday.map(emp => (
                    <div key={emp._id} className="flex items-center gap-3 px-5 py-3">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#27AE60] to-[#1E6F5C] flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{emp.name}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                            {new Date(emp.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
            </div>
        )}
    </div>
);

export const PendingQueriesCard = ({
    pendingQueries, queriesLoading, queriesContainerRef,
    replyingTo, setReplyingTo, replyText, setReplyText,
    isSendingReply, handleSendReply
}) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <i className="fas fa-tasks text-blue-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-[#1A4A40]">Pending Employee Queries</h2>
                <p className="text-xs text-gray-400">Queries submitted by employees awaiting response</p>
            </div>
            <span className="ml-auto bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                {pendingQueries.length}
            </span>
        </div>
        {queriesLoading ? (
            <div className="text-center py-10">
                <i className="fas fa-spinner fa-spin text-2xl text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Loading queries...</p>
            </div>
        ) : pendingQueries.length === 0 ? (
            <div className="text-center py-10">
                <i className="fas fa-inbox text-3xl text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">No pending queries</p>
            </div>
        ) : (
            <div ref={queriesContainerRef} className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {pendingQueries.map(q => {
                    const queryText = q.query || '';
                    const catMatch = queryText.match(/^\[([^\]]+)\]\s*(.+?)(?:\n|$)/);
                    const catLabel = catMatch ? catMatch[1] : 'General';
                    const subject = catMatch ? catMatch[2] : queryText.split('\n')[0];
                    return (
                        <div key={q._id} className="px-5 py-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="fas fa-comment-dots text-blue-600 text-xs" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{subject}</p>
                                    <p className="text-xs text-gray-500 truncate">by {q.empName || q.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{catLabel}</span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold bg-yellow-100 text-yellow-700">
                                    {q.status}
                                </span>
                            </div>

                            {q.status === 'pending' && (
                                <div className="mt-3 ml-11">
                                    {replyingTo === q._id ? (
                                        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                                            <h4 className="font-medium text-gray-900 mb-2 text-xs">
                                                <i className="fas fa-reply mr-2 text-blue-600" />Compose Reply:
                                            </h4>
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Type your reply here..."
                                                className="w-full p-2 border border-gray-300 rounded-lg resize-vertical min-h-16 text-xs bg-white"
                                                disabled={isSendingReply}
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => handleSendReply(q._id)}
                                                    disabled={isSendingReply || !replyText.trim()}
                                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                                                >
                                                    {isSendingReply ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-paper-plane mr-1" />Send</>}
                                                </button>
                                                <button
                                                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                    className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setReplyingTo(q._id)}
                                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition"
                                        >
                                            <i className="fas fa-reply mr-1" />Reply
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

export const ResolvedQueriesSection = ({
    queriesLoading, allQueries, itemsPerPage, resolvedPage, setResolvedPage, resolvedContainerRef
}) => {
    const resolvedQueries = allQueries.filter(q => q.admin_reply && q.status === 'replied');
    const totalPages = Math.ceil(resolvedQueries.length / itemsPerPage);
    const startIdx = (resolvedPage - 1) * itemsPerPage;
    const paginatedQueries = resolvedQueries.slice(startIdx, startIdx + itemsPerPage);

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="p-5 border-b border-gray-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                    <i className="fas fa-check-circle text-green-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[#1A4A40]">Resolved Queries</h2>
                    <p className="text-xs text-gray-400">Queries with admin replies</p>
                </div>
            </div>
            {queriesLoading ? (
                <div className="text-center py-10">
                    <i className="fas fa-spinner fa-spin text-2xl text-gray-300 mb-3" />
                    <p className="text-gray-400 text-sm">Loading resolved queries...</p>
                </div>
            ) : resolvedQueries.length === 0 ? (
                <div className="text-center py-10">
                    <i className="fas fa-check-double text-3xl text-gray-300 mb-3" />
                    <p className="text-gray-400 text-sm">No resolved queries yet</p>
                </div>
            ) : (
                <>
                    <div ref={resolvedContainerRef} className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {paginatedQueries.map(q => {
                            const queryText = q.query || '';
                            const catMatch = queryText.match(/^\[([^\]]+)\]\s*(.+?)(?:\n|$)/);
                            const catLabel = catMatch ? catMatch[1] : 'General';
                            const subject = catMatch ? catMatch[2] : queryText.split('\n')[0];
                            return (
                                <div key={q._id} className="px-5 py-4 hover:bg-gray-50 transition">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <i className="fas fa-check-circle text-green-600 text-xs" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate">{subject}</p>
                                            <p className="text-xs text-gray-500 truncate">by {q.empName || q.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">{catLabel}</span>
                                                <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Resolved</span>
                                    </div>
                                    {q.admin_reply && (
                                        <div className="ml-11 bg-green-50 border-l-4 border-green-400 p-3 rounded text-sm">
                                            <p className="font-semibold text-gray-900 text-xs mb-1"><i className="fas fa-check text-green-600 mr-1" />Admin Reply:</p>
                                            <p className="text-gray-700 text-xs">{q.admin_reply}</p>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(q.replied_at).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {totalPages > 1 && (
                        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-600">Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, resolvedQueries.length)} of {resolvedQueries.length}</p>
                            <div className="flex gap-2">
                                <button onClick={() => setResolvedPage(prev => Math.max(1, prev - 1))} disabled={resolvedPage === 1} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                                    <i className="fas fa-chevron-left" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button key={page} onClick={() => setResolvedPage(page)} className={`px-3 py-1 text-sm rounded font-medium ${resolvedPage === page ? 'bg-[#27AE60] text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                                ))}
                                <button onClick={() => setResolvedPage(prev => Math.min(totalPages, prev + 1))} disabled={resolvedPage === totalPages} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                                    <i className="fas fa-chevron-right" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export const TeamBoardSection = ({
    orgName, boardMsg, setBoardMsg, boardError, boardPosting,
    handleBoardPost, boardLoading, boardPosts, boardContainerRef, handleDeletePost
}) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-[#1A4A40]"><i className="fas fa-comments mr-2 text-[#27AE60]" />Team Board</h2>
            <p className="text-sm text-gray-500 mt-1">View messages from your team and respond as admin. Shared with all employees of <strong>{orgName}</strong>.</p>
        </div>
        <div className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-[#1A4A40] flex items-center justify-center text-white font-bold shrink-0 mt-1 text-sm">
                    <i className="fas fa-building" />
                </div>
                <div className="flex-1">
                    <textarea rows={3} value={boardMsg} onChange={e => setBoardMsg(e.target.value)} placeholder="Post an announcement or reply to your team..." className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#27AE60] resize-none bg-white text-sm" />
                    {boardError && <p className="text-red-500 text-xs mt-1">{boardError}</p>}
                    <div className="flex justify-end mt-2">
                        <button onClick={handleBoardPost} disabled={boardPosting} className="bg-[#1A4A40] hover:bg-[#27AE60] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                            {boardPosting ? <><i className="fas fa-spinner fa-spin mr-2" />Posting...</> : <><i className="fas fa-paper-plane mr-2" />Post as Admin</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        {boardLoading ? (
            <div className="text-center py-14"><i className="fas fa-spinner fa-spin text-3xl text-gray-400 mb-3" /><p className="text-gray-400 text-sm">Loading board...</p></div>
        ) : boardPosts.length === 0 ? (
            <div className="text-center py-14"><i className="fas fa-comments text-5xl text-gray-300 mb-4" /><p className="text-gray-500">No messages on the board yet.</p></div>
        ) : (
            <div ref={boardContainerRef} className="flex flex-col gap-3 p-5 h-[40vh] overflow-y-auto scroll-smooth">
                {[...boardPosts].reverse().map(post => {
                    const isMine = post.isOrg === true;
                    return (
                        <div key={post._id} className={`flex items-end gap-2 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isMine && <div className="w-8 h-8 rounded-full bg-[#27AE60] flex items-center justify-center text-white font-bold shrink-0 text-xs">{post.author.charAt(0).toUpperCase()}</div>}
                            <div className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                                {!isMine && <span className="text-xs font-semibold text-gray-700 px-1">{post.author}</span>}
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${isMine ? 'bg-[#27AE60] text-white rounded-br-sm' : 'bg-green-200 text-green-900 rounded-bl-sm'}`}>
                                    {post.message}
                                </div>
                                <div className={`flex items-center gap-2 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-[10px] text-gray-400">{new Date(post.postedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <button onClick={() => handleDeletePost(post._id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600" title="Delete">
                                        <i className="fas fa-trash text-[10px]" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

export const EmployeeWorkSummarySection = ({
    workLoading, workSummary, fetchWorkSummary, expandedEmployee, setExpandedEmployee, workTab, setWorkTab
}) => {
    const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    const statusBadge = (status) => {
        const map = { verified: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', flagged: 'bg-yellow-100 text-yellow-700' };
        return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#1A4A40]">Employee Work Summary</h2>
                <button onClick={fetchWorkSummary} className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#1E6F5C] transition-colors"><i className="fas fa-sync-alt mr-2" />Refresh</button>
            </div>
            {workLoading ? (
                <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-4xl text-[#27AE60]" /><p className="mt-4 text-gray-600">Loading work summary...</p></div>
            ) : workSummary.length === 0 ? (
                <div className="text-center py-12"><i className="fas fa-check-circle text-6xl text-gray-300 mb-4" /><p className="text-gray-500 text-lg">No employee activity yet</p></div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {workSummary.map((work) => {
                        const isOpen = expandedEmployee === work.employeeId;
                        const activeTab = workTab[work.employeeId] || 'verifications';
                        return (
                            <div key={work.employeeId}>
                                <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left" onClick={() => setExpandedEmployee(isOpen ? null : work.employeeId)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#27AE60] to-[#1E6F5C] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {work.employeeName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{work.employeeName}</p>
                                            <p className="text-xs text-gray-500">{work.employeeEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="hidden sm:flex gap-4 text-sm text-gray-500">
                                            <span><i className="fas fa-user-check mr-1 text-blue-500" />{work.verifications.total} verif.</span>
                                            <span><i className="fas fa-newspaper mr-1 text-purple-500" />{work.blogModeration.total} blogs</span>
                                            {work.lastActivityAt && <span className="text-xs text-gray-400">Last: {new Date(work.lastActivityAt).toLocaleDateString()}</span>}
                                        </div>
                                        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`} />
                                    </div>
                                </button>
                                {isOpen && (
                                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                                        <div className="flex gap-2 mb-4">
                                            <button onClick={() => setWorkTab(p => ({ ...p, [work.employeeId]: 'verifications' }))} className={`px-4 py-1.5 rounded-full text-sm font-medium ${activeTab === 'verifications' ? 'bg-[#27AE60] text-white' : 'bg-white text-gray-600 border'}`}>
                                                <i className="fas fa-user-check mr-1" />Verifications ({work.verifications.total})
                                            </button>
                                            <button onClick={() => setWorkTab(p => ({ ...p, [work.employeeId]: 'blogs' }))} className={`px-4 py-1.5 rounded-full text-sm font-medium ${activeTab === 'blogs' ? 'bg-[#27AE60] text-white' : 'bg-white text-gray-600 border'}`}>
                                                <i className="fas fa-newspaper mr-1" />Blog Moderation ({work.blogModeration.total})
                                            </button>
                                        </div>
                                        {activeTab === 'verifications' && (
                                            work.verifications.items.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No verification actions yet</p> : (
                                                <table className="w-full text-sm bg-white rounded-lg border">
                                                    <thead className="bg-blue-50"><tr><th className="px-4 py-2 text-left text-xs text-blue-700 uppercase">Dietitian</th><th className="px-4 py-2 text-left text-xs text-blue-700 uppercase">Action</th><th className="px-4 py-2 text-left text-xs text-blue-700 uppercase">Notes</th><th className="px-4 py-2 text-left text-xs text-blue-700 uppercase">Date</th></tr></thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {work.verifications.items.map(item => <tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-2 font-medium">{item.name}</td><td className="px-4 py-2">{statusBadge(item.status)}</td><td className="px-4 py-2 text-gray-500 text-xs">{item.notes || '—'}</td><td className="px-4 py-2 text-gray-400 text-xs">{formatDate(item.date)}</td></tr>)}
                                                    </tbody>
                                                </table>
                                            )
                                        )}
                                        {activeTab === 'blogs' && (
                                            work.blogModeration.items.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No blog moderation actions yet</p> : (
                                                <table className="w-full text-sm bg-white rounded-lg border">
                                                    <thead className="bg-purple-50"><tr><th className="px-4 py-2 text-left text-xs text-purple-700 uppercase">Blog Title</th><th className="px-4 py-2 text-left text-xs text-purple-700 uppercase">Action</th><th className="px-4 py-2 text-left text-xs text-purple-700 uppercase">Notes</th><th className="px-4 py-2 text-left text-xs text-purple-700 uppercase">Date</th></tr></thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {work.blogModeration.items.map(item => <tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-2 font-medium">{item.title}</td><td className="px-4 py-2">{statusBadge(item.status)}</td><td className="px-4 py-2 text-gray-500 text-xs">{item.notes || '—'}</td><td className="px-4 py-2 text-gray-400 text-xs">{formatDate(item.date)}</td></tr>)}
                                                    </tbody>
                                                </table>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const EmployeeActivityLogTable = ({ filteredEmployees, loading, fetchEmployees, todayStr, formatDate }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1A4A40]">Employee Activity Log ({filteredEmployees.length})</h2>
            <button onClick={fetchEmployees} className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#1E6F5C] transition-colors"><i className="fas fa-sync-alt mr-2" />Refresh</button>
        </div>
        {loading ? (
            <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-4xl text-[#27AE60]" /><p className="mt-4 text-gray-600">Loading employees...</p></div>
        ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12"><i className="fas fa-filter text-6xl text-gray-300 mb-4" /><p className="text-gray-500 text-lg">No employees match the selected filters</p></div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-green-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">License</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Last Login</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A4A40] uppercase">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredEmployees.map((employee) => (
                            <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="shrink-0 h-10 w-10 bg-linear-to-br from-[#27AE60] to-[#1E6F5C] rounded-full flex items-center justify-center text-white font-bold">{employee.name.charAt(0).toUpperCase()}</div>
                                        <div className="ml-4"><div className="font-medium text-gray-900">{employee.name}</div><div className="text-sm text-gray-500">{employee.email}</div></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">{employee.licenseNumber}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center ${employee.status === 'active' ? 'bg-green-100 text-green-800' : employee.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        <span className={`w-2 h-2 rounded-full mr-2 ${employee.status === 'active' ? 'bg-green-500' : employee.status === 'inactive' ? 'bg-red-500' : 'bg-yellow-500'}`} />{employee.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {employee.lastLogin ? (
                                        <div><div>{formatDate(employee.lastLogin)}</div>{new Date(employee.lastLogin).toDateString() === todayStr && <span className="text-xs text-emerald-600 font-semibold">● Today</span>}</div>
                                    ) : <span className="text-gray-400">Never</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(employee.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);
