import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const holdSlot = ({ dietitianId, date, time }) =>
  makeRequest(() => axiosInstance.post('/api/bookings/hold', { dietitianId, date, time }));

export const releaseSlot = ({ dietitianId, date, time }) =>
  makeRequest(() => axiosInstance.post('/api/bookings/release', { dietitianId, date, time }));

export const getDietitianHolds = (dietitianId, date) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/dietitian/${dietitianId}/holds`, { params: { date } }));

export const createBooking = (bookingData) =>
  makeRequest(() => axiosInstance.post('/api/bookings/create', bookingData));

export const getUserBookings = (userId) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/user/${userId}`));

export const getDietitianBookings = (dietitianId) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/dietitian/${dietitianId}`));

export const getDietitianBookedSlots = (dietitianId, params = {}) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/dietitian/${dietitianId}/booked-slots`, { params }));

export const getUserBookedSlots = (userId, params = {}) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/user/${userId}/booked-slots`, { params }));

export const getMeetingLink = (bookingId) =>
  makeRequest(() => axiosInstance.post(`/api/bookings/${bookingId}/meeting-link`, {}));

export const getBookingIcs = (bookingId) =>
  makeRequest(() => axiosInstance.get(`/api/bookings/${bookingId}/ics`, { responseType: 'blob' }));

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
