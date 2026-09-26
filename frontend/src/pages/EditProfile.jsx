import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';

const EditProfile = () => {
  const navigate = useNavigate();
  const {
    originalData,
    isLoading,
    isFetching,
    message,
    config,
    fetchProfileData,
    updateProfile,
    resetProfileData,
    initializeRole
  } = useProfile();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    age: '',
    gender: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [calculatedAge, setCalculatedAge] = useState(null);

  // Initialize role and config
  useEffect(() => {
    initializeRole();
  }, [initializeRole]);

  // Calculate age from DOB
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      setCalculatedAge(age);
    } else {
      setCalculatedAge(null);
    }
  }, [formData.dob]);

  // Fetch user details on component mount
  useEffect(() => {
    const loadProfile = async () => {
      const data = await fetchProfileData();
      if (data) {
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          dob: data.dob || '',
          age: data.age || '',
          gender: data.gender || '',
          address: data.address || '',
        });
      }
    };

    loadProfile();
  }, [fetchProfileData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const fields = config?.fields || [];
    const errs = {};

    if (fields.includes('name')) {
      if (!formData.name?.trim()) {
        errs.name = 'Name is required';
      } else if (formData.name.trim().length < 5) {
        errs.name = 'Name must be at least 5 characters';
      }
    }

    if (fields.includes('phone')) {
      if (!formData.phone?.trim()) {
        errs.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone.trim())) {
        errs.phone = 'Phone number must be exactly 10 digits';
      }
    }

    if (fields.includes('dob')) {
      if (!formData.dob) {
        errs.dob = 'Date of birth is required';
      }
    }

    if (fields.includes('gender')) {
      if (!formData.gender) {
        errs.gender = 'Gender is required';
      }
    }

    if (fields.includes('address')) {
      if (!formData.address?.trim()) {
        errs.address = 'Address is required';
      } else if (formData.address.trim().length < 5) {
        errs.address = 'Address must be at least 5 characters';
      }
    }

    if (fields.includes('age')) {
      if (formData.age === '' || formData.age === null || formData.age === undefined) {
        errs.age = 'Age is required';
      } else if (isNaN(Number(formData.age))) {
        errs.age = 'Age must be a number';
      } else if (Number(formData.age) < 18) {
        errs.age = 'Age must be at least 18';
      } else if (Number(formData.age) > 100) {
        errs.age = 'Age must be less than 100';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await updateProfile(formData);
  };

  const handleReset = () => {
    if (originalData) {
      setFormData({
        name: originalData.name || '',
        email: originalData.email || '',
        phone: originalData.phone || '',
        dob: originalData.dob || '',
        age: originalData.age || '',
        gender: originalData.gender || '',
        address: originalData.address || '',
      });
    }
    setErrors({});
    resetProfileData();
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

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-emerald-600 mb-4"></i>
          <p className="text-gray-600">Loading your profile...</p>
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
            <h2 className="text-3xl font-bold text-teal-900">Edit Profile</h2>
            <p className="text-gray-600 mt-2">Update your {config.roleLabel.toLowerCase()} information</p>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 mb-6 rounded-lg ${
                message.includes('Error') || message.includes('Failed')
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : message.includes('No changes')
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Full Name */}
              {config.fields.includes('name') && (
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>
              )}

              {/* Email (Read-only) */}
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-100 cursor-not-allowed"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              {config.fields.includes('phone') && (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600`}
                    placeholder="10-digit phone number"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>
              )}

              {/* Date of Birth (User only) */}
              {config.fields.includes('dob') && (
                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="dob"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.dob ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600`}
                  />
                  {calculatedAge !== null && (
                    <p className="text-emerald-600 text-sm mt-1 font-medium">
                      <i className="fas fa-calendar-check mr-1"></i>
                      Age: {calculatedAge} years
                    </p>
                  )}
                  {errors.dob && (
                    <p className="text-red-500 text-sm mt-1">{errors.dob}</p>
                  )}
                </div>
              )}

              {/* Age (Dietitian only) */}
              {config.fields.includes('age') && (
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.age ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600`}
                    placeholder="Enter your age"
                  />
                  {errors.age && (
                    <p className="text-red-500 text-sm mt-1">{errors.age}</p>
                  )}
                </div>
              )}

              {/* Gender (User only) */}
              {config.fields.includes('gender') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <div className="flex gap-6">
                    {['male', 'female', 'other'].map((val) => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value={val}
                          checked={formData.gender === val}
                          onChange={handleChange}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-600"
                        />
                        <span className="text-gray-700 capitalize">{val}</span>
                      </label>
                    ))}
                  </div>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                  )}
                </div>
              )}

              {/* Address */}
              {config.fields.includes('address') && (
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none`}
                    placeholder="Enter your complete address"
                  ></textarea>
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-emerald-600 text-white font-semibold py-3 rounded-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Updating Profile...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition cursor-pointer"
              >
                <i className="fas fa-undo mr-2"></i>
                Reset
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

          {/* Info Box */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-green-900 mb-2">
              <i className="fas fa-info-circle mr-2"></i>
              Profile Update Information
            </h3>
            <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
              <li>Your email address cannot be changed</li>
              <li>All fields marked with * are required</li>
              <li>Changes will be saved immediately after submission</li>
              <li>Click "Reset" to restore original values</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
