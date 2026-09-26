import React, { createContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { getDocumentStatus } from '../services/misc/miscService';

const VerifyContext = createContext();

const StatusModal = ({ icon, iconColor, borderColor, title, titleColor, message, actionBtn }) => (
  <>
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg shadow-2xl p-8 max-w-md text-center border-l-4 ${borderColor} relative`}>
        <div className={`text-6xl mb-4 ${iconColor}`}>
          <i className={icon} />
        </div>
        <h2 className={`text-2xl font-bold ${titleColor} mb-3`}>{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        {actionBtn}
      </div>
    </div>
  </>
);

export const VerifyProvider = ({ children, requiredRole, redirectTo = '/doc-status' }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const { token: authToken, isAuthenticated: authIsAuthenticated, loading: authLoading } = useAuthContext();

  useEffect(() => {
    if (authLoading) return;

    const checkVerification = async () => {
      setLoading(true);
      setError(null);

      if (!authIsAuthenticated || !authToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await getDocumentStatus(requiredRole);
        if (res?.isError) {
          setError(res.message || 'Network error while checking verification');
        } else {
          const payload = res?.data || res;
          const statusVal = payload?.verificationStatus?.finalReport || payload?.documentUploadStatus || payload?.finalReportStatus || 'pending';
          const normalizedStatus = String(statusVal).toLowerCase().trim();
          setVerificationStatus(normalizedStatus);
          setIsVerified(normalizedStatus === 'verified');
        }
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
    recheckVerification: async () => {
      if (authToken && authIsAuthenticated) {
        try {
          const res = await getDocumentStatus(requiredRole);
          if (!res?.isError) {
            const payload = res?.data || res;
            const statusVal = payload?.verificationStatus?.finalReport || payload?.documentUploadStatus || payload?.finalReportStatus || 'pending';
            const normalizedStatus = String(statusVal).toLowerCase().trim();
            setVerificationStatus(normalizedStatus);
            setIsVerified(normalizedStatus === 'verified');
          } else {
            setError(res?.message || 'Failed to recheck verification');
          }
        } catch (err) {
          console.error('Verification recheck error:', err);
          setError('Failed to recheck verification');
        }
      }
    }
  };

  if (loading) {
    return (
      <VerifyContext.Provider value={value}>
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4 text-blue-500">
              <i className="fas fa-spinner fa-spin" />
            </div>
            <h2 className="text-2xl font-bold text-blue-600 mb-3">Verifying Account</h2>
            <p className="text-gray-600">Please wait while we check your verification status...</p>
          </div>
        </div>
      </VerifyContext.Provider>
    );
  }

  if (!authIsAuthenticated) {
    const signinHref = requiredRole === 'employee'
      ? '/signin?role=organization&type=employee'
      : `/signin?role=${requiredRole}`;

    return (
      <VerifyContext.Provider value={value}>
        <StatusModal
          icon="fas fa-lock"
          iconColor="text-red-500"
          borderColor="border-red-500"
          title="Not Authenticated"
          titleColor="text-red-600"
          message="You need to sign in to access this page. Your session has expired or you haven't logged in yet."
          actionBtn={
            <a href={signinHref} className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Go to Sign In
            </a>
          }
        />
      </VerifyContext.Provider>
    );
  }

  if (error) {
    return (
      <VerifyContext.Provider value={value}>
        <StatusModal
          icon="fas fa-exclamation-triangle"
          iconColor="text-red-500"
          borderColor="border-red-500"
          title="Verification Check Failed"
          titleColor="text-red-600"
          message="Unable to verify your account status. Please try refreshing the page."
          actionBtn={
            <button onClick={() => window.location.reload()} className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer">
              <i className="fas fa-sync-alt mr-2" /> Retry
            </button>
          }
        />
      </VerifyContext.Provider>
    );
  }

  if (!isVerified) {
    const isEmployee = requiredRole === 'employee';
    const roleDisplayName = requiredRole === 'dietitian' ? 'Dietitian' : 'Organization';

    if (verificationStatus === 'rejected') {
      return (
        <VerifyContext.Provider value={value}>
          <StatusModal
            icon="fas fa-times-circle"
            iconColor="text-red-500"
            borderColor="border-red-500"
            title={isEmployee ? 'Organization Verification Rejected' : 'Application Rejected'}
            titleColor="text-red-600"
            message={
              isEmployee
                ? "Your organization's verification has been rejected. You cannot perform this task until your organization is verified."
                : `Your ${roleDisplayName.toLowerCase()} application has been rejected. Please review and resubmit your documents.`
            }
            actionBtn={
              isEmployee ? (
                <a href="/employee/home" className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                  <i className="fas fa-home mr-2" /> Go to Home
                </a>
              ) : (
                <a href={`/upload-documents?role=${requiredRole}`} className="inline-block bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                  <i className="fas fa-upload mr-2" /> Resubmit Documents
                </a>
              )
            }
          />
        </VerifyContext.Provider>
      );
    }

    return (
      <VerifyContext.Provider value={value}>
        <StatusModal
          icon="fas fa-shield-alt"
          iconColor="text-yellow-500"
          borderColor="border-yellow-500"
          title={isEmployee ? 'Organization Verification Pending' : 'Verification Required'}
          titleColor="text-yellow-600"
          message={
            isEmployee
              ? "Your organization's verification is still pending. You cannot perform this task until your organization is verified."
              : `Your ${roleDisplayName.toLowerCase()} account needs to be verified before you can access this page.`
          }
          actionBtn={
            isEmployee ? (
              <a href="/employee/home" className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                <i className="fas fa-home mr-2" /> Go to Home
              </a>
            ) : (
              <a href={redirectTo} className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                <i className="fas fa-file-alt mr-2" /> Check Verification Status
              </a>
            )
          }
        />
      </VerifyContext.Provider>
    );
  }

  return (
    <VerifyContext.Provider value={value}>
      {children}
    </VerifyContext.Provider>
  );
};

export default VerifyContext;