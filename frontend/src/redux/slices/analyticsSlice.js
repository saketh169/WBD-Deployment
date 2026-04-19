import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken_admin');
};

// Helper function to handle API errors and fallback
const handleApiCall = async (apiCall, fallbackData = null) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token found, using fallback data');
      return fallbackData;
    }

    const result = await apiCall(token);
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    return fallbackData;
  }
};

// Date formatting utilities
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return 'N/A';
    return parsedDate.toISOString().split('T')[0];
  } catch {
    return 'N/A';
  }
};

const getDateRanges = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dailyDates.push({
      date: formatDate(date),
      displayDate: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    });
  }

  const monthlyPeriods = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(today);
    date.setMonth(today.getMonth() - i);
    date.setDate(1);
    monthlyPeriods.push({
      start: formatDate(date),
      displayMonth: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      year: date.getFullYear(),
      month: date.getMonth() + 1
    });
  }

  const yearlyPeriods = [];
  for (let i = 0; i < 4; i++) {
    const year = today.getFullYear() - i;
    yearlyPeriods.push({
      year,
      start: `${year}-01-01`,
      end: `${year}-12-31`
    });
  }

  return { dailyDates, monthlyPeriods, yearlyPeriods };
};

// --- Async Thunks for API Calls ---

// Fetch user statistics
export const fetchUserStats = createAsyncThunk(
  'analytics/fetchUserStats',
  async () => {
    const fallbackData = {
      totalUsers: 0,
      totalDietitians: 0,
      totalOrganizations: 0,
      activeDietPlans: 0,
      totalRegistered: 0
    };

    const data = await handleApiCall(async (token) => {
      const [usersRes, dietitiansRes, organizationsRes, dietPlansRes] = await Promise.all([
        axios.get('/api/users-list', {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        axios.get('/api/dietitian-list', {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        axios.get('/api/organizations-list', {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        axios.get('/api/active-diet-plans', {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        })
      ]);

      // Extract counts from different response formats
      const totalUsers = usersRes.data.total || 0;
      const totalDietitians = dietitiansRes.data.pagination?.total || (dietitiansRes.data.data || []).length || 0;
      const totalOrganizations = organizationsRes.data.pagination?.total || (organizationsRes.data.data || []).length || 0;
      const activeDietPlans = (dietPlansRes.data.data || []).length || 0;
      const totalRegistered = totalUsers + totalDietitians + totalOrganizations;

      return {
        totalUsers,
        totalDietitians,
        totalOrganizations,
        activeDietPlans,
        totalRegistered
      };
    }, fallbackData);

    return data;
  }
);

// Fetch membership revenue
export const fetchMembershipRevenue = createAsyncThunk(
  'analytics/fetchMembershipRevenue',
  async () => {
    const fallbackData = {
      dailyPeriods: [],
      monthlyPeriods: [],
      yearlyPeriods: [],
      daily: 0,
      monthly: 0,
      yearly: 0
    };

    const data = await handleApiCall(async (token) => {
      const response = await axios.get('/api/membership-revenue', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      return response.data;
    }, fallbackData);

    return data;
  }
);

// Fetch consultation revenue
export const fetchConsultationRevenue = createAsyncThunk(
  'analytics/fetchConsultationRevenue',
  async () => {
    const fallbackData = {
      dailyPeriods: [],
      monthlyPeriods: [],
      yearlyPeriods: []
    };

    const data = await handleApiCall(async (token) => {
      const response = await axios.get('/api/consultation-revenue', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      // Check if backend already calculated the periods with revenue
      if (response.data.dailyPeriods && Array.isArray(response.data.dailyPeriods) &&
        response.data.dailyPeriods.length > 0 &&
        Object.prototype.hasOwnProperty.call(response.data.dailyPeriods[0], 'revenue')) {
        // Backend already calculated everything with revenue, use it directly
        return {
          dailyPeriods: response.data.dailyPeriods,
          monthlyPeriods: response.data.monthlyPeriods,
          yearlyPeriods: response.data.yearlyPeriods,
          daily: response.data.daily || 0,
          monthly: response.data.monthly || 0,
          yearly: response.data.yearly || 0
        };
      }

      // Fallback to old logic if backend doesn't provide calculated data
      const consultationData = response.data.data || response.data || [];
      const { dailyDates, monthlyPeriods, yearlyPeriods } = getDateRanges();

      // Daily Consultation Revenue
      const dailyConsultationRevenue = dailyDates.map(day => {
        const revenue = consultationData
          .filter(con => formatDate(con.createdAt) === day.date)
          .reduce((sum, con) => sum + (con.amount || 0), 0);
        return { ...day, revenue };
      });

      // Monthly Consultation Revenue
      const monthlyConsultationRevenue = monthlyPeriods.map(period => {
        const revenue = consultationData
          .filter(con => {
            const conDate = new Date(con.createdAt);
            return conDate.getFullYear() === period.year && conDate.getMonth() === period.month - 1;
          })
          .reduce((sum, con) => sum + (con.amount || 0), 0);
        return { month: period.displayMonth, revenue };
      });

      // Yearly Consultation Revenue
      const yearlyConsultationRevenue = yearlyPeriods.map(period => {
        const revenue = consultationData
          .filter(con => new Date(con.createdAt).getFullYear() === period.year)
          .reduce((sum, con) => sum + (con.amount || 0), 0);
        return { year: period.year, revenue };
      }).reverse();

      return {
        dailyPeriods: dailyConsultationRevenue,
        monthlyPeriods: monthlyConsultationRevenue,
        yearlyPeriods: yearlyConsultationRevenue
      };
    }, fallbackData);

    return data;
  }
);

// Fetch user growth data (historical)
export const fetchUserGrowth = createAsyncThunk(
  'analytics/fetchUserGrowth',
  async () => {
    const fallbackData = {
      monthlyGrowth: [],
      totalUsers: 0
    };

    const data = await handleApiCall(async (token) => {
      // Get user growth data from backend (already aggregated by month)
      const response = await axios.get('/api/user-growth', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      // Backend already returns aggregated monthly growth data
      const monthlyGrowth = response.data.monthlyGrowth || [];
      const totalUsers = response.data.totalUsers || 0;

      return {
        monthlyGrowth,
        totalUsers
      };
    }, fallbackData);

    return data;
  }
);

// Fetch subscriptions data
export const fetchSubscriptions = createAsyncThunk(
  'analytics/fetchSubscriptions',
  async () => {
    const fallbackData = [];

    const data = await handleApiCall(async (token) => {
      const response = await axios.get('/api/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      return response.data.data || response.data || [];
    }, fallbackData);

    return data;
  }
);

// Fetch revenue analytics with commission calculations
export const fetchRevenueAnalytics = createAsyncThunk(
  'analytics/fetchRevenueAnalytics',
  async () => {
    const fallbackData = {
      summary: {
        totalRevenue: 0,
        totalSubscriptionRevenue: 0,
        totalConsultationRevenue: 0,
        totalPlatformEarnings: 0,
        totalDietitianEarnings: 0,
        commissionRates: {
          consultationCommission: '15%',
          platformShare: '20%'
        }
      },
      peakHours: {
        consultation: [],
        membership: []
      },
      monthlyBreakdown: [],
      recentConsultations: []
    };

    const data = await handleApiCall(async (token) => {
      const response = await axios.get('/api/revenue-analytics', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      return response.data.data || response.data || fallbackData;
    }, fallbackData);

    return data;
  }
);

// Fetch dietitian-specific revenue
export const fetchDietitianRevenue = createAsyncThunk(
  'analytics/fetchDietitianRevenue',
  async () => {
    const fallbackData = {
      data: [],
      totalDietitians: 0,
      totalRevenue: 0
    };

    const data = await handleApiCall(async (token) => {
      const response = await axios.get('/api/dietitian-revenue', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      return response.data || fallbackData;
    }, fallbackData);

    return data;
  }
);

// Fetch user-specific revenue
export const fetchUserRevenue = createAsyncThunk(
  'analytics/fetchUserRevenue',
  async () => {
    const fallbackData = {
      data: [],
      totalUsers: 0,
      totalRevenue: 0
    };

    const data = await handleApiCall(async (token) => {
      const response = await axios.get('/api/user-revenue', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      return response.data || fallbackData;
    }, fallbackData);

    return data;
  }
);

// --- Initial State ---
const initialState = {
  userStats: {
    totalRegistered: 0,
    totalUsers: 0,
    totalDietitians: 0,
    totalOrganizations: 0,
    activeDietPlans: 0,
  },
  userGrowth: {
    monthlyGrowth: [],
    totalUsers: 0,
  },
  membershipRevenue: {
    dailyPeriods: [],
    monthlyPeriods: [],
    yearlyPeriods: [],
    daily: 0,
    monthly: 0,
    yearly: 0,
  },
  consultationRevenue: {
    dailyPeriods: [],
    monthlyPeriods: [],
    yearlyPeriods: [],
  },
  revenueAnalytics: {
    summary: {
      totalRevenue: 0,
      totalSubscriptionRevenue: 0,
      totalConsultationRevenue: 0,
      totalPlatformEarnings: 0,
      totalDietitianEarnings: 0,
      commissionRates: {
        consultationCommission: '15%',
        platformShare: '20%'
      }
    },
    monthlyBreakdown: [],
    recentConsultations: []
  },
  dietitianRevenue: {
    data: [],
    totalDietitians: 0,
    totalRevenue: 0
  },
  userRevenue: {
    data: [],
    totalUsers: 0,
    totalRevenue: 0
  },
  subscriptions: [],
  expandedSubscriptionId: null,
  isLoading: false,
  error: null,
};

// --- Slice ---
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
    builder
      // Fetch User Stats
      .addCase(fetchUserStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.userStats = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch User Growth
      .addCase(fetchUserGrowth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserGrowth.fulfilled, (state, action) => {
        state.userGrowth = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchUserGrowth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch Membership Revenue
      .addCase(fetchMembershipRevenue.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMembershipRevenue.fulfilled, (state, action) => {
        state.membershipRevenue = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchMembershipRevenue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch Consultation Revenue
      .addCase(fetchConsultationRevenue.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchConsultationRevenue.fulfilled, (state, action) => {
        state.consultationRevenue = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchConsultationRevenue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch Subscriptions
      .addCase(fetchSubscriptions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.subscriptions = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch Revenue Analytics
      .addCase(fetchRevenueAnalytics.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchRevenueAnalytics.fulfilled, (state, action) => {
        state.revenueAnalytics = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchRevenueAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch Dietitian Revenue
      .addCase(fetchDietitianRevenue.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDietitianRevenue.fulfilled, (state, action) => {
        state.dietitianRevenue = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchDietitianRevenue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })

      // Fetch User Revenue
      .addCase(fetchUserRevenue.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserRevenue.fulfilled, (state, action) => {
        state.userRevenue = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchUserRevenue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

export const { setExpandedSubscriptionId, clearError } = analyticsSlice.actions;

export default analyticsSlice.reducer;