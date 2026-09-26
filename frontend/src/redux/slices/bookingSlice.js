import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axiosInstance';

const API_BASE_URL = '/api/bookings';
const DIETITIAN_API_URL = '/api/dietitians';

const getAuthToken = (role = 'user') =>
  localStorage.getItem(`authToken_${role}`) ||
  localStorage.getItem('authToken_user') ||
  localStorage.getItem('authToken_employee') ||
  localStorage.getItem('token');
const getAuthConfig = (role = 'user') => {
  const token = getAuthToken(role);
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};
const d = (res) => (res?.data?.data !== undefined ? res.data.data : (res?.data !== undefined ? res.data : {}));
const isSuccess = (res) => Boolean(res?.data?.success || res?.data?.isError === false);

export const checkBookingLimits = createAsyncThunk(
  'booking/checkBookingLimits',
  async ({ userId, date, time, dietitianId }, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      const response = await axios.post(
        `${API_BASE_URL}/check-limits`,
        { userId, date, time, dietitianId },
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      const resData = d(response);
      if (isSuccess(response)) {
        return {
          withinLimits: true,
          planType: resData.planType,
          currentCount: resData.currentCount,
          limit: resData.limit,
          advanceBookingDays: resData.advanceBookingDays,
        };
      }
      return rejectWithValue({
        message: resData.message || response?.data?.message,
        limitReached: resData.limitReached || response?.data?.limitReached,
        planType: resData.planType,
        currentCount: resData.currentCount,
        limit: resData.limit,
        maxAdvanceDays: resData.maxAdvanceDays,
      });
    } catch (error) {
      const errData = error.response?.data?.data || error.response?.data || {};
      if (errData.limitReached || error.response?.data?.limitReached) {
        return rejectWithValue({
          message: errData.message || error.response?.data?.message,
          limitReached: true,
          planType: errData.planType,
          currentCount: errData.currentCount,
          limit: errData.limit,
          maxAdvanceDays: errData.maxAdvanceDays,
        });
      }
      return rejectWithValue(errData.message || error.response?.data?.message || 'Failed to check booking limits');
    }
  }
);

export const createBooking = createAsyncThunk(
  'booking/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      const response = await axios.post(`${API_BASE_URL}/create`, bookingData, {
        headers: { ...config.headers, 'Content-Type': 'application/json' },
      });
      if (isSuccess(response)) return d(response);
      return rejectWithValue(response.data?.message || 'Failed to create booking');
    } catch (error) {
      const errData = error.response?.data?.data || error.response?.data || {};
      if (errData.limitReached || error.response?.data?.limitReached) {
        return rejectWithValue({
          message: errData.message || error.response?.data?.message,
          limitReached: true,
          planType: errData.planType,
          currentCount: errData.currentCount,
          limit: errData.limit,
          maxAdvanceDays: errData.maxAdvanceDays,
        });
      }
      return rejectWithValue(errData.message || error.response?.data?.message || 'Failed to create booking');
    }
  }
);

export const fetchUserBookings = createAsyncThunk(
  'booking/fetchUserBookings',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, getAuthConfig('user'));
      if (isSuccess(response)) return d(response);
      return rejectWithValue(response.data?.message || 'Failed to fetch user bookings');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user bookings');
    }
  }
);

export const fetchDietitianBookings = createAsyncThunk(
  'booking/fetchDietitianBookings',
  async ({ dietitianId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dietitian/${dietitianId}`, getAuthConfig('dietitian'));
      if (isSuccess(response)) return d(response);
      return rejectWithValue(response.data?.message || 'Failed to fetch dietitian bookings');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dietitian bookings');
    }
  }
);

export const fetchBookedSlots = createAsyncThunk(
  'booking/fetchBookedSlots',
  async ({ dietitianId, date, userId }, { rejectWithValue }) => {
    try {
      const userIdParam = userId && userId !== 'null' && userId !== 'undefined' ? userId : '';
      const response = await axios.get(
        `${API_BASE_URL}/dietitian/${dietitianId}/booked-slots?date=${date}&userId=${userIdParam}`
      );
      const resData = d(response);
      if (isSuccess(response)) {
        return {
          bookedSlots: resData.bookedSlots || response.data?.bookedSlots || [],
          userBookings: resData.userBookings || response.data?.userBookings || [],
          blockedSlots: resData.blockedSlots || response.data?.blockedSlots || [],
        };
      }
      return rejectWithValue(response.data?.message || 'Failed to fetch booked slots');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch booked slots');
    }
  }
);

export const fetchUserBookedSlots = createAsyncThunk(
  'booking/fetchUserBookedSlots',
  async ({ userId, date }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}/booked-slots?date=${date}`);
      const resData = d(response);
      if (isSuccess(response)) return resData.bookedSlots || response.data?.bookedSlots || [];
      return rejectWithValue(response.data?.message || 'Failed to fetch user booked slots');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user booked slots');
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  'booking/fetchBookingById',
  async ({ bookingId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${bookingId}`, getAuthConfig('user'));
      if (isSuccess(response)) return d(response);
      return rejectWithValue(response.data?.message || 'Failed to fetch booking');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch booking');
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'booking/updateBookingStatus',
  async ({ bookingId, status }, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      const response = await axios.patch(
        `${API_BASE_URL}/${bookingId}/status`,
        { status },
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      if (isSuccess(response)) return { bookingId, status, booking: d(response) };
      return rejectWithValue(response.data?.message || 'Failed to update booking status');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update booking status');
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'booking/cancelBooking',
  async ({ bookingId }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${bookingId}`, getAuthConfig('user'));
      if (isSuccess(response)) return bookingId;
      return rejectWithValue(response.data?.message || 'Failed to cancel booking');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel booking');
    }
  }
);

