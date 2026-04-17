import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../axios';
import { roleConfig, ProfileContext as Context, useProfile } from './roleConfig';
import { useAuthContext } from '../hooks/useAuthContext';

// Profile Provider Component
export const ProfileProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role: authRole } = useAuthContext();

  const [profileData, setProfileData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState('');
  const [currentRole, setCurrentRole] = useState(null);
  const [config, setConfig] = useState(null);

  // Detect role: prefer AuthContext role, fall back to URL path
  const detectRole = useCallback(() => {
    if (authRole) return authRole;
    const path = location.pathname;
    if (path.includes('/user/')) return 'user';
    if (path.includes('/dietitian/')) return 'dietitian';
    if (path.includes('/organization/')) return 'organization';
    if (path.includes('/admin/')) return 'admin';
    return 'user'; // Default fallback
  }, [authRole, location.pathname]);

  // Initialize role and config
  const initializeRole = useCallback(() => {
    const role = detectRole();
    setCurrentRole(role);
    setConfig(roleConfig[role]);
    return { role, config: roleConfig[role] };
  }, [detectRole]);

  // Fetch user profile details
  const fetchProfileData = useCallback(async () => {
    setIsFetching(true);
    setMessage('');

    const { config: roleConfiguration } = initializeRole();

    try {
      const token = localStorage.getItem(roleConfiguration.tokenKey);
      if (!token) {
        setMessage('Session expired. Please login again.');
        setTimeout(() => navigate(roleConfiguration.signinPath), 2000);
        return null;
      }

      const response = await axios.get(roleConfiguration.apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const userData = {};

        // Populate data based on role-specific fields
        roleConfiguration.fields.forEach(field => {
          if (field === 'dob' && response.data[field]) {
            userData[field] = response.data[field].split('T')[0];
          } else {
            userData[field] = response.data[field] || '';
          }
        });

        // Email is always included (read-only)
        userData.email = response.data.email || '';

        setProfileData(userData);
        setOriginalData(userData);
        return userData;
      }
    } catch (error) {
      console.error('Error fetching profile details:', error);
      setMessage('Failed to load profile details. Please try again.');
      return null;
    } finally {
      setIsFetching(false);
    }
  }, [initializeRole, navigate]);

  // Update profile
  const updateProfile = useCallback(async (data) => {
    setMessage('');
    setIsLoading(true);

    const { config: roleConfiguration } = initializeRole();

    try {
      // Check if any changes were made
      const hasChanges = roleConfiguration.fields.some(key => data[key] !== originalData[key]);

      if (!hasChanges) {
        setMessage('No changes detected. Please modify at least one field.');
        setIsLoading(false);
        return { success: false, message: 'No changes detected' };
      }

      const token = localStorage.getItem(roleConfiguration.tokenKey);
      if (!token) {
        setMessage('Session expired. Please login again.');
        setTimeout(() => navigate(roleConfiguration.signinPath), 2000);
        setIsLoading(false);
        return { success: false, message: 'Session expired' };
      }

      // Only send fields that were changed
      const updatePayload = {};
      roleConfiguration.fields.forEach(key => {
        if (data[key] !== originalData[key]) {
          updatePayload[key] = data[key];
        }
      });

      const response = await axios.put('/api/update-profile', updatePayload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMessage('Profile updated successfully! Redirecting to dashboard...');
        setProfileData(data);
        setOriginalData(data);

        // Update localStorage authUser data so AuthContext picks up the changes
        const currentAuthUser = localStorage.getItem(`authUser_${currentRole}`);

        if (currentAuthUser) {
          const authUserData = JSON.parse(currentAuthUser);
          // Merge updated fields into authUser data
          const updatedAuthUser = { ...authUserData, ...data };

          // Special handling for organization - sync 'name' to 'org_name' field
          if (currentRole === 'organization' && data.name) {
            updatedAuthUser.org_name = data.name;
          }

          localStorage.setItem(`authUser_${currentRole}`, JSON.stringify(updatedAuthUser));
        }

        // Force page reload to refresh AuthContext
        setTimeout(() => {
          window.location.href = roleConfiguration.dashboardPath;
        }, 2000);

        return { success: true, message: 'Profile updated successfully' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
      setMessage(`Error: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [originalData, initializeRole, navigate, currentRole]);

  // Change password
  const changePassword = useCallback(async (oldPassword, newPassword) => {
    setMessage('');
    setIsLoading(true);

    const { config: roleConfiguration } = initializeRole();

    try {
      const token = localStorage.getItem(roleConfiguration.tokenKey);
      if (!token) {
        setMessage('Session expired. Please login again.');
        setTimeout(() => navigate(roleConfiguration.signinPath), 2000);
        setIsLoading(false);
        return { success: false, message: 'Session expired' };
      }

      const response = await axios.post('/api/change-password', {
        oldPassword,
        newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMessage('Password changed successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate(roleConfiguration.dashboardPath);
        }, 2000);
        return { success: true, message: 'Password changed successfully' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
      setMessage(`Error: ${errorMessage}`);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [initializeRole, navigate]);

  // Reset profile data to original
  const resetProfileData = useCallback(() => {
    setProfileData(originalData);
    setMessage('');
  }, [originalData]);

  // Clear message
  const clearMessage = useCallback(() => {
    setMessage('');
  }, []);

  const value = {
    profileData,
    originalData,
    isLoading,
    isFetching,
    message,
    currentRole,
    config,
    fetchProfileData,
    updateProfile,
    changePassword,
    resetProfileData,
    clearMessage,
    setMessage,
    initializeRole
  };

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
};

export { Context as ProfileContext };
// eslint-disable-next-line react-refresh/only-export-components
export { useProfile };
export default Context;