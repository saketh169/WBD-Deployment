import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';
import { FileText, Eye, Download, Send, Plus, ChevronLeft, User, ClipboardList } from 'lucide-react';
import axios from '../../axios';

const DietitianHealthReportPage = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const clientInfo = location.state?.clientInfo;

  // State
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    diagnosis: '',
    findings: '',
    dietaryRecommendations: '',
    lifestyleRecommendations: '',
    supplements: '',
    followUpInstructions: '',
    additionalNotes: ''
  });
  const [files, setFiles] = useState({
    healthReportFile1: null,
    healthReportFile2: null,
    healthReportFile3: null
  });

  // Fetch existing health reports
  useEffect(() => {
    const fetchReports = async () => {
      if (!clientId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const dietitianId = user.id;

        const response = await axios.get(
          `/api/health-reports/dietitian/${dietitianId}/client/${clientId}`
        );

        if (response.data.success) {
          setReports(response.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching health reports:', err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [clientId, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    setFiles(prev => ({ ...prev, [name]: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter a report title.');
      return;
    }

    setSubmitting(true);
    try {
      const dietitianId = user.id;

      const submitData = new FormData();
      submitData.append('dietitianId', dietitianId);
      submitData.append('dietitianName', user.name || 'Dietitian');
      submitData.append('clientId', clientId);
      submitData.append('clientName', clientInfo?.name || 'Client');
      submitData.append('title', formData.title);
      submitData.append('diagnosis', formData.diagnosis);
      submitData.append('findings', formData.findings);
      submitData.append('dietaryRecommendations', formData.dietaryRecommendations);
      submitData.append('lifestyleRecommendations', formData.lifestyleRecommendations);
      submitData.append('supplements', formData.supplements);
      submitData.append('followUpInstructions', formData.followUpInstructions);
      submitData.append('additionalNotes', formData.additionalNotes);

      // Append files
      Object.entries(files).forEach(([key, file]) => {
        if (file) submitData.append(key, file);
      });

      const response = await axios.post('/api/health-reports/create', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('Health report sent successfully!');
        setReports(prev => [response.data.data, ...prev]);
        setShowForm(false);
        setFormData({
          title: '',
          diagnosis: '',
          findings: '',
          dietaryRecommendations: '',
          lifestyleRecommendations: '',
          supplements: '',
          followUpInstructions: '',
          additionalNotes: ''
        });
        setFiles({ healthReportFile1: null, healthReportFile2: null, healthReportFile3: null });
        setSelectedReport(response.data.data);
      }
    } catch (err) {
      console.error('Error submitting health report:', err);
      alert('Failed to send health report: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // File preview / download helpers
  const openFilePreview = (file) => {
    try {
      if (!file || !file.data) return;
      const raw = file.data.data ? file.data.data : file.data;
      const uint8 = new Uint8Array(raw);
      const blob = new Blob([uint8], { type: file.mimetype });
      const url = URL.createObjectURL(blob);
      setPreviewFile({ url, name: file.originalName, mimetype: file.mimetype });
      setShowPreview(true);
    } catch (err) {
      console.error('Failed to open file preview', err);
      alert('Unable to preview this file.');
    }
  };

  const closePreview = () => {
    if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
    setShowPreview(false);
    setPreviewFile(null);
  };

  const downloadFile = (file) => {
    try {
      if (!file || !file.data) return;
      const raw = file.data.data ? file.data.data : file.data;
      const uint8 = new Uint8Array(raw);
      const blob = new Blob([uint8], { type: file.mimetype });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName || file.filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file', err);
      alert('Unable to download file.');
    }
  };

  const renderReportDetail = (report) => (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-emerald-800">{report.title}</h2>
          <div className="flex items-center gap-4 text-sm text-emerald-600 mt-1">
            <span>Sent: {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              report.status === 'viewed' ? 'bg-green-100 text-green-800' :
              report.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {report.status === 'viewed' ? 'Viewed' : report.status === 'sent' ? 'Sent' : 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-emerald-800 text-sm">Prepared for: {report.clientName}</span>
        </div>
      </div>

      {/* Diagnosis */}
      {report.diagnosis && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <i className="fas fa-stethoscope text-emerald-500"></i>
            Diagnosis / Chief Complaint
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.diagnosis}</p>
        </div>
      )}

      {/* Findings */}
      {report.findings && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <i className="fas fa-search text-emerald-500"></i>
            Assessment & Findings
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.findings}</p>
        </div>
      )}

      {/* Dietary Recommendations */}
      {report.dietaryRecommendations && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <i className="fas fa-utensils text-emerald-500"></i>
            Dietary Recommendations
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.dietaryRecommendations}</p>
        </div>
      )}

      {/* Lifestyle Recommendations */}
      {report.lifestyleRecommendations && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <i className="fas fa-running text-emerald-500"></i>
            Lifestyle Recommendations
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.lifestyleRecommendations}</p>
        </div>
      )}

      {/* Supplements */}
      {report.supplements && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <i className="fas fa-pills text-emerald-500"></i>
            Supplements Suggested
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.supplements}</p>
        </div>
      )}

      {/* Follow-up Instructions */}
      {report.followUpInstructions && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <i className="fas fa-calendar-check text-emerald-500"></i>
            Follow-up Instructions
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.followUpInstructions}</p>
        </div>
      )}

      {/* Additional Notes */}
      {report.additionalNotes && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <i className="fas fa-sticky-note text-emerald-500"></i>
            Additional Notes
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.additionalNotes}</p>
        </div>
      )}

      {/* Attached Files */}
      {report.uploadedFiles && report.uploadedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <i className="fas fa-paperclip text-emerald-500"></i>
            Attached Files
          </h3>
          <div className="space-y-2">
            {report.uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-emerald-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700">{file.originalName}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openFilePreview(file)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg" title="View">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => downloadFile(file)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 to-teal-50 pt-0 pb-6 px-6">
      {/* File Preview Modal */}
      {showPreview && previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-full lg:max-w-6xl w-full mx-4 flex flex-col overflow-hidden border border-slate-200" style={{ height: '600px' }}>
            <div className="p-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-emerald-50 rounded-t-3xl flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-100 rounded-xl mr-3">
                  <i className="fas fa-file-alt text-emerald-600"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-800">File Preview - {previewFile.name}</h3>
              </div>
              <button onClick={closePreview} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="grow p-4 overflow-y-auto bg-slate-50" style={{ height: 'calc(600px - 80px)' }}>
              {previewFile.mimetype?.startsWith('image/') ? (
                <img src={previewFile.url} alt="Preview" className="w-full h-full object-contain mx-auto rounded-xl" />
              ) : previewFile.mimetype === 'application/pdf' ? (
                <iframe src={previewFile.url} title="Preview" className="w-full h-full border-none"></iframe>
              ) : (
                <div className="text-center py-16">
                  <i className="fas fa-file text-6xl text-slate-400 mb-4"></i>
                  <p className="text-slate-600">Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border-2 border-emerald-200 overflow-hidden">
        {/* Header */}
        <header className="bg-linear-to-r from-emerald-500 to-teal-600 text-white p-4">
          <div className="relative flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 flex items-center gap-2 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-2xl md:text-3xl font-bold whitespace-nowrap">
              {clientInfo ? `Health Reports — ${clientInfo.name}` : 'Health Assessment Reports'}
            </h1>
            <button
              onClick={() => { setShowForm(true); setSelectedReport(null); }}
              className="px-4 py-2 bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 font-semibold flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Report</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-emerald-700">Loading health reports...</p>
          </div>
        ) : showForm ? (
          /* Create Form */
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
                  <ClipboardList className="w-6 h-6" />
                  Create Health Assessment Report
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Prepare a comprehensive health report for {clientInfo?.name || 'your client'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Report Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Post-Consultation Health Assessment"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <i className="fas fa-stethoscope text-emerald-500 mr-1.5"></i>
                  Diagnosis / Chief Complaint
                </label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleInputChange}
                  placeholder="Primary diagnosis or health concern..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Findings */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <i className="fas fa-search text-emerald-500 mr-1.5"></i>
                  Assessment & Findings
                </label>
                <textarea
                  name="findings"
                  value={formData.findings}
                  onChange={handleInputChange}
                  placeholder="Detailed assessment and clinical findings..."
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Dietary Recommendations */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <i className="fas fa-utensils text-emerald-500 mr-1.5"></i>
                  Dietary Recommendations
                </label>
                <textarea
                  name="dietaryRecommendations"
                  value={formData.dietaryRecommendations}
                  onChange={handleInputChange}
                  placeholder="Recommended diet plan, foods to include/avoid..."
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Lifestyle Recommendations */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <i className="fas fa-running text-emerald-500 mr-1.5"></i>
                  Lifestyle Recommendations
                </label>
                <textarea
                  name="lifestyleRecommendations"
                  value={formData.lifestyleRecommendations}
                  onChange={handleInputChange}
                  placeholder="Exercise, sleep, stress management recommendations..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Supplements */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <i className="fas fa-pills text-emerald-500 mr-1.5"></i>
                  Supplements Suggested
                </label>
                <textarea
                  name="supplements"
                  value={formData.supplements}
                  onChange={handleInputChange}
                  placeholder="Vitamins, minerals, or other supplements..."
                  rows="2"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Follow-up Instructions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <i className="fas fa-calendar-check text-emerald-500 mr-1.5"></i>
                  Follow-up Instructions
                </label>
                <textarea
                  name="followUpInstructions"
                  value={formData.followUpInstructions}
                  onChange={handleInputChange}
                  placeholder="Next consultation date, tests to be done, etc..."
                  rows="2"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <i className="fas fa-sticky-note text-emerald-500 mr-1.5"></i>
                  Additional Notes
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  placeholder="Any other important information..."
                  rows="2"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* File Attachments */}
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                <h3 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-paperclip"></i>
                  Attach Files (Optional — max 3 files, PDF or images, 10MB each)
                </h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((num) => (
                    <div key={num}>
                      <label className="block text-xs text-gray-600 mb-1">Attachment {num}</label>
                      <input
                        type="file"
                        name={`healthReportFile${num}`}
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send to Client</>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-red-700 text-lg font-bold">Error loading reports</p>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <p className="text-teal-900 text-lg font-bold">No health reports sent yet</p>
            <p className="text-emerald-600 mt-2">
              Create a comprehensive health assessment report for {clientInfo?.name || 'your client'}.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Report
            </button>
          </div>
        ) : (
          <div className="flex gap-6 p-6">
            {/* Left Sidebar */}
            <div className="w-80 bg-white shadow-xl h-[calc(100vh-300px)] overflow-y-auto p-4 border-r-2 border-emerald-200 rounded-tr-2xl rounded-br-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-notes-medical text-white text-lg"></i>
                </div>
                <h3 className="text-lg font-bold text-teal-900">
                  Reports ({reports.length})
                </h3>
              </div>
              <div className="border-t-2 border-emerald-200 mb-4"></div>
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report._id}
                    onClick={() => { setSelectedReport(report); setShowForm(false); }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 flex items-center gap-3 transform hover:scale-105 ${
                      selectedReport?._id === report._id
                        ? 'active shadow-lg border-emerald-300'
                        : 'hover:shadow-md border-gray-200'
                    }`}
                    style={{
                      color: selectedReport?._id === report._id ? 'white' : '#0F766E',
                      borderLeft: selectedReport?._id === report._id ? '4px solid #34D399' : '2px solid #E5E7EB',
                      background: selectedReport?._id === report._id ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'white',
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg shrink-0">
                      <ClipboardList className={`w-4 h-4 ${selectedReport?._id === report._id ? 'text-emerald-600' : 'text-emerald-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${selectedReport?._id === report._id ? 'text-white' : 'text-teal-900'}`}>
                        {report.title}
                      </div>
                      <div className={`text-xs ${selectedReport?._id === report._id ? 'text-emerald-100' : 'text-gray-600'}`}>
                        {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Main Panel */}
            <div className="flex-1 bg-transparent p-4 overflow-y-auto">
              {selectedReport ? (
                renderReportDetail(selectedReport)
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
                  <p className="text-emerald-700">Select a report from the sidebar to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DietitianHealthReportPage;
