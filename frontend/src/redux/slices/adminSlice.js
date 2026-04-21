import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Mock data for fallback
const mockAllUsers = {
  'user': [
    { _id: 'u1', name: 'Alice Johnson', email: 'alice@client.com', phone: '1234567890', dob: '1990-05-15T00:00:00.000Z', gender: 'female', address: '101 Main St', consultationCount: 12 },
    { _id: 'u2', name: 'Bob Smith', email: 'bob@client.com', phone: '9876543210', dob: '1985-11-22T00:00:00.000Z', gender: 'male', address: '202 Oak Ave', consultationCount: 5 },
  ],
  'dietitian': [
    { _id: 'd1', name: 'Dr. Jane Doe', email: 'jane@dietitian.com', phone: '5551234567', age: 40, licenseNumber: 'DLN123456', verificationStatus: 'Verified', clientCount: 45 },
    { _id: 'd2', name: 'Mark Wilson', email: 'mark@dietitian.com', phone: '5559876543', age: 35, licenseNumber: 'DLN654321', verificationStatus: 'Pending', clientCount: 8 },
  ],
  'organization': [
    { _id: 'o1', name: 'Wellness Corp', email: 'admin@wellness.com', phone: '9991112222', licenseNumber: 'OLN000111', address: 'HQ Building', employeeCount: 15 },
  ],
};

const mockRemovedAccounts = [
  { _id: 'r1', name: 'Zoe Deleted', email: 'zoe@old.com', phone: '1112223333', accountType: 'User', removedOn: '2024-10-01' },
  { _id: 'r2', name: 'Dr. Removed', email: 'removed@old.com', phone: '4445556666', accountType: 'Dietitian', removedOn: '2024-10-15' },
];

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken_admin');
};

// Helper function to handle API errors and fallback to mock data
const handleApiCall = async (apiCall, mockData) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token found, using mock data');
      return mockData;
    }

    const result = await apiCall(token);
    return result;
  } catch (error) {
    console.error('API call failed, using mock data:', error);
    return mockData;
  }
};

// --- Async Thunks for API Calls ---

