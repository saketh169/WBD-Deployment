import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const getUsersByRole = (role, params = {}) =>
  makeRequest(() => axiosInstance.get(`/api/crud/${role}-list`, { params }));

export const searchUsersByRole = (role, query, params = {}) =>
  makeRequest(() => axiosInstance.get(`/api/crud/${role}-list/search`, { params: { q: query, ...params } }));

export const removeUser = (role, id, reason = '') =>
  makeRequest(() => axiosInstance.delete(`/api/crud/${role}-list/${id}`, { data: { reason } }));

export const getRemovedAccounts = (params = {}) =>
  makeRequest(() => axiosInstance.get('/api/crud/removed-accounts', { params }));

export const restoreAccount = (id) =>
  makeRequest(() => axiosInstance.post(`/api/crud/removed-accounts/${id}/restore`));

export const permanentDeleteAccount = (id) =>
  makeRequest(() => axiosInstance.delete(`/api/crud/removed-accounts/${id}`));

export const getAdminQueries = () =>
  makeRequest(() => axiosInstance.get('/api/contact/queries-list'));

export const replyToAdminQuery = (queryId, replyMessage) =>
  makeRequest(() => axiosInstance.post('/api/contact/reply', { queryId, replyMessage }));

export const getAdminSettings = () =>
  makeRequest(() => axiosInstance.get('/api/settings'));

export const updateAdminSettings = (settings) =>
  makeRequest(() => axiosInstance.put('/api/settings', settings));

export const sendAdminEmail = (emailData) =>
  makeRequest(() => axiosInstance.post('/api/settings/send-email', emailData));

export const getAnalytics = (params = {}) =>
  makeRequest(() => axiosInstance.get('/api/analytics', { params }));
