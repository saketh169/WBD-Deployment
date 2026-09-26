import { createSlice, createAsyncThunk, isAnyOf } from '@reduxjs/toolkit';
import axios from '../../utils/axiosInstance';

const getAuthToken = () => localStorage.getItem('authToken_admin') || localStorage.getItem('token');

const handleApiCall = async (apiCall, fallbackData = null) => {
  try {
    const token = getAuthToken();
    if (!token) return fallbackData;
    return await apiCall(token);
  } catch (error) {
    console.error('API call failed:', error);
    return fallbackData;
  }
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? 'N/A' : parsedDate.toISOString().split('T')[0];
  } catch {
    return 'N/A';
  }
};

const getDateRanges = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    return {
      date: formatDate(date),
      displayDate: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    };
  });

  const monthlyPeriods = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(today);
    date.setMonth(today.getMonth() - i);
    date.setDate(1);
    return {
      start: formatDate(date),
      displayMonth: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      year: date.getFullYear(),
      month: date.getMonth() + 1
    };
  });

  const yearlyPeriods = Array.from({ length: 4 }, (_, i) => {
    const year = today.getFullYear() - i;
    return { year, start: `${year}-01-01`, end: `${year}-12-31` };
  });

  return { dailyDates, monthlyPeriods, yearlyPeriods };
};

// Async Thunks
export const fetchUserStats = createAsyncThunk('analytics/fetchUserStats', async () => {
  const fallback = { totalUsers: 0, totalDietitians: 0, totalOrganizations: 0, activeDietPlans: 0, totalRegistered: 0 };
  return await handleApiCall(async (token) => {
    const authHeader = { headers: { Authorization: `Bearer ${token}` }, withCredentials: true };
    const [usersRes, dietitiansRes, organizationsRes, dietPlansRes] = await Promise.all([
      axios.get('/api/users-list', authHeader),
      axios.get('/api/dietitian-list', authHeader),
      axios.get('/api/organizations-list', authHeader),
      axios.get('/api/active-diet-plans', authHeader)
    ]);

    const totalUsers = usersRes.data?.total || usersRes.data?.data?.total || 0;
    const totalDietitians = dietitiansRes.data?.pagination?.total || dietitiansRes.data?.data?.pagination?.total || (dietitiansRes.data?.data || dietitiansRes.data || []).length || 0;
    const totalOrganizations = organizationsRes.data?.pagination?.total || organizationsRes.data?.data?.pagination?.total || (organizationsRes.data?.data || organizationsRes.data || []).length || 0;
    const activeDietPlans = (dietPlansRes.data?.data || dietPlansRes.data || []).length || 0;

    return {
      totalUsers,
      totalDietitians,
      totalOrganizations,
      activeDietPlans,
      totalRegistered: totalUsers + totalDietitians + totalOrganizations
    };
  }, fallback);
});

