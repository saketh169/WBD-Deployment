import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const uploadLabReport = (formData) =>
  makeRequest(() =>
    axiosInstance.post('/api/lab-reports/lab/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );

export const getClientLabReports = (clientId, dietitianId = null) => {
  const endpoint = dietitianId ? `/api/lab-reports/client/${clientId}/dietitian/${dietitianId}` : `/api/lab-reports/client/${clientId}`;
  return makeRequest(() => axiosInstance.get(endpoint));
};

export const getDietitianLabReports = (dietitianId, clientId = null) => {
  const endpoint = clientId ? `/api/lab-reports/client/${clientId}/dietitian/${dietitianId}` : `/api/lab-reports/dietitian/${dietitianId}`;
  return makeRequest(() => axiosInstance.get(endpoint));
};

export const getHealthReport = (clientId, dietitianId = null) => {
  const endpoint = dietitianId ? `/api/health-reports/client/${clientId}/dietitian/${dietitianId}` : `/api/health-reports/${clientId}`;
  return makeRequest(() => axiosInstance.get(endpoint));
};

export const getDietitianHealthReports = (dietitianId, clientId) =>
  makeRequest(() => axiosInstance.get(`/api/health-reports/dietitian/${dietitianId}/client/${clientId}`));

export const createHealthReport = (formData) =>
  makeRequest(() =>
    axiosInstance.post('/api/health-reports/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );

export const markHealthReportViewed = (reportId) =>
  makeRequest(() => axiosInstance.put(`/api/health-reports/${reportId}/viewed`, {}));

export const saveHealthReport = (userId, reportData) =>
  makeRequest(() => axiosInstance.post(`/api/health-reports/${userId}`, reportData));
