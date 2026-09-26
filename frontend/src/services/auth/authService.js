import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const loginUser = (role, credentials) =>
  makeRequest(() => axiosInstance.post(`/api/signin/${role}`, credentials));

export const signupUser = (role, userData) =>
  makeRequest(() => axiosInstance.post(`/api/signup/${role}`, userData));

export const googleSignin = (credential) =>
  makeRequest(() => axiosInstance.post('/api/signin/user/google', { credential }));

export const googleSignup = (credential) =>
  makeRequest(() => axiosInstance.post('/api/signup/user/google', { credential }));

export const forgotPassword = (role, email) =>
  makeRequest(() => axiosInstance.post(`/api/forgot-password/${role}`, { email }));

export const resetPassword = (role, payload) =>
  makeRequest(() => axiosInstance.post(`/api/reset-password/${role}`, payload));

export const verifyLoginOtp = (role, payload) =>
  makeRequest(() => axiosInstance.post(`/api/verify-login-otp/${role}`, payload));

export const resendLoginOtp = (email, role) =>
  makeRequest(() => axiosInstance.post('/api/resend-login-otp', { email, role }));

export const verifyToken = (customToken = null) =>
  makeRequest(() => {
    const config = customToken ? { headers: { Authorization: `Bearer ${customToken}` } } : {};
    return axiosInstance.get('/api/verify-token', config);
  });

export const uploadDocuments = (role, formData) =>
  makeRequest(() =>
    axiosInstance.post(`/api/documents/upload/${role}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