export const rescheduleBooking = createAsyncThunk(
  'booking/rescheduleBooking',
  async ({ bookingId, date, time }, { rejectWithValue }) => {
    try {
      const config = getAuthConfig('user');
      const response = await axios.patch(
        `${API_BASE_URL}/${bookingId}/reschedule`,
        { date, time },
        { headers: { ...config.headers, 'Content-Type': 'application/json' } }
      );
      if (isSuccess(response)) return d(response);
      return rejectWithValue(response.data?.message || 'Failed to reschedule booking');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reschedule booking');
    }
  }
);

export const holdSlot = createAsyncThunk(
  'booking/holdSlot',
  async ({ dietitianId, date, time }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/hold`, { dietitianId, date, time }, getAuthConfig('user'));
      return d(response);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to hold slot');
    }
  }
);

export const releaseSlot = createAsyncThunk(
  'booking/releaseSlot',
  async ({ dietitianId, date, time }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/release`, { dietitianId, date, time }, getAuthConfig('user'));
      return d(response);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to release slot');
    }
  }
);

export const fetchDietitianClients = createAsyncThunk(
  'booking/fetchDietitianClients',
  async ({ dietitianId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${DIETITIAN_API_URL}/${dietitianId}/clients`, getAuthConfig('dietitian'));
      if (isSuccess(response)) return d(response);
      return rejectWithValue(response.data?.message || 'Failed to fetch clients');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch clients');
    }
  }
);

export const fetchDietitianProfile = createAsyncThunk(
  'booking/fetchDietitianProfile',
  async ({ dietitianId }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${DIETITIAN_API_URL}/${dietitianId}`, getAuthConfig('user'));
      if (isSuccess(response)) return d(response);
      return rejectWithValue(response.data?.message || 'Failed to fetch dietitian profile');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dietitian profile');
    }
  }
);

