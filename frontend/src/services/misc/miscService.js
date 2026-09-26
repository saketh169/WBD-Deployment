import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const submitContactForm = (formData) =>
  makeRequest(() => axiosInstance.post('/api/contact/submit', formData));

export const getUserActivities = (userId, page = 1, limit = 20) =>
  makeRequest(() => axiosInstance.get(`/api/analytics/user/${userId}/activities`, { params: { page, limit } }));

export const getDietitianActivities = (dietitianId, page = 1, limit = 20) =>
  makeRequest(() => axiosInstance.get(`/api/analytics/dietitian/${dietitianId}/activities`, { params: { page, limit } }));

export const getDocumentStatus = (role, id = null) => {
  let endpoint;
  if (id) {
    endpoint = `/api/documents/status/${role}/${id}`;
  } else if (role === 'employee') {
    endpoint = '/api/status/employee-org-status';
  } else {
    endpoint = `/api/status/${role}-status`;
  }
  return makeRequest(() => axiosInstance.get(endpoint));
};

export const getChatbotResponse = async (message, sessionId, userId = null) => {
  try {
    return await makeRequest(() => axiosInstance.post('/api/chatbot/message', { message, sessionId, userId }));
  } catch (error) {
    if (error.response?.data?.limitReached) {
      return { isError: true, limitReached: true, limitData: error.response.data, message: error.response.data.message, data: null };
    }
    return { isError: true, message: error.message || 'Chatbot unavailable', data: null };
  }
};

export const getChatbotHistory = (sessionId) =>
  makeRequest(() => axiosInstance.get(`/api/chatbot/history/${sessionId}`));

export const searchDietitians = (params = {}) =>
  makeRequest(() => axiosInstance.get('/api/dietitians', { params }));

export const getChatbotFAQs = () =>
  makeRequest(() => axiosInstance.get('/api/chatbot/top-faqs'));

export const getUserProgressData = () =>
  makeRequest(() => axiosInstance.get('/api/user-progress'));

export const saveUserProgress = (progressData) =>
  makeRequest(() => axiosInstance.post('/api/user-progress', progressData));

export const deleteUserProgress = (id) =>
  makeRequest(() => axiosInstance.delete(`/api/user-progress/${id}`));

export const getUserProgressSubscriptionInfo = () =>
  makeRequest(() => axiosInstance.get('/api/user-progress/subscription-info'));

export const getPublicSettings = () =>
  makeRequest(() => axiosInstance.get('/api/settings'));

export const globalSearch = (query, limit = 3) =>
  makeRequest(() => axiosInstance.get('/api/search', { params: { q: query, limit } }));

export const getUserDashboardData = (userId) =>
  makeRequest(() => axiosInstance.get(`/api/analytics/user/${userId}`));

export const getDietitianDashboardData = (dietitianId) =>
  makeRequest(() => axiosInstance.get(`/api/analytics/dietitian/${dietitianId}`));
