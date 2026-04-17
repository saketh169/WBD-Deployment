import React, { createContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuthContext } from '../hooks/useAuthContext';

// Create Verify Context
const VerifyContext = createContext();

/**
 * VerifyProvider Component
 *
 * Provides verification context and handles route protection UI for verified routes
 * Manages both authentication and verification states
 * Shows loading/verification/authentication modals automatically
 *
 * @param {string} requiredRole - The role required for authentication and verification (dietitian, organization)
 * @param {string} redirectTo - Path to redirect to if not verified (default: '/doc-status')
 * @param {ReactNode} children - Child components (route components)
 */
export const VerifyProvider = ({
  children,
  requiredRole,
  redirectTo = '/doc-status'
}) => {
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const { token: authToken, isAuthenticated: authIsAuthenticated, loading: authLoading } = useAuthContext();

  useEffect(() => {
    // Wait for AuthContext to finish loading
    if (authLoading) return;

    const checkVerification = async () => {
      setLoading(true);
      setError(null);

      if (!authIsAuthenticated || !authToken) {
        setLoading(false);
        return;
      }

      // Check verification status
      try {
        // Employees need to check their parent organization's verification status
        const statusEndpoint = requiredRole === 'employee' 
          ? '/api/status/employee-org-status' 
          : `/api/status/${requiredRole}-status`;
        
        const response = await axios.get(statusEndpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data = response.data;
        const finalStatus = data.verificationStatus?.finalReport || 'pending';
        setVerificationStatus(finalStatus);
        setIsVerified(finalStatus === 'verified');
      } catch (err) {
        setError('Network error while checking verification');
        console.error('Verification check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkVerification();
  }, [requiredRole, location.pathname, authToken, authIsAuthenticated, authLoading]);

  const value = {
    isAuthenticated: authIsAuthenticated,
    isVerified,
    verificationStatus,
    token: authToken,
    loading,
    error,
    requiredRole,
    redirectTo,
    // Helper to manually recheck verification (e.g., after status update)
    recheckVerification: () => {
      if (authToken && authIsAuthenticated) {
        // Re-fetch verification status (employees check their org's status)
        const statusEndpoint = requiredRole === 'employee' 
          ? '/api/status/employee-org-status' 
          : `/api/status/${requiredRole}-status`;
        
        axios.get(statusEndpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
          .then(response => {
            const data = response.data;
            const finalStatus = data.verificationStatus?.finalReport || 'pending';
            setVerificationStatus(finalStatus);
            setIsVerified(finalStatus === 'verified');
          })
          .catch(err => {
            console.error('Verification recheck error:', err);
            setError('Failed to recheck verification');
          });
      }
    }
  };

  // Loading State UI
  if (loading) {
    return (
      <VerifyContext.Provider value={value}>
        {/* Backdrop with blur */}
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"></div>

        {/* Loading Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4 text-blue-500">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <h2 className="text-2xl font-bold text-blue-600 mb-3">Verifying Account</h2>
            <p className="text-gray-600">
              Please wait while we check your verification status...
            </p>
          </div>
        </div>
      </VerifyContext.Provider>
    );
  }

  // Not Authenticated UI
  if (!authIsAuthenticated) {
    console.warn(`[VerifyProvider] User not authenticated for role: ${requiredRole}`);

    // Employees sign in through the organization form with orgType=employee
    const signinHref = requiredRole === 'employee'
      ? '/signin?role=organization&type=employee'
      : `/signin?role=${requiredRole}`;

    return (
      <VerifyContext.Provider value={value}>
        {/* Backdrop with blur */}
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"></div>

        {/* Alert Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center border-l-4 border-red-500 relative">
            <div className="text-6xl mb-4 text-red-500">
              <i className="fas fa-lock"></i>
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
      </VerifyContext.Provider>
    );
  }

  // Verification check error UI
  if (error) {
    return (
      <VerifyContext.Provider value={value}>
        {/* Backdrop with blur */}
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"></div>

        {/* Error Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center border-l-4 border-red-500 relative">
            <div className="text-6xl mb-4 text-red-500">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-3">Verification Check Failed</h2>
            <p className="text-gray-600 mb-6">
              Unable to verify your account status. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
            >
              <i className="fas fa-refresh mr-2"></i> Retry
            </button>
          </div>
        </div>
      </VerifyContext.Provider>
    );
  }

  // Not Verified UI - Handle different statuses
  if (!isVerified) {
    // For employees, show organization-related messaging
    const isEmployee = requiredRole === 'employee';
    const roleDisplayName = requiredRole === 'dietitian' ? 'Dietitian' : 'Organization';

    // Rejected status - allow resubmitting documents (not applicable for employees)
    if (verificationStatus === 'rejected') {
      return (
        <VerifyContext.Provider value={value}>
          {/* Backdrop with blur */}
          <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"></div>

          {/* Rejected Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center border-l-4 border-red-500 relative">
              <div className="text-6xl mb-4 text-red-500">
                <i className="fas fa-times-circle"></i>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-3">
                {isEmployee ? 'Organization Verification Rejected' : 'Application Rejected'}
              </h2>
              <p className="text-gray-600 mb-6">
                {isEmployee 
                  ? 'Your organization\'s verification has been rejected. You cannot perform this task until your organization is verified. Please contact your organization administrator.'
                  : `Your ${roleDisplayName.toLowerCase()} application has been rejected. Please review and resubmit your documents.`
                }
              </p>
              {!isEmployee && (
                <a
                  href={`/upload-documents?role=${requiredRole}`}
                  className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
                >
                  <i className="fas fa-upload mr-2"></i> Resubmit Documents
                </a>
              )}
              {isEmployee && (
                <a
                  href="/employee/home"
                  className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
                >
                  <i className="fas fa-home mr-2"></i> Go to Home
                </a>
              )}
            </div>
          </div>
        </VerifyContext.Provider>
      );
    }

    // Pending status - show verification required
    return (
      <VerifyContext.Provider value={value}>
        {/* Backdrop with blur */}
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"></div>

        {/* Verification Required Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center border-l-4 border-yellow-500 relative">
            <div className="text-6xl mb-4 text-yellow-500">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h2 className="text-2xl font-bold text-yellow-600 mb-3">
              {isEmployee ? 'Organization Verification Pending' : 'Verification Required'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isEmployee
                ? 'Your organization\'s verification is still pending. You cannot perform this task until your organization is verified. Please contact your organization administrator.'
                : `Your ${roleDisplayName.toLowerCase()} account needs to be verified before you can access this page. Please complete the verification process.`
              }
            </p>
            {isEmployee ? (
              <a
                href="/employee/home"
                className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
              >
                <i className="fas fa-home mr-2"></i> Go to Home
              </a>
            ) : (
              <a
                href={redirectTo}
                className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-300"
              >
                <i className="fas fa-file-alt mr-2"></i> Check Verification Status
              </a>
            )}
          </div>
        </div>
      </VerifyContext.Provider>
    );
  }

  // Authenticated AND Verified - Render children
  return (
    <VerifyContext.Provider value={value}>
      {children}
    </VerifyContext.Provider>
  );
};

export default VerifyContext;