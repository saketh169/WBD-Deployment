import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

const _dietitiansCache = new Map(); // key → { data, expiresAt }
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const _getCached = (key) => {
  const entry = _dietitiansCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  _dietitiansCache.delete(key);
  return null;
};
const _setCache = (key, data) =>
  _dietitiansCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });

export const getAllDietitians = async (params = {}) => {
  const key = `dietitians:${JSON.stringify(params)}`;
  const cached = _getCached(key);
  if (cached) return cached;
  const result = await makeRequest(() => axiosInstance.get('/api/dietitians', { params }));
  if (!result?.isError) _setCache(key, result);
  return result;
};

export const getDietitianById = (id) =>
  makeRequest(() => axiosInstance.get(`/api/dietitians/${id}/profile`));

export const getDietitianProfile = (id) =>
  makeRequest(() => axiosInstance.get(`/api/dietitians/profile/${id}`));

export const getDietitianClients = async (id) => {
  const key = `dietitian:clients:${id}`;
  const cached = _getCached(key);
  if (cached) return cached;
  const result = await makeRequest(() => axiosInstance.get(`/api/dietitians/${id}/client-list`));
  if (!result?.isError) _setCache(key, result);
  return result;
};

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
