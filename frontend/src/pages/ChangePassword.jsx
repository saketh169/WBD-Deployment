import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';

const ChangePassword = () => {
  const navigate = useNavigate();
  const {
    isLoading,
    message,
    config,
    changePassword,
    initializeRole
  } = useProfile();

  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize role and config
  useEffect(() => {
    initializeRole();
  }, [initializeRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.oldPassword) {
      errs.oldPassword = 'Current password is required.';
    } else if (formData.oldPassword.length < 6) {
      errs.oldPassword = 'Password must be at least 6 characters.';
    }

    if (!formData.newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (formData.newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters.';
    } else if (formData.newPassword.length > 20) {
      errs.newPassword = 'Password must not exceed 20 characters.';
    }

    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.';
    } else if (formData.confirmPassword !== formData.newPassword) {
      errs.confirmPassword = 'Passwords must match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await changePassword(formData.oldPassword, formData.newPassword);
    if (result.success) {
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-emerald-600 mb-4"></i>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-[70%] mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-emerald-600">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(config.dashboardPath)}
              className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition mb-4 cursor-pointer"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Dashboard</span>
            </button>
            <h2 className="text-3xl font-bold text-teal-900">Change Password</h2>
            <p className="text-gray-600 mt-2">Update your {config.roleLabel} account password</p>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 mb-6 rounded-lg ${
                message.includes('Error')
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            {/* Current Password */}
            <div>
              <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  id="oldPassword"
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.oldPassword ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-12`}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <i className={`fas ${showOldPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {errors.oldPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.oldPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.newPassword ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-12`}
                  placeholder="Enter new password (min. 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-12`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-emerald-600 text-white font-semibold py-3 rounded-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock mr-2"></i>
                    Change Password
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(config.dashboardPath)}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Security Tips */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-green-900 mb-2">
              <i className="fas fa-shield-alt mr-2"></i>
              Password Security Tips
            </h3>
            <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
              <li>Use a combination of letters, numbers, and special characters</li>
              <li>Avoid using personal information in your password</li>
              <li>Don't reuse passwords from other accounts</li>
              <li>Change your password regularly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
