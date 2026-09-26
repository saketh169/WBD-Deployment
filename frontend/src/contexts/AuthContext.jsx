import React, { createContext, useState, useEffect } from 'react';
import { loginUser } from '../services/auth/authService';
import { getProfileByRole, clearProfileCache } from '../services/profile/profileService';
import { isTokenExpired } from '../utils/jwtUtils';


// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children, currentRole }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(currentRole || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on app load or when currentRole changes
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      if (currentRole) {
        // If currentRole is provided, use it specifically
        const token = localStorage.getItem(`authToken_${currentRole}`);
        const user = localStorage.getItem(`authUser_${currentRole}`);

        if (token) {
          // Check if token is expired before using
          if (isTokenExpired(token)) {
            localStorage.removeItem(`authToken_${currentRole}`);
            localStorage.removeItem(`authUser_${currentRole}`);
            setToken(null);
            setRole(null);
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }

          setToken(token);
          setRole(currentRole);
          setIsAuthenticated(true);

          // Use cached data from localStorage immediately
          if (user) {
            try {
              const cachedUser = JSON.parse(user);
              setUser(cachedUser);
            } catch { /* ignore parse errors */ }
          }

          // Fetch fresh data in background (for profileImage, etc.)
          fetchUserDetails(token, currentRole);
        } else {
          // No token for this role, clear state
          setToken(null);
          setRole(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // Fallback: check all roles if no currentRole provided
        // employee must come before organization to avoid picking org token for employee sessions
        const roles = ['user', 'admin', 'employee', 'organization', 'dietitian'];
        let foundToken = null;
        let foundRole = null;

        for (const r of roles) {
          const token = localStorage.getItem(`authToken_${r}`);
          if (token && !isTokenExpired(token)) {
            foundToken = token;
            foundRole = r;
            break;
          }
        }

        if (foundToken && foundRole) {
          setToken(foundToken);
          setRole(foundRole);
          setIsAuthenticated(true);

          // Fetch fresh user details if token exists (since profileImage isn't stored locally)
          await fetchUserDetails(foundToken, foundRole);
        } else {
          setToken(null);
          setRole(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [currentRole]);

  // Fetch user details from API
  const fetchUserDetails = async (token, role) => {
    try {
      const res = await getProfileByRole(role);
      // After middleware fix: business fields live in res.data only
      const resData = res.data || {};

      if (!res.isError && (res.success || resData.id || resData.email)) {
        const userData = {
          id: resData.id,
          name: resData.name,
          email: resData.email,
          phone: resData.phone,
          age: resData.age,
          address: resData.address,
          profileImage: resData.profileImage,
          gender: resData.gender,
          // Organization-specific fields
          org_name: resData.org_name,
          // Dietitian-specific fields
          specialization: resData.specialization,
          experience: resData.experience,
          licenseNumber: resData.licenseNumber,
        };
        setUser(userData);

        // Store user data in localStorage but exclude profileImage to avoid quota issues
        const storageData = { ...userData };
        delete storageData.profileImage; // Remove large profileImage from localStorage
        localStorage.setItem(`authUser_${role}`, JSON.stringify(storageData));

        return userData;
      }
    } catch (error) {
      // Handle rate limiting
      if (error.response?.status === 429) {
        window.location.href = '/rate-limit';
        return;
      }
      console.error('Error fetching user details:', error);
    }
  };

  // Login function
  const login = async (email, password, role, additionalData = {}) => {
    try {
      const formData = {
        email,
        password,
        role,
        ...additionalData,
      };

      const res = await loginUser(role, formData);
      const data = res.data || res;

      if (!res.isError && data.token) {
        const loginRole = data.role || role;

        // Clear all previous JWT sessions for this role completely
        localStorage.removeItem(`authToken_${loginRole}`);
        localStorage.removeItem(`authUser_${loginRole}`);
        localStorage.removeItem(`profileImage_${loginRole}`);

        // Clear current context state to ensure clean slate
        setToken(null);
        setRole(null);
        setUser(null);
        setIsAuthenticated(false);

        // Store in context
        setToken(data.token);
        setRole(loginRole);
        setIsAuthenticated(true);

        // Store in localStorage for persistence with role-specific keys
        localStorage.setItem(`authToken_${loginRole}`, data.token);

        // Fetch user details after successful login
        await fetchUserDetails(data.token, loginRole);

        return { success: true, role: loginRole };
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    let logoutRole = role;
    if (!logoutRole) {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) logoutRole = 'admin';
      else if (path.startsWith('/dietitian')) logoutRole = 'dietitian';
      else if (path.startsWith('/organization')) logoutRole = 'organization';
      else if (path.startsWith('/employee')) logoutRole = 'employee';
      else logoutRole = 'user';
    }

    if (logoutRole) {
      localStorage.removeItem(`authToken_${logoutRole}`);
      localStorage.removeItem(`authUser_${logoutRole}`);
      localStorage.removeItem(`profileImage_${logoutRole}`);
      clearProfileCache(logoutRole);
    }

    if (role === logoutRole || !role) {
      setToken(null);
      setRole(null);
      setUser(null);
      setIsAuthenticated(false);
      clearProfileCache();
    }
  };

  // Update user data
  const updateUser = (newUserData) => {
    setUser(newUserData);
    if (role) {
      localStorage.setItem(`authUser_${role}`, JSON.stringify(newUserData));
      clearProfileCache(role);
    }
  };


  const value = {
    user,
    token,
    role,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    fetchUserDetails,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = React.useContext(AuthContext);
  return context || {
    user: null, token: null, role: null, isAuthenticated: false, loading: false,
    login: async () => {}, logout: () => {}, updateUser: () => {}, fetchUserDetails: async () => {}
  };
};

export default AuthContext;