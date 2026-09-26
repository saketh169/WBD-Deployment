import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const getOrCreateConversation = (payload) =>
  makeRequest(() => axiosInstance.post('/api/chat/conversation', payload));

export const getUserConversations = (userId, userType) =>
  makeRequest(() => axiosInstance.get(`/api/chat/conversations/${userId}/${userType}`));

export const getMessages = (conversationId) =>
  makeRequest(() => axiosInstance.get(`/api/chat/messages/${conversationId}`));

export const sendChatMessage = (messageData) =>
  makeRequest(() => axiosInstance.post('/api/chat/message', messageData));

export const editMessage = (messageId, payload) => {
  const data = typeof payload === 'string' ? { content: payload, text: payload } : payload;
  return makeRequest(() => axiosInstance.put(`/api/chat/message/${messageId}`, data));
};

export const deleteChatMessage = (messageId, payload = {}) =>
  makeRequest(() => axiosInstance.delete(`/api/chat/message/${messageId}`, { data: payload }));

export const markAsRead = (conversationId) =>
  makeRequest(() => axiosInstance.post(`/api/chat/read/${conversationId}`));
