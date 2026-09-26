import React from 'react';

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDate = (date) => {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (msgDate.toDateString() === today.toDateString()) return 'Today';
  if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const ChatHeader = ({
  onBack,
  otherParticipant,
  otherUserType,
  userType,
  onOpenVideoModal,
  navigate,
  showReportsDropdown,
  setShowReportsDropdown,
  reportsDropdownRef
}) => (
  <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-md">
    <div className="px-6">
      <div className="flex items-center justify-between h-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <i className="fas fa-arrow-left text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {otherParticipant?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{otherParticipant?.name || 'Chat'}</h2>
              <p className="text-sm text-emerald-50">{otherUserType === 'dietitian' ? 'Dietitian' : 'Client'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userType === 'dietitian' && (
            <button
              onClick={onOpenVideoModal}
              className="px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2"
            >
              <i className="fas fa-video" />
              <span className="hidden sm:inline">Video Link</span>
            </button>
          )}

          {userType === 'client' && (
            <>
              <button
                onClick={() => navigate(`/user/submit-lab-report/${otherParticipant?._id || otherParticipant?.id}`)}
                className="px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2"
              >
                <i className="fas fa-file-upload" />
                <span className="hidden sm:inline">Upload Report</span>
              </button>
              <div className="relative" ref={reportsDropdownRef}>
                <button
                  onClick={() => setShowReportsDropdown(!showReportsDropdown)}
                  className="px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-file-medical" />
                  <span className="hidden sm:inline">My Reports</span>
                  <i className={`fas fa-chevron-${showReportsDropdown ? 'up' : 'down'} text-xs ml-1`} />
                </button>
                {showReportsDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-emerald-200 overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setShowReportsDropdown(false);
                        navigate(`/user/lab-reports/${otherParticipant?._id || otherParticipant?.id}`);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3 border-b border-gray-100"
                    >
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-flask text-emerald-600 text-sm" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">Lab Reports</div>
                        <div className="text-xs text-gray-500">Your submitted lab reports</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowReportsDropdown(false);
                        navigate(`/user/health-reports/${otherParticipant?._id || otherParticipant?.id}`);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-notes-medical text-teal-600 text-sm" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">Health Assessment</div>
                        <div className="text-xs text-gray-500">Reports from your dietitian</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {userType === 'dietitian' && (
            <div className="relative" ref={reportsDropdownRef}>
              <button
                onClick={() => setShowReportsDropdown(!showReportsDropdown)}
                className="px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2"
              >
                <i className="fas fa-file-medical" />
                <span className="hidden sm:inline">Client Reports</span>
                <i className={`fas fa-chevron-${showReportsDropdown ? 'up' : 'down'} text-xs ml-1`} />
              </button>
              {showReportsDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-emerald-200 overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setShowReportsDropdown(false);
                      navigate(`/dietitian/lab-reports/${otherParticipant?._id || otherParticipant?.id}`, {
                        state: { clientInfo: otherParticipant }
                      });
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3 border-b border-gray-100"
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-flask text-emerald-600 text-sm" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">Lab Reports</div>
                      <div className="text-xs text-gray-500">View client's lab reports</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowReportsDropdown(false);
                      navigate(`/dietitian/health-reports/${otherParticipant?._id || otherParticipant?.id}`, {
                        state: { clientInfo: otherParticipant }
                      });
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-notes-medical text-teal-600 text-sm" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">Health Assessment</div>
                      <div className="text-xs text-gray-500">Send health report to client</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

export const ChatMessageList = ({
  messages,
  userId,
  messagesContainerRef,
  editingMessageId,
  setEditingMessageId,
  editContent,
  setEditContent,
  handleEditMessage,
  handleDeleteMessage
}) => (
  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
    {messages.length === 0 ? (
      <div className="text-center py-12">
        <i className="fas fa-comments text-6xl text-gray-300 mb-4" />
        <p className="text-gray-500">No messages yet. Start the conversation!</p>
      </div>
    ) : (
      messages.map((message, index) => {
        const isOwnMessage = message.senderId === userId || message.senderId?.toString() === userId?.toString();
        const showDate = index === 0 || formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);

        return (
          <React.Fragment key={message._id}>
            {showDate && (
              <div className="text-center my-4">
                <span className="px-4 py-1 bg-gray-200 text-gray-600 text-sm rounded-full">
                  {formatDate(message.createdAt)}
                </span>
              </div>
            )}

            <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-2 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="max-w-md lg:max-w-lg">
                  {message.messageType === 'video-link' ? (
                    <div
                      className={`p-4 rounded-2xl shadow-md ${
                        isOwnMessage ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white' : 'bg-emerald-50 border border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-video" />
                        <span className="font-semibold">Video Consultation</span>
                      </div>
                      <p className="text-sm mb-2"><strong>Date:</strong> {message.videoLink?.scheduledDate}</p>
                      <p className="text-sm mb-2"><strong>Time:</strong> {message.videoLink?.scheduledTime}</p>
                      <a
                        href={message.videoLink?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-block px-4 py-2 rounded-lg font-medium ${
                          isOwnMessage ? 'bg-white text-emerald-600 hover:bg-gray-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        Join Meeting
                      </a>
                    </div>
                  ) : (
                    <div
                      className={`relative group ${
                        isOwnMessage ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white' : 'bg-gray-100 text-gray-900'
                      } px-4 py-3 rounded-2xl shadow-sm`}
                    >
                      {editingMessageId === message._id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditMessage(message._id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditContent('');
                              }}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="wrap-break-word">{message.content}</p>
                          {message.isEdited && <span className="text-xs opacity-75 italic ml-2">(edited)</span>}
                          {isOwnMessage && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingMessageId(message._id);
                                  setEditContent(message.content);
                                }}
                                className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 text-gray-600 text-xs border border-gray-200"
                                title="Edit"
                              >
                                <i className="fas fa-edit" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(message._id)}
                                className="p-1.5 bg-white rounded-full shadow-md hover:bg-red-50 text-red-600 text-xs border border-red-200"
                                title="Delete"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })
    )}
  </div>
);

export const VideoLinkModal = ({
  showVideoModal,
  setShowVideoModal,
  videoLinkData,
  setVideoLinkData,
  handleSendVideoLink
}) => {
  if (!showVideoModal) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Send Video Consultation Link</h3>
          <button onClick={() => setShowVideoModal(false)} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video Link URL</label>
            <input
              type="url"
              value={videoLinkData.url}
              onChange={(e) => setVideoLinkData({ ...videoLinkData, url: e.target.value })}
              placeholder="https://meet.google.com/..."
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date</label>
            <input
              type="date"
              value={videoLinkData.scheduledDate}
              onChange={(e) => setVideoLinkData({ ...videoLinkData, scheduledDate: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Time</label>
            <input
              type="time"
              value={videoLinkData.scheduledTime}
              onChange={(e) => setVideoLinkData({ ...videoLinkData, scheduledTime: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowVideoModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendVideoLink}
              className="flex-1 px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700"
            >
              Send Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
