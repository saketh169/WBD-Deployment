// Role-specific configuration
export const roleConfig = {
  user: {
    tokenKey: 'authToken_user',
    signinPath: '/signin?role=user',
    dashboardPath: '/user/profile',
    roleLabel: 'User',
    apiEndpoint: '/api/getuserdetails',
    fields: ['name', 'phone', 'dob', 'gender', 'address']
  },
  dietitian: {
    tokenKey: 'authToken_dietitian',
    signinPath: '/signin?role=dietitian',
    dashboardPath: '/dietitian/profile',
    roleLabel: 'Dietitian',
    apiEndpoint: '/api/getdietitiandetails',
    fields: ['name', 'phone', 'age']
  },
  organization: {
    tokenKey: 'authToken_organization',
    signinPath: '/signin?role=organization',
    dashboardPath: '/organization/profile',
    roleLabel: 'Organization',
    apiEndpoint: '/api/getorganizationdetails',
    fields: ['name', 'phone', 'address']
  },
  admin: {
    tokenKey: 'authToken_admin',
    signinPath: '/signin?role=admin',
    dashboardPath: '/admin/profile',
    roleLabel: 'Admin',
    apiEndpoint: '/api/getadmindetails',
    fields: ['name', 'phone']
  },
};

import React, { useContext, createContext } from 'react';

// Create Profile Context
export const ProfileContext = createContext();

// Custom hook to use Profile Context (exported from non-component file)
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