// Fetch all active users by role
export const fetchUsersByRole = createAsyncThunk(
  'admin/fetchUsersByRole',
  async ({ role, page = 1, limit = 10 }) => {
    const mockData = mockAllUsers[role] || [];
    const data = await handleApiCall(async (token) => {
      const response = await axios.get(`/api/crud/${role}-list?page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response.data; // Return full response to get pagination metadata
    }, { data: mockData, page, limit, total: mockData.length, pages: 1 });

    return { role, data };
  }
);

// Search users by role
export const searchUsersByRole = createAsyncThunk(
  'admin/searchUsersByRole',
  async ({ role, query, page = 1, limit = 10 }) => {
    const mockData = mockAllUsers[role] || [];
    const data = await handleApiCall(async (token) => {
      const response = await axios.get(`/api/crud/${role}-list/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response.data; // Return full response
    }, { data: mockData, page, limit, total: mockData.length, pages: 1 });

    return { role, data };
  }
);

// Fetch removed accounts
export const fetchRemovedAccounts = createAsyncThunk(
  'admin/fetchRemovedAccounts',
  async ({ query = '', page = 1, limit = 10 } = {}) => {
    const data = await handleApiCall(async (token) => {
      const baseEndpoint = query ? `/api/crud/removed-accounts/search?q=${encodeURIComponent(query)}` : '/api/crud/removed-accounts';
      const separator = baseEndpoint.includes('?') ? '&' : '?';
      const endpoint = `${baseEndpoint}${separator}page=${page}&limit=${limit}`;

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response.data; // Return full response
    }, { data: mockRemovedAccounts, page, limit, total: mockRemovedAccounts.length, pages: 1 });

    return data;
  }
);

// Remove a user
export const removeUser = createAsyncThunk(
  'admin/removeUser',
  async ({ role, id, reason }) => {
    const mockResponse = { message: 'User removed successfully' };
    const data = await handleApiCall(async (token) => {
      const response = await axios.delete(`/api/crud/${role}-list/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { reason },
        withCredentials: true,
      });
      return response.data;
    }, mockResponse);

    return { role, id, data };
  }
);

// Restore a removed account
export const restoreAccount = createAsyncThunk(
  'admin/restoreAccount',
  async (id) => {
    const mockResponse = { message: 'Account restored successfully', data: { passwordRestored: false } };
    const data = await handleApiCall(async (token) => {
      const response = await axios.post(`/api/crud/removed-accounts/${id}/restore`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response.data;
    }, mockResponse);

    return { id, data };
  }
);

// Fetch dietitian's consultations (admin view)
export const fetchDietitianConsultations = createAsyncThunk(
  'admin/fetchDietitianConsultations',
  async (dietitianId) => {
    const token = localStorage.getItem('authToken_admin');
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await axios.get(`/api/crud/admin/dietitian/${dietitianId}/consultations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    
    return { dietitianId, consultations: response.data.data || [] };
  }
);

// Fetch user's consultations (admin view)
export const fetchUserConsultations = createAsyncThunk(
  'admin/fetchUserConsultations',
  async (userId) => {
    const token = localStorage.getItem('authToken_admin');
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await axios.get(`/api/crud/admin/user/${userId}/consultations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    
    return { userId, consultations: response.data.data || [] };
  }
);

// Fetch organization's employees (admin view)
export const fetchOrganizationEmployees = createAsyncThunk(
  'admin/fetchOrganizationEmployees',
  async (organizationId) => {
    const token = localStorage.getItem('authToken_admin');
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await axios.get(`/api/crud/admin/organization/${organizationId}/employees`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    
    return { organizationId, employees: response.data.data || [] };
  }
);

// --- Initial State ---
const initialState = {
  users: {
    user: [],
    dietitian: [],
    organization: [],
    _isSearchResult: false,
  },
  usersPagination: {
    user: { page: 1, limit: 10, total: 0, pages: 1 },
    dietitian: { page: 1, limit: 10, total: 0, pages: 1 },
    organization: { page: 1, limit: 10, total: 0, pages: 1 },
  },
  removedAccounts: [],
  removedAccountsPagination: { page: 1, limit: 10, total: 0, pages: 1 },
  // New state for consultations and employees
  dietitianConsultations: {},
  userConsultations: {},
  organizationEmployees: {},
  activeRole: 'user',
  removedRole: 'user',
  searchTerm: '',
  removedSearchTerm: '',
  expandedDetails: null,
  confirmAction: null,
  removeReason: '',
  isLoading: false,
  error: null,
};

// --- Slice ---
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setActiveRole: (state, action) => {
      state.activeRole = action.payload;
      state.searchTerm = '';
      state.expandedDetails = null;
      state.confirmAction = null;
    },
    setRemovedRole: (state, action) => {
      state.removedRole = action.payload;
      state.removedSearchTerm = '';
      state.expandedDetails = null;
      state.confirmAction = null;
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setRemovedSearchTerm: (state, action) => {
      state.removedSearchTerm = action.payload;
    },
    setExpandedDetails: (state, action) => {
      state.expandedDetails = state.expandedDetails === action.payload ? null : action.payload;
      state.confirmAction = null;
    },
    setConfirmAction: (state, action) => {
      state.confirmAction = action.payload;
      state.expandedDetails = null;
      state.removeReason = '';
    },
    setRemoveReason: (state, action) => {
      state.removeReason = action.payload;
    },
    clearConfirmAction: (state) => {
      state.confirmAction = null;
      state.removeReason = '';
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users by Role
      .addCase(fetchUsersByRole.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUsersByRole.fulfilled, (state, action) => {
        const { role, data } = action.payload;
        state.users[role] = data?.data || data || [];
        state.usersPagination[role] = {
          page: data?.page || 1,
          limit: data?.limit || 10,
          total: data?.total || 0,
          pages: data?.pages || 1,
        }
        state.users._isSearchResult = false;
        state.isLoading = false;
        state.error = null;
      })

      // Search Users by Role
      .addCase(searchUsersByRole.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchUsersByRole.fulfilled, (state, action) => {
        const { role, data } = action.payload;
        state.users[role] = data?.data || data || [];
        state.usersPagination[role] = {
          page: data?.page || 1,
          limit: data?.limit || 10,
          total: data?.total || 0,
          pages: data?.pages || 1,
        }
        state.users._isSearchResult = true;
        state.isLoading = false;
        state.error = null;
      })

      // Fetch Removed Accounts
      .addCase(fetchRemovedAccounts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchRemovedAccounts.fulfilled, (state, action) => {
        state.removedAccounts = action.payload.data || action.payload;
        state.removedAccountsPagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 10,
          total: action.payload.total || 0,
          pages: action.payload.pages || 1
        };
        state.isLoading = false;
        state.error = null;
      })

      // Remove User
      .addCase(removeUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(removeUser.fulfilled, (state, action) => {
        const { role, id } = action.payload;
        state.users[role] = state.users[role].filter(user => user._id !== id);
        state.isLoading = false;
        state.confirmAction = null;
        state.error = null;
      })

      // Restore Account
      .addCase(restoreAccount.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(restoreAccount.fulfilled, (state, action) => {
        const { id } = action.payload;
        state.removedAccounts = state.removedAccounts.filter(account => account._id !== id);
        state.isLoading = false;
        state.confirmAction = null;
        state.error = null;
      })

      // Fetch Dietitian Consultations
      .addCase(fetchDietitianConsultations.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDietitianConsultations.fulfilled, (state, action) => {
        const { dietitianId, consultations } = action.payload;
        state.dietitianConsultations[dietitianId] = consultations;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchDietitianConsultations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch User Consultations
      .addCase(fetchUserConsultations.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserConsultations.fulfilled, (state, action) => {
        const { userId, consultations } = action.payload;
        state.userConsultations[userId] = consultations;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchUserConsultations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch Organization Employees
      .addCase(fetchOrganizationEmployees.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchOrganizationEmployees.fulfilled, (state, action) => {
        const { organizationId, employees } = action.payload;
        state.organizationEmployees[organizationId] = employees;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchOrganizationEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

export const {
  setActiveRole,
  setRemovedRole,
  setSearchTerm,
  setRemovedSearchTerm,
  setExpandedDetails,
  setConfirmAction,
  setRemoveReason,
  clearConfirmAction,
  clearError,
} = adminSlice.actions;

export default adminSlice.reducer;