import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const getEmployees = () =>
  makeRequest(() => axiosInstance.get('/api/employees'));

export const getEmployeeStats = () =>
  makeRequest(() => axiosInstance.get('/api/employees/stats'));

export const addEmployee = (employeeData) =>
  makeRequest(() => axiosInstance.post('/api/employees/add', employeeData));

export const updateEmployee = (employeeId, data) =>
  makeRequest(() => axiosInstance.put(`/api/employees/${employeeId}`, data));

export const removeEmployee = (employeeId) =>
  makeRequest(() => axiosInstance.delete(`/api/employees/${employeeId}`));

export const inactivateEmployee = (employeeId) =>
  makeRequest(() => axiosInstance.patch(`/api/employees/${employeeId}/inactive`, {}));

export const activateEmployee = (employeeId) =>
  makeRequest(() => axiosInstance.patch(`/api/employees/${employeeId}/active`, {}));

export const bulkImportEmployees = (csvFile) => {
  const formData = new FormData();
  formData.append('csvFile', csvFile);
  return makeRequest(() =>
    axiosInstance.post('/api/employees/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
};

export const getTeamboardPosts = (orgName) =>
  makeRequest(() => axiosInstance.get(`/api/teamboard?orgName=${encodeURIComponent(orgName)}`));

export const createTeamboardPost = (payload) =>
  makeRequest(() => axiosInstance.post('/api/teamboard', payload));

export const deleteTeamboardPost = (id, email, isOrg = false) =>
  makeRequest(() => axiosInstance.delete(`/api/teamboard/${id}?email=${encodeURIComponent(email)}&isOrg=${isOrg}`));

export const getEmployeeQueries = () =>
  makeRequest(() => axiosInstance.get('/api/contact/employee-queries'));

export const getResolvedEmployeeQueries = () =>
  makeRequest(() => axiosInstance.get('/api/contact/employee-resolved-queries'));

export const replyToQuery = (queryId, replyMessage) =>
  makeRequest(() => axiosInstance.post('/api/contact/reply', { queryId, replyMessage }));

export const getEmployeeWorkSummary = () =>
  makeRequest(() => axiosInstance.get('/api/organization/employee-work-summary'));

export const logActivity = (activityData) =>
  makeRequest(() => axiosInstance.post('/api/organization/log-activity', activityData));

export const blockEmployee = (employeeId) =>
  makeRequest(() => axiosInstance.patch(`/api/employees/${employeeId}/block`));

export const unblockEmployee = (employeeId) =>
  makeRequest(() => axiosInstance.patch(`/api/employees/${employeeId}/unblock`));

export const getOrganizationDetails = () =>
  makeRequest(() => axiosInstance.get('/api/getorganizationdetails'));

export const submitEmployeeQuery = (payload) =>
  makeRequest(() => axiosInstance.post('/api/contact/employee/submit', payload));

export const getMyEmployeeQueries = (email = '') => {
  const endpoint = email ? `/api/contact/my-queries?email=${encodeURIComponent(email)}` : '/api/contact/my-queries';
  return makeRequest(() => axiosInstance.get(endpoint));
};

export const getOrgDashboardStats = () =>
  makeRequest(() => axiosInstance.get('/api/organization/dashboard-stats'));

export const getEmployeeMonitoringDashboard = async (orgName = '') => {
  try {
    const [statsRes, employeesRes, boardRes, pendingRes, resolvedRes, workRes] = await Promise.all([
      getEmployeeStats(),
      getEmployees(),
      orgName ? getTeamboardPosts(orgName) : Promise.resolve({ data: [] }),
      getEmployeeQueries(),
      getResolvedEmployeeQueries(),
      getEmployeeWorkSummary(),
    ]);

    const data = {
      stats: statsRes?.data || {},
      employees: Array.isArray(employeesRes?.data) ? employeesRes.data : [],
      boardPosts: Array.isArray(boardRes?.data) ? boardRes.data : [],
      pendingQueries: Array.isArray(pendingRes?.data) ? pendingRes.data : [],
      resolvedQueries: Array.isArray(resolvedRes?.data) ? resolvedRes.data : [],
      workSummary: Array.isArray(workRes?.data) ? workRes.data : [],
    };

    return {
      isError: false,
      success: true,
      message: 'Employee monitoring dashboard loaded',
      data,
      status: 200,
    };
  } catch (error) {
    return {
      isError: true,
      success: false,
      message: error.message || 'Failed to load employee monitoring dashboard',
      data: null,
      status: 500,
    };
  }
};

export const getEmployeeSupportDashboard = async (orgName = '', email = '') => {
  try {
    const [orgRes, boardRes, queriesRes] = await Promise.all([
      getOrganizationDetails(),
      orgName ? getTeamboardPosts(orgName) : Promise.resolve({ data: [] }),
      getMyEmployeeQueries(email),
    ]);

    const data = {
      orgDetails: orgRes?.data || {},
      boardPosts: Array.isArray(boardRes?.data) ? boardRes.data : [],
      myQueries: Array.isArray(queriesRes?.data) ? queriesRes.data : [],
    };

    return {
      isError: false,
      success: true,
      message: 'Employee support dashboard loaded',
      data,
      status: 200,
    };
  } catch (error) {
    return {
      isError: true,
      success: false,
      message: error.message || 'Failed to load employee support dashboard',
      data: null,
      status: 500,
    };
  }
};
