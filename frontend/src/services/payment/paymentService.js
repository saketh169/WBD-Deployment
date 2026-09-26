import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const initializePayment = (orderData) =>
  makeRequest(() => axiosInstance.post('/api/payments/initialize', orderData));

export const processPayment = (paymentId, payload) =>
  makeRequest(() => axiosInstance.post(`/api/payments/process/${paymentId}`, payload));

export const verifyPayment = (transactionId) =>
  makeRequest(() => axiosInstance.get(`/api/payments/verify/${transactionId}`));

export const getActiveSubscription = () =>
  makeRequest(() => axiosInstance.get('/api/payments/subscription/active'));

export const getPaymentHistory = () =>
  makeRequest(() => axiosInstance.get('/api/payments/history'));

export const cancelSubscription = (data = {}) =>
  makeRequest(() => axiosInstance.post('/api/payments/subscription/cancel', data));

export const getPaymentAnalytics = () =>
  makeRequest(() => axiosInstance.get('/api/payments/analytics'));

export const createConsultationOrder = (orderData) =>
  makeRequest(() => axiosInstance.post('/api/bookings/payment/order', orderData));
