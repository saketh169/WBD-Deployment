import { createSlice, createAsyncThunk, isAnyOf } from '@reduxjs/toolkit';
import axios from '../../utils/axiosInstance';

const getAuthToken = () => localStorage.getItem('authToken_admin') || localStorage.getItem('token');

const authHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const fetchUsersByRole = createAsyncThunk(
  'admin/fetchUsersByRole',
  async ({ role, page = 1, limit = 100 }, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const res = await axios.get(`/api/crud/${role}-list?page=${page}&limit=${limit}`, authHeaders(token));
      return { role, data: res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch users');
    }
  }
);

export const searchUsersByRole = createAsyncThunk(
  'admin/searchUsersByRole',
  async ({ role, query, page = 1, limit = 100 }, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const res = await axios.get(`/api/crud/${role}-list/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, authHeaders(token));
      return { role, data: res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Search failed');
    }
  }
);

export const fetchRemovedAccounts = createAsyncThunk(
  'admin/fetchRemovedAccounts',
  async ({ query = '', page = 1, limit = 50 } = {}, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const base = query ? `/api/crud/removed-accounts/search?q=${encodeURIComponent(query)}` : '/api/crud/removed-accounts';
      const sep = base.includes('?') ? '&' : '?';
      const res = await axios.get(`${base}${sep}page=${page}&limit=${limit}`, authHeaders(token));
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch removed accounts');
    }
  }
);

export const removeUser = createAsyncThunk(
  'admin/removeUser',
  async ({ role, id, reason }, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const res = await axios.delete(`/api/crud/${role}-list/${id}`, {
        ...authHeaders(token),
        data: { reason },
      });
      return { role, id, data: res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to remove user');
    }
  }
);

export const restoreAccount = createAsyncThunk(
  'admin/restoreAccount',
  async (id, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const res = await axios.post(`/api/crud/removed-accounts/${id}/restore`, {}, authHeaders(token));
      return { id, data: res.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to restore account');
    }
  }
);

export const fetchDietitianConsultations = createAsyncThunk(
  'admin/fetchDietitianConsultations',
  async (dietitianId, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const res = await axios.get(`/api/crud/admin/dietitian/${dietitianId}/consultations`, authHeaders(token));
      return { dietitianId, consultations: res.data.data || [] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchUserConsultations = createAsyncThunk(
  'admin/fetchUserConsultations',
  async (userId, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const res = await axios.get(`/api/crud/admin/user/${userId}/consultations`, authHeaders(token));
      return { userId, consultations: res.data.data || [] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchOrganizationEmployees = createAsyncThunk(
  'admin/fetchOrganizationEmployees',
  async (organizationId, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue('No auth token found');
      const res = await axios.get(`/api/crud/admin/organization/${organizationId}/employees`, authHeaders(token));
      return { organizationId, employees: res.data.data || [] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchAllAdminManagementData = createAsyncThunk(
  'admin/fetchAllAdminManagementData',
  async (_, { dispatch }) => {
    return await Promise.all([
      dispatch(fetchUsersByRole({ role: 'user', page: 1, limit: 100 })),
      dispatch(fetchUsersByRole({ role: 'dietitian', page: 1, limit: 100 })),
      dispatch(fetchUsersByRole({ role: 'organization', page: 1, limit: 100 })),
      dispatch(fetchRemovedAccounts({ page: 1, limit: 50 })),
    ]);
  }
);

const initialState = {
  users: { user: [], dietitian: [], organization: [], _isSearchResult: false },
  usersPagination: {
    user: { page: 1, limit: 10, total: 0, pages: 1 },
    dietitian: { page: 1, limit: 10, total: 0, pages: 1 },
    organization: { page: 1, limit: 10, total: 0, pages: 1 },
  },
  removedAccounts: [],
  removedAccountsPagination: { page: 1, limit: 10, total: 0, pages: 1 },
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
    const asyncThunks = [
      fetchUsersByRole, searchUsersByRole, fetchRemovedAccounts,
      removeUser, restoreAccount, fetchDietitianConsultations,
      fetchUserConsultations, fetchOrganizationEmployees
    ];

    builder
      .addCase(fetchUsersByRole.fulfilled, (state, { payload: { role, data } }) => {
        state.users[role] = data?.data || data || [];
        state.usersPagination[role] = {
          page: data?.page || 1,
          limit: data?.limit || 10,
          total: data?.total || 0,
          pages: data?.pages || 1,
        };
        state.users._isSearchResult = false;
      })
      .addCase(searchUsersByRole.fulfilled, (state, { payload: { role, data } }) => {
        state.users[role] = data?.data || data || [];
        state.usersPagination[role] = {
          page: data?.page || 1,
          limit: data?.limit || 10,
          total: data?.total || 0,
          pages: data?.pages || 1,
        };
        state.users._isSearchResult = true;
      })
      .addCase(fetchRemovedAccounts.fulfilled, (state, { payload }) => {
        const list = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
        state.removedAccounts = list;
        state.removedAccountsPagination = {
          page: payload.page || 1,
          limit: payload.limit || 10,
          total: payload.total ?? list.length,
          pages: payload.pages || 1,
        };
      })
      .addCase(removeUser.fulfilled, (state, { payload: { role, id } }) => {
        state.users[role] = state.users[role].filter(user => user._id !== id);
        state.confirmAction = null;
      })
      .addCase(restoreAccount.fulfilled, (state, { payload: { id } }) => {
        state.removedAccounts = state.removedAccounts.filter(account => account._id !== id);
        state.confirmAction = null;
      })
      .addCase(fetchDietitianConsultations.fulfilled, (state, { payload: { dietitianId, consultations } }) => {
        state.dietitianConsultations[dietitianId] = consultations;
      })
      .addCase(fetchUserConsultations.fulfilled, (state, { payload: { userId, consultations } }) => {
        state.userConsultations[userId] = consultations;
      })
      .addCase(fetchOrganizationEmployees.fulfilled, (state, { payload: { organizationId, employees } }) => {
        state.organizationEmployees[organizationId] = employees;
      })
      .addMatcher(isAnyOf(...asyncThunks.map(t => t.pending)), (state) => {
        state.isLoading = true;
      })
      .addMatcher(isAnyOf(...asyncThunks.map(t => t.fulfilled)), (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addMatcher(isAnyOf(...asyncThunks.map(t => t.rejected)), (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error?.message || 'Request failed';
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