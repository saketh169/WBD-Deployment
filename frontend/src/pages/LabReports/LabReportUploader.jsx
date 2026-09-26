import React, { useState, useCallback, useMemo, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Heart, TestTube, Factory, Scale, TrendingUp, Droplet, Upload, CheckCircle, X } from 'lucide-react';
import AuthContext from '../../contexts/AuthContext';
import { uploadLabReport } from '../../services/labreport/labReportService';

const CategoryIcon = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 m-2 w-36 h-36 md:w-40 md:h-40 text-center rounded-xl transition-all duration-300 transform shadow-lg cursor-pointer ${
      isActive
        ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 scale-[1.02] shadow-emerald-500/50'
        : 'bg-white text-gray-700 hover:bg-emerald-50 hover:shadow-xl border border-emerald-100'
    }`}
  >
    <Icon className={`w-12 h-12 mb-2 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
    <span className="text-sm font-semibold mt-1">{label}</span>
  </button>
);

const FormInput = ({
  label,
  name,
  type = 'text',
  value = '',
  onChange,
  required = false,
  unit = '',
  onView,
}) => {
  const isFile = type === 'file';
  const [filePreview, setFilePreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileSizeError, setFileSizeError] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      setFileSizeError('File too large (max 10MB)');
      e.target.value = '';
      setSelectedFileName('');
      if (onChange) onChange(name, null);
    } else {
      setFileSizeError('');
      setSelectedFileName(file ? file.name : '');
      if (onChange) onChange(name, file || null);
    }
  };

  const handleViewFile = () => {
    const input = document.querySelector(`input[name="${name}"]`);
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ dataUrl: e.target.result, mime: file.type, name: file.name });
        setShowPreview(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>} {unit && <span className="text-gray-500">({unit})</span>}
        </label>
        {isFile ? (
          <div className="flex flex-col space-y-2">
            <input
              type="file"
              name={name}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
              required={required}
              onChange={handleFileInputChange}
            />
            <div className="text-xs text-gray-500">Max size: 10MB. PDF, JPG, PNG</div>
            {selectedFileName && !fileSizeError && <div className="text-xs text-emerald-600">Selected: {selectedFileName}</div>}
            {fileSizeError && <div className="text-xs text-red-600 font-medium">{fileSizeError}</div>}
            {onView && selectedFileName && !fileSizeError && (
              <button type="button" onClick={handleViewFile} className="text-sm text-emerald-600 hover:text-emerald-800 underline self-start cursor-pointer">
                Preview selected file
              </button>
            )}
          </div>
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required={required}
          />
        )}
      </div>

      {showPreview && filePreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-full lg:max-w-6xl w-full flex flex-col overflow-hidden h-[600px]">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">File Preview - {filePreview.name}</h3>
              <button onClick={() => { setShowPreview(false); setFilePreview(null); }} className="p-2 text-slate-400 hover:text-red-500 cursor-pointer">
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <div className="grow p-4 overflow-y-auto bg-slate-50">
              {filePreview.mime?.startsWith('image/') ? (
                <img src={filePreview.dataUrl} alt="File Preview" className="w-full h-full object-contain mx-auto rounded-xl" />
              ) : filePreview.mime === 'application/pdf' ? (
                <iframe src={filePreview.dataUrl} title="File Preview" className="w-full h-full border-none" allow="fullscreen" />
              ) : (
                <div className="text-center p-12 text-slate-600">Preview not available for this file type</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const FormSectionWrapper = ({ label, description, children }) => (
  <>
    <h2 className="text-2xl font-bold text-emerald-800 mb-2 flex items-center">
      <span className="mr-2"><i className="fas fa-heartbeat w-8 h-8" /></span>
      {label} - Details
    </h2>
    <p className="text-gray-600 mb-6 border-b border-emerald-200 pb-4">{description}</p>
    {children}
  </>
);

const CategoryFormContent = ({ categoryId, categories, formData, onFieldChange }) => {
  const categoryMeta = categories.find((c) => c.id === categoryId);

  switch (categoryId) {
    case 'Hormonal_Issues':
      return (
        <FormSectionWrapper {...categoryMeta}>
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Hormonal Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormInput label="Total Testosterone" name="testosteroneTotal" type="number" unit="ng/dL" value={formData.testosteroneTotal || ''} onChange={onFieldChange} />
              <FormInput label="DHEA-S" name="dheaS" type="number" unit="μg/dL" value={formData.dheaS || ''} onChange={onFieldChange} />
              <FormInput label="Cortisol (AM)" name="cortisol" type="number" unit="nmol/L" value={formData.cortisol || ''} onChange={onFieldChange} />
              <FormInput label="Vitamin D" name="vitaminD" type="number" unit="ng/mL" value={formData.vitaminD || ''} onChange={onFieldChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <FormInput label="Upload Hormonal Profile Report" name="hormonalProfileReport" type="file" onView={true} onChange={onFieldChange} />
              <FormInput label="Upload General Endocrine Report" name="endocrineReport" type="file" onView={true} onChange={onFieldChange} />
            </div>
          </div>
        </FormSectionWrapper>
      );
    case 'Fitness_Metrics':
      return (
        <FormSectionWrapper {...categoryMeta}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Height" name="heightCm" type="number" unit="cm" value={formData.heightCm || ''} onChange={onFieldChange} />
            <FormInput label="Current Weight" name="currentWeight" type="number" unit="kg" value={formData.currentWeight || ''} onChange={onFieldChange} />
            <FormInput label="Body Fat Percentage" name="bodyFatPercentage" type="number" unit="%" value={formData.bodyFatPercentage || ''} onChange={onFieldChange} />
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700">Activity Level</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                name="activityLevel"
                value={formData.activityLevel || ''}
                onChange={(e) => onFieldChange('activityLevel', e.target.value)}
              >
                <option value="">Select Level</option>
                <option value="sedentary">Sedentary (Little or no exercise)</option>
                <option value="light">Lightly Active (1-3 days/week)</option>
                <option value="moderate">Moderately Active (3-5 days/week)</option>
                <option value="very">Very Active (6-7 days/week)</option>
                <option value="extra">Extra Active (2x per day/training)</option>
              </select>
            </div>
            <div className="flex flex-col space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Additional Health Information</label>
              <textarea
                rows="3"
                name="additionalInfo"
                value={formData.additionalInfo || ''}
                onChange={(e) => onFieldChange('additionalInfo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </FormSectionWrapper>
      );
    case 'General_Reports':
      return (
        <FormSectionWrapper {...categoryMeta}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormInput label="Date of Latest Report" name="dateOfReport" type="date" value={formData.dateOfReport || ''} onChange={onFieldChange} />
              <FormInput label="BMI Value" name="bmiValue" type="number" unit="kg/m²" value={formData.bmiValue || ''} onChange={onFieldChange} />
              <FormInput label="Weight at Time of Report" name="currentWeight" type="number" unit="kg" value={formData.currentWeight || ''} onChange={onFieldChange} />
              <FormInput label="Height at Time of Report" name="heightCm" type="number" unit="cm" value={formData.heightCm || ''} onChange={onFieldChange} />
            </div>
            <FormInput label="Upload General Health Report (PDF/Image)" name="generalHealthReport" type="file" onView={true} onChange={onFieldChange} />
          </div>
        </FormSectionWrapper>
      );
    case 'Blood_Sugar_Focus':
      return (
        <FormSectionWrapper {...categoryMeta}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormInput label="Fasting Glucose" name="fastingGlucose" type="number" unit="mg/dL" value={formData.fastingGlucose || ''} onChange={onFieldChange} />
              <FormInput label="HbA1c" name="hba1c" type="number" unit="%" value={formData.hba1c || ''} onChange={onFieldChange} />
              <FormInput label="Total Cholesterol" name="cholesterolTotal" type="number" unit="mg/dL" value={formData.cholesterolTotal || ''} onChange={onFieldChange} />
              <FormInput label="Triglycerides" name="triglycerides" type="number" unit="mg/dL" value={formData.triglycerides || ''} onChange={onFieldChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormInput label="Upload General Blood Test Report" name="bloodTestReport" type="file" onView={true} onChange={onFieldChange} />
              <FormInput label="Upload Blood Sugar Report" name="bloodSugarReport" type="file" onView={true} onChange={onFieldChange} />
              <FormInput label="Upload Diabetes/HbA1c Report" name="diabetesReport" type="file" onView={true} onChange={onFieldChange} />
            </div>
          </div>
        </FormSectionWrapper>
      );
    case 'Thyroid':
      return (
        <FormSectionWrapper {...categoryMeta}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormInput label="TSH" name="tsh" type="number" unit="mIU/L" value={formData.tsh || ''} onChange={onFieldChange} />
              <FormInput label="Free T4" name="freeT4" type="number" unit="ng/dL" value={formData.freeT4 || ''} onChange={onFieldChange} />
              <FormInput label="Reverse T3" name="reverseT3" type="number" unit="ng/dL" value={formData.reverseT3 || ''} onChange={onFieldChange} />
              <FormInput label="Thyroid Antibodies (TPO/TgAb)" name="thyroidAntibodies" value={formData.thyroidAntibodies || ''} onChange={onFieldChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <FormInput label="Upload Full Thyroid Panel Report" name="thyroidReport" type="file" onView={true} onChange={onFieldChange} />
              <FormInput label="Upload General Health Report" name="generalHealthReport" type="file" onView={true} onChange={onFieldChange} />
            </div>
          </div>
        </FormSectionWrapper>
      );
    case 'Cardiovascular':
      return (
        <FormSectionWrapper {...categoryMeta}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormInput label="Systolic Blood Pressure" name="systolicBP" type="number" unit="mmHg" value={formData.systolicBP || ''} onChange={onFieldChange} />
              <FormInput label="Diastolic Blood Pressure" name="diastolicBP" type="number" unit="mmHg" value={formData.diastolicBP || ''} onChange={onFieldChange} />
              <FormInput label="SpO₂" name="spO2" type="number" unit="%" value={formData.spO2 || ''} onChange={onFieldChange} />
              <FormInput label="Resting Heart Rate" name="restingHeartRate" type="number" unit="bpm" value={formData.restingHeartRate || ''} onChange={onFieldChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormInput label="Upload General Cardiac Health Report" name="cardiacHealthReport" type="file" onView={true} onChange={onFieldChange} />
              <FormInput label="Upload Cardiovascular Risk Assessment" name="cardiovascularReport" type="file" onView={true} onChange={onFieldChange} />
              <FormInput label="Upload ECG/ECHO Report" name="ecgReport" type="file" onView={true} onChange={onFieldChange} />
            </div>
          </div>
        </FormSectionWrapper>
      );
    default:
      return null;
  }
};

const LabReportUploader = () => {
  const navigate = useNavigate();
  const { dietitianId } = useParams();
  const { user } = useContext(AuthContext);

  const [activeFormsOrder, setActiveFormsOrder] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [clientData, setClientData] = useState({
    clientName: '',
    clientAge: '',
    clientPhone: '',
    clientAddress: '',
  });
  const [clientErrors, setClientErrors] = useState({});

  const [categoryData, setCategoryData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});

  useEffect(() => {
    if (user) {
      setClientData({
        clientName: user.name || '',
        clientAge: user.age || '',
        clientPhone: user.phone || '',
        clientAddress: user.address || '',
      });
    }
  }, [user]);

  useEffect(() => () => setNotification(null), []);

  const categories = useMemo(
    () => [
      { id: 'Hormonal_Issues', label: 'Hormonal Issues', icon: TrendingUp, description: 'Enter specific metrics for endocrine and reproductive health.' },
      { id: 'Fitness_Metrics', label: 'Fitness & Body Metrics', icon: Scale, description: 'Key body composition and lifestyle data for weight goals.' },
      { id: 'General_Reports', label: 'General Checkup', icon: TestTube, description: 'Upload your primary health screening report and fill in key metrics.' },
      { id: 'Blood_Sugar_Focus', label: 'Blood & Sugar Focus', icon: Droplet, description: 'Detailed reports and values for glucose and lipids.' },
      { id: 'Thyroid', label: 'Thyroid', icon: Factory, description: 'Detailed thyroid panel results and related reports.' },
      { id: 'Cardiovascular', label: 'Heart & Cardiac', icon: Heart, description: 'Cardiovascular health, blood pressure, and ECG details.' },
    ],
    []
  );

  const toggleCategory = useCallback((categoryId) => {
    setActiveFormsOrder((prevOrder) => {
      const index = prevOrder.indexOf(categoryId);
      if (index > -1) {
        const newOrder = [...prevOrder];
        newOrder.splice(index, 1);
        return newOrder;
      }
      setTimeout(() => {
        const el = document.getElementById(`form-section-${categoryId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return [...prevOrder, categoryId];
    });
  }, []);

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClientData((prev) => ({ ...prev, [name]: value }));
    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryFieldChange = (fieldName, val) => {
    if (val instanceof File || val === null) {
      setUploadedFiles((prev) => ({ ...prev, [fieldName]: val }));
    } else {
      setCategoryData((prev) => ({ ...prev, [fieldName]: val }));
    }
  };

  const validateClient = () => {
    const errs = {};
    if (!clientData.clientName.trim()) {
      errs.clientName = 'Full Name is required.';
    } else if (clientData.clientName.trim().length < 2) {
      errs.clientName = 'Name must be at least 2 characters.';
    }

    if (!clientData.clientAge) {
      errs.clientAge = 'Age is required.';
    } else if (isNaN(Number(clientData.clientAge)) || Number(clientData.clientAge) < 1 || Number(clientData.clientAge) > 120) {
      errs.clientAge = 'Enter a valid age.';
    }

    if (!clientData.clientPhone.trim()) {
      errs.clientPhone = 'Phone Number is required.';
    } else if (!/^[0-9]{10}$/.test(clientData.clientPhone.trim())) {
      errs.clientPhone = 'Enter a valid 10-digit phone number.';
    }

    if (!clientData.clientAddress.trim()) {
      errs.clientAddress = 'Address is required.';
    } else if (clientData.clientAddress.trim().length < 5) {
      errs.clientAddress = 'Address must be at least 5 characters.';
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateClient()) return;

    if (activeFormsOrder.length === 0) {
      setNotification({ type: 'error', message: 'Please select at least one category to submit.' });
      return;
    }

    const categoryRequiredFields = {
      Hormonal_Issues: [['testosteroneTotal', 'Total Testosterone'], ['dheaS', 'DHEA-S'], ['cortisol', 'Cortisol'], ['vitaminD', 'Vitamin D']],
      Fitness_Metrics: [['heightCm', 'Height'], ['currentWeight', 'Current Weight'], ['bodyFatPercentage', 'Body Fat %'], ['activityLevel', 'Activity Level']],
      General_Reports: [['dateOfReport', 'Date of Report'], ['bmiValue', 'BMI Value']],
      Blood_Sugar_Focus: [['fastingGlucose', 'Fasting Glucose'], ['hba1c', 'HbA1c'], ['cholesterolTotal', 'Total Cholesterol'], ['triglycerides', 'Triglycerides']],
      Thyroid: [['tsh', 'TSH'], ['freeT4', 'Free T4'], ['reverseT3', 'Reverse T3'], ['thyroidAntibodies', 'Thyroid Antibodies']],
      Cardiovascular: [['systolicBP', 'Systolic BP'], ['diastolicBP', 'Diastolic BP'], ['spO2', 'SpO₂'], ['restingHeartRate', 'Resting Heart Rate']],
    };

    const validationErrors = [];
    activeFormsOrder.forEach((categoryId) => {
      const required = categoryRequiredFields[categoryId] || [];
      const missing = required
        .filter(([field]) => !categoryData[field] && categoryData[field] !== 0)
        .map(([, label]) => label);
      if (missing.length > 0) validationErrors.push(`${categoryId.replace(/_/g, ' ')}: ${missing.join(', ')}`);
    });

    if (validationErrors.length > 0) {
      setNotification({ type: 'error', message: `Please fill in all required fields:\n${validationErrors.join('\n')}` });
      return;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('clientName', clientData.clientName.trim());
      formDataToSend.append('clientAge', clientData.clientAge);
      formDataToSend.append('clientPhone', clientData.clientPhone.trim());
      formDataToSend.append('clientAddress', clientData.clientAddress.trim());
      formDataToSend.append('submittedCategories', JSON.stringify(activeFormsOrder));
      if (user?.id) formDataToSend.append('clientId', user.id);
      if (dietitianId) formDataToSend.append('dietitianId', dietitianId);

      const metricKeys = [
        'testosteroneTotal', 'dheaS', 'cortisol', 'vitaminD', 'heightCm', 'currentWeight',
        'bodyFatPercentage', 'activityLevel', 'additionalInfo', 'dateOfReport', 'bmiValue',
        'fastingGlucose', 'hba1c', 'cholesterolTotal', 'triglycerides', 'tsh', 'freeT4',
        'reverseT3', 'thyroidAntibodies', 'systolicBP', 'diastolicBP', 'spO2', 'restingHeartRate'
      ];
      metricKeys.forEach((k) => {
        if (categoryData[k] !== undefined && categoryData[k] !== '') {
          formDataToSend.append(k, categoryData[k]);
        }
      });

      const fileFields = [
        'hormonalProfileReport', 'endocrineReport', 'generalHealthReport',
        'bloodTestReport', 'bloodSugarReport', 'diabetesReport',
        'thyroidReport', 'cardiacHealthReport', 'cardiovascularReport', 'ecgReport'
      ];
      fileFields.forEach((fieldName) => {
        if (uploadedFiles[fieldName]) {
          formDataToSend.append(fieldName, uploadedFiles[fieldName]);
        }
      });

      const res = await uploadLabReport(formDataToSend);
      if (!res.isError && (res.success || res.data)) {
        setNotification({ type: 'success', message: 'Your lab report has been submitted successfully!' });
        setTimeout(() => navigate(`/user/lab-reports/${dietitianId}`), 2000);
      } else {
        throw new Error(res.message || 'Failed to submit lab report');
      }
    } catch (error) {
      setNotification({ type: 'error', message: error.message || 'An unexpected error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 to-teal-50 pt-0 pb-6 px-6">
      {notification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {notification.type === 'success' ? <CheckCircle className="w-12 h-12" /> : <X className="w-12 h-12" />}
            </div>
            <h3 className="text-2xl font-bold mb-4">{notification.type === 'success' ? 'Report Submitted Successfully!' : 'Error'}</h3>
            <p className="text-gray-600 text-sm mb-6">{notification.message}</p>
            {notification.type !== 'success' && (
              <button onClick={() => setNotification(null)} className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium cursor-pointer">
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border-2 border-emerald-200 overflow-hidden">
        <header className="bg-linear-to-r from-emerald-500 to-teal-600 text-white p-6 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-emerald-700 rounded-xl font-semibold cursor-pointer">Back</button>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold mb-2">Lab Report Upload</h1>
            <p className="text-emerald-100 text-lg">Upload your health reports and metrics for analysis by your Dietitian.</p>
          </div>
          <button onClick={() => navigate(`/user/lab-reports/${dietitianId}`)} className="px-4 py-2 bg-emerald-700 rounded-xl font-semibold cursor-pointer">Report History</button>
        </header>

        <section className="grid grid-cols-6 gap-4 p-6 max-w-6xl mx-auto">
          {categories.map((cat) => (
            <CategoryIcon key={cat.id} icon={cat.icon} label={cat.label} isActive={activeFormsOrder.includes(cat.id)} onClick={() => toggleCategory(cat.id)} />
          ))}
        </section>

        <div className="p-6 border border-emerald-200 rounded-xl bg-emerald-50/50 m-6 mb-8">
          <h2 className="text-2xl font-bold text-emerald-800 mb-2 flex items-center">
            <User className="w-8 h-8 mr-2" />Client Information
          </h2>
          <p className="text-gray-600 mb-6 border-b border-emerald-200 pb-4">Please verify your personal details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="clientName"
                value={clientData.clientName}
                onChange={handleClientChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              {clientErrors.clientName && <p className="text-xs text-red-500 mt-1">{clientErrors.clientName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Age <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="clientAge"
                value={clientData.clientAge}
                onChange={handleClientChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              {clientErrors.clientAge && <p className="text-xs text-red-500 mt-1">{clientErrors.clientAge}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone Number <span className="text-red-500">*</span></label>
              <input
                type="tel"
                name="clientPhone"
                value={clientData.clientPhone}
                onChange={handleClientChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              {clientErrors.clientPhone && <p className="text-xs text-red-500 mt-1">{clientErrors.clientPhone}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="clientAddress"
                value={clientData.clientAddress}
                onChange={handleClientChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              {clientErrors.clientAddress && <p className="text-xs text-red-500 mt-1">{clientErrors.clientAddress}</p>}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-8 p-6" noValidate>
          {activeFormsOrder.length > 0 ? (
            activeFormsOrder.map((categoryId) => (
              <div key={categoryId} id={`form-section-${categoryId}`} className="p-6 border border-emerald-200 rounded-xl bg-emerald-50/50 space-y-4">
                <CategoryFormContent
                  categoryId={categoryId}
                  categories={categories}
                  formData={categoryData}
                  onFieldChange={handleCategoryFieldChange}
                />
              </div>
            ))
          ) : (
            <div className="p-6 border border-gray-300 rounded-xl bg-gray-50 text-center text-gray-500 italic">
              Select one or more categories above to load corresponding forms.
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={submitting || activeFormsOrder.length === 0}
              className="px-12 py-3 bg-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center cursor-pointer"
            >
              <Upload className="w-6 h-6 mr-2" />
              {submitting ? 'Submitting...' : 'Submit the Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LabReportUploader;
