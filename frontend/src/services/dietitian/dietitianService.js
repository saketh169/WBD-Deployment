import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const getAllDietitians = (params = {}) =>
  makeRequest(() => axiosInstance.get('/api/dietitians', { params }));

export const getDietitianById = (id) =>
  makeRequest(() => axiosInstance.get(`/api/dietitians/${id}`));

export const getDietitianProfile = (id) =>
  makeRequest(() => axiosInstance.get(`/api/dietitians/profile/${id}`));

export const getDietitianClients = (id) =>
  makeRequest(() => axiosInstance.get(`/api/dietitians/${id}/clients`));

export const getDietitianStats = (id) =>
  makeRequest(() => axiosInstance.get(`/api/dietitians/${id}/stats`));

export const canReviewDietitian = (id) =>
  makeRequest(() => axiosInstance.get(`/api/dietitians/${id}/can-review`));

export const setupDietitianProfile = (id, profileData) =>
  makeRequest(() => axiosInstance.post(`/api/dietitian-profile-setup/${id}`, profileData));

export const blockSlot = (id, payload) =>
  makeRequest(() => axiosInstance.post(`/api/dietitians/${id}/block-slot`, payload));

export const unblockSlot = (id, payload) =>
  makeRequest(() => axiosInstance.post(`/api/dietitians/${id}/unblock-slot`, payload));

export const blockDay = (id, payload) =>
  makeRequest(() => axiosInstance.post(`/api/dietitians/${id}/block-day`, payload));

export const unblockDay = (id, payload) =>
  makeRequest(() => axiosInstance.post(`/api/dietitians/${id}/unblock-day`, payload));

export const notifyLeave = (id, payload) =>
  makeRequest(() => axiosInstance.post(`/api/dietitians/${id}/notify-leave`, payload));

export const addTestimonial = (id, reviewData) =>
  makeRequest(() => axiosInstance.post(`/api/dietitians/${id}/testimonials`, reviewData));

export const deleteTestimonial = (id, idx) =>
  makeRequest(() => axiosInstance.delete(`/api/dietitians/${id}/testimonials/${idx}`));

export const getDietitianProfileDetails = async (id) => {
  try {
    const [profileRes, statsRes, canReviewRes] = await Promise.all([
      getDietitianById(id),
      getDietitianStats(id),
      canReviewDietitian(id)
    ]);

    const isError = profileRes?.isError || false;
    const profile = profileRes?.data || null;
    const stats = statsRes?.data || {};
    const canReviewData = canReviewRes?.data !== undefined ? canReviewRes.data : false;

    return {
      isError,
      success: !isError,
      message: isError ? (profileRes?.message || 'Failed to load profile') : 'Profile details loaded',
      data: {
        profile,
        stats,
        canReview: typeof canReviewData === 'boolean' ? canReviewData : (canReviewData?.canReview ?? false),
      },
      status: isError ? (profileRes?.status || 500) : 200,
    };
  } catch (error) {
    return {
      isError: true,
      success: false,
      message: error.message || 'Failed to load dietitian profile details',
      data: null,
      status: 500,
    };
  }
};
