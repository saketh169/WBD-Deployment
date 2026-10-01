import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

const _bookingsCache = new Map(); // key → { data, expiresAt }
const BOOKINGS_TTL_MS = 2 * 60 * 1000; // 2 minutes

const _getBCached = (key) => {
  const entry = _bookingsCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  _bookingsCache.delete(key);
  return null;
};
const _setBCache = (key, data) =>
  _bookingsCache.set(key, { data, expiresAt: Date.now() + BOOKINGS_TTL_MS });

export const holdSlot = ({ dietitianId, date, time }) =>
  makeRequest(() => axiosInstance.post('/api/bookings/hold', { dietitianId, date, time }));

export const releaseSlot = ({ dietitianId, date, time }) =>
  makeRequest(() => axiosInstance.post('/api/bookings/release', { dietitianId, date, time }));

export const getDietitianHolds = (dietitianId, date) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/dietitian/${dietitianId}/holds`, { params: { date } }));

export const createBooking = (bookingData) =>
  makeRequest(() => axiosInstance.post('/api/bookings/create', bookingData));

export const clearUserBookingsCache = (userId) => _bookingsCache.delete(`bookings:${userId}`);
export const clearDietitianBookingsCache = (dietitianId) => _bookingsCache.delete(`bookings:dietitian:${dietitianId}`);

export const getUserBookings = async (userId) => {
  const key = `bookings:${userId}`;
  const cached = _getBCached(key);
  if (cached) return cached;
  const result = await makeRequest(() => axiosInstance.get(`/api/bookings/user/${userId}/dietitian-list`));
  if (!result?.isError) _setBCache(key, result);
  return result;
};

export const getDietitianBookings = async (dietitianId) => {
  const key = `bookings:dietitian:${dietitianId}`;
  const cached = _getBCached(key);
  if (cached) return cached;
  const result = await makeRequest(() => axiosInstance.get(`/api/bookings/dietitian/${dietitianId}/client-list`));
  if (!result?.isError) _setBCache(key, result);
  return result;
};

export const getDietitianBookedSlots = (dietitianId, params = {}) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/dietitian/${dietitianId}/booked-slots`, { params }));

export const getUserBookedSlots = (userId, params = {}) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/user/${userId}/booked-slots`, { params }));

export const getMeetingLink = (bookingId) =>
  makeRequest(() => axiosInstance.post(`/api/bookings/${bookingId}/meeting-link`, {}));

export const getBookingIcs = (bookingId) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/${bookingId}/ics`));

export const cancelBooking = (bookingId, reason = '') =>
  makeRequest(() => axiosInstance.post(`/api/bookings/cancel/${bookingId}`, { reason }));

export const rescheduleBooking = (bookingId, payload) =>
  makeRequest(() => axiosInstance.patch(`/api/bookings/${bookingId}/reschedule`, payload));

export const checkBookingLimits = (payload) =>
  makeRequest(() => axiosInstance.post('/api/bookings/check-limits', payload));

export const createPaymentOrder = (orderData) =>
  makeRequest(() => axiosInstance.post('/api/bookings/payment/order', orderData));

export const getDietitianScheduleOverview = async (dietitianId, activeDate = null) => {
  try {
    const promises = [getDietitianBookings(dietitianId)];
    if (activeDate) {
      promises.push(getDietitianBookedSlots(dietitianId, { date: activeDate, userId: dietitianId }));
    }
    const [bookingsRes, slotsRes] = await Promise.all(promises);

    const bookings = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
    const slots = slotsRes?.data || {};

    return {
      isError: false,
      success: true,
      message: 'Schedule overview loaded',
      data: { bookings, slots },
      status: 200,
    };
  } catch (error) {
    return {
      isError: true,
      success: false,
      message: error.message || 'Failed to load schedule overview',
      data: null,
      status: 500,
    };
  }
};
