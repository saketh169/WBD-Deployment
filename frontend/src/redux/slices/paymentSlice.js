import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axiosInstance';

const API_BASE_URL = '/api/payments';
const SETTINGS_API_URL = '/api/settings';

const getAuthToken = (role = 'user') => localStorage.getItem(`authToken_${role}`);
const getAuthConfig = (role = 'user') => {
  const token = getAuthToken(role);
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const d = (response) => response.data?.data ?? response.data;
const ok = (response) => response.data?.success === true || response.data?.isError === false;

const defaultPlans = {
  monthly: [
    {
      name: 'Basic',
      price: 299,
      desc1: 'Perfect starter plan for your wellness journey',
      desc2: '3 consultations/month • 5 days advance booking • 5 progress plans • 25 daily chatbot queries • No blog posting',
      features: ['3 Consultations per month', 'Book up to 5 days in advance', '5 Personalized Progress Plans', '25 AI Chatbot queries per day', 'No Blog posting', 'Unlimited Chat & Video Calls', 'Blog Reading Access', 'Email Support'],
    },
    {
      name: 'Premium',
      price: 599,
      desc1: 'Most popular for serious health goals',
      desc2: '5 consultations/month • 7 days advance booking • 10 progress plans • 40 daily chatbot queries • 3 blog posts/month',
      features: ['5 Consultations per month', 'Book up to 7 days in advance', '10 Personalized Progress Plans', '40 AI Chatbot queries per day', 'Create 3 Blog posts per month', 'Unlimited Chat & Video Calls', 'Full Blog Access', 'Priority Email Support', 'Advanced Progress Analytics', 'Lab Report Analysis'],
    },
    {
      name: 'Ultimate',
      price: 899,
      desc1: 'Complete wellness package with all features',
      desc2: '12 consultations/month • 14 days advance booking • 20 progress plans • 75 daily chatbot queries • 10 blog posts/month',
      features: ['12 Consultations per month', 'Book up to 14 days in advance', '20 Personalized Progress Plans', '75 AI Chatbot queries per day', 'Create 10 Blog posts per month', 'Unlimited Chat & Video Calls', 'Full Blog Access & Priority', '24/7 Priority Support', 'Premium Analytics Dashboard', 'AI-Powered Health Insights', 'Exclusive Health Resources', 'Priority Dietitian Matching'],
    },
  ],
  yearly: [
    {
      name: 'Basic',
      price: 999,
      desc1: 'Save 72% with yearly subscription!',
      desc2: '3 consultations/month • 5 days advance booking • 5 progress plans • 25 daily chatbot queries • No blog posting',
      features: ['3 Consultations per month', 'Book up to 5 days in advance', '5 Personalized Progress Plans', '25 AI Chatbot queries per day', 'No Blog posting', 'Unlimited Chat & Video Calls', 'Blog Reading Access', 'Email Support'],
    },
    {
      name: 'Premium',
      price: 1999,
      desc1: 'Save 72% compared to monthly billing!',
      desc2: '5 consultations/month • 7 days advance booking • 10 progress plans • 40 daily chatbot queries • 3 blog posts/month',
      features: ['5 Consultations per month', 'Book up to 7 days in advance', '10 Personalized Progress Plans', '40 AI Chatbot queries per day', 'Create 3 Blog posts per month', 'Unlimited Chat & Video Calls', 'Full Blog Access', 'Priority Email Support', 'Advanced Progress Analytics', 'Lab Report Analysis'],
    },
    {
      name: 'Ultimate',
      price: 2999,
      desc1: 'Best Value! Save 72% on yearly plan',
      desc2: '12 consultations/month • 14 days advance booking • 20 progress plans • 75 daily chatbot queries • 10 blog posts/month',
      features: ['12 Consultations per month', 'Book up to 14 days in advance', '20 Personalized Progress Plans', '75 AI Chatbot queries per day', 'Create 10 Blog posts per month', 'Unlimited Chat & Video Calls', 'Full Blog Access & Priority', '24/7 Priority Support', 'Premium Analytics Dashboard', 'AI-Powered Health Insights', 'Exclusive Health Resources', 'Priority Dietitian Matching'],
    },
  ],
};

export const fetchPricingPlans = createAsyncThunk(
  'payment/fetchPricingPlans',
  async ({ billing = 'monthly' }, { rejectWithValue }) => {
    try {
      const response = await axios.get(SETTINGS_API_URL, getAuthConfig());
      const settings = d(response);
      const tiers = billing === 'monthly' ? settings.monthlyTiers : settings.yearlyTiers;
      if (tiers && tiers.length > 0) return { plans: tiers, billing };
      return { plans: defaultPlans[billing] || defaultPlans.monthly, billing };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pricing plans');
    }
  }
);

export const checkActiveSubscription = createAsyncThunk(
  'payment/checkActiveSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      if (!config.headers?.Authorization) return { hasActiveSubscription: false, subscription: null };
      const response = await axios.get(`${API_BASE_URL}/subscription/active`, config);
      if (ok(response)) {
        const payload = d(response);
        return {
          hasActiveSubscription: Boolean(payload.hasActiveSubscription),
          subscription: payload.subscription || null,
        };
      }
      return { hasActiveSubscription: false, subscription: null };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check subscription');
    }
  }
);

