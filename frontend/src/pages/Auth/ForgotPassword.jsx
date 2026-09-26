import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../../services/auth/authService';

const primaryGreen = '#1E6F5C';
const lightGreen = '#6a994e';
const commonLinkClasses = 'text-[#1E6F5C] hover:text-[#155345] font-medium transition-colors duration-300';
const commonInputClasses = `w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[${lightGreen}] transition-all duration-300`;
const errorClasses = 'text-red-500 text-xs mt-1';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [currentStep, setCurrentStep] = useState('email'); // 'email' or 'reset'
  const [userRole, setUserRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email step state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Reset step state
  const [resetData, setResetData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [resetErrors, setResetErrors] = useState({});

  useEffect(() => {
    const roleFromUrl = searchParams.get('role') || 'user';
    setUserRole(roleFromUrl);
  }, [searchParams]);

  // Handle email step submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Invalid email address.');
      return;
    }

    setEmailError('');
    setIsSubmitting(true);
    setMessage('Sending OTP to your email...');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const res = await forgotPassword(userRole, email.trim());

    if (res.isError) {
      setMessage(`Error: ${res.message}`);
      setIsSubmitting(false);
      return;
    }

    setMessage('OTP sent successfully! Please check your email.');
    setCurrentStep('reset');
    setTimeout(() => setMessage(''), 2500);
    setIsSubmitting(false);
  };

  // Handle reset step input changes
  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
    if (resetErrors[name]) {
      setResetErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validate reset form
  const validateResetForm = () => {
    const errs = {};
    if (!resetData.otp.trim()) {
      errs.otp = 'OTP is required.';
    } else if (!/^\d{6}$/.test(resetData.otp.trim())) {
      errs.otp = 'OTP must be 6 digits.';
    }

    if (!resetData.newPassword) {
      errs.newPassword = 'Password is required.';
    } else if (resetData.newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters.';
    }

    if (!resetData.confirmPassword) {
      errs.confirmPassword = 'Confirm password is required.';
    } else if (resetData.confirmPassword !== resetData.newPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setResetErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle reset step submit
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!validateResetForm()) return;

    setIsSubmitting(true);
    setMessage('Resetting your password...');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const res = await resetPassword(userRole, {
      email: email.trim(),
      otp: resetData.otp.trim(),
      newPassword: resetData.newPassword,
    });

    if (res.isError) {
      setMessage(`Error: ${res.message}`);
      setIsSubmitting(false);
      return;
    }

    setMessage('Password reset successfully! Redirecting to sign in...');
    setTimeout(() => {
      navigate(`/signin?role=${userRole}`);
    }, 1500);
    setIsSubmitting(false);
  };

  return (
    <section className="flex items-center justify-center bg-gray-100 p-4 min-h-150">
      <div className="w-full max-w-[40%] p-8 mx-auto rounded-3xl shadow-2xl bg-white animate-fade-in relative">
        <button
          onClick={() => navigate(`/signin?role=${userRole}`)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          title="Back to Sign In"
        >
          <i className="fas fa-times text-xl" />
        </button>

        <div className="text-center mb-6">
          <i className={`fas ${currentStep === 'email' ? 'fa-key' : 'fa-lock'} text-4xl text-[#1E6F5C] mb-4`} />
          <h2 className="text-3xl font-bold text-[#1E6F5C]">
            {currentStep === 'email' ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p className="text-gray-600 mt-2">
            {currentStep === 'email'
              ? `Reset your password for ${userRole.charAt(0).toUpperCase() + userRole.slice(1)} account`
              : 'Enter the OTP sent to your email'}
          </p>
        </div>

        {message && (
          <div
            aria-live="polite"
            className={`p-3 mb-5 text-center text-base font-medium rounded-lg shadow-sm animate-slide-in w-full ${
              message.includes('successfully') || message.includes('sent') || message.includes('Redirecting')
                ? 'text-green-800 bg-green-100 border border-green-300'
                : message.includes('Sending') || message.includes('Resetting')
                ? 'text-blue-800 bg-blue-100 border border-blue-300'
                : 'text-red-800 bg-red-100 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        {currentStep === 'email' ? (
          /* ==================== STEP 1: ENTER EMAIL ==================== */
          <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
            <div className="relative">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                className={`${commonInputClasses} ${emailError ? 'border-red-500' : ''} h-11`}
                placeholder="Enter your registered email address"
                required
              />
              {emailError && <div className={errorClasses}>{emailError}</div>}
            </div>

            <div className="text-sm text-gray-600 mt-2">
              <p>Enter your registered email address and we'll send you an OTP to reset your password.</p>
            </div>

            <button
              type="submit"
              className={`w-full bg-[${primaryGreen}] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" /> Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm">
                Remember your password?{' '}
                <Link to={`/signin?role=${userRole}`} className={commonLinkClasses}>
                  Back to Sign In
                </Link>
              </p>
            </div>
          </form>
        ) : (
          /* ==================== STEP 2: RESET PASSWORD ==================== */
          <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                <i className="fas fa-envelope mr-2" />
                OTP sent to: <span className="font-medium text-gray-800">{email}</span>
              </p>
            </div>

            {/* OTP */}
            <div className="relative">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                OTP Code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                value={resetData.otp}
                onChange={handleResetChange}
                autoComplete="one-time-code"
                maxLength={6}
                className={`${commonInputClasses} ${resetErrors.otp ? 'border-red-500' : ''} h-11 text-center text-lg tracking-widest`}
                placeholder="Enter 6-digit OTP"
                required
              />
              {resetErrors.otp && <div className={errorClasses}>{resetErrors.otp}</div>}
            </div>

            {/* New Password */}
            <div className="relative">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={resetData.newPassword}
                onChange={handleResetChange}
                className={`${commonInputClasses} ${resetErrors.newPassword ? 'border-red-500' : ''} h-11`}
                placeholder="Enter your new password"
                required
              />
              {resetErrors.newPassword && <div className={errorClasses}>{resetErrors.newPassword}</div>}
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={resetData.confirmPassword}
                onChange={handleResetChange}
                className={`${commonInputClasses} ${resetErrors.confirmPassword ? 'border-red-500' : ''} h-11`}
                placeholder="Confirm your new password"
                required
              />
              {resetErrors.confirmPassword && <div className={errorClasses}>{resetErrors.confirmPassword}</div>}
            </div>

            <div className="text-sm text-gray-600 mt-2">
              <p>Password must be at least 6 characters long.</p>
            </div>

            <button
              type="submit"
              className={`w-full bg-[${primaryGreen}] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" /> Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('email');
                    setMessage('');
                  }}
                  className={commonLinkClasses}
                >
                  Back to Email Step
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default ForgotPassword;