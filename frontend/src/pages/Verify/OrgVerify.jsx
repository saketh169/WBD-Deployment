import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOrganizationsForVerification,
  approveOrgField,
  disapproveOrgField,
  finalApproveOrg,
  finalDisapproveOrg,
  uploadOrgReport,
  getOrgFile
} from '../../services/verification/verifyService';

const FIELD_MAP = {
  orgLogo: { name: 'Organization Logo', ext: 'png', icon: 'fas fa-image', isImage: true },
  orgBrochure: { name: 'Organization Brochure', ext: 'pdf', icon: 'fas fa-file-pdf', isImage: false },
  legalDocument: { name: 'Legal Document', ext: 'pdf', icon: 'fas fa-file-contract', isImage: false },
  taxDocument: { name: 'Tax Document', ext: 'pdf', icon: 'fas fa-file-invoice-dollar', isImage: false },
  addressProof: { name: 'Proof of Address', ext: 'pdf', icon: 'fas fa-map-marker-alt', isImage: false },
  businessLicense: { name: 'Business License', ext: 'pdf', icon: 'fas fa-id-card', isImage: false },
  authorizedRepId: { name: 'Identity Proof', ext: 'pdf', icon: 'fas fa-user-check', isImage: false },
  bankDocument: { name: 'Bank Document', ext: 'pdf', icon: 'fas fa-university', isImage: false },
  finalReport: { name: 'Final Report', ext: 'pdf', icon: 'fas fa-file-alt', isImage: false }
};

const STATUS_ICONS = {
  'Not Received': 'hourglass-half',
  Received: 'hourglass-half',
  Verified: 'check-circle',
  Rejected: 'times-circle',
  Pending: 'hourglass-half',
  'Not Uploaded': 'minus-circle'
};