export const initializePayment = createAsyncThunk(
  'payment/initializePayment',
  async ({ planType, billingCycle, amount, paymentMethod, paymentDetails }, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      if (!config.headers?.Authorization) return rejectWithValue('Not authenticated');
      const response = await axios.post(
        `${API_BASE_URL}/initialize`,
        { planType, billingCycle, amount: parseFloat(amount), paymentMethod, paymentDetails },
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      if (ok(response)) {
        const payload = d(response);
        return payload.payment || payload;
      }
      return rejectWithValue(response.data?.message || 'Failed to initialize payment');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to initialize payment');
    }
  }
);

export const processPayment = createAsyncThunk(
  'payment/processPayment',
  async ({ paymentId, paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature }, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      if (!config.headers?.Authorization) return rejectWithValue('Not authenticated');
      if (!paymentId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return rejectWithValue('Missing Razorpay payment verification fields');
      }
      const response = await axios.post(
        `${API_BASE_URL}/process/${paymentId}`,
        { paymentMethod, razorpayOrderId, razorpayPaymentId, razorpaySignature },
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      if (ok(response)) {
        const payload = d(response);
        return payload.payment || payload;
      }
      return rejectWithValue(response.data?.message || 'Payment processing failed');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Payment processing failed');
    }
  }
);

export const verifyPayment = createAsyncThunk(
  'payment/verifyPayment',
  async (transactionId, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      if (!config.headers?.Authorization) return rejectWithValue('Not authenticated');
      if (!transactionId) return rejectWithValue('Transaction ID is required');
      const response = await axios.get(`${API_BASE_URL}/verify/${transactionId}`, config);
      if (ok(response)) {
        const payload = d(response);
        return payload.payment || payload;
      }
      return rejectWithValue(response.data?.message || 'Payment verification failed');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Payment verification failed');
    }
  }
);

export const fetchPaymentHistory = createAsyncThunk(
  'payment/fetchPaymentHistory',
  async ({ limit = 10 }, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      if (!config.headers?.Authorization) return rejectWithValue('Not authenticated');
      const response = await axios.get(`${API_BASE_URL}/history?limit=${limit}`, config);
      if (ok(response)) {
        const payload = d(response);
        return payload.payments || (Array.isArray(payload) ? payload : []);
      }
      return rejectWithValue(response.data?.message || 'Failed to fetch payment history');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment history');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'payment/cancelSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      if (!config.headers?.Authorization) return rejectWithValue('Not authenticated');
      const response = await axios.post(`${API_BASE_URL}/subscription/cancel`, {}, config);
      if (ok(response)) return { success: true, message: 'Subscription cancelled successfully' };
      return rejectWithValue(response.data?.message || 'Failed to cancel subscription');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel subscription');
    }
  }
);

