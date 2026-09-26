import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { loginUser, googleSignin, verifyLoginOtp, resendLoginOtp } from '../../services/auth/authService';
import { GoogleLogin } from '@react-oauth/google';

const commonLinkClasses = 'text-[#1E6F5C] hover:text-[#155345] font-medium transition-colors duration-300';

const roleRoutes = {
  user: '/user/home',
  admin: '/admin/home',
  organization: '/organization/home',
  dietitian: '/dietitian/home',
};

const Signin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [orgType, setOrgType] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states (normal React state, no Formik/Yup)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    licenseNumber: '',
    adminKey: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});

  // 2FA step states
  const [currentStep, setCurrentStep] = useState('credentials');
  const [twoFAEmail, setTwoFAEmail] = useState('');
  const [twoFARememberMe, setTwoFARememberMe] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    setRole(searchParams.get('role') || 'user');
    setOrgType(searchParams.get('type') || '');
  }, [searchParams]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Standard validation logic
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    // Role-specific field validation
    if (role === 'dietitian') {
      if (!formData.licenseNumber.trim()) {
        newErrors.licenseNumber = 'License Number is required.';
      } else if (!/^DLN[0-9]{6}$/.test(formData.licenseNumber.trim())) {
        newErrors.licenseNumber = 'License Number format: DLN123456.';
      }
    } else if (role === 'organization') {
      if (orgType === 'employee') {
        if (!formData.licenseNumber.trim()) {
          newErrors.licenseNumber = 'Employee License Number is required.';
        } else if (!/^[A-Z]{3}[0-9]{6}$/.test(formData.licenseNumber.trim())) {
          newErrors.licenseNumber = 'Format: 3 letters + 6 digits (e.g. APO123456).';
        }
      } else {
        if (!formData.licenseNumber.trim()) {
          newErrors.licenseNumber = 'License Number is required.';
        } else if (formData.licenseNumber.trim().length < 5) {
          newErrors.licenseNumber = 'License Number must be at least 5 characters.';
        }
      }
    } else if (role === 'admin') {
      if (!formData.adminKey.trim()) {
        newErrors.adminKey = 'Admin Key is required.';
      } else if (formData.adminKey.trim().length < 5) {
        newErrors.adminKey = 'Admin Key must be at least 5 characters.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit credentials
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      email: formData.email.trim(),
      password: formData.password,
      rememberMe: formData.rememberMe,
      role,
    };

    if (role === 'dietitian') payload.licenseNumber = formData.licenseNumber.trim();
    if (role === 'organization') {
      payload.orgType = orgType;
      payload.licenseNumber = formData.licenseNumber.trim();
    }
    if (role === 'admin') payload.adminKey = formData.adminKey.trim();

    setIsSubmitting(true);
    setMessage('Verifying credentials...');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const res = await loginUser(role, payload);

    if (res.isError) {
      setMessage(`Error: ${res.message}`);
      setIsSubmitting(false);
      return;
    }

    const data = res.data || res;

    // Check if 2FA is required
    if (data.requires2FA || res.requires2FA) {
      const email = data.email || res.email || formData.email.trim();
      setTwoFAEmail(email);
      setTwoFARememberMe(formData.rememberMe);
      setOtp('');
      setOtpError('');
      setMessage('OTP sent to your email! Please check your inbox.');
      setCurrentStep('otp');
      setTimeout(() => setMessage(''), 3000);
    } else if (data.token || res.token) {
      handleLoginSuccess(data, res);
    }

    setIsSubmitting(false);
  };

  // Handle successful login and store tokens
  const handleLoginSuccess = (data, rawRes) => {
    const token = data.token || rawRes.token;
    const resRole = data.role || rawRes.role || role;
    const resOrgType = data.orgType || rawRes.orgType || orgType;
    const storageRole = resRole === 'organization' && resOrgType === 'employee' ? 'employee' : resRole;

    localStorage.setItem(`authToken_${storageRole}`, token);
    localStorage.setItem('role', storageRole);
    const existingUser = JSON.parse(localStorage.getItem(`authUser_${storageRole}`) || '{}');
    const userUpdate = { ...existingUser };
    if (resOrgType) userUpdate.orgType = resOrgType;
    if (data.name || rawRes.name) userUpdate.name = data.name || rawRes.name;
    if (data.email || rawRes.email) userUpdate.email = data.email || rawRes.email;
    if (data.roleId || rawRes.roleId) userUpdate.id = data.roleId || rawRes.roleId;
    localStorage.setItem(`authUser_${storageRole}`, JSON.stringify(userUpdate));

    setMessage('Sign-in successful! Redirecting...');
    setTimeout(() => {
      setMessage('');
      if (role === 'organization' && (orgType === 'employee' || resOrgType === 'employee')) {
        navigate('/employee/home');
      } else {
        navigate(roleRoutes[role]);
      }
    }, 1000);
  };

  // Google sign in for users
  const handleGoogleSuccess = async (credentialResponse) => {
    if (role !== 'user') return;
    const credential = credentialResponse?.credential;
    if (!credential) {
      setMessage('Error: Google sign-in did not return a valid token.');
      return;
    }

    setMessage('Signing in with Google...');
    const res = await googleSignin(credential);
    if (res.isError) {
      setMessage(`Error: ${res.message}`);
      return;
    }
    const data = res.data || res;
    if (data.token || res.token) {
      handleLoginSuccess(data, res);
    } else {
      setMessage('Error: Failed to obtain authentication token.');
    }
  };

  // Submit 2FA OTP
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setOtpError('OTP is required.');
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('OTP must be 6 digits.');
      return;
    }

    setOtpError('');
    setIsSubmitting(true);
    setMessage('Verifying OTP...');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const res = await verifyLoginOtp(role, {
      email: twoFAEmail,
      otp: otp.trim(),
      rememberMe: twoFARememberMe,
      orgType,
    });

    if (res.isError) {
      setMessage(`Error: ${res.message}`);
      setIsSubmitting(false);
      return;
    }

    const data = res.data || res;
    if (data.token || res.token) {
      handleLoginSuccess(data, res);
    } else {
      setMessage('Error: No token received after OTP verification.');
    }
    setIsSubmitting(false);
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setMessage('Resending OTP...');
    const res = await resendLoginOtp(twoFAEmail, role);
    if (res.isError) {
      setMessage('Error: Failed to resend OTP. Please try again.');
      return;
    }
    setMessage('A new OTP has been sent to your email!');
    setTimeout(() => setMessage(''), 3000);
  };

  // If no role selected
  if (!role || role === 'default') {
    return (
      <section className="flex items-center justify-center bg-gray-100 p-4 min-h-150">
        <div className="w-full max-w-lg p-8 mx-auto rounded-3xl shadow-2xl bg-white text-center">
          <h3 className="text-xl text-gray-700 font-semibold mb-4">Please select a role to sign in.</h3>
          <button
            onClick={() => navigate('/role')}
            className="bg-[#28B463] hover:bg-[#1E8449] text-white font-bold py-2 px-4 rounded-md shadow-lg transition-colors cursor-pointer"
          >
            Select a Role
          </button>
        </div>
      </section>
    );
  }

  // Header display text
  const getRoleTitle = () => {
    if (role === 'organization' && orgType === 'employee') return 'EMPLOYEE';
    if (role === 'organization') return 'ORGANIZATION';
    return role.toUpperCase();
  };

  return (
    <section className="flex items-center justify-center bg-gray-100 p-4 min-h-150">
      <div className="w-full max-w-lg p-8 mx-auto rounded-3xl shadow-2xl bg-white relative">
        <button
          onClick={() => {
            if (currentStep === 'otp') {
              setCurrentStep('credentials');
              setMessage('');
              setOtp('');
              setOtpError('');
            } else {
              navigate('/role');
            }
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          title={currentStep === 'otp' ? 'Back' : 'Close'}
        >
          <i className={`fas ${currentStep === 'otp' ? 'fa-arrow-left' : 'fa-times'} text-xl`} />
        </button>

        {currentStep === 'otp' ? (
          <div className="text-center mb-6">
            <i className="fas fa-shield-alt text-4xl text-[#1E6F5C] mb-4" />
            <h2 className="text-3xl font-bold text-[#1E6F5C]">Verify Your Identity</h2>
            <p className="text-gray-600 mt-2">Two-Factor Authentication</p>
          </div>
        ) : (
          <h2 className="text-center text-3xl font-bold text-[#1E6F5C] mb-6">
            LOG IN AS {getRoleTitle()}
          </h2>
        )}

        {message && (
          <div
            className={`p-3 mb-5 text-center text-base font-medium rounded-lg shadow-sm w-full ${
              message.includes('successful') || message.includes('Redirecting') || message.includes('OTP sent') || message.includes('new OTP')
                ? 'text-green-800 bg-green-100 border border-green-300'
                : message.includes('Verifying') || message.includes('Resending') || message.includes('Signing in')
                ? 'text-blue-800 bg-blue-100 border border-blue-300'
                : 'text-red-800 bg-red-100 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        {currentStep === 'otp' ? (
          /* ==================== 2FA OTP FORM ==================== */
          <form onSubmit={handleOTPSubmit} className="space-y-4" noValidate autoComplete="off">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <i className="fas fa-envelope mr-2" />
                OTP sent to: <span className="font-medium text-gray-800">{twoFAEmail}</span>
              </p>
            </div>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                Enter OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (otpError) setOtpError('');
                }}
                autoComplete="one-time-code"
                maxLength={6}
                className={`w-full px-4 py-2 rounded-lg border ${
                  otpError ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#6a994e] h-11 text-center text-lg tracking-widest`}
                placeholder="Enter 6-digit OTP"
                autoFocus
              />
              {otpError && <div className="text-red-500 text-xs mt-1">{otpError}</div>}
            </div>
            <p className="text-sm text-gray-600">Enter the 6-digit code sent to your email to complete sign-in.</p>
            <button
              type="submit"
              className="w-full bg-[#1E6F5C] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" /> Verifying...
                </>
              ) : (
                'Verify & Log In'
              )}
            </button>
            <div className="text-center mt-4 space-y-2">
              <p className="text-sm">
                Didn't receive OTP?{' '}
                <button type="button" onClick={handleResendOTP} className={commonLinkClasses}>
                  Resend OTP
                </button>
              </p>
              <p className="text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('credentials');
                    setMessage('');
                    setOtp('');
                    setOtpError('');
                  }}
                  className={commonLinkClasses}
                >
                  Back to Sign In
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* ==================== CREDENTIALS FORM ==================== */
          <form onSubmit={handleCredentialsSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#6a994e] h-11`}
                placeholder="Enter your email"
                required
              />
              {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#6a994e] h-11`}
                placeholder="Enter your password"
                required
              />
              {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
            </div>

            {/* Role-Specific Fields */}
            {role === 'dietitian' && (
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.licenseNumber ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-[#6a994e] h-11`}
                  placeholder="e.g., DLN123456"
                  required
                />
                {errors.licenseNumber && <div className="text-red-500 text-xs mt-1">{errors.licenseNumber}</div>}
              </div>
            )}

            {role === 'organization' && orgType !== 'employee' && (
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.licenseNumber ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-[#6a994e] h-11`}
                  placeholder="Enter your License Number"
                  required
                />
                {errors.licenseNumber && <div className="text-red-500 text-xs mt-1">{errors.licenseNumber}</div>}
              </div>
            )}

            {role === 'organization' && orgType === 'employee' && (
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Employee License Number
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.licenseNumber ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-[#6a994e] h-11`}
                  placeholder="e.g. APO123456"
                  required
                />
                {errors.licenseNumber && <div className="text-red-500 text-xs mt-1">{errors.licenseNumber}</div>}
              </div>
            )}

            {role === 'admin' && (
              <div>
                <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Key
                </label>
                <input
                  id="adminKey"
                  name="adminKey"
                  type="password"
                  value={formData.adminKey}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.adminKey ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-[#6a994e] h-11`}
                  placeholder="Enter Admin Key"
                  required
                />
                {errors.adminKey && <div className="text-red-500 text-xs mt-1">{errors.adminKey}</div>}
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-[#1E6F5C] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900" htmlFor="rememberMe">
                  Remember Me
                </label>
              </div>
              <Link to={`/forgot-password?role=${role}`} className="text-sm font-medium text-[#1E6F5C] hover:text-[#155345]">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#1E6F5C] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" /> Verifying Credentials...
                </>
              ) : (
                'Continue'
              )}
            </button>

            {/* Google Login for Users */}
            {role === 'user' && (
              <>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or continue with</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setMessage('Error: Google sign-in was cancelled or failed.')}
                    text="signin_with"
                    shape="pill"
                  />
                </div>
              </>
            )}

            <p className="text-center text-sm mt-4">
              Don't have an account?{' '}
              <Link to={`/signup?role=${role}`} className={commonLinkClasses}>
                Sign Up
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
};

export default Signin;