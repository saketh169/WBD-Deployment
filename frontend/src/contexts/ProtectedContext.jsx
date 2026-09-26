import React, { createContext, useEffect, useState } from 'react';
import { isTokenExpired } from '../utils/jwtUtils';

const ProtectedContext = createContext();

export const ProtectedProvider = ({ children, requiredRole }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      let storedToken = localStorage.getItem(`authToken_${requiredRole}`);

      if (!storedToken && requiredRole === 'employee') {
        const orgUser = JSON.parse(localStorage.getItem('authUser_organization') || '{}');
        if (orgUser.orgType === 'employee') {
          const oldToken = localStorage.getItem('authToken_organization');
          if (oldToken) {
            localStorage.setItem('authToken_employee', oldToken);
            localStorage.setItem('authUser_employee', JSON.stringify(orgUser));
            localStorage.removeItem('authToken_organization');
            localStorage.removeItem('authUser_organization');
            storedToken = oldToken;
          }
        }
      }

      if (storedToken && !isTokenExpired(storedToken)) {
        setToken(storedToken);
        setIsAuthenticated(true);
      } else {
        if (storedToken) {
          localStorage.removeItem(`authToken_${requiredRole}`);
          localStorage.removeItem(`authUser_${requiredRole}`);
        }
        setToken(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
    const handleStorageChange = (e) => {
      if (e.key === `authToken_${requiredRole}`) checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [requiredRole]);

  const value = {
    isAuthenticated,
    token,
    loading,
    requiredRole,
    recheckAuth: () => {
      const storedToken = localStorage.getItem(`authToken_${requiredRole}`);
      const valid = storedToken && !isTokenExpired(storedToken);
      setToken(valid ? storedToken : null);
      setIsAuthenticated(!!valid);
    }
  };

  if (loading) {
    return (
      <ProtectedContext.Provider value={value}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-green-600 mb-4"></i>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </ProtectedContext.Provider>
    );
  }

  if (!isAuthenticated) {
    const signinHref = requiredRole === 'employee'
      ? '/signin?role=organization&type=employee'
      : `/signin?role=${requiredRole}`;

    return (
      <ProtectedContext.Provider value={value}>
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center border-l-4 border-red-500 relative">
            <div className="text-6xl mb-4 text-red-500">
              <i className="fas fa-lock" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-3">Not Authenticated</h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access this page. Your session has expired or you haven't logged in yet.
            </p>
            <a
              href={signinHref}
              className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
            >
              Go to Sign In
            </a>
          </div>
        </div>
      </ProtectedContext.Provider>
    );
  }

  return (
    <ProtectedContext.Provider value={value}>
      {children}
    </ProtectedContext.Provider>
  );
};

export default ProtectedContext;
