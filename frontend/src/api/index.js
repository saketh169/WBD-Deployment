import apiClient from './client';

export const authApi = {
  signin: (role, creds) => apiClient.post(`/api/signin/${role}`, creds),
  signup: (role, data) => apiClient.post(`/api/signup/${role}`, data),
  googleSignin: (credential) => apiClient.post('/api/signin/user/google', { credential }),
  verifyToken: () => apiClient.get('/api/verify-token'),
  forgotPassword: (role, email) => apiClient.post(`/api/forgot-password/${role}`, { email }),
  resetPassword: (role, payload) => apiClient.post(`/api/reset-password/${role}`, payload),
};

export const bookingApi = {
  holdSlot: (payload) => apiClient.post('/api/bookings/hold', payload),
  releaseSlot: (payload) => apiClient.post('/api/bookings/release', payload),
  getDietitianHolds: (id, date) => apiClient.get(`/api/bookings/dietitian/${id}/holds`, { params: { date } }),
  checkLimits: (payload) => apiClient.post('/api/bookings/check-limits', payload),
  createBooking: (payload) => apiClient.post('/api/bookings/create', payload),
  getUserBookings: (userId) => apiClient.get(`/api/bookings/user/${userId}`),
  getDietitianBookedSlots: (id, date, userId) => apiClient.get(`/api/bookings/dietitian/${id}/booked-slots`, { params: { date, userId } }),
  cancelBooking: (id, reason) => apiClient.post(`/api/bookings/cancel/${id}`, { reason }),
};

export const dietitianApi = {
  getAll: (params) => apiClient.get('/api/dietitians', { params }),
  getById: (id) => apiClient.get(`/api/dietitians/${id}`),
  blockSlot: (id, payload) => apiClient.post(`/api/dietitians/${id}/block-slot`, payload),
  unblockSlot: (id, payload) => apiClient.post(`/api/dietitians/${id}/unblock-slot`, payload),
};

export const profileApi = {
  getUserDetails: () => apiClient.get('/api/getuserdetails'),
  getDietitianDetails: () => apiClient.get('/api/getdietitiandetails'),
  updateProfile: (data) => apiClient.put('/api/update-profile', data),
  getSubscriptionStatus: () => apiClient.get('/api/subscription-status'),
};

export const blogApi = {
  getAll: (params) => apiClient.get('/api/blogs', { params }),
  getById: (id) => apiClient.get(`/api/blogs/${id}`),
  toggleLike: (id) => apiClient.post(`/api/blogs/${id}/like`),
  addComment: (id, payload) => apiClient.post(`/api/blogs/${id}/comments`, payload),
};

export const mealPlanApi = {
  getUserMealPlans: (id) => apiClient.get(`/api/meal-plans/user/${id}`),
  create: (data) => apiClient.post('/api/meal-plans', data),
  delete: (id) => apiClient.delete(`/api/meal-plans/${id}`),
};

export const chatApi = {
  getOrCreateConversation: (payload) => apiClient.post('/api/chat/conversation', payload),
  sendMessage: (payload) => apiClient.post('/api/chat/message', payload),
};

export const adminApi = {
  getUsersByRole: (role, params) => apiClient.get(`/api/crud/${role}-list`, { params }),
  removeUser: (role, id, reason) => apiClient.delete(`/api/crud/${role}-list/${id}`, { data: { reason } }),
  getRemovedAccounts: (params = {}) => apiClient.get('/api/crud/removed-accounts', { params }),
};

export const paymentApi = {
  initialize: (order) => apiClient.post('/api/payments/initialize', order),
  getActiveSubscription: () => apiClient.get('/api/payments/subscription/active'),
  getHistory: () => apiClient.get('/api/payments/history'),
};