const initialState = {
  userBookings: [],
  dietitianBookings: [],
  dietitianClients: [],
  dietitianProfiles: {},
  currentBooking: null,
  bookedSlots: [],
  userBookedSlots: [],
  blockedSlots: [],
  currentUserBookedTimesWithDietitian: [],
  bookingLimitsCheck: null,
  subscriptionAlertData: null,
  showSubscriptionAlert: false,
  selectedBookingData: null,
  isLoading: false,
  isLoadingSlots: false,
  isCreatingBooking: false,
  isUpdatingBooking: false,
  isCancellingBooking: false,
  isCheckingLimits: false,
  error: null,
  successMessage: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedBookingData: (state, action) => { state.selectedBookingData = action.payload; },
    clearSelectedBookingData: (state) => { state.selectedBookingData = null; },
    clearCurrentBooking: (state) => { state.currentBooking = null; },
    setSubscriptionAlert: (state, action) => {
      state.subscriptionAlertData = action.payload;
      state.showSubscriptionAlert = true;
    },
    clearSubscriptionAlert: (state) => {
      state.subscriptionAlertData = null;
      state.showSubscriptionAlert = false;
    },
    clearBookingLimitsCheck: (state) => { state.bookingLimitsCheck = null; },
    clearError: (state) => { state.error = null; },
    clearSuccessMessage: (state) => { state.successMessage = null; },
    clearBookedSlots: (state) => {
      state.bookedSlots = [];
      state.userBookedSlots = [];
      state.blockedSlots = [];
      state.currentUserBookedTimesWithDietitian = [];
    },
    setUserBookedSlotsLocal: (state, action) => { state.userBookedSlots = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      // Limits Check
      .addCase(checkBookingLimits.pending, (state) => { state.isCheckingLimits = true; state.error = null; })
      .addCase(checkBookingLimits.fulfilled, (state, action) => { state.isCheckingLimits = false; state.bookingLimitsCheck = action.payload; })
      .addCase(checkBookingLimits.rejected, (state, action) => {
        state.isCheckingLimits = false;
        if (action.payload?.limitReached) {
          state.subscriptionAlertData = {
            message: action.payload.message,
            planType: action.payload.planType,
            limitType: action.payload.maxAdvanceDays ? 'advance' : 'booking',
            currentCount: action.payload.currentCount || 0,
            limit: action.payload.limit || action.payload.maxAdvanceDays || 0,
          };
          state.showSubscriptionAlert = true;
        } else {
          state.error = action.payload;
        }
      })
      // Create Booking
      .addCase(createBooking.pending, (state) => { state.isCreatingBooking = true; state.error = null; })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.isCreatingBooking = false;
        state.userBookings.unshift(action.payload);
        state.currentBooking = action.payload;
        state.successMessage = 'Booking created successfully!';
        state.selectedBookingData = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isCreatingBooking = false;
        if (action.payload?.limitReached) {
          state.subscriptionAlertData = {
            message: action.payload.message,
            planType: action.payload.planType,
            limitType: action.payload.maxAdvanceDays ? 'advance' : 'booking',
            currentCount: action.payload.currentCount || 0,
            limit: action.payload.limit || action.payload.maxAdvanceDays || 0,
          };
          state.showSubscriptionAlert = true;
        } else {
          state.error = typeof action.payload === 'string' ? action.payload : action.payload?.message || 'Failed to create booking';
        }
      })
      // Fetch Bookings
      .addCase(fetchUserBookings.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchUserBookings.fulfilled, (state, action) => { state.isLoading = false; state.userBookings = action.payload; })
      .addCase(fetchUserBookings.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(fetchDietitianBookings.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchDietitianBookings.fulfilled, (state, action) => { state.isLoading = false; state.dietitianBookings = action.payload; })
      .addCase(fetchDietitianBookings.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      // Slots
      .addCase(fetchBookedSlots.pending, (state) => { state.isLoadingSlots = true; })
      .addCase(fetchBookedSlots.fulfilled, (state, action) => {
        state.isLoadingSlots = false;
        const bookedSlotsExcludingCurrentUser = action.payload.bookedSlots.filter(
          (slot) => !action.payload.userBookings.includes(slot)
        );
        state.bookedSlots = [...bookedSlotsExcludingCurrentUser, ...action.payload.blockedSlots];
        state.currentUserBookedTimesWithDietitian = action.payload.userBookings;
        state.blockedSlots = action.payload.blockedSlots;
      })
      .addCase(fetchBookedSlots.rejected, (state) => {
        state.isLoadingSlots = false;
        state.bookedSlots = [];
        state.currentUserBookedTimesWithDietitian = [];
      })

      .addCase(fetchUserBookedSlots.pending, (state) => { state.isLoadingSlots = true; })
      .addCase(fetchUserBookedSlots.fulfilled, (state, action) => { state.isLoadingSlots = false; state.userBookedSlots = action.payload; })
      .addCase(fetchUserBookedSlots.rejected, (state) => { state.isLoadingSlots = false; state.userBookedSlots = []; })

      // Single Booking
      .addCase(fetchBookingById.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchBookingById.fulfilled, (state, action) => { state.isLoading = false; state.currentBooking = action.payload; })
      .addCase(fetchBookingById.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      // Update / Cancel / Reschedule
      .addCase(updateBookingStatus.pending, (state) => { state.isUpdatingBooking = true; state.error = null; })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.isUpdatingBooking = false;
        const { bookingId, status, booking } = action.payload;
        const uIdx = state.userBookings.findIndex((b) => b._id === bookingId);
        if (uIdx !== -1) state.userBookings[uIdx] = { ...state.userBookings[uIdx], status, ...booking };
        const dIdx = state.dietitianBookings.findIndex((b) => b._id === bookingId);
        if (dIdx !== -1) state.dietitianBookings[dIdx] = { ...state.dietitianBookings[dIdx], status, ...booking };
        if (state.currentBooking?._id === bookingId) state.currentBooking = { ...state.currentBooking, status, ...booking };
        state.successMessage = 'Booking status updated successfully!';
      })
      .addCase(updateBookingStatus.rejected, (state, action) => { state.isUpdatingBooking = false; state.error = action.payload; })

      .addCase(cancelBooking.pending, (state) => { state.isCancellingBooking = true; state.error = null; })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.isCancellingBooking = false;
        const bookingId = action.payload;
        state.userBookings = state.userBookings.filter((b) => b._id !== bookingId);
        state.dietitianBookings = state.dietitianBookings.filter((b) => b._id !== bookingId);
        if (state.currentBooking?._id === bookingId) state.currentBooking = null;
        state.successMessage = 'Booking cancelled successfully!';
      })
      .addCase(cancelBooking.rejected, (state, action) => { state.isCancellingBooking = false; state.error = action.payload; })

      .addCase(rescheduleBooking.pending, (state) => { state.isUpdatingBooking = true; state.error = null; })
      .addCase(rescheduleBooking.fulfilled, (state, action) => {
        state.isUpdatingBooking = false;
        const updatedBooking = action.payload;
        const uIdx = state.userBookings.findIndex((b) => b._id === updatedBooking._id);
        if (uIdx !== -1) state.userBookings[uIdx] = updatedBooking;
        const dIdx = state.dietitianBookings.findIndex((b) => b._id === updatedBooking._id);
        if (dIdx !== -1) state.dietitianBookings[dIdx] = updatedBooking;
        if (state.currentBooking?._id === updatedBooking._id) state.currentBooking = updatedBooking;
        state.successMessage = 'Booking rescheduled successfully!';
      })
      .addCase(rescheduleBooking.rejected, (state, action) => { state.isUpdatingBooking = false; state.error = action.payload; })

      // Dietitian Clients & Profile
      .addCase(fetchDietitianClients.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchDietitianClients.fulfilled, (state, action) => { state.isLoading = false; state.dietitianClients = action.payload; })
      .addCase(fetchDietitianClients.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(fetchDietitianProfile.pending, (state) => { state.isLoading = true; })
      .addCase(fetchDietitianProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dietitianProfiles[action.payload._id] = action.payload;
      })
      .addCase(fetchDietitianProfile.rejected, (state) => { state.isLoading = false; })

      // Slot Hold
      .addCase(holdSlot.pending, (state) => { state.isLoadingSlots = true; })
      .addCase(holdSlot.fulfilled, (state) => { state.isLoadingSlots = false; })
      .addCase(holdSlot.rejected, (state, action) => {
        state.isLoadingSlots = false;
        state.error = action.payload?.message || 'Slot is currently held by someone else';
      });
  },
});

