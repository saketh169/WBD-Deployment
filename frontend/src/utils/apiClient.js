import axios from 'axios';
import { isTokenExpired, decodeTokenPayload } from './jwtUtils';

/**
 * Centralized Axios instance with auth interceptors.
 * - Automatically attaches the JWT token from localStorage
 * - Handles 401/403 by clearing auth state and redirecting to signin
 * - Proactively refreshes tokens when close to expiry
 */
// Export the global axios instance so that all requests made via raw `axios`
// or `apiClient` share the same interceptors (e.g., 401 redirect logic).
const apiClient = axios;

// Find the active role and token
function getActiveAuth() {
  const path = window.location.pathname;
  let activeRole = 'user'; // default fallback for public/user pages

  if (path.startsWith('/admin')) activeRole = 'admin';
  else if (path.startsWith('/dietitian')) activeRole = 'dietitian';
  else if (path.startsWith('/organization')) activeRole = 'organization';
  else if (path.startsWith('/employee')) activeRole = 'employee';
  else if (path.startsWith('/user')) activeRole = 'user';

  const token = localStorage.getItem(`authToken_${activeRole}`);
  if (token) return { role: activeRole, token };

  return { role: null, token: null };
}

// Check if token expires within the next 5 minutes
function isTokenExpiringSoon(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return false;
  const fiveMinutesMs = 5 * 60 * 1000;
  return Date.now() >= (payload.exp * 1000) - fiveMinutesMs;
}

let refreshPromise = null;

// Request interceptor: attach token and refresh if expiring soon
apiClient.interceptors.request.use(async (config) => {
  const { role, token } = getActiveAuth();
  if (!token) return config;

  // Proactively refresh if expiring soon (but not yet expired)
  if (isTokenExpiringSoon(token) && !isTokenExpired(token) && !refreshPromise) {
    refreshPromise = axios.post('/api/refresh-token', {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
      if (res.data?.token && role) {
        localStorage.setItem(`authToken_${role}`, res.data.token);
      }
    }).catch(() => {
      // Refresh failed — let the existing token be used
    }).finally(() => {
      refreshPromise = null;
    });
  }

  // Use the latest token (may have been refreshed)
  const { token: currentToken } = getActiveAuth();
  config.headers.Authorization = `Bearer ${currentToken || token}`;
  return config;
});

// Response interceptor: handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = (data && data.message ? String(data.message) : '').toLowerCase();

      // Treat only explicit auth failures as logout-worthy. Business 403s (e.g., subscription limits)
      // should surface to the caller without dropping the session.
      const isAuthFailure =
        status === 401 ||
        (status === 403 && (message.includes('token') || message.includes('unauthorized') || message.includes('access')));

      if (isAuthFailure) {
        const { role: activeRole, token } = getActiveAuth();

        // Only clear authentication if it was actually unauthorized AND it's our current role's token
        const requestAuth = error.config.headers['Authorization'];
        const currentToken = token ? `Bearer ${token}` : null;

        if (activeRole && requestAuth === currentToken) {
          localStorage.removeItem(`authToken_${activeRole}`);
          localStorage.removeItem(`authUser_${activeRole}`);
          localStorage.removeItem(`profileImage_${activeRole}`);

          // Redirect to signin — detect which role was active from the current path
          if (activeRole !== 'user') {
            const typeParam = activeRole === 'employee' ? '&type=employee' : '';
            const baseRole = activeRole === 'employee' ? 'organization' : activeRole;
            window.location.href = `/signin?role=${baseRole}${typeParam}`;
          } else {
            window.location.href = '/signin?role=user';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