const initialState = {
  plans: [],
  billing: 'monthly',
  hasActiveSubscription: false,
  activeSubscription: null,
  currentPayment: null,
  paymentStatus: null,
  verifiedPayment: null,
  paymentHistory: [],
  selectedPlan: null,
  isLoading: false,
  isLoadingPlans: false,
  isLoadingSubscription: false,
  isProcessingPayment: false,
  isCancelling: false,
  error: null,
  successMessage: null,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setBilling: (state, action) => { state.billing = action.payload; },
    setSelectedPlan: (state, action) => { state.selectedPlan = action.payload; },
    clearSelectedPlan: (state) => { state.selectedPlan = null; },
    resetPaymentStatus: (state) => {
      state.paymentStatus = null;
      state.currentPayment = null;
      state.error = null;
    },
    clearVerifiedPayment: (state) => { state.verifiedPayment = null; },
    clearError: (state) => { state.error = null; },
    clearSuccessMessage: (state) => { state.successMessage = null; },
    setPaymentStatus: (state, action) => { state.paymentStatus = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      // Plans
      .addCase(fetchPricingPlans.pending, (state) => { state.isLoadingPlans = true; state.error = null; })
      .addCase(fetchPricingPlans.fulfilled, (state, action) => {
        state.plans = action.payload.plans;
        state.billing = action.payload.billing;
        state.isLoadingPlans = false;
      })
      .addCase(fetchPricingPlans.rejected, (state, action) => { state.isLoadingPlans = false; state.error = action.payload; })

      // Subscription
      .addCase(checkActiveSubscription.pending, (state) => { state.isLoadingSubscription = true; state.error = null; })
      .addCase(checkActiveSubscription.fulfilled, (state, action) => {
        state.hasActiveSubscription = action.payload.hasActiveSubscription;
        state.activeSubscription = action.payload.subscription;
        state.isLoadingSubscription = false;
      })
      .addCase(checkActiveSubscription.rejected, (state, action) => { state.isLoadingSubscription = false; state.error = action.payload; })

      // Initialize
      .addCase(initializePayment.pending, (state) => {
        state.isProcessingPayment = true;
        state.paymentStatus = 'initializing';
        state.error = null;
      })
      .addCase(initializePayment.fulfilled, (state, action) => {
        state.currentPayment = action.payload;
        state.paymentStatus = 'processing';
        state.isProcessingPayment = false;
      })
      .addCase(initializePayment.rejected, (state, action) => {
        state.isProcessingPayment = false;
        state.paymentStatus = 'failed';
        state.error = action.payload;
      })

      // Process
      .addCase(processPayment.pending, (state) => { state.isProcessingPayment = true; state.error = null; })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.currentPayment = action.payload;
        state.paymentStatus = 'success';
        state.isProcessingPayment = false;
        state.hasActiveSubscription = true;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.isProcessingPayment = false;
        state.paymentStatus = 'failed';
        state.error = action.payload;
      })

      // Verify
      .addCase(verifyPayment.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.verifiedPayment = action.payload;
        state.isLoading = false;
      })
      .addCase(verifyPayment.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      // History
      .addCase(fetchPaymentHistory.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.paymentHistory = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      // Cancel
      .addCase(cancelSubscription.pending, (state) => { state.isCancelling = true; state.error = null; })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.isCancelling = false;
        state.hasActiveSubscription = false;
        state.activeSubscription = null;
        state.successMessage = 'Subscription cancelled successfully';
      })
      .addCase(cancelSubscription.rejected, (state, action) => { state.isCancelling = false; state.error = action.payload; });
  },
});

export const {
  setBilling,
  setSelectedPlan,
  clearSelectedPlan,
  resetPaymentStatus,
  clearVerifiedPayment,
  clearError,
  clearSuccessMessage,
  setPaymentStatus,
} = paymentSlice.actions;

export const selectPlans = (state) => state.payment.plans;
export const selectBilling = (state) => state.payment.billing;
export const selectHasActiveSubscription = (state) => state.payment.hasActiveSubscription;
export const selectActiveSubscription = (state) => state.payment.activeSubscription;
export const selectCurrentPayment = (state) => state.payment.currentPayment;
export const selectPaymentStatus = (state) => state.payment.paymentStatus;
export const selectVerifiedPayment = (state) => state.payment.verifiedPayment;
export const selectPaymentHistory = (state) => state.payment.paymentHistory;
export const selectSelectedPlan = (state) => state.payment.selectedPlan;
export const selectIsLoading = (state) => state.payment.isLoading;
export const selectIsLoadingPlans = (state) => state.payment.isLoadingPlans;
export const selectIsLoadingSubscription = (state) => state.payment.isLoadingSubscription;
export const selectIsProcessingPayment = (state) => state.payment.isProcessingPayment;
export const selectIsCancelling = (state) => state.payment.isCancelling;
export const selectError = (state) => state.payment.error;
export const selectSuccessMessage = (state) => state.payment.successMessage;

export default paymentSlice.reducer;
