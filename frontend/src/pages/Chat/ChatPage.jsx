import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';
import { getMessages, sendChatMessage, editMessage, deleteChatMessage } from '../../services/chat/chatService';
import { io } from 'socket.io-client';
import { ChatHeader, ChatMessageList, VideoLinkModal } from './ChatMessageViews';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, role } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoLinkData, setVideoLinkData] = useState({ url: '', scheduledDate: '', scheduledTime: '' });

  const [showReportsDropdown, setShowReportsDropdown] = useState(false);
  const reportsDropdownRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const otherParticipant = location.state?.otherParticipant;
  const bookingInfo = location.state?.bookingInfo;
  const userType = role === 'dietitian' || user?.role === 'dietitian' ? 'dietitian' : 'client';
  const otherUserType = userType === 'dietitian' ? 'client' : 'dietitian';

  useEffect(() => {
    if (showVideoModal && bookingInfo?.date && bookingInfo?.time) {
      const dateStr = bookingInfo.date.split('T')[0];
      const timeStr = bookingInfo.time.includes(':') ? bookingInfo.time : '10:00';
      setVideoLinkData({ url: '', scheduledDate: dateStr, scheduledTime: timeStr });
    }
  }, [showVideoModal, bookingInfo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target)) {
        setShowReportsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!conversationId || conversationId.length !== 24) return;
    try {
      const response = await getMessages(conversationId);
      if (response && !response.isError && response.success) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [conversationId]);

  useEffect(() => {
    const initChat = async () => {
      if (!conversationId || !user || !token) {
        setLoading(false);
        return;
      }
      try {
        await fetchMessages();
        setTimeout(() => {
          if (messagesContainerRef.current) messagesContainerRef.current.scrollTop = 0;
        }, 100);
        window.scrollTo(0, 0);
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initChat();

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
    });

    socket.on('connect', () => {
      socket.emit('join_conversation', conversationId);
    });

    socket.on('new_message', (newMsg) => {
      setMessages((prev) => {
        if (!prev.find((m) => m._id === newMsg._id)) {
          setTimeout(scrollToBottom, 100);
          return [...prev, newMsg];
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId, token, user, fetchMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user?.id) return;
    if (!conversationId || conversationId.length !== 24) {
      alert('Invalid conversation. Please restart the chat.');
      return;
    }

    setSending(true);
    try {
      const response = await sendChatMessage({
        conversationId,
        senderId: user.id,
        senderType: userType,
        content: newMessage.trim(),
        messageType: 'text'
      });

      if (response && !response.isError && response.success) {
        setMessages([...messages, response.data]);
        setNewMessage('');
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId) => {
    if (!editContent.trim()) return;
    try {
      const response = await editMessage(messageId, { content: editContent.trim(), userId: user.id });
      if (response && !response.isError && response.success) {
        setMessages(messages.map((msg) => (msg._id === messageId ? response.data : msg)));
        setEditingMessageId(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const response = await deleteChatMessage(messageId, { userId: user.id });
      if (response && !response.isError && response.success) {
        setMessages(messages.filter((msg) => msg._id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleSendVideoLink = async () => {
    if (!videoLinkData.url.trim() || !videoLinkData.scheduledDate || !videoLinkData.scheduledTime) {
      alert('Please fill in all fields');
      return;
    }
    if (!conversationId || conversationId.length !== 24) {
      alert('Invalid conversation. Please restart the chat.');
      return;
    }

    try {
      const content = `Video Consultation Link\nDate: ${videoLinkData.scheduledDate}\nTime: ${videoLinkData.scheduledTime}`;
      const response = await sendChatMessage({
        conversationId,
        senderId: user.id,
        senderType: userType,
        content,
        messageType: 'video-link',
        videoLink: videoLinkData
      });

      if (response && !response.isError && response.success) {
        setMessages([...messages, response.data]);
        setShowVideoModal(false);
        setVideoLinkData({ url: '', scheduledDate: '', scheduledTime: '' });
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error sending video link:', error);
      alert('Failed to send video link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50/30 to-teal-50/30">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-auto h-[580px]">
        <ChatHeader
          onBack={() => navigate(-1)}
          otherParticipant={otherParticipant}
          otherUserType={otherUserType}
          userType={userType}
          onOpenVideoModal={() => setShowVideoModal(true)}
          navigate={navigate}
          showReportsDropdown={showReportsDropdown}
          setShowReportsDropdown={setShowReportsDropdown}
          reportsDropdownRef={reportsDropdownRef}
        />

        <ChatMessageList
          messages={messages}
          userId={user?.id}
          messagesContainerRef={messagesContainerRef}
          editingMessageId={editingMessageId}
          setEditingMessageId={setEditingMessageId}
          editContent={editContent}
          setEditContent={setEditContent}
          handleEditMessage={handleEditMessage}
          handleDeleteMessage={handleDeleteMessage}
        />

        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-3 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-semibold cursor-pointer"
            >
              <i className="fas fa-paper-plane" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>

      <VideoLinkModal
        showVideoModal={showVideoModal}
        setShowVideoModal={setShowVideoModal}
        videoLinkData={videoLinkData}
        setVideoLinkData={setVideoLinkData}
        handleSendVideoLink={handleSendVideoLink}
      />
    </div>
  );
};

export default ChatPage;