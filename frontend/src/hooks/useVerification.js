import { useState, useEffect } from 'react';
import { getDocumentStatus } from '../services/misc/miscService';

export const useVerification = (role) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (role !== 'dietitian' && role !== 'organization') {
      setIsLoading(false);
      return;
    }
    const token = localStorage.getItem(`authToken_${role}`);
    if (!token) {
      setIsLoading(false);
      return;
    }

    const check = async () => {
      try {
        const res = await getDocumentStatus(role);
        if (!res?.isError) {
          const payload = res?.data || res;
          const status = String(payload?.verificationStatus?.finalReport || payload?.documentUploadStatus || '').toLowerCase().trim();
          setIsVerified(status === 'verified');
        } else {
          setError('Network error while checking verification');
        }
      } catch (err) {
        setError(err.message || 'Error checking verification');
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [role]);

  return { isVerified, isLoading, error };
};