export const fetchMembershipRevenue = createAsyncThunk('analytics/fetchMembershipRevenue', async () => {
  const fallback = { dailyPeriods: [], monthlyPeriods: [], yearlyPeriods: [], daily: 0, monthly: 0, yearly: 0 };
  return await handleApiCall(async (token) => {
    const response = await axios.get('/api/membership-revenue', {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    return response.data?.data || response.data;
  }, fallback);
});

export const fetchConsultationRevenue = createAsyncThunk('analytics/fetchConsultationRevenue', async () => {
  const fallback = { dailyPeriods: [], monthlyPeriods: [], yearlyPeriods: [] };
  return await handleApiCall(async (token) => {
    const response = await axios.get('/api/consultation-revenue', {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });

    if (response.data.dailyPeriods?.length > 0 && Object.prototype.hasOwnProperty.call(response.data.dailyPeriods[0], 'revenue')) {
      return {
        dailyPeriods: response.data.dailyPeriods,
        monthlyPeriods: response.data.monthlyPeriods,
        yearlyPeriods: response.data.yearlyPeriods,
        daily: response.data.daily || 0,
        monthly: response.data.monthly || 0,
        yearly: response.data.yearly || 0
      };
    }

    const consultationData = response.data.data || response.data || [];
    const { dailyDates, monthlyPeriods, yearlyPeriods } = getDateRanges();

    const dailyPeriods = dailyDates.map(day => ({
      ...day,
      revenue: consultationData
        .filter(con => formatDate(con.createdAt) === day.date)
        .reduce((sum, con) => sum + (con.amount || 0), 0)
    }));

    const monthlyRev = monthlyPeriods.map(period => ({
      month: period.displayMonth,
      revenue: consultationData
        .filter(con => {
          const conDate = new Date(con.createdAt);
          return conDate.getFullYear() === period.year && conDate.getMonth() === period.month - 1;
        })
        .reduce((sum, con) => sum + (con.amount || 0), 0)
    }));

    const yearlyRev = yearlyPeriods.map(period => ({
      year: period.year,
      revenue: consultationData
        .filter(con => new Date(con.createdAt).getFullYear() === period.year)
        .reduce((sum, con) => sum + (con.amount || 0), 0)
    })).reverse();

    return { dailyPeriods, monthlyPeriods: monthlyRev, yearlyPeriods: yearlyRev };
  }, fallback);
});

export const fetchUserGrowth = createAsyncThunk('analytics/fetchUserGrowth', async () => {
  const fallback = { monthlyGrowth: [], totalUsers: 0 };
  return await handleApiCall(async (token) => {
    const response = await axios.get('/api/user-growth', {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    const resData = response.data?.data || response.data || {};
    return {
      monthlyGrowth: resData.monthlyGrowth || response.data?.monthlyGrowth || [],
      totalUsers: resData.totalUsers || response.data?.totalUsers || 0
    };
  }, fallback);
});

export const fetchSubscriptions = createAsyncThunk('analytics/fetchSubscriptions', async () => {
  return await handleApiCall(async (token) => {
    const response = await axios.get('/api/subscriptions', {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    return response.data.data || response.data || [];
  }, []);
});

export const fetchRevenueAnalytics = createAsyncThunk('analytics/fetchRevenueAnalytics', async () => {
  const fallback = {
    summary: {
      totalRevenue: 0,
      totalSubscriptionRevenue: 0,
      totalConsultationRevenue: 0,
      totalPlatformEarnings: 0,
      totalDietitianEarnings: 0,
      commissionRates: { consultationCommission: '15%', platformShare: '20%' }
    },
    peakHours: { consultation: [], membership: [] },
    monthlyBreakdown: [],
    recentConsultations: []
  };
  return await handleApiCall(async (token) => {
    const response = await axios.get('/api/revenue-analytics', {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    return response.data.data || response.data || fallback;
  }, fallback);
});

export const fetchDietitianRevenue = createAsyncThunk('analytics/fetchDietitianRevenue', async () => {
  const fallback = { data: [], totalDietitians: 0, totalRevenue: 0 };
  return await handleApiCall(async (token) => {
    const response = await axios.get('/api/dietitian-revenue', {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    return response.data || fallback;
  }, fallback);
});

export const fetchUserRevenue = createAsyncThunk('analytics/fetchUserRevenue', async () => {
  const fallback = { data: [], totalUsers: 0, totalRevenue: 0 };
  return await handleApiCall(async (token) => {
    const response = await axios.get('/api/user-revenue', {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    return response.data || fallback;
  }, fallback);
});

export const fetchAllAdminAnalytics = createAsyncThunk('analytics/fetchAllAdminAnalytics', async (_, { dispatch }) => {
  return await Promise.all([
    dispatch(fetchUserStats()),
    dispatch(fetchUserGrowth()),
    dispatch(fetchMembershipRevenue()),
    dispatch(fetchConsultationRevenue()),
    dispatch(fetchSubscriptions()),
    dispatch(fetchRevenueAnalytics()),
  ]);
});

export const fetchFullAnalyticsDashboard = createAsyncThunk('analytics/fetchFullAnalyticsDashboard', async (_, { dispatch }) => {
  return await Promise.all([
    dispatch(fetchUserStats()),
    dispatch(fetchMembershipRevenue()),
    dispatch(fetchConsultationRevenue()),
    dispatch(fetchSubscriptions()),
    dispatch(fetchRevenueAnalytics()),
    dispatch(fetchDietitianRevenue()),
    dispatch(fetchUserRevenue()),
  ]);
});

const initialState = {
  userStats: { totalRegistered: 0, totalUsers: 0, totalDietitians: 0, totalOrganizations: 0, activeDietPlans: 0 },
  userGrowth: { monthlyGrowth: [], totalUsers: 0 },
  membershipRevenue: { dailyPeriods: [], monthlyPeriods: [], yearlyPeriods: [], daily: 0, monthly: 0, yearly: 0 },
  consultationRevenue: { dailyPeriods: [], monthlyPeriods: [], yearlyPeriods: [] },
  revenueAnalytics: {
    summary: {
      totalRevenue: 0,
      totalSubscriptionRevenue: 0,
      totalConsultationRevenue: 0,
      totalPlatformEarnings: 0,
      totalDietitianEarnings: 0,
      commissionRates: { consultationCommission: '15%', platformShare: '20%' }
    },
    monthlyBreakdown: [],
    recentConsultations: []
  },
  dietitianRevenue: { data: [], totalDietitians: 0, totalRevenue: 0 },
  userRevenue: { data: [], totalUsers: 0, totalRevenue: 0 },
  subscriptions: [],
  expandedSubscriptionId: null,
  isLoading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setExpandedSubscriptionId: (state, action) => {
      state.expandedSubscriptionId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const asyncThunks = [
      fetchUserStats, fetchUserGrowth, fetchMembershipRevenue,
      fetchConsultationRevenue, fetchSubscriptions, fetchRevenueAnalytics,
      fetchDietitianRevenue, fetchUserRevenue
    ];

    builder
      .addCase(fetchUserStats.fulfilled, (state, { payload }) => { state.userStats = payload; })
      .addCase(fetchUserGrowth.fulfilled, (state, { payload }) => { state.userGrowth = payload; })
      .addCase(fetchMembershipRevenue.fulfilled, (state, { payload }) => { state.membershipRevenue = payload; })
      .addCase(fetchConsultationRevenue.fulfilled, (state, { payload }) => { state.consultationRevenue = payload; })
      .addCase(fetchSubscriptions.fulfilled, (state, { payload }) => { state.subscriptions = payload; })
      .addCase(fetchRevenueAnalytics.fulfilled, (state, { payload }) => { state.revenueAnalytics = payload; })
      .addCase(fetchDietitianRevenue.fulfilled, (state, { payload }) => { state.dietitianRevenue = payload; })
      .addCase(fetchUserRevenue.fulfilled, (state, { payload }) => { state.userRevenue = payload; })
      .addMatcher(isAnyOf(...asyncThunks.map(t => t.pending)), (state) => {
        state.isLoading = true;
      })
      .addMatcher(isAnyOf(...asyncThunks.map(t => t.fulfilled)), (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addMatcher(isAnyOf(...asyncThunks.map(t => t.rejected)), (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message;
      });
  },
});

export const { setExpandedSubscriptionId, clearError } = analyticsSlice.actions;
export default analyticsSlice.reducer;