import axios from 'axios';
import { isTokenExpired } from './jwtUtils';

/**
 * Derives active role from URL path
 * Uses startsWith so /user/dietitian-profiles correctly resolves to 'user', NOT 'dietitian'
 */
export function getActiveRoleFromPath() {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname.toLowerCase();

  // Root role paths must be checked with startsWith so /user/... is identified as 'user', NOT 'dietitian'
  if (path.startsWith('/user')) return 'user';
  if (path.startsWith('/dietitian')) return 'dietitian';
  if (path.startsWith('/organization') || path.startsWith('/org')) return 'organization';
  if (path.startsWith('/employee')) return 'employee';
  if (path.startsWith('/admin')) return 'admin';

  // Sub-path checks with delimiters to avoid partial string matching
  if (path.includes('/user/')) return 'user';
  if (path.includes('/dietitian/')) return 'dietitian';
  if (path.includes('/organization/') || path.includes('/org/')) return 'organization';
  if (path.includes('/employee/')) return 'employee';
  if (path.includes('/admin/')) return 'admin';

  return null;
}

/**
 * Gets a valid (non-expired) JWT token for the currently active user
 */
export function getActiveToken() {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  const getValidToken = (key) => {
    try {
      const t = localStorage.getItem(key);
      if (!t) return null;
      if (isTokenExpired(t)) {
        localStorage.removeItem(key);
        return null;
      }
      return t;
    } catch {
      return null;
    }
  };

  // 1. Try URL pathname role first (prevents multi-tab token overlap)
  const pathRole = getActiveRoleFromPath();
  if (pathRole) {
    const pathToken = getValidToken(`authToken_${pathRole}`);
    if (pathToken) return pathToken;
  }

  // 2. Fallback to stored role key
  const role = localStorage.getItem('role') || localStorage.getItem('userRole');
  if (role) {
    const roleToken = getValidToken(`authToken_${role.toLowerCase()}`);
    if (roleToken) return roleToken;
  }

  // 3. Fallbacks to any valid active token
  return (
    getValidToken('authToken_user') ||
    getValidToken('authToken_dietitian') ||
    getValidToken('authToken_employee') ||
    getValidToken('authToken_organization') ||
    getValidToken('authToken_admin') ||
    getValidToken('token') ||
    null
  );
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
});

// Interceptor to add dynamic, role-scoped JWT token to all outgoing requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getActiveToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired/invalid JWT tokens (401 or 403 Token expired)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const msg = (error.response.data?.message || '').toLowerCase();
      const isAuthError =
        status === 401 ||
        (status === 403 && (msg.includes('token') || msg.includes('expired') || msg.includes('invalid')));

      if (isAuthError) {
        const pathRole = getActiveRoleFromPath();
        if (pathRole) {
          localStorage.removeItem(`authToken_${pathRole}`);
          localStorage.removeItem(`authUser_${pathRole}`);
          localStorage.removeItem(`email_${pathRole}`);
          localStorage.removeItem(`username_${pathRole}`);
        }
      }
    }
    return Promise.reject(error);
  }
);


// In-flight request map to eliminate duplicate parallel requests across components
const pendingRequests = new Map();
// Short-term cache for GET requests (TTL: 2000ms) to eliminate StrictMode / rapid re-render duplicates
const getCache = new Map();
const CACHE_TTL_MS = 2000;

export const clearRequestCache = () => {
  pendingRequests.clear();
  getCache.clear();
};

const getRequestKey = (config) => {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  const token = config.headers?.Authorization || getActiveToken() || '';
  return `${method}:${url}:${params}:${token}`;
};

const originalRequest = axiosInstance.request.bind(axiosInstance);

axiosInstance.request = async function (config) {
  if (typeof config === 'string') {
    config = { url: config, ...(arguments[1] || {}) };
  }

  const method = (config.method || 'get').toLowerCase();

  // If mutation (POST/PUT/DELETE/PATCH), clear GET cache and execute directly
  if (method !== 'get') {
    getCache.clear();
    return originalRequest(config);
  }

  if (config.skipCache || config.noCache) {
    return originalRequest(config);
  }

  const key = getRequestKey(config);

  // 1. Return cached response if within TTL window
  const cached = getCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve({ ...cached.response, config });
  }

  // 2. Return in-flight promise if an identical GET is currently executing
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // 3. Initiate request and register in-flight tracker
  const requestPromise = originalRequest(config)
    .then((response) => {
      pendingRequests.delete(key);
      getCache.set(key, { timestamp: Date.now(), response });
      return response;
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, requestPromise);
  return requestPromise;
};

/**
 * Standard request wrapper implementing School ERP pattern:
 * Guarantees every API response has { isError, message, data, status }
 */
export const makeRequest = async (requestFn) => {
  try {
    const response = await requestFn();
    const resData = response.data;

    // If backend already formatted with isError envelope, pass through directly
    if (resData && typeof resData === 'object' && 'isError' in resData) {
      return {
        isError: resData.isError,
        success: !resData.isError,
        message: resData.message || 'Success',
        data: resData.data !== undefined ? resData.data : null,
        status: resData.status || resData.statusCode || response.status,
      };
    }

    // Fallback for non-standard responses
    const resolvedData = resData?.data !== undefined ? resData.data : resData;

    return {
      isError: false,
      success: true,
      message: resData?.message || 'Success',
      data: resolvedData,
      status: response.status,
    };
  } catch (error) {
    const status = error.response?.status;
    let message = 'Something went wrong. Please try again.';

    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.message) {
      message = error.message;
    }

    return {
      isError: true,
      success: false,
      message,
      data: null,
      status: status || 500,
      details: error.response?.data || null,
    };
  }
};


export default axiosInstance;
