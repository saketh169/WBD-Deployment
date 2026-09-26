import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDietitiansForVerification, approveDietitianWithLog, disapproveDietitianWithLog,
  finalApproveDietitianWithLog, finalDisapproveDietitianWithLog, uploadDietitianReport, getDietitianFile
} from '../../services/verification/verifyService';

const FIELD_MAP = {
  resume: { name: 'Resume', ext: 'pdf', icon: 'fas fa-file-alt', isImage: false },
  degreeCertificate: { name: 'Degree Certificate', ext: 'pdf', icon: 'fas fa-graduation-cap', isImage: false },
  licenseDocument: { name: 'License Document', ext: 'pdf', icon: 'fas fa-id-card', isImage: false },
  idProof: { name: 'ID Proof', ext: 'pdf', icon: 'fas fa-user', isImage: true },
  experienceCertificates: { name: 'Experience Certificates', ext: 'pdf', icon: 'fas fa-briefcase', isImage: false, optional: true },
  specializationCertifications: { name: 'Specialization Certifications', ext: 'pdf', icon: 'fas fa-certificate', isImage: false, optional: true },
  internshipCertificate: { name: 'Internship Certificate', ext: 'pdf', icon: 'fas fa-certificate', isImage: false, optional: true },
  researchPapers: { name: 'Research Papers', ext: 'pdf', icon: 'fas fa-book', isImage: false, optional: true },
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

const VerificationNotification = ({ notification, setNotification }) => {
  if (!notification) return null;
  return (
    <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl border-l-4 w-full max-w-md ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' : 'bg-blue-50 border-blue-400 text-blue-800'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <i className={`text-lg mr-3 mt-1 fas ${notification.type === 'success' ? 'fa-check-circle text-emerald-600' : notification.type === 'error' ? 'fa-exclamation-triangle text-red-600' : 'fa-info-circle text-blue-600'}`} />
          <p className="font-semibold text-sm">{notification.message}</p>
        </div>
        <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times text-sm" /></button>
      </div>
    </div>
  );
};

const VerificationConfirmModal = ({ modal, setModal }) => {
  if (!modal.active) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl mx-auto mb-4 flex items-center justify-center"><i className="fas fa-question text-2xl text-amber-600" /></div>
        <h4 className="text-2xl font-bold text-slate-800 mb-2">Confirm Action</h4>
        <p className="text-slate-600 mb-8" dangerouslySetInnerHTML={{ __html: modal.message }} />
        <div className="flex gap-3">
          <button className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-semibold" onClick={() => setModal({ active: false, message: '', onConfirm: () => {} })}>Cancel</button>
          <button className="flex-1 bg-linear-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-2xl font-semibold" onClick={modal.onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

const VerificationFileViewer = ({ fileViewer, closeFileViewer }) => {
  if (!fileViewer.active) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-full lg:max-w-6xl w-full flex flex-col overflow-hidden h-[600px]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><i className="fas fa-file-alt text-emerald-600" />Document Viewer</h3>
          <button onClick={closeFileViewer} className="p-2 text-slate-400 hover:text-red-500"><i className="fas fa-times text-xl" /></button>
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

const DietitianDocumentDetails = ({
  dietitian: d, viewFile, downloadFile, verifyDocument, rejectDocument,
  handleFileUpload, finalVerify, finalReject
}) => (
  <div className="bg-linear-to-r from-slate-50 to-emerald-50/30 p-8 border-t border-slate-200">
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <div className="p-3 bg-emerald-100 rounded-2xl mr-4"><i className="fas fa-folder-open text-emerald-600 text-xl" /></div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Document Verification</h3>
          <p className="text-slate-600">Review and verify documents for {d.name}</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {Object.keys(FIELD_MAP).map(field => {
          const status = d.verificationStatus[field] || (field === 'finalReport' ? 'Not Received' : 'Not Uploaded');
          const fileExists = ['Received', 'Pending', 'Verified', 'Rejected'].includes(status);
          const fieldInfo = FIELD_MAP[field];

          return (
            <div key={field} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-xl mr-4 ${status === 'Verified' ? 'bg-emerald-100 text-emerald-600' : status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    <i className={`${fieldInfo.icon} text-lg`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{fieldInfo.name}</h4>
                    {fieldInfo.optional && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Optional</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {status}
                </span>
                {fileExists && (
                  <div className="flex gap-2">
                    <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl" onClick={e => { e.preventDefault(); viewFile(d._id, field); }} title="View"><i className="fas fa-eye" /></button>
                    <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl" onClick={e => { e.preventDefault(); downloadFile(d._id, field, fieldInfo.name, fieldInfo.ext); }} title="Download"><i className="fas fa-download" /></button>
                  </div>
                )}
              </div>
              {status === 'Pending' && field !== 'finalReport' && (
                <div className="flex gap-3 mt-4">
                  <button className="flex-1 bg-emerald-600 text-white py-1.5 px-3 rounded-xl font-semibold text-sm hover:bg-emerald-700" onClick={() => verifyDocument(d._id, field)}><i className="fas fa-check mr-1" />Verify</button>
                  <button className="flex-1 bg-red-600 text-white py-1.5 px-3 rounded-xl font-semibold text-sm hover:bg-red-700" onClick={() => rejectDocument(d._id, field)}><i className="fas fa-times mr-1" />Reject</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 mb-6">
        <h4 className="text-xl font-bold text-slate-800 mb-1">Upload Final Verification Report</h4>
        <p className="text-slate-600 text-sm mb-4">PDF files only. Required before final approval or rejection.</p>
        <input type="file" accept=".pdf" onChange={e => handleFileUpload(d._id, e.target.files[0])} className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button className="flex-1 bg-emerald-600 text-white py-3 px-6 rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-50" onClick={() => finalVerify(d._id)} disabled={!['Received', 'Verified', 'Rejected'].includes(d.verificationStatus.finalReport)}>
          <i className="fas fa-check-circle mr-2" />Final Approve
        </button>
        <button className="flex-1 bg-red-600 text-white py-3 px-6 rounded-2xl font-bold hover:bg-red-700 disabled:opacity-50" onClick={() => finalReject(d._id)} disabled={!['Received', 'Verified', 'Rejected'].includes(d.verificationStatus.finalReport)}>
          <i className="fas fa-times-circle mr-2" />Final Reject
        </button>
      </div>
    </div>
  </div>
);

const DietitianVerify = () => {
  const [dietitians, setDietitians] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [notification, setNotification] = useState(null);
  const [modal, setModal] = useState({ active: false, message: '', onConfirm: () => {} });
  const [fileViewer, setFileViewer] = useState({ active: false, file: null });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const tableRef = useRef(null);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNotify = (message, type = 'info', duration = 5000, isFinalReject = false) => {
    setNotification({ message, type, isFinalReject });
    setTimeout(() => setNotification(null), duration);
  };

  const closeFileViewer = () => setFileViewer({ active: false, file: null });
  const toggleDocumentDetails = (rowId) => setExpandedRow(expandedRow === rowId ? null : rowId);

  const fetchDietitians = useCallback(async () => {
    try {
      const response = await getDietitiansForVerification();
      const data = response?.data || response;
      if (Array.isArray(data)) {
        setDietitians(data.map((d, index) => ({ ...d, rowId: index + 1 })));
      }
    } catch {
      handleNotify('Failed to load dietitians. Please try again.', 'error');
    }
  }, []);

  useEffect(() => { fetchDietitians(); }, [fetchDietitians]);

  const verifyDocument = async (dietitianId, field) => {
    try {
      const d = dietitians.find(x => x._id === dietitianId);
      const logDetails = d ? { activityType: 'verification_approved', targetId: dietitianId, targetType: 'dietitian', targetName: `${d.name} - ${FIELD_MAP[field]?.name || field}`, status: 'verified', notes: `Approved ${FIELD_MAP[field]?.name || field}` } : null;
      const res = await approveDietitianWithLog(dietitianId, field, logDetails);
      if (res?.isError) { handleNotify(res.message || 'Failed to approve document', 'error'); return; }
      handleNotify(`Document ${FIELD_MAP[field]?.name || field} verified.`, 'success');
      fetchDietitians();
    } catch {
      handleNotify('Failed to approve document', 'error');
    }
  };

  const rejectDocument = async (dietitianId, field) => {
    try {
      const d = dietitians.find(x => x._id === dietitianId);
      const logDetails = d ? { activityType: 'verification_rejected', targetId: dietitianId, targetType: 'dietitian', targetName: `${d.name} - ${FIELD_MAP[field]?.name || field}`, status: 'rejected', notes: `Rejected ${FIELD_MAP[field]?.name || field}` } : null;
      const res = await disapproveDietitianWithLog(dietitianId, field, logDetails);
      if (res?.isError) { handleNotify(res.message || 'Failed to reject document', 'error'); return; }
      handleNotify(`Document ${FIELD_MAP[field]?.name || field} rejected.`, 'error');
      fetchDietitians();
    } catch {
      handleNotify('Failed to reject document', 'error');
    }
  };

  const finalVerify = async (dietitianId) => {
    try {
      const d = dietitians.find(x => x._id === dietitianId);
      const logDetails = d ? { activityType: 'verification_approved', targetId: dietitianId, targetType: 'dietitian', targetName: `${d.name} - Final Approval`, status: 'verified', notes: 'Final Report Verified' } : null;
      const res = await finalApproveDietitianWithLog(dietitianId, logDetails);
      if (res?.isError) { handleNotify(res.message || 'Failed to finalize approval', 'error'); return; }
      handleNotify('Dietitian has been finally approved!', 'success');
      fetchDietitians();
      setExpandedRow(null);
    } catch {
      handleNotify('Failed to finalize approval', 'error');
    }
  };

  const finalReject = async (dietitianId) => {
    try {
      const d = dietitians.find(x => x._id === dietitianId);
      const logDetails = d ? { activityType: 'verification_rejected', targetId: dietitianId, targetType: 'dietitian', targetName: `${d.name} - Final Rejection`, status: 'rejected', notes: 'Final Report Rejected' } : null;
      const res = await finalDisapproveDietitianWithLog(dietitianId, logDetails);
      if (res?.isError) { handleNotify(res.message || 'Failed to finalize rejection', 'error'); return; }
      handleNotify('Dietitian has been finally rejected.', 'error', 5000, true);
      fetchDietitians();
      setExpandedRow(null);
    } catch {
      handleNotify('Failed to finalize rejection', 'error');
    }
  };

  const handleFileUpload = async (dietitianId, file) => {
    if (!file) return handleNotify('Please select a file to upload.', 'warning');
    const formData = new FormData();
    formData.append('finalReport', file);
    try {
      const res = await uploadDietitianReport(dietitianId, formData);
      if (res?.isError) {
        handleNotify(res.message || 'Failed to upload verification report', 'error');
      } else {
        handleNotify('Verification report uploaded successfully.', 'success');
        fetchDietitians();
      }
    } catch {
      handleNotify('Failed to upload verification report', 'error');
    }
  };

  const viewFile = async (dietitianId, field) => {
    try {
      const data = await getDietitianFile(dietitianId, field);
      if (data && !data.isError && data.file) {
        setFileViewer({ active: true, file: { dataUrl: data.file.url, mime: data.file.mime } });
      } else {
        handleNotify('File is not uploaded or data is missing.', 'warning');
      }
    } catch {
      handleNotify('File is not uploaded or data is missing.', 'warning');
    }
  };

  const downloadFile = async (dietitianId, field, fileName, fileExt) => {
    try {
      const data = await getDietitianFile(dietitianId, field);
      if (data && !data.isError && data.file) {
        const link = document.createElement('a');
        link.href = data.file.url;
        link.download = `${fileName}.${fileExt}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        handleNotify('File is not available for download.', 'warning');
      }
    } catch {
      handleNotify('File is not available for download.', 'warning');
    }
  };

  const sortedDietitians = [...dietitians].sort((a, b) => {
    const priority = d => {
      const os = d.verificationStatus?.finalReport || 'Not Received';
      const ds = d.documentUploadStatus || 'pending';
      if (ds === 'verified') return 2;
      if (os === 'Rejected' || ds === 'rejected') return 1;
      return 0;
    };
    return priority(a) - priority(b);
  });

  const totalPages = Math.ceil(sortedDietitians.length / ITEMS_PER_PAGE);
  const paginatedDietitians = sortedDietitians.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className='min-h-screen bg-linear-to-br from-slate-50 via-emerald-50 to-teal-50 pb-12 px-4 sm:px-6 lg:px-8'>
      <div className='w-full max-w-7xl mx-auto'>
        <div className='text-center py-6'>
          <h1 className='text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent'>
            Dietitian Verification
          </h1>
          <p className='text-sm text-slate-600 mt-1'>Streamlined document verification system for dietitians</p>
        </div>

        <VerificationNotification notification={notification} setNotification={setNotification} />
        <VerificationConfirmModal modal={modal} setModal={setModal} />
        <VerificationFileViewer fileViewer={fileViewer} closeFileViewer={closeFileViewer} />

        <div ref={tableRef} className='bg-white rounded-3xl shadow-xl overflow-hidden'>
          <table className='min-w-full divide-y divide-slate-200'>
            <thead className='bg-emerald-600 text-white'>
              <tr>
                <th className='py-4 px-8 text-left text-sm font-bold uppercase'>Dietitian Name</th>
                <th className='py-4 px-8 text-left text-sm font-bold uppercase'>Verification Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 bg-white'>
              {!dietitians.length ? (
                <tr><td colSpan='2' className='py-16 text-center text-slate-500'>No dietitians found to verify.</td></tr>
              ) : (
                paginatedDietitians.map(d => {
                  const overallStatus = d.verificationStatus?.finalReport || 'Not Received';
                  const docStatus = d.documentUploadStatus || 'pending';
                  const displayStatus = docStatus === 'verified' ? 'Verified' : overallStatus === 'Not Received' ? 'Pending' : overallStatus;
                  const statusColor = docStatus === 'verified' ? 'text-emerald-600' : overallStatus === 'Rejected' ? 'text-red-600' : 'text-amber-600';

                  return (
                    <React.Fragment key={d._id}>
                      <tr id={`dietitian-row-${d._id}`} className='hover:bg-emerald-50 cursor-pointer transition-colors border-b' onClick={() => toggleDocumentDetails(d.rowId)}>
                        <td className='py-3 px-8'>
                          <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600'><i className='fas fa-user-md' /></div>
                            <div>
                              <div className='font-bold text-slate-800'>{d.name}</div>
                              <div className='text-xs text-slate-500'>Dietitian</div>
                            </div>
                          </div>
                        </td>
                        <td className='py-3 px-8'>
                          <div className='flex items-center justify-between'>
                            <span className={`font-bold ${statusColor}`}><i className={`fas fa-${STATUS_ICONS[overallStatus] || 'info-circle'} mr-2`} />{displayStatus}</span>
                            <i className='fas fa-chevron-down text-slate-400' />
                          </div>
                        </td>
                      </tr>
                      {expandedRow === d.rowId && (
                        <tr>
                          <td colSpan='2' className='p-0'>
                            <DietitianDocumentDetails
                              dietitian={d} viewFile={viewFile} downloadFile={downloadFile}
                              verifyDocument={verifyDocument} rejectDocument={rejectDocument}
                              handleFileUpload={handleFileUpload} finalVerify={finalVerify} finalReject={finalReject}
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
        </div>

        {totalPages > 1 && (
          <div className='flex items-center justify-between mt-6 px-2'>
            <p className='text-sm text-slate-500'>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedDietitians.length)} of {sortedDietitians.length}</p>
            <div className='flex items-center gap-2'>
              <button onClick={() => handlePageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} className='px-3 py-1.5 rounded-lg border text-emerald-700 text-sm disabled:opacity-40'>Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => handlePageChange(p)} className={`px-3 py-1.5 rounded-lg text-sm ${p === currentPage ? 'bg-emerald-600 text-white' : 'border text-emerald-700'}`}>{p}</button>
              ))}
              <button onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages} className='px-3 py-1.5 rounded-lg border text-emerald-700 text-sm disabled:opacity-40'>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DietitianVerify;
