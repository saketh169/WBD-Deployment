import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDietitianProfile, setupDietitianProfile } from '../../services/dietitian/dietitianService';
import { useAuthContext } from '../../hooks/useAuthContext';
import ProfessionalDetailsStep from './ProfessionalDetailsStep';

const initialFormData = {
  name: '',
  email: '',
  age: '',
  phone: '',
  specializationDomain: '',
  specialization: '',
  experience: '',
  fees: '',
  languages: '',
  location: '',
  onlineConsultation: false,
  offlineConsultation: false,
  about: '',
  education: '',
  title: '',
  description: '',
  specialties: '',
  infoEducation: '',
  expertise: '',
  infoLanguages: '',
  workingDays: '',
  workingHoursStart: '',
  workingHoursEnd: '',
  linkedin: '',
  twitter: '',
};

const DietitianSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  // Dynamic array fields for Step 2
  const [certifications, setCertifications] = useState([{ name: '', year: '', issuer: '' }]);
  const [awards, setAwards] = useState([{ name: '', year: '', description: '' }]);
  const [publications, setPublications] = useState([{ title: '', year: '', link: '' }]);
  const [consultationTypes, setConsultationTypes] = useState([{ type: '', duration: '', fee: '' }]);

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('authToken_dietitian');
        const userId = user?.id;
        if (!token || !userId) {
          return;
        }

        const res = await getDietitianProfile(userId);
        if (!res.isError && (res.success || res.data)) {
          setUserProfile(res.data?.data || res.data);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Update form with fetched user data and auth context data
  useEffect(() => {
    setFormData({
      name: user?.name || userProfile?.name || '',
      email: user?.email || userProfile?.email || '',
      phone: user?.phone || userProfile?.phone || '',
      age: user?.age || userProfile?.age || '',
      specializationDomain: userProfile?.specializationDomain || '',
      specialization: Array.isArray(userProfile?.specialization) ? userProfile.specialization.join(', ') : '',
      experience: userProfile?.experience || '',
      fees: userProfile?.fees || '',
      languages: Array.isArray(userProfile?.languages) ? userProfile.languages.join(', ') : '',
      location: userProfile?.location || '',
      onlineConsultation: userProfile?.online || false,
      offlineConsultation: userProfile?.offline || false,
      about: userProfile?.about || '',
      education: Array.isArray(userProfile?.education) ? userProfile.education.join(', ') : '',
      title: userProfile?.title || '',
      description: userProfile?.description || '',
      specialties: Array.isArray(userProfile?.specialties) ? userProfile.specialties.join(', ') : '',
      infoEducation: Array.isArray(userProfile?.education) ? userProfile.education.join(', ') : '',
      expertise: Array.isArray(userProfile?.expertise) ? userProfile.expertise.join(', ') : '',
      infoLanguages: Array.isArray(userProfile?.languages) ? userProfile.languages.join(', ') : '',
      workingDays: userProfile?.availability?.workingDays?.join(', ') || '',
      workingHoursStart: userProfile?.availability?.workingHours?.start || '',
      workingHoursEnd: userProfile?.availability?.workingHours?.end || '',
      linkedin: userProfile?.socialMedia?.linkedin || '',
      twitter: userProfile?.socialMedia?.twitter || '',
    });

    if (userProfile?.certifications?.length) setCertifications(userProfile.certifications);
    if (userProfile?.awards?.length) setAwards(userProfile.awards);
    if (userProfile?.publications?.length) setPublications(userProfile.publications);
    if (userProfile?.consultationTypes?.length) setConsultationTypes(userProfile.consultationTypes);
  }, [user, userProfile]);

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

  const validateStep1 = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Name is required';
    if (!formData.age) errs.age = 'Age is required';
    else if (Number(formData.age) < 18) errs.age = 'Must be at least 18';

    if (!formData.specialization?.trim()) errs.specialization = 'Specializations are required';
    if (formData.experience === '' || formData.experience === null) errs.experience = 'Experience is required';
    if (formData.fees === '' || formData.fees === null) errs.fees = 'Fees are required';
    if (!formData.languages?.trim()) errs.languages = 'Languages are required';
    if (!formData.location?.trim()) errs.location = 'Location is required';
    if (!formData.education?.trim()) errs.education = 'Education is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.title?.trim()) errs.title = 'Title is required';
    if (!formData.description?.trim()) errs.description = 'Description is required';
    if (!formData.specialties?.trim()) errs.specialties = 'Specialties are required';
    if (!formData.infoEducation?.trim()) errs.infoEducation = 'Education is required';
    if (!formData.expertise?.trim()) errs.expertise = 'Expertise is required';
    if (!formData.infoLanguages?.trim()) errs.infoLanguages = 'Languages are required';
    if (!formData.workingDays?.trim()) errs.workingDays = 'Working days are required';
    if (!formData.workingHoursStart?.trim()) errs.workingHoursStart = 'Start time is required';
    if (!formData.workingHoursEnd?.trim()) errs.workingHoursEnd = 'End time is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
      return;
    }

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken_dietitian');
      if (!token) {
        setError('Authentication token not found. Please sign in.');
        return;
      }

      const userId = user?.id;
      if (!userId) {
        setError('User ID not found. Please sign in again.');
        return;
      }

      const processedData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        age: parseInt(formData.age),
        specialization: formData.specialization
          ? formData.specialization.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        experience: parseInt(formData.experience) || 0,
        fees: parseInt(formData.fees) || 0,
        languages: formData.languages
          ? formData.languages.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        location: formData.location?.trim(),
        online: formData.onlineConsultation || false,
        offline: formData.offlineConsultation || false,
        education: formData.education
          ? formData.education.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        about: formData.about?.trim(),
        title: formData.title?.trim(),
        description: formData.description?.trim(),
        specialties: formData.specialties
          ? formData.specialties.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        expertise: formData.expertise
          ? formData.expertise.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        certifications: certifications.filter((cert) => cert.name?.trim() && cert.year && cert.issuer?.trim()),
        awards: awards.filter((award) => award.name?.trim() && award.year && award.description?.trim()),
        publications: publications.filter((pub) => pub.title?.trim() && pub.year && pub.link?.trim()),
        consultationTypes: consultationTypes.filter((ct) => ct.type?.trim() && ct.duration && ct.fee),
        availability: {
          workingDays: formData.workingDays
            ? formData.workingDays.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          workingHours: {
            start: formData.workingHoursStart?.trim(),
            end: formData.workingHoursEnd?.trim(),
          },
        },
        socialMedia: {
          linkedin: formData.linkedin?.trim(),
          twitter: formData.twitter?.trim(),
        },
      };

      const res = await setupDietitianProfile(userId, processedData);

      if (!res.isError && (res.success || res.data)) {
        alert('Profile setup completed successfully! Welcome to your dashboard.');
        navigate('/dietitian/profile');
      } else {
        setError(res.message || 'Profile update failed');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || 'An error occurred during profile setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#27AE60] mb-2">
            <i className="fas fa-user-md mr-3"></i>Dietitian Profile Setup
          </h1>
          <p className="text-gray-600">Step {currentStep} of 2 - Complete your professional profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            <div className={`flex-1 h-2 rounded ${currentStep >= 1 ? 'bg-[#27AE60]' : 'bg-gray-300'}`}></div>
            <div className={`flex-1 h-2 rounded ${currentStep >= 2 ? 'bg-[#27AE60]' : 'bg-gray-300'}`}></div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-xl p-12" noValidate>
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <i className="fas fa-exclamation-triangle mr-2"></i>{error}
            </div>
          )}

          {/* ========== STEP 1: DIETITIAN DETAILS ========== */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-8 pb-4 border-b-3 border-[#27AE60]">
                <i className="fas fa-id-card mr-3 text-[#27AE60]"></i>Dietitian Details
              </h2>

              {/* Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${errors.name ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                    placeholder="e.g., John Doe"
                  />
                  {errors.name && <span className="text-red-500 text-sm mt-1">{errors.name}</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email * 
                    <span className="text-xs text-gray-500 ml-2">(From signup - read only)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-gray-100 cursor-not-allowed transition-all"
                    placeholder="e.g., john@example.com"
                    readOnly
                  />
                </div>
              </div>

              {/* Age & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Age * 
                    <span className="text-xs text-gray-500 ml-2">(From signup)</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${errors.age ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                    placeholder="e.g., 30"
                  />
                  {errors.age && <span className="text-red-500 text-sm mt-1">{errors.age}</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number * 
                    <span className="text-xs text-gray-500 ml-2">(From signup - read only)</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-gray-100 cursor-not-allowed transition-all"
                    placeholder="e.g., 9876543210"
                    readOnly
                  />
                </div>
              </div>

              {/* Specializations */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Specializations (comma-separated) *</label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${errors.specialization ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                  placeholder="e.g., Diabetes, Weight Loss"
                />
                {errors.specialization && <span className="text-red-500 text-sm mt-1">{errors.specialization}</span>}
              </div>

              {/* Experience & Fees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Experience (years) *</label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${errors.experience ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                    placeholder="e.g., 5"
                    min="0"
                  />
                  {errors.experience && <span className="text-red-500 text-sm mt-1">{errors.experience}</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Consultation Fees *</label>
                  <input
                    type="number"
                    name="fees"
                    value={formData.fees}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${errors.fees ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                    placeholder="e.g., 100"
                    min="0"
                  />
                  {errors.fees && <span className="text-red-500 text-sm mt-1">{errors.fees}</span>}
                </div>
              </div>

              {/* Languages & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Languages (comma-separated) *</label>
                  <input
                    type="text"
                    name="languages"
                    value={formData.languages}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${errors.languages ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                    placeholder="e.g., English, Spanish"
                  />
                  {errors.languages && <span className="text-red-500 text-sm mt-1">{errors.languages}</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${errors.location ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                    placeholder="e.g., New York"
                  />
                  {errors.location && <span className="text-red-500 text-sm mt-1">{errors.location}</span>}
                </div>
              </div>

              {/* Consultation Mode */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-4">Consultation Mode</label>
                <div className="flex gap-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="onlineConsultation"
                      checked={formData.onlineConsultation}
                      onChange={handleChange}
                      className="w-5 h-5 text-[#27AE60]"
                    />
                    <span className="text-gray-700">Online</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="offlineConsultation"
                      checked={formData.offlineConsultation}
                      onChange={handleChange}
                      className="w-5 h-5 text-[#27AE60]"
                    />
                    <span className="text-gray-700">Offline</span>
                  </label>
                </div>
              </div>

              {/* Education */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Education (comma-separated) *</label>
                <input
                  type="text"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${errors.education ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
                  placeholder="e.g., BS Nutrition, MS Dietetics"
                />
                {errors.education && <span className="text-red-500 text-sm mt-1">{errors.education}</span>}
              </div>

              {/* About */}
              <div className="mb-10">
                <label className="block text-sm font-semibold text-gray-700 mb-2">About You</label>
                <textarea
                  name="about"
                  value={formData.about}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-[#27AE60] transition-all"
                  placeholder="Brief description about yourself"
                />
              </div>

              {/* Step 1 Buttons */}
              <div className="flex gap-4 justify-end pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-8 py-3 rounded-lg border-2 border-gray-400 text-gray-700 font-bold hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 rounded-lg bg-[#27AE60] text-white font-bold hover:bg-[#1e8449] transition-all disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ========== STEP 2: PROFESSIONAL DETAILS ========== */}
          {currentStep === 2 && (
            <ProfessionalDetailsStep
              formData={formData}
              errors={errors}
              handleChange={handleChange}
              certifications={certifications}
              setCertifications={setCertifications}
              awards={awards}
              setAwards={setAwards}
              publications={publications}
              setPublications={setPublications}
              consultationTypes={consultationTypes}
              setConsultationTypes={setConsultationTypes}
              isSubmitting={isLoading}
              isLoading={isLoading}
              setCurrentStep={setCurrentStep}
            />
          )}
        </form>
      </div>
    </div>
  );
};

export default DietitianSetup;
