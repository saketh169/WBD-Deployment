import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Eye, Download, ChevronLeft, ClipboardList, User } from 'lucide-react';
import AuthContext from '../../contexts/AuthContext';
import axios from '../../axios';

const ClientHealthReportViewer = () => {
  const { dietitianId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch health reports sent by the dietitian
  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      if (!dietitianId) {
        setError('Dietitian ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const clientId = user.id;

        const response = await axios.get(
          `/api/health-reports/client/${clientId}/dietitian/${dietitianId}`
        );

        if (response.data.success) {
          setReports(response.data.data || []);
        } else {
          throw new Error(response.data.message || 'Failed to fetch health reports');
        }
      } catch (err) {
        console.error('Error fetching health reports:', err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, dietitianId]);

  // Auto-select first report
  useEffect(() => {
    if (reports.length > 0 && !selectedReport) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  // Mark report as viewed when selected
  useEffect(() => {
    const markViewed = async () => {
      if (!selectedReport || selectedReport.status === 'viewed') return;
      try {
        await axios.put(
          `/api/health-reports/${selectedReport._id}/viewed`,
          {}
        );
        // Update local state
        setReports(prev => prev.map(r =>
          r._id === selectedReport._id ? { ...r, status: 'viewed' } : r
        ));
        setSelectedReport(prev => prev ? { ...prev, status: 'viewed' } : prev);
      } catch (err) {
        console.error('Error marking report as viewed:', err);
      }
    };
    markViewed();
  }, [selectedReport?._id]);

  // File helpers
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
            <span>Received: {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              report.status === 'viewed' ? 'bg-green-100 text-green-800' :
              report.status === 'sent' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {report.status === 'viewed' ? 'Viewed' : report.status === 'sent' ? 'New' : 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Dietitian Info */}
      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-emerald-800 text-sm">Prepared by: {report.dietitianName || 'Your Dietitian'}</span>
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
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-0 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 flex items-center gap-2 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-center">
              Health Assessment Reports
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-emerald-700">Loading health reports...</p>
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
            <p className="text-teal-900 text-lg font-bold">No health reports received yet</p>
            <p className="text-emerald-600 mt-2">
              Your dietitian hasn't sent any health assessment reports yet.
            </p>
          </div>
        ) : (
          <div className="flex gap-6 p-6">
            {/* Left Sidebar – Report List */}
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
                    onClick={() => setSelectedReport(report)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 flex items-center gap-3 transform hover:scale-105 ${
                      selectedReport?._id === report._id
                        ? 'active shadow-lg border-emerald-300'
                        : 'hover:shadow-md border-gray-200'
                    }`}
                    style={{
                      color: selectedReport?._id === report._id ? 'white' : '#0F766E',
                      borderLeft: selectedReport?._id === report._id ? '4px solid #34D399' : '2px solid #E5E7EB',
                      background: selectedReport?._id === report._id
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                        : 'white',
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg shrink-0">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${selectedReport?._id === report._id ? 'text-white' : 'text-teal-900'}`}>
                        {report.title}
                      </div>
                      <div className={`text-xs ${selectedReport?._id === report._id ? 'text-emerald-100' : 'text-gray-600'}`}>
                        {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {report.status === 'sent' && (
                          <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="New"></span>
                        )}
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

export default ClientHealthReportViewer;
