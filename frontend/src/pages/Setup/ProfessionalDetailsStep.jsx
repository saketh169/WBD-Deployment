import React from 'react';

const ProfessionalDetailsStep = ({
  formData,
  errors,
  handleChange,
  certifications,
  setCertifications,
  awards,
  setAwards,
  publications,
  setPublications,
  consultationTypes,
  setConsultationTypes,
  isSubmitting,
  isLoading,
  setCurrentStep,
}) => {
  const updateCert = (index, field, value) => {
    setCertifications((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };
  const appendCert = () => {
    setCertifications((prev) => [...prev, { name: '', year: '', issuer: '' }]);
  };
  const removeCert = (index) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAward = (index, field, value) => {
    setAwards((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };
  const appendAward = () => {
    setAwards((prev) => [...prev, { name: '', year: '', description: '' }]);
  };
  const removeAward = (index) => {
    setAwards((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePub = (index, field, value) => {
    setPublications((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };
  const appendPub = () => {
    setPublications((prev) => [...prev, { title: '', year: '', link: '' }]);
  };
  const removePub = (index) => {
    setPublications((prev) => prev.filter((_, i) => i !== index));
  };

  const updateConsultType = (index, field, value) => {
    setConsultationTypes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };
  const appendConsultType = () => {
    setConsultationTypes((prev) => [...prev, { type: '', duration: '', fee: '' }]);
  };
  const removeConsultType = (index) => {
    setConsultationTypes((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8 pb-4 border-b-3 border-[#27AE60]">
        <i className="fas fa-briefcase mr-3 text-[#27AE60]"></i>Professional Details
      </h2>

      {/* Title & Description */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Professional Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.title ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., Registered Dietitian"
          />
          {errors.title && <span className="text-red-500 text-sm mt-1">{errors.title}</span>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Professional Description *</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows="4"
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.description ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="Detailed professional background"
          />
          {errors.description && <span className="text-red-500 text-sm mt-1">{errors.description}</span>}
        </div>
      </div>

      {/* Specialties & Education */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Specialties (comma-separated) *</label>
          <input
            type="text"
            name="specialties"
            value={formData.specialties || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.specialties ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., Clinical Nutrition, Wellness"
          />
          {errors.specialties && <span className="text-red-500 text-sm mt-1">{errors.specialties}</span>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Education (comma-separated) *</label>
          <input
            type="text"
            name="infoEducation"
            value={formData.infoEducation || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.infoEducation ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., PhD Nutrition, RD Certification"
          />
          {errors.infoEducation && <span className="text-red-500 text-sm mt-1">{errors.infoEducation}</span>}
        </div>
      </div>

      {/* Expertise & Languages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Expertise (comma-separated) *</label>
          <input
            type="text"
            name="expertise"
            value={formData.expertise || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.expertise ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., Meal Planning, Nutritional Counseling"
          />
          {errors.expertise && <span className="text-red-500 text-sm mt-1">{errors.expertise}</span>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Languages (comma-separated) *</label>
          <input
            type="text"
            name="infoLanguages"
            value={formData.infoLanguages || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.infoLanguages ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., French, German"
          />
          {errors.infoLanguages && <span className="text-red-500 text-sm mt-1">{errors.infoLanguages}</span>}
        </div>
      </div>

      {/* Certifications */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800"><i className="fas fa-certificate mr-2 text-blue-600"></i>Certifications</h3>
          <button type="button" onClick={appendCert} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">+ Add</button>
        </div>
        {certifications.map((field, i) => (
          <div key={i} className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                value={field.name || ''}
                onChange={(e) => updateCert(i, 'name', e.target.value)}
                placeholder="Certification Name"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="number"
                value={field.year || ''}
                onChange={(e) => updateCert(i, 'year', e.target.value)}
                placeholder="Year"
                min="1900"
                max={new Date().getFullYear()}
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="text"
                value={field.issuer || ''}
                onChange={(e) => updateCert(i, 'issuer', e.target.value)}
                placeholder="Issuer"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
            </div>
            {certifications.length > 1 && (
              <button type="button" onClick={() => removeCert(i)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Awards */}
      <div className="mb-8 p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800"><i className="fas fa-star mr-2 text-purple-600"></i>Awards</h3>
          <button type="button" onClick={appendAward} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">+ Add</button>
        </div>
        {awards.map((field, i) => (
          <div key={i} className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                value={field.name || ''}
                onChange={(e) => updateAward(i, 'name', e.target.value)}
                placeholder="Award Name"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="number"
                value={field.year || ''}
                onChange={(e) => updateAward(i, 'year', e.target.value)}
                placeholder="Year"
                min="1900"
                max={new Date().getFullYear()}
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="text"
                value={field.description || ''}
                onChange={(e) => updateAward(i, 'description', e.target.value)}
                placeholder="Description"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
            </div>
            {awards.length > 1 && (
              <button type="button" onClick={() => removeAward(i)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Publications */}
      <div className="mb-8 p-6 bg-green-50 rounded-lg border-2 border-green-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800"><i className="fas fa-book mr-2 text-green-600"></i>Publications</h3>
          <button type="button" onClick={appendPub} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">+ Add</button>
        </div>
        {publications.map((field, i) => (
          <div key={i} className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                value={field.title || ''}
                onChange={(e) => updatePub(i, 'title', e.target.value)}
                placeholder="Publication Title"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="number"
                value={field.year || ''}
                onChange={(e) => updatePub(i, 'year', e.target.value)}
                placeholder="Year"
                min="1900"
                max={new Date().getFullYear()}
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="text"
                value={field.link || ''}
                onChange={(e) => updatePub(i, 'link', e.target.value)}
                placeholder="Link/URL"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
            </div>
            {publications.length > 1 && (
              <button type="button" onClick={() => removePub(i)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Consultation Types */}
      <div className="mb-8 p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800"><i className="fas fa-comments mr-2 text-orange-600"></i>Consultation Types</h3>
          <button type="button" onClick={appendConsultType} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer">+ Add</button>
        </div>
        {consultationTypes.map((field, i) => (
          <div key={i} className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                value={field.type || ''}
                onChange={(e) => updateConsultType(i, 'type', e.target.value)}
                placeholder="Type (e.g., Initial)"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="number"
                value={field.duration || ''}
                onChange={(e) => updateConsultType(i, 'duration', e.target.value)}
                placeholder="Duration (min)"
                min="1"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
              <input
                type="number"
                value={field.fee || ''}
                onChange={(e) => updateConsultType(i, 'fee', e.target.value)}
                placeholder="Fee"
                min="0"
                className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#27AE60]"
              />
            </div>
            {consultationTypes.length > 1 && (
              <button type="button" onClick={() => removeConsultType(i)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Working Hours */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Working Days (comma-separated) *</label>
          <input
            type="text"
            name="workingDays"
            value={formData.workingDays || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.workingDays ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., Monday, Tuesday"
          />
          {errors.workingDays && <span className="text-red-500 text-sm mt-1">{errors.workingDays}</span>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Working Hours Start (HH:MM) *</label>
          <input
            type="text"
            name="workingHoursStart"
            value={formData.workingHoursStart || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.workingHoursStart ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., 09:00"
          />
          {errors.workingHoursStart && <span className="text-red-500 text-sm mt-1">{errors.workingHoursStart}</span>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Working Hours End (HH:MM) *</label>
          <input
            type="text"
            name="workingHoursEnd"
            value={formData.workingHoursEnd || ''}
            onChange={handleChange}
            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.workingHoursEnd ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[#27AE60] transition-all`}
            placeholder="e.g., 17:00"
          />
          {errors.workingHoursEnd && <span className="text-red-500 text-sm mt-1">{errors.workingHoursEnd}</span>}
        </div>
      </div>

      {/* Social Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn URL</label>
          <input
            type="text"
            name="linkedin"
            value={formData.linkedin || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-[#27AE60] transition-all"
            placeholder="https://linkedin.com/in/username"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Twitter URL</label>
          <input
            type="text"
            name="twitter"
            value={formData.twitter || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-[#27AE60] transition-all"
            placeholder="https://twitter.com/username"
          />
        </div>
      </div>

      {/* Step 2 Buttons */}
      <div className="flex gap-4 justify-end pt-6 border-t-2 border-gray-200">
        <button type="button" onClick={() => setCurrentStep(1)} className="px-8 py-3 rounded-lg border-2 border-gray-400 text-gray-700 font-bold hover:bg-gray-100 transition-all cursor-pointer">
          Previous
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="px-8 py-3 rounded-lg bg-[#27AE60] text-white font-bold hover:bg-[#1e8449] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          <i className="fas fa-save"></i>
          {isSubmitting || isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

export default ProfessionalDetailsStep;