const OrgNotification = ({ notification, setNotification }) => {
  if (!notification) return null;
  return (
    <div
      className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl border-l-4 backdrop-blur-sm w-full max-w-md ${
        notification.type === 'success'
          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
          : notification.type === 'error'
          ? 'bg-red-50 border-red-400 text-red-800'
          : 'bg-blue-50 border-blue-400 text-blue-800'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <i
            className={`text-lg mr-3 mt-1 fas ${
              notification.type === 'success'
                ? 'fa-check-circle text-emerald-600'
                : notification.type === 'error'
                ? 'fa-exclamation-triangle text-red-600'
                : 'fa-info-circle text-blue-600'
            }`}
          />
          <p className="font-semibold text-sm">{notification.message}</p>
        </div>
        <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 ml-4">
          <i className="fas fa-times text-sm" />
        </button>
      </div>
    </div>
  );
};

const OrgConfirmModal = ({ modal, setModal }) => {
  if (!modal.active) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <i className="fas fa-question text-2xl text-amber-600" />
        </div>
        <h4 className="text-2xl font-bold text-slate-800 mb-2">Confirm Action</h4>
        <p className="text-slate-600 mb-8" dangerouslySetInnerHTML={{ __html: modal.message }} />
        <div className="flex gap-3">
          <button
            className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-semibold hover:bg-slate-200 transition-colors"
            onClick={() => setModal({ active: false, message: '', onConfirm: () => {} })}
          >
            Cancel
          </button>
          <button
            className="flex-1 bg-linear-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-2xl font-semibold shadow-md hover:shadow-lg transition-all"
            onClick={modal.onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const OrgFileViewer = ({ fileViewer, closeFileViewer }) => {
  if (!fileViewer.active) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-full lg:max-w-6xl w-full flex flex-col overflow-hidden h-[600px]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-file-alt text-emerald-600" /> Document Viewer
          </h3>
          <button onClick={closeFileViewer} className="p-2 text-slate-400 hover:text-red-500">
            <i className="fas fa-times text-xl" />
          </button>
        </div>
        <div className="grow p-4 overflow-y-auto bg-slate-50">
          {fileViewer.file?.mime?.startsWith('image/') ? (
            <img src={fileViewer.file.dataUrl} alt="Document" className="w-full h-full object-contain mx-auto rounded-xl" />
          ) : (
            <iframe src={fileViewer.file?.dataUrl} title="Document Viewer" className="w-full h-full border-none" allow="fullscreen" />
          )}
        </div>
      </div>
    </div>
  );
};

const OrgDocumentDetails = ({
  org: o, viewFile, downloadFile, verifyDocument, rejectDocument,
  handleFileUpload, finalVerify, finalReject
}) => (
  <div className="bg-linear-to-r from-slate-50 to-emerald-50/30 p-8 border-t border-slate-200">
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <div className="p-3 bg-emerald-100 rounded-2xl mr-4">
          <i className="fas fa-folder-open text-emerald-600 text-xl" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Document Verification</h3>
          <p className="text-slate-600">Review and verify documents for {o.name || o.org_name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {Object.keys(FIELD_MAP).map(field => {
          const status = o.verificationStatus?.[field] || (field === 'finalReport' ? 'Not Received' : 'Not Uploaded');
          const fileExists = ['Received', 'Pending', 'Verified', 'Rejected'].includes(status);
          const fieldInfo = FIELD_MAP[field];

          return (
            <div key={field} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className={`p-3 rounded-xl mr-4 ${
                      status === 'Verified' ? 'bg-emerald-100' :
                      status === 'Rejected' ? 'bg-red-100' :
                      status === 'Received' || status === 'Pending' ? 'bg-amber-100' : 'bg-slate-100'
                    }`}
                  >
                    <i
                      className={`${fieldInfo.icon} text-lg ${
                        status === 'Verified' ? 'text-emerald-600' :
                        status === 'Rejected' ? 'text-red-600' :
                        status === 'Received' || status === 'Pending' ? 'text-amber-600' : 'text-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{fieldInfo.name}</h4>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${
                    status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                    status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    status === 'Received' || status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {status}
                </span>

                {fileExists && (
                  <div className="flex gap-2">
                    <button
                      className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                      onClick={(e) => { e.preventDefault(); viewFile(o._id, field); }}
                      title="View Document"
                    >
                      <i className="fas fa-eye" />
                    </button>
                    <button
                      className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                      onClick={(e) => { e.preventDefault(); downloadFile(o._id, field, fieldInfo.name, fieldInfo.ext); }}
                      title="Download Document"
                    >
                      <i className="fas fa-download" />
                    </button>
                  </div>
                )}
              </div>

              {status === 'Pending' && field !== 'finalReport' && (
                <div className="flex gap-3 mt-4">
                  <button
                    className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-xl hover:bg-emerald-700 transition-colors font-semibold cursor-pointer"
                    onClick={() => verifyDocument(o._id, field)}
                  >
                    <i className="fas fa-check mr-2" /> Verify
                  </button>
                  <button
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-xl hover:bg-red-700 transition-colors font-semibold cursor-pointer"
                    onClick={() => rejectDocument(o._id, field)}
                  >
                    <i className="fas fa-times mr-2" /> Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
        <div className="flex items-center mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl mr-4">
            <i className="fas fa-upload text-emerald-600 text-lg" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-800">Upload Final Verification Report</h4>
            <p className="text-slate-600 text-sm">PDF files only</p>
          </div>
        </div>
        <p className="text-slate-600 mb-6">Upload a detailed report before final approval or rejection of this organization.</p>
        <div className="relative">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload(o._id, e.target.files[0])}
            className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 mt-6">
        <button
          className="flex-1 bg-emerald-600 text-white py-4 px-6 rounded-2xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
          onClick={() => finalVerify(o._id)}
          disabled={!['Received', 'Verified', 'Rejected'].includes(o.verificationStatus?.finalReport)}
        >
          <i className="fas fa-check-circle mr-2" /> Final Approve
        </button>
        <button
          className="flex-1 bg-red-600 text-white py-4 px-6 rounded-2xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
          onClick={() => finalReject(o._id)}
          disabled={!['Received', 'Verified', 'Rejected'].includes(o.verificationStatus?.finalReport)}
        >
          <i className="fas fa-times-circle mr-2" /> Final Reject
        </button>
      </div>
    </div>
  </div>
);

const OrgVerify = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [expandedRow, setExpandedRow] = useState(null);
  const [notification, setNotification] = useState(null);
  const [modal, setModal] = useState({ active: false, message: '', onConfirm: () => {} });
  const [fileViewer, setFileViewer] = useState({ active: false, file: null });

  const handleNotify = (message, type = 'info', duration = 5000, isFinalReject = false) => {
    setNotification({ message, type, isFinalReject });
    setTimeout(() => setNotification(null), duration);
  };

  const closeFileViewer = () => setFileViewer({ active: false, file: null });
  const toggleDocumentDetails = (rowId) => setExpandedRow(expandedRow === rowId ? null : rowId);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await getOrganizationsForVerification(currentPage, limit);
      const data = response?.data || response;
      const pages = response?.pages;
      const orgData = Array.isArray(data) ? data : (response?.data || []);
      setOrganizations(orgData.map((o, index) => ({ ...o, rowId: index + 1 })));
      if (pages) setTotalPages(pages);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      handleNotify('Failed to load organizations. Please try again.', 'error');
    }
  }, [currentPage, limit]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations, currentPage]);

  const verifyDocument = async (orgId, field) => {
    try {
      const res = await approveOrgField(orgId, field);
      if (res?.isError) {
        handleNotify(res.message || 'Failed to approve document', 'error');
      } else {
        const fieldName = FIELD_MAP[field]?.name || field;
        handleNotify(`Document ${fieldName} verified.`, 'success');
        fetchOrganizations();
      }
    } catch (error) {
      console.error('Error approving document:', error);
      handleNotify('Failed to approve document', 'error');
    }
  };

  const rejectDocument = async (orgId, field) => {
    try {
      const res = await disapproveOrgField(orgId, field);
      if (res?.isError) {
        handleNotify(res.message || 'Failed to reject document', 'error');
      } else {
        const fieldName = FIELD_MAP[field]?.name || field;
        handleNotify(`Document ${fieldName} rejected.`, 'error');
        fetchOrganizations();
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      handleNotify('Failed to reject document', 'error');
    }
  };

  const finalVerify = async (orgId) => {
    try {
      const res = await finalApproveOrg(orgId);
      if (res?.isError) {
        handleNotify(res.message || 'Failed to finalize approval', 'error');
      } else {
        handleNotify('Organization has been finally approved!', 'success');
        fetchOrganizations();
        setExpandedRow(null);
      }
    } catch (error) {
      console.error('Error finalizing approval:', error);
      handleNotify('Failed to finalize approval', 'error');
    }
  };

  const finalReject = async (orgId) => {
    try {
      const res = await finalDisapproveOrg(orgId);
      if (res?.isError) {
        handleNotify(res.message || 'Failed to finalize rejection', 'error');
      } else {
        handleNotify('Organization has been finally rejected.', 'error', 5000, true);
        fetchOrganizations();
        setExpandedRow(null);
      }
    } catch (error) {
      console.error('Error finalizing rejection:', error);
      handleNotify('Failed to finalize rejection', 'error');
    }
  };

  const handleFileUpload = async (orgId, file) => {
    if (!file) return handleNotify('Please select a file to upload.', 'warning');
    const formData = new FormData();
    formData.append('finalReport', file);
    try {
      const res = await uploadOrgReport(orgId, formData);
      if (res?.isError) {
        handleNotify(res.message || 'Failed to upload verification report', 'error');
      } else {
        handleNotify('Verification report uploaded successfully.', 'success');
        fetchOrganizations();
      }
    } catch (error) {
      console.error('Error uploading report:', error);
      handleNotify('Failed to upload verification report', 'error');
    }
  };

  const viewFile = async (orgId, field) => {
    try {
      const data = await getOrgFile(orgId, field);
      if (data && !data.isError && data.file) {
        setFileViewer({ active: true, file: { dataUrl: data.file.url, mime: data.file.mime } });
      } else {
        handleNotify('File is not uploaded or data is missing.', 'warning');
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      handleNotify('File is not uploaded or data is missing.', 'warning');
    }
  };

  const downloadFile = async (orgId, field, fileName, fileExt) => {
    try {
      const data = await getOrgFile(orgId, field);
      if (data && !data.isError && data.file) {
        const link = document.createElement('a');
        link.href = data.file.url;
        link.download = `${fileName}.${fileExt}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        handleNotify(`Starting download for ${fileName}.`, 'info');
      } else {
        handleNotify('File is not available for download.', 'warning');
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      handleNotify('File is not uploaded or data is missing.', 'warning');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-emerald-50 to-teal-50 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 pt-2 px-4 min-h-[60px] max-h-[100px]">
          <button
            onClick={() => navigate('/admin/profile')}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md font-medium cursor-pointer"
          >
            <i className="fas fa-chevron-left mr-2" /> Back
          </button>
          <div className="flex-1 text-center">
            <div className="inline-flex items-center justify-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-600 rounded-2xl shadow-lg">
                <i className="fas fa-building text-lg text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 leading-tight">
                Organization Verification
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-2 leading-tight max-w-lg mx-auto">
              Streamlined document verification system for organizations
            </p>
          </div>
          <div className="w-20" />
        </div>

        <OrgNotification notification={notification} setNotification={setNotification} />
        <OrgConfirmModal modal={modal} setModal={setModal} />
        <OrgFileViewer fileViewer={fileViewer} closeFileViewer={closeFileViewer} />

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-emerald-600">
              <tr>
                <th className="py-4 px-8 text-left text-sm font-bold uppercase tracking-wider text-white">
                  <div className="flex items-center">
                    <i className="fas fa-building mr-3 opacity-90" />
                    Organization Name
                  </div>
                </th>
                <th className="py-4 px-8 text-left text-sm font-bold uppercase tracking-wider text-white">
                  <div className="flex items-center">
                    <i className="fas fa-chart-line mr-3 opacity-90" />
                    Verification Status
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan="2" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                        <i className="fas fa-building text-3xl text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-700 mb-2">No Organizations Found</h3>
                      <p className="text-slate-500">There are currently no organizations to verify.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                organizations.map(o => {
                  const documentUploadStatus = o.documentUploadStatus || 'pending';
                  const displayStatus =
                    documentUploadStatus === 'verified' ? 'Verified' :
                    documentUploadStatus === 'rejected' ? 'Rejected' : 'Pending';
                  const statusColor =
                    documentUploadStatus === 'verified' ? 'text-emerald-600' :
                    documentUploadStatus === 'rejected' ? 'text-red-600' : 'text-amber-600';

                  return (
                    <React.Fragment key={o._id}>
                      <tr
                        id={`org-row-${o._id}`}
                        className="hover:bg-emerald-100/70 cursor-pointer transition-colors border-b border-emerald-100"
                        onClick={() => toggleDocumentDetails(o.rowId)}
                      >
                        <td className="py-3 px-8">
                          <div className="flex items-center">
                            <div className="p-3 bg-emerald-100 rounded-xl mr-4">
                              <i className="fas fa-building text-emerald-600 text-lg" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-lg">{o.name || o.org_name}</div>
                              <div className="text-sm text-slate-500">Organization</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-8">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-xl mr-3 ${documentUploadStatus === 'verified' ? 'bg-emerald-100' : documentUploadStatus === 'rejected' ? 'bg-red-100' : 'bg-amber-100'}`}>
                              <i className={`fas fa-${STATUS_ICONS[displayStatus]} ${statusColor}`} />
                            </div>
                            <span className={`font-bold text-lg ${statusColor}`}>{displayStatus}</span>
                            <i className="fas fa-chevron-down text-slate-400 ml-auto" />
                          </div>
                        </td>
                      </tr>
                      {expandedRow === o.rowId && (
                        <tr>
                          <td colSpan="2" className="p-0">
                            <OrgDocumentDetails
                              org={o}
                              viewFile={viewFile}
                              downloadFile={downloadFile}
                              verifyDocument={verifyDocument}
                              rejectDocument={rejectDocument}
                              handleFileUpload={handleFileUpload}
                              finalVerify={finalVerify}
                              finalReject={finalReject}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 py-6 bg-white border-t border-slate-200">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${currentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm cursor-pointer'}`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                <button
                  key={number}
                  onClick={() => setCurrentPage(number)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentPage === number ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm cursor-pointer'}`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm cursor-pointer'}`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgVerify;
