import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const getDietitiansForVerification = (page = 1, limit = 10) =>
  makeRequest(() => axiosInstance.get('/api/verify/dietitians', { params: { page, limit } }));

export const getOrganizationsForVerification = (page = 1, limit = 10) =>
  makeRequest(() => axiosInstance.get('/api/verify/organizations', { params: { page, limit } }));

export const approveDietitianField = (dietitianId, field) =>
  makeRequest(() => axiosInstance.post(`/api/verify/${dietitianId}/approve`, { field }));

export const disapproveDietitianField = (dietitianId, field) =>
  makeRequest(() => axiosInstance.post(`/api/verify/${dietitianId}/disapprove`, { field }));

export const finalApproveDietitian = (dietitianId) =>
  makeRequest(() => axiosInstance.post(`/api/verify/${dietitianId}/final-approve`, {}));

export const finalDisapproveDietitian = (dietitianId) =>
  makeRequest(() => axiosInstance.post(`/api/verify/${dietitianId}/final-disapprove`, {}));

export const uploadDietitianReport = (dietitianId, formData) =>
  makeRequest(() =>
    axiosInstance.post(`/api/verify/${dietitianId}/upload-report`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );

export const getDietitianFile = (dietitianId, field) =>
  makeRequest(() => axiosInstance.get(`/api/verify/files/${dietitianId}/${field}`));

export const approveOrgField = (orgId, field) =>
  makeRequest(() => axiosInstance.post(`/api/verify/org/${orgId}/approve`, { field }));

export const disapproveOrgField = (orgId, field) =>
  makeRequest(() => axiosInstance.post(`/api/verify/org/${orgId}/disapprove`, { field }));

export const finalApproveOrg = (orgId) =>
  makeRequest(() => axiosInstance.post(`/api/verify/org/${orgId}/final-approve`, {}));

export const finalDisapproveOrg = (orgId) =>
  makeRequest(() => axiosInstance.post(`/api/verify/org/${orgId}/final-disapprove`, {}));

export const uploadOrgReport = (orgId, formData) =>
  makeRequest(() =>
    axiosInstance.post(`/api/verify/org/${orgId}/upload-report`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );

export const getOrgFile = (orgId, field) =>
  makeRequest(() => axiosInstance.get(`/api/verify/org/files/${orgId}/${field}`));

export const approveDietitianWithLog = async (dietitianId, field, logDetails = null) => {
  const approveRes = await approveDietitianField(dietitianId, field);
  if (!approveRes?.isError && logDetails) {
    try {
      await axiosInstance.post('/api/organization/log-activity', logDetails);
    } catch (_) {}
  }
  return approveRes;
};

export const disapproveDietitianWithLog = async (dietitianId, field, logDetails = null) => {
  const disapproveRes = await disapproveDietitianField(dietitianId, field);
  if (!disapproveRes?.isError && logDetails) {
    try {
      await axiosInstance.post('/api/organization/log-activity', logDetails);
    } catch (_) {}
  }
  return disapproveRes;
};

export const finalApproveDietitianWithLog = async (dietitianId, logDetails = null) => {
  const finalRes = await finalApproveDietitian(dietitianId);
  if (!finalRes?.isError && logDetails) {
    try {
      await axiosInstance.post('/api/organization/log-activity', logDetails);
    } catch (_) {}
  }
  return finalRes;
};

export const finalDisapproveDietitianWithLog = async (dietitianId, logDetails = null) => {
  const finalRes = await finalDisapproveDietitian(dietitianId);
  if (!finalRes?.isError && logDetails) {
    try {
      await axiosInstance.post('/api/organization/log-activity', logDetails);
    } catch (_) {}
  }
  return finalRes;
};
