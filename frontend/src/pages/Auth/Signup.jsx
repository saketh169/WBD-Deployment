import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { signupUser, googleSignup } from '../../services/auth/authService';
import { GoogleLogin } from '@react-oauth/google';

const commonInputClasses =
  'w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6a994e] transition-all duration-300';
const commonButtonClasses =
  'w-full bg-[#1E6F5C] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer';
const errorClasses = 'text-red-500 text-xs mt-1';

const roleRoutes = {
  user: '/user/home',
  admin: '/admin/home',
  organization: '/upload-documents?role=organization',
  dietitian: '/upload-documents?role=dietitian',
};

const decodeGoogleCredential = (credential) => {
  try {
    const tokenParts = credential.split('.');
    if (tokenParts.length < 2) return null;
    const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(paddedBase64));
  } catch {
    return null;
  }
};

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  dob: '',
  gender: '',
  address: '',
  age: '',
  licenseNumber: '',
  organizationType: '',
};

const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');

  // Standard React state for form fields and validation errors
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const roleFromUrl = searchParams.get('role');
    if (roleFromUrl) {
      setRole(roleFromUrl);
      setFormData(initialFormData);
      setErrors({});
      setGoogleCredential('');
      setMessage('');
    }
  }, [searchParams]);

  // Handle standard input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Google sign up success
  const handleGoogleSignupSuccess = (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      setMessage('Error: Google signup did not return a valid token.');
      return;
    }

    const payload = decodeGoogleCredential(credential);
    if (payload?.email) {
      setFormData((prev) => ({
        ...prev,
        email: payload.email,
        name: payload.name || prev.name,
      }));
    }

    setGoogleCredential(credential);
    setMessage('Google account linked. Fill remaining fields and click Get Started.');
  };

  // Standard validation logic (clean, readable JS)
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    const nameLabel = role === 'organization' ? 'Certifying Organization Name' : 'Full Name';
    if (!formData.name.trim()) {
      newErrors.name = `${nameLabel} is required.`;
    } else if (formData.name.trim().length < 5) {
      newErrors.name = `${nameLabel} must be at least 5 characters.`;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email address.';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone Number is required.';
    } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit phone number.';
    }

    // User & Admin specific validation
    if (role === 'user' || role === 'admin') {
      if (!formData.dob) {
        newErrors.dob = 'Date of Birth is required.';
      }
      if (!formData.gender) {
        newErrors.gender = 'Please select your gender.';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required.';
      }
    }

    // Dietitian specific validation
    if (role === 'dietitian') {
      if (!formData.age) {
        newErrors.age = 'Age is required.';
      } else if (Number(formData.age) < 18) {
        newErrors.age = 'Age must be at least 18.';
      }
      if (!formData.licenseNumber.trim()) {
        newErrors.licenseNumber = 'License Number is required.';
      } else if (!/^DLN[0-9]{6}$/.test(formData.licenseNumber.trim())) {
        newErrors.licenseNumber = 'License Number format: DLN123456.';
      }
    }

    // Organization specific validation
    if (role === 'organization') {
      if (!formData.licenseNumber.trim()) {
        newErrors.licenseNumber = 'License Number is required.';
      } else if (!/^OLN[0-9]{6}$/.test(formData.licenseNumber.trim())) {
        newErrors.licenseNumber = 'License Number format: OLN123456.';
      }
      if (!formData.organizationType) {
        newErrors.organizationType = 'Organization Type is required.';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      setMessage('Error: Role not selected for signup.');
      return;
    }

    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      role,
    };

    if (role === 'user' || role === 'admin') {
      payload.dob = formData.dob;
      payload.gender = formData.gender;
      payload.address = formData.address.trim();
    }

    if (role === 'dietitian') {
      payload.age = Number(formData.age);
      payload.licenseNumber = formData.licenseNumber.trim();
    }

    if (role === 'organization') {
      payload.licenseNumber = formData.licenseNumber.trim();
      payload.organizationType = formData.organizationType;
      payload.address = formData.address.trim();
    }

    if (role === 'user' && googleCredential) {
      payload.credential = googleCredential;
    }

    setIsLoading(true);
    setMessage('Validating your details...');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const serviceCall =
      role === 'user' && googleCredential
        ? googleSignup(payload.credential)
        : signupUser(role, payload);

    const res = await serviceCall;

    if (res.isError) {
      setMessage(`Error: ${res.message}`);
      setIsLoading(false);
      return;
    }

    const responseData = res.data || res;
    const token = responseData.token || res.token;

    const redirectMessage = ['organization', 'dietitian'].includes(role)
      ? `Sign-up successful! Welcome! Redirecting to ${role} upload documents ...`
      : `Sign-up successful! Welcome! Redirecting to ${role} home page ...`;
    setMessage(redirectMessage);

    if (token) {
      const targetRole = responseData.role || role;
      localStorage.setItem(`authToken_${targetRole}`, token);
      localStorage.setItem('role', targetRole);
      if (responseData.roleId) {
        const userData = JSON.parse(localStorage.getItem(`authUser_${targetRole}`) || '{}');
        userData.id = responseData.roleId;
        localStorage.setItem(`authUser_${targetRole}`, JSON.stringify(userData));
      }
    }

    setTimeout(() => {
      setMessage('');
      navigate(roleRoutes[role]);
    }, 1500);

    setIsLoading(false);
  };

  const handleLoginClick = () => {
    navigate(`/signin?role=${role}`, { state: { scrollToTop: true } });
  };

  // Reusable input renderer
  const renderInput = (label, name, type = 'text', placeholder = '', extraProps = {}) => (
    <div className="relative">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={formData[name] || ''}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${commonInputClasses} ${errors[name] ? 'border-red-500' : ''}`}
        {...extraProps}
      />
      {errors[name] && <div className={errorClasses}>{errors[name]}</div>}
    </div>
  );

  // If no role selected
  if (!role) {
    return (
      <section className="flex items-center justify-center bg-gray-100 p-2 sm:p-3 min-h-162.5">
        <div className="w-full max-w-7xl p-4 sm:p-5 mx-auto rounded-3xl shadow-2xl bg-white text-center flex flex-col items-center justify-center min-h-37.5">
          <h3 className="text-xl text-gray-700 font-semibold mb-4">Please select a role to sign up.</h3>
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

  return (
    <section className="flex items-center justify-center bg-gray-100 p-2 sm:p-3 min-h-162.5">
      <div className="w-full max-w-7xl p-4 sm:p-5 mx-auto rounded-3xl shadow-2xl bg-white flex flex-col items-center justify-center animate-fade-in relative">
        <button
          onClick={() => navigate('/role')}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors z-10 cursor-pointer"
          title="Back to Role Selection"
        >
          <i className="fas fa-times text-xl" />
        </button>
        <h2 className="text-center text-3xl font-bold text-[#1E6F5C] mb-4">
          SIGN UP AS A {role.toUpperCase() || 'NEW MEMBER'}
        </h2>

        {message && (
          <div
            aria-live="polite"
            className={`p-3 mb-5 text-center text-base font-medium rounded-lg shadow-sm animate-slide-in w-full ${
              message.includes('successful') || message.includes('linked') || message.includes('Google account')
                ? 'text-green-800 bg-green-100 border border-green-300'
                : message.includes('Validating')
                ? 'text-blue-800 bg-blue-100 border border-blue-300'
                : 'text-red-800 bg-red-100 border border-red-300'
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        <div className="mt-6 mb-3 w-full max-w-7xl mx-auto">
          <form
            id={`${role}SignupForm`}
            onSubmit={handleSubmit}
            className="needs-validation grid gap-3 sm:gap-4 lg:grid-cols-2"
            noValidate
          >
            {/* Common Fields */}
            {renderInput(role === 'organization' ? 'Certifying Organization Name' : 'Full Name', 'name', 'text', 'Enter name')}
            {renderInput('Email', 'email', 'email', 'Enter your email')}

            {role === 'dietitian' && renderInput('Age', 'age', 'number', 'Enter your age', { min: 18, max: 120 })}

            {renderInput('Phone Number', 'phone', 'tel', 'Enter 10-digit phone number', { maxLength: 10 })}
            {renderInput('Password', 'password', 'password', 'Create a password')}

            {/* User & Admin: DOB & Gender */}
            {(role === 'user' || role === 'admin') && (
              <>
                {renderInput('Date of Birth', 'dob', 'date')}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <div className="flex items-center space-x-4 mt-2">
                    {['male', 'female', 'other'].map((val) => (
                      <div key={val} className="flex items-center">
                        <input
                          id={`gender-${val}`}
                          className="h-4 w-4 text-[#1E6F5C] border-gray-300 rounded focus:ring-[#1E6F5C]"
                          type="radio"
                          name="gender"
                          value={val}
                          checked={formData.gender === val}
                          onChange={handleChange}
                        />
                        <label htmlFor={`gender-${val}`} className="ml-2 block text-sm text-gray-900 capitalize cursor-pointer">
                          {val}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.gender && <div className={errorClasses}>{errors.gender}</div>}
                </div>
              </>
            )}

            {/* Dietitian: License Number */}
            {role === 'dietitian' &&
              renderInput('License Number', 'licenseNumber', 'text', 'e.g., DLN123456', { maxLength: 9 })}

            {/* Organization: License Number & Type */}
            {role === 'organization' && (
              <>
                {renderInput('License Number', 'licenseNumber', 'text', 'e.g., OLN123456', { maxLength: 9 })}
                <div className="relative">
                  <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="organizationType"
                    name="organizationType"
                    value={formData.organizationType}
                    onChange={handleChange}
                    className={`${commonInputClasses} ${errors.organizationType ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select organization type</option>
                    <option value="private">Private</option>
                    <option value="ppo">PPO (Preferred Provider Organization)</option>
                    <option value="freelancing">Freelancing</option>
                    <option value="ngo">NGO (Non-Governmental Organization)</option>
                    <option value="government">Government</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.organizationType && <div className={errorClasses}>{errors.organizationType}</div>}
                </div>
              </>
            )}

            {/* Address field for User, Admin, Organization */}
            {(role === 'user' || role === 'admin' || role === 'organization') && (
              <div className="relative lg:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows="3"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  className={`${commonInputClasses} ${errors.address ? 'border-red-500' : ''}`}
                />
                {errors.address && <div className={errorClasses}>{errors.address}</div>}
              </div>
            )}

            {/* Google Signup for Users */}
            {role === 'user' && (
              <div className="lg:col-span-2">
                <div className="relative py-1 mb-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or use Google</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSignupSuccess}
                    onError={() => setMessage('Error: Google signup was cancelled or failed.')}
                    text="signup_with"
                    shape="pill"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="lg:col-span-2">
              <button type="submit" className={commonButtonClasses} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2" /> Validating...
                  </>
                ) : (
                  'Get Started'
                )}
              </button>
            </div>

            {/* Login Link */}
            <div className="lg:col-span-2 text-center mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="text-[#1E6F5C] font-medium hover:underline focus:outline-none cursor-pointer"
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Signup;