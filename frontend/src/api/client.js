import axios from 'axios';

export const getActiveAuthToken = () => {
  const roles = ['user', 'dietitian', 'admin', 'organization', 'employee'];
  for (const r of roles) {
    const t = localStorage.getItem(`authToken_${r}`);
    if (t) return t;
  }
  const generic = localStorage.getItem('token');
  if (generic) return generic;
  return null;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getActiveAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
