import axiosInstance from '../../utils/axiosInstance';

// In-memory profile cache and in-flight promise tracker to eliminate duplicate calls across pages and components
const profileCache = new Map();
const inFlightRequests = new Map();

/**
 * Clears the profile cache. Call this on logout or after profile/avatar updates.
 * @param {string|null} role - Optional role to clear, or null to clear all.
 */
export const clearProfileCache = (role = null) => {
  if (role) {
    profileCache.delete(role.toLowerCase());
    inFlightRequests.delete(role.toLowerCase());
  } else {
    profileCache.clear();
    inFlightRequests.clear();
  }
};

/**
 * Fetches user profile for a specific role with deduplication and in-memory caching.
 * Concurrent calls for the same role share the same in-flight promise.
 * Subsequent calls in the same session return the cached profile instantly.
 */
export const getProfileByRole = async (role = 'user', options = {}) => {
  const normalizedRole = (role || 'user').toLowerCase();
  const forceRefresh = options?.forceRefresh === true;

  // 1. Return cached profile if available and not forcing a refresh
  if (!forceRefresh && profileCache.has(normalizedRole)) {
    return profileCache.get(normalizedRole);
  }

  // 2. Return in-flight promise if an identical request is already running
  if (inFlightRequests.has(normalizedRole)) {
    return inFlightRequests.get(normalizedRole);
  }

  const endpoints = {
    user: '/api/getuserdetails',
    dietitian: '/api/getdietitiandetails',
    admin: '/api/getadmindetails',
    organization: '/api/getorganizationdetails',
    employee: '/api/getorganizationdetails',
  };
  const endpoint = endpoints[normalizedRole] || '/api/getuserdetails';

  const requestPromise = (async () => {
    try {
      const res = await axiosInstance.get(endpoint);
      const data = res.data;
      if (!data?.isError) {
        profileCache.set(normalizedRole, data);
      }
      return data;
    } catch (error) {
      return {
        isError: true,
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch profile',
        data: null,
        status: error.response?.status || 500,
      };
    } finally {
      inFlightRequests.delete(normalizedRole);
    }
  })();

  inFlightRequests.set(normalizedRole, requestPromise);
  return requestPromise;
};

export const getUserDetails = (options) => getProfileByRole('user', options);
export const getDietitianDetails = (options) => getProfileByRole('dietitian', options);
export const getAdminDetails = (options) => getProfileByRole('admin', options);
export const getOrganizationDetails = (options) => getProfileByRole('organization', options);

export const updateProfile = async (profileData) => {
  try {
    const res = await axiosInstance.put('/api/update-profile', profileData);
    clearProfileCache();
    return res.data;
  } catch (error) {
    return { isError: true, success: false, message: error.response?.data?.message || error.message || 'Failed to update profile', data: null, status: error.response?.status || 500 };
  }
};

export const uploadAvatar = async (role, formData) => {
  try {
    const res = await axiosInstance.post(`/api/upload${role}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    clearProfileCache(role);
    return res.data;
  } catch (error) {
    return { isError: true, success: false, message: error.response?.data?.message || error.message || 'Failed to upload avatar', data: null, status: error.response?.status || 500 };
  }
};

export const deleteAvatar = async (role) => {
  try {
    const res = await axiosInstance.delete(`/api/delete${role}`);
    clearProfileCache(role);
    return res.data;
  } catch (error) {
    return { isError: true, success: false, message: error.response?.data?.message || error.message || 'Failed to delete avatar', data: null, status: error.response?.status || 500 };
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const res = await axiosInstance.get('/api/subscription-status');
    return res.data;
  } catch (error) {
    return { isError: true, success: false, message: error.response?.data?.message || error.message || 'Failed to fetch subscription', data: null, status: error.response?.status || 500 };
  }
};

export const changePassword = async (passwords) => {
  try {
    const res = await axiosInstance.post('/api/change-password', passwords);
    return res.data;
  } catch (error) {
    return { isError: true, success: false, message: error.response?.data?.message || error.message || 'Failed to change password', data: null, status: error.response?.status || 500 };
  }
};