export const {
  setSelectedBookingData,
  clearSelectedBookingData,
  clearCurrentBooking,
  setSubscriptionAlert,
  clearSubscriptionAlert,
  clearBookingLimitsCheck,
  clearError,
  clearSuccessMessage,
  clearBookedSlots,
  setUserBookedSlotsLocal,
} = bookingSlice.actions;

export const selectUserBookings = (state) => state.booking.userBookings;
export const selectDietitianBookings = (state) => state.booking.dietitianBookings;
export const selectDietitianClients = (state) => state.booking.dietitianClients;
export const selectDietitianProfiles = (state) => state.booking.dietitianProfiles;
export const selectCurrentBooking = (state) => state.booking.currentBooking;
export const selectBookedSlots = (state) => state.booking.bookedSlots;
export const selectUserBookedSlots = (state) => state.booking.userBookedSlots;
export const selectBlockedSlots = (state) => state.booking.blockedSlots;
export const selectCurrentUserBookedTimesWithDietitian = (state) => state.booking.currentUserBookedTimesWithDietitian;
export const selectBookingLimitsCheck = (state) => state.booking.bookingLimitsCheck;
export const selectSubscriptionAlertData = (state) => state.booking.subscriptionAlertData;
export const selectShowSubscriptionAlert = (state) => state.booking.showSubscriptionAlert;
export const selectSelectedBookingData = (state) => state.booking.selectedBookingData;
export const selectIsLoading = (state) => state.booking.isLoading;
export const selectIsLoadingSlots = (state) => state.booking.isLoadingSlots;
export const selectIsCreatingBooking = (state) => state.booking.isCreatingBooking;
export const selectIsUpdatingBooking = (state) => state.booking.isUpdatingBooking;
export const selectIsCancellingBooking = (state) => state.booking.isCancellingBooking;
export const selectIsCheckingLimits = (state) => state.booking.isCheckingLimits;
export const selectError = (state) => state.booking.error;
export const selectSuccessMessage = (state) => state.booking.successMessage;

export default bookingSlice.reducer;
