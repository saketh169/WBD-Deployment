import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { uploadDocuments } from '../../services/auth/authService';

const SelectField = ({ label, options, required, error, field, colSpan }) => (
  <div className={`relative animate-slide-in ${colSpan ? 'lg:col-span-2' : ''}`}>
    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {!required && <span className="ml-1 text-xs text-gray-500 font-medium">(Optional)</span>}
    </label>
    <div className="relative">
      <select
        {...field}
        id={field.name}
        className={`w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6a994e] transition-all duration-300 appearance-none bg-white shadow-sm hover:shadow-md ${
          error ? 'border-red-500' : ''
        }`}
        required={required}
        aria-invalid={!!error}
        aria-describedby={`${field.name}-error`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled} hidden={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
    {error && <p id={`${field.name}-error`} className="text-red-500 text-sm mt-2">{error}</p>}
  </div>
);

const FileUploadField = ({ label, accept, maxSize, required, disabled, error, field, colSpan }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const validateFile = (f) => {
    if (!f) return true;
    if (f.size > maxSize) {
      const mb = (maxSize / (1024 * 1024)).toFixed(0);
      setLocalError(`${label} file size exceeds ${mb} MB.`);
      return false;
    }
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    const allowed = accept.split(',').map((a) => a.trim().toLowerCase());
    if (!allowed.includes(ext)) {
      setLocalError(`Invalid file type. Allowed: ${accept.replace(/\./g, ' ')}.`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setLocalError('');
    if (f && !validateFile(f)) {
      field.onChange(null);
      return;
    }
    field.onChange(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    setLocalError('');
    if (f && !validateFile(f)) {
      field.onChange(null);
      return;
    }
    field.onChange(f);
  };

  const handleRemove = () => {
    field.onChange(null);
    setLocalError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm4 14h-2v-2h2v2zm0-4h-2v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm4 4h-2v-4h2v4z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4zm14 12H6v-2h12v2zm0-4H6v-2h12v2zm0-4V6H6v2h12z" />
      </svg>
    );
  };

  return (
    <div className={`relative animate-slide-in ${colSpan ? 'lg:col-span-2' : ''}`}>
      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {!required && <span className="ml-1 text-xs text-gray-500 font-medium">(Optional)</span>}
      </label>
      <div
        className={`w-full p-4 border-2 border-dashed rounded-lg transition-all duration-300 ${
          isDragging && !disabled ? 'border-[#6a994e] bg-green-50' : 'border-gray-300 bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#6a994e] hover:shadow-md'} ${
          localError || error ? 'border-red-400' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {field.value ? (
              <>
                {getFileIcon(field.value.name)}
                <span className="text-sm text-gray-700 truncate max-w-xs">{field.value.name}</span>
                <span className="text-xs text-gray-500">({(field.value.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">Drag and drop {label.toLowerCase()} here</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#28B463] text-white hover:bg-[#1E8449]'
            }`}
            disabled={disabled}
          >
            Browse
          </button>
        </div>
        <input
          id={field.name}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
          disabled={disabled}
        />
        {field.value && (
          <button type="button" onClick={handleRemove} className="mt-2 text-sm text-red-500 hover:text-red-700 underline">
            Remove File
          </button>
        )}
      </div>
      {(localError || error) && <p id={`${field.name}-error`} className="text-red-500 text-sm mt-2">{localError || error}</p>}
    </div>
  );
};

const RoleSelector = ({ validRoles, navigate }) => (
  <div className="text-center p-4 sm:p-5 animate-slide-in">
    <h3 className="text-xl text-gray-700 font-semibold mb-4">Please select a role to upload documents.</h3>
    <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
      {validRoles.map((r) => (
        <button
          key={r}
          onClick={() => navigate(`/upload-documents?role=${r}`, { replace: true })}
          className="bg-[#28B463] hover:bg-[#1E8449] text-white font-bold py-2 px-4 rounded-md shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          {r.charAt(0).toUpperCase() + r.slice(1)}
        </button>
      ))}
    </div>
  </div>
);

const DocUpload = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const validRoles = useMemo(() => ['dietitian', 'organization'], []);

  const formConfig = useMemo(
    () => ({
      dietitian: [
        { id: 'interestedField', label: 'Interested In', type: 'select', options: [{ value: '', label: 'Choose Interest Field', disabled: true }, { value: 'weight_loss_gain', label: 'Weight Loss/Gain' }, { value: 'diabetes_thyroid_management', label: 'Diabetes/Thyroid Management' }, { value: 'cardiac_health', label: 'Cardiac Health' }, { value: 'women_health', label: 'Women Health' }, { value: 'skin_hair_care', label: 'Skin and Hair Care' }, { value: 'gut_digestive_health', label: 'Gut/Digestive Health' }], required: true },
        { id: 'resume', label: 'Resume (PDF, max 5MB)', type: 'file', accept: '.pdf', maxSize: 5 * 1024 * 1024, required: true, dependsOn: 'interestedField' },
        { id: 'degreeType', label: 'Degree Type', type: 'select', options: [{ value: '', label: 'Choose Degree Type', disabled: true }, { value: 'bsc', label: 'B.Sc. in Nutrition/Dietetics' }, { value: 'msc', label: 'M.Sc. in Nutrition/Dietetics' }, { value: 'food_science', label: 'B.Sc./M.Sc. in Food Science' }, { value: 'other', label: 'Other' }], required: true },
        { id: 'degreeCertificate', label: 'Degree Certificate (PDF, max 5MB)', type: 'file', accept: '.pdf', maxSize: 5 * 1024 * 1024, required: true, dependsOn: 'degreeType' },
        { id: 'licenseIssuer', label: 'License Issued By', type: 'select', options: [{ value: '', label: 'Choose License Issuer', disabled: true }, { value: 'ida', label: 'Indian Dietetic Association (IDA)' }, { value: 'cdr', label: 'Commission on Dietetic Registration (U.S.)' }, { value: 'other', label: 'Other' }], required: true },
        { id: 'licenseDocument', label: 'License Document (PDF, max 5MB)', type: 'file', accept: '.pdf', maxSize: 5 * 1024 * 1024, required: true, dependsOn: 'licenseIssuer' },
        { id: 'idProofType', label: 'Government ID Proof Type', type: 'select', options: [{ value: '', label: 'Choose ID Proof Type', disabled: true }, { value: 'passport', label: 'Passport' }, { value: 'aadhaar', label: 'Aadhaar Card' }, { value: 'driver_license', label: "Driver's License" }, { value: 'other', label: 'Other' }], required: true },
        { id: 'idProof', label: 'Government ID Proof (PDF/Image, max 2MB)', type: 'file', accept: '.pdf,.jpg,.png', maxSize: 2 * 1024 * 1024, required: true, dependsOn: 'idProofType' },
        { id: 'specializationDomain', label: 'Specialization Domain', type: 'select', options: [{ value: '', label: 'Choose Specialization Domain', disabled: true }, { value: 'sports_nutrition', label: 'Sports Nutrition' }, { value: 'pediatric_nutrition', label: 'Pediatric Nutrition' }, { value: 'weight_management', label: 'Weight Management' }, { value: 'other', label: 'Other' }], required: false },
        { id: 'specializationCertifications', label: 'Specialization Certifications (PDF, max 5MB)', type: 'file', accept: '.pdf', maxSize: 5 * 1024 * 1024, required: false, dependsOn: 'specializationDomain' },
        { id: 'experienceCertificates', label: 'Experience Certificates (PDF, max 5MB)', type: 'file', accept: '.pdf', maxSize: 5 * 1024 * 1024, required: false, colSpan: 2 },
        { id: 'internshipCertificate', label: 'Internship Completion Certificate (PDF, max 5MB)', type: 'file', accept: '.pdf', maxSize: 5 * 1024 * 1024, required: false, colSpan: 2 },
        { id: 'researchPapers', label: 'Research Papers/Publications (PDF, max 5MB)', type: 'file', accept: '.pdf', maxSize: 5 * 1024 * 1024, required: false, colSpan: 2 },
      ],
      organization: [
        { id: 'orgLogo', label: 'Organization Logo (Image, max 20MB)', type: 'file', accept: '.jpg,.png,.jpeg', maxSize: 20 * 1024 * 1024, required: true },
        { id: 'orgBrochure', label: 'Organization Brochure (PDF, max 20MB)', type: 'file', accept: '.pdf', maxSize: 20 * 1024 * 1024, required: false },
        { id: 'legalDocumentType', label: 'Legal Document Type', type: 'select', options: [{ value: '', label: 'Choose Legal Document Type', disabled: true }, { value: 'certificateOfIncorporation', label: 'Certificate of Incorporation' }, { value: 'articlesOfAssociation', label: 'Articles of Association' }, { value: 'memorandumOfAssociation', label: 'Memorandum of Association' }], required: true },
        { id: 'legalDocument', label: 'Legal Document (PDF, max 20MB)', type: 'file', accept: '.pdf', maxSize: 20 * 1024 * 1024, required: true, dependsOn: 'legalDocumentType' },
        { id: 'taxDocumentType', label: 'Tax Document Type', type: 'select', options: [{ value: '', label: 'Choose Tax Document Type', disabled: true }, { value: 'gstCertificate', label: 'GST Certificate' }, { value: 'panCard', label: 'PAN Card' }, { value: 'tinCertificate', label: 'TIN Certificate' }], required: true },
        { id: 'taxDocument', label: 'Tax Document (PDF, max 20MB)', type: 'file', accept: '.pdf', maxSize: 20 * 1024 * 1024, required: true, dependsOn: 'taxDocumentType' },
        { id: 'businessLicenseType', label: 'Business License Type', type: 'select', options: [{ value: '', label: 'Choose Business License Type', disabled: true }, { value: 'generalLicense', label: 'General Business License' }, { value: 'industrySpecificLicense', label: 'Industry-Specific License' }], required: true },
        { id: 'businessLicense', label: 'Business License (PDF, max 20MB)', type: 'file', accept: '.pdf', maxSize: 20 * 1024 * 1024, required: true, dependsOn: 'businessLicenseType' },
        { id: 'authorizedRepIdType', label: 'Identity Proof Type', type: 'select', options: [{ value: '', label: 'Choose Identity Proof Type', disabled: true }, { value: 'aadhaarCard', label: 'Aadhaar Card' }, { value: 'passport', label: 'Passport' }, { value: 'driversLicense', label: "Driver's License" }], required: true },
        { id: 'authorizedRepId', label: 'Identity Proof (PDF/Image, max 20MB)', type: 'file', accept: '.pdf,.jpg,.png', maxSize: 20 * 1024 * 1024, required: true, dependsOn: 'authorizedRepIdType' },
        { id: 'addressProofType', label: 'Proof of Address Type', type: 'select', options: [{ value: '', label: 'Choose Address Proof Type', disabled: true }, { value: 'utilityBill', label: 'Utility Bill' }, { value: 'leaseAgreement', label: 'Lease Agreement' }, { value: 'propertyTaxReceipt', label: 'Property Tax Receipt' }], required: false },
        { id: 'addressProof', label: 'Proof of Address (PDF/Image, max 20MB)', type: 'file', accept: '.pdf,.jpg,.png', maxSize: 20 * 1024 * 1024, required: false, dependsOn: 'addressProofType' },
        { id: 'bankDocumentType', label: 'Bank Document Type', type: 'select', options: [{ value: '', label: 'Choose Bank Document Type', disabled: true }, { value: 'cancelledCheque', label: 'Cancelled Cheque' }, { value: 'bankStatement', label: 'Bank Statement' }], required: false },
        { id: 'bankDocument', label: 'Bank Document (PDF, max 20MB)', type: 'file', accept: '.pdf', maxSize: 20 * 1024 * 1024, required: false, dependsOn: 'bankDocumentType' },
      ],
    }),
    []
  );

  useEffect(() => {
    const roleFromUrl = searchParams.get('role');
    if (validRoles.includes(roleFromUrl)) {
      setRole(roleFromUrl);
      const initial = (formConfig[roleFromUrl] || []).reduce(
        (acc, field) => ({ ...acc, [field.id]: field.type === 'file' ? null : '' }),
        {}
      );
      setFormData(initial);
      setErrors({});
      setMessage('');
    } else {
      setRole('');
      setMessage(roleFromUrl ? 'Invalid role. Please select a valid role.' : '');
    }
  }, [searchParams, validRoles, formConfig]);

  const handleFieldChange = (fieldId, val) => {
    setFormData((prev) => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) setErrors((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    (formConfig[role] || []).forEach((field) => {
      const val = formData[field.id];
      if (field.required && !val) {
        newErrors[field.id] = field.type === 'select'
          ? `Please select your ${field.label.toLowerCase()}.`
          : `Please upload your ${field.label.toLowerCase()}.`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const roleRoutes = {
    dietitian: '/dietitian/home',
    organization: '/organization/home',
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!roleRoutes[role]) {
      setMessage('Invalid role selected.');
      return;
    }
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsLoading(true);
    setMessage('Uploading your documents...');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const token = localStorage.getItem(`authToken_${role}`);
      if (!token) {
        setMessage('Session expired. Please sign up again.');
        setTimeout(() => navigate('/signup?role=' + role), 1500);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('role', role);
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) formDataToSend.append(key, value);
      });

      const res = await uploadDocuments(role, formDataToSend);
      if (res.isError) {
        setMessage(`Error: ${res.message}`);
        setIsLoading(false);
        return;
      }

      setMessage('Documents uploaded successfully! Redirecting...');
      setTimeout(() => navigate(roleRoutes[role]), 1500);
      setIsLoading(false);
    } catch (error) {
      setMessage(`Error: ${error.message || 'Upload failed'}`);
      setIsLoading(false);
    }
  };

  return (
    <section className="flex items-center justify-center bg-gray-100 p-2 sm:p-3 min-h-screen">
      <div className="w-full max-w-7xl p-4 sm:p-5 mx-auto rounded-3xl shadow-2xl bg-white relative animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 text-[#1E6F5C] hover:text-[#155345] text-xl transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <i className="fas fa-times"></i>
        </button>
        <h2 className="text-center text-3xl font-bold text-[#1E6F5C] mb-4">
          UPLOAD DOCUMENTS {role ? `- ${role.charAt(0).toUpperCase() + role.slice(1)}` : ''}
        </h2>

        {!role || !formConfig[role] ? (
          <RoleSelector validRoles={validRoles} navigate={navigate} />
        ) : (
          <form id={`${role}UploadForm`} onSubmit={onSubmit} className="needs-validation" noValidate>
            {message && (
              <div
                className={`p-3 mb-5 text-center text-base font-medium rounded-lg shadow-sm w-full ${
                  message.includes('successfully') || message.includes('Redirecting')
                    ? 'text-green-800 bg-green-100 border border-green-300'
                    : message.includes('Uploading')
                    ? 'text-blue-800 bg-blue-100 border border-blue-300'
                    : 'text-red-800 bg-red-100 border border-red-300'
                }`}
                role="alert"
              >
                {message}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2 w-full max-w-7xl mx-auto">
              {formConfig[role].map((field) => {
                const isDependentDisabled = field.dependsOn ? !formData[field.dependsOn] : field.disabled;
                return field.type === 'select' ? (
                  <SelectField
                    key={field.id}
                    label={field.label}
                    options={field.options}
                    required={field.required}
                    error={errors[field.id]}
                    field={{
                      name: field.id,
                      value: formData[field.id] || '',
                      onChange: (e) => handleFieldChange(field.id, e.target.value),
                    }}
                    colSpan={field.colSpan}
                  />
                ) : (
                  <FileUploadField
                    key={field.id}
                    label={field.label}
                    accept={field.accept}
                    maxSize={field.maxSize}
                    required={field.required}
                    disabled={isDependentDisabled}
                    error={errors[field.id]}
                    field={{
                      name: field.id,
                      value: formData[field.id],
                      onChange: (f) => handleFieldChange(field.id, f),
                    }}
                    colSpan={field.colSpan}
                  />
                );
              })}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1E6F5C] text-white font-semibold py-3 rounded-lg hover:bg-[#155345] transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                {isLoading ? 'Submitting...' : 'Submit Documents'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default DocUpload;