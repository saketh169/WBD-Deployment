import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProfileByRole, updateProfile as apiUpdateProfile, changePassword as apiChangePassword } from '../services/profile/profileService';
import { useAuthContext } from '../hooks/useAuthContext';

export const roleConfig = {
  user: {
    tokenKey: 'authToken_user',
    signinPath: '/signin?role=user',
    dashboardPath: '/user/profile',
    roleLabel: 'User',
    fields: ['name', 'phone', 'dob', 'gender', 'address']
  },
  dietitian: {
    tokenKey: 'authToken_dietitian',
    signinPath: '/signin?role=dietitian',
    dashboardPath: '/dietitian/profile',
    roleLabel: 'Dietitian',
    fields: ['name', 'phone', 'age']
  },
  organization: {
    tokenKey: 'authToken_organization',
    signinPath: '/signin?role=organization',
    dashboardPath: '/organization/profile',
    roleLabel: 'Organization',
    fields: ['name', 'phone', 'address']
  },
  admin: {
    tokenKey: 'authToken_admin',
    signinPath: '/signin?role=admin',
    dashboardPath: '/admin/profile',
    roleLabel: 'Admin',
    fields: ['name', 'phone']
  },
};

export const ProfileContext = createContext();

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

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

  const detectRole = useCallback(() => {
    if (authRole) return authRole;
    const path = location.pathname.toLowerCase();
    if (path.startsWith('/dietitian')) return 'dietitian';
    if (path.startsWith('/organization') || path.startsWith('/org')) return 'organization';
    if (path.startsWith('/employee')) return 'employee';
    if (path.startsWith('/admin')) return 'admin';
    return 'user';
  }, [authRole, location.pathname]);

  const initializeRole = useCallback(() => {
    const role = detectRole();
    setCurrentRole(role);
    const cfg = roleConfig[role] || roleConfig.user;
    setConfig(cfg);
    return { role, config: cfg };
  }, [detectRole]);

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

      const res = await getProfileByRole(currentRole || roleConfiguration.role);
      const resData = res?.data || res;

      if (!res?.isError && (res?.success || resData?.email || resData?.name)) {
        const userData = {};
        roleConfiguration.fields.forEach((field) => {
          if (field === 'dob' && resData[field]) {
            userData[field] = resData[field].split('T')[0];
          } else {
            userData[field] = resData[field] || '';
          }
        });
        userData.email = resData.email || '';

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
  }, [initializeRole, navigate, currentRole]);

  const updateProfile = useCallback(async (data) => {
    setMessage('');
    setIsLoading(true);
    const { config: roleConfiguration } = initializeRole();

    try {
      const hasChanges = roleConfiguration.fields.some((key) => data[key] !== originalData[key]);
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

      const updatePayload = {};
      roleConfiguration.fields.forEach((key) => {
        if (data[key] !== originalData[key]) {
          updatePayload[key] = data[key];
        }
      });

      const res = await apiUpdateProfile(updatePayload);
      if (!res?.isError && (res?.success || res?.data)) {
        setMessage('Profile updated successfully! Redirecting to dashboard...');
        setProfileData(data);
        setOriginalData(data);

        const currentAuthUser = localStorage.getItem(`authUser_${currentRole}`);
        if (currentAuthUser) {
          const authUserData = JSON.parse(currentAuthUser);
          const updatedAuthUser = { ...authUserData, ...data };
          if (currentRole === 'organization' && data.name) {
            updatedAuthUser.org_name = data.name;
          }
          localStorage.setItem(`authUser_${currentRole}`, JSON.stringify(updatedAuthUser));
        }

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

      const res = await apiChangePassword({ oldPassword, newPassword });
      if (!res?.isError && (res?.success || res?.data)) {
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

  const resetProfileData = useCallback(() => {
    setProfileData(originalData);
    setMessage('');
  }, [originalData]);

  const clearMessage = useCallback(() => setMessage(''), []);

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
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export default ProfileContext;