import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosInstance, { makeRequest } from '../utils/axiosInstance';
import {
  authService,
  bookingService,
  dietitianService,
  profileService,
  blogService,
  mealPlanService,
  chatService,
  adminService,
  paymentService,
} from '../services';

vi.mock('../utils/axiosInstance', async () => {
  const actual = await vi.importActual('../utils/axiosInstance');
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };
});

describe('Services Standard Response Envelope Tests (School ERP Pattern)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('makeRequest envelope guarantee', () => {
    it('returns { isError: false, message, data, status } on success', async () => {
      const mockSuccess = vi.fn().mockResolvedValue({
        status: 200,
        data: { message: 'Fetched successfully', data: { id: 1, name: 'Test' } },
      });

      const res = await makeRequest(mockSuccess);
      expect(res.isError).toBe(false);
      expect(res.message).toBe('Fetched successfully');
      expect(res.data).toEqual({ id: 1, name: 'Test' });
      expect(res.status).toBe(200);
    });

    it('returns { isError: true, message, data: null, status } on error', async () => {
      const mockError = vi.fn().mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Resource not found' },
        },
      });

      const res = await makeRequest(mockError);
      expect(res.isError).toBe(true);
      expect(res.message).toBe('Resource not found');
      expect(res.data).toBeNull();
      expect(res.status).toBe(404);
    });
  });

  describe('authService', () => {
    it('loginUser returns formatted success envelope', async () => {
      axiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { token: 'jwt_123', message: 'Login successful' },
      });

      const res = await authService.loginUser('user', { email: 'test@mail.com', password: '123' });
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/signin/user', {
        email: 'test@mail.com',
        password: '123',
      });
      expect(res.isError).toBe(false);
      expect(res.data.token).toBe('jwt_123');
    });

    it('loginUser catches errors and returns isError: true with message', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      });

      const res = await authService.loginUser('user', { email: 'bad@mail.com', password: 'wrong' });
      expect(res.isError).toBe(true);
      expect(res.message).toBe('Invalid credentials');
      expect(res.data).toBeNull();
      expect(res.status).toBe(401);
    });
  });

  describe('bookingService', () => {
    it('holdSlot returns { isError: false, data } on success', async () => {
      axiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true, message: 'Slot held for 10 minutes' },
      });

      const res = await bookingService.holdSlot({ dietitianId: 'd1', date: '2026-10-01', time: '10:00' });
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/bookings/hold', {
        dietitianId: 'd1',
        date: '2026-10-01',
        time: '10:00',
      });
      expect(res.isError).toBe(false);
      expect(res.message).toBe('Slot held for 10 minutes');
    });

    it('holdSlot catches 423 error cleanly without throwing', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 423,
          data: { message: 'This slot is currently being held by another user.' },
        },
      });

      const res = await bookingService.holdSlot({ dietitianId: 'd1', date: '2026-10-01', time: '10:00' });
      expect(res.isError).toBe(true);
      expect(res.message).toBe('This slot is currently being held by another user.');
      expect(res.status).toBe(423);
    });
  });

  describe('dietitianService', () => {
    it('getAllDietitians queries /api/dietitians and unwraps data', async () => {
      axiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [{ id: 'd1', name: 'Dr. Jane' }] },
      });

      const res = await dietitianService.getAllDietitians({ specialization: 'Clinical' });
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/dietitians', {
        params: { specialization: 'Clinical' },
      });
      expect(res.isError).toBe(false);
      expect(res.data).toEqual([{ id: 'd1', name: 'Dr. Jane' }]);
    });
  });

  describe('profileService', () => {
    it('getUserDetails returns profile data envelope', async () => {
      axiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { data: { name: 'Saketh', email: 'saketh@test.com' } },
      });

      const res = await profileService.getUserDetails();
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/getuserdetails');
      expect(res.isError).toBe(false);
      expect(res.data.name).toBe('Saketh');
    });
  });

  describe('blogService', () => {
    it('toggleLike toggles like and returns envelope', async () => {
      axiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { liked: true, message: 'Liked' },
      });

      const res = await blogService.toggleLike('b1');
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/blogs/b1/like');
      expect(res.isError).toBe(false);
    });
  });

  describe('mealPlanService', () => {
    it('deleteMealPlan calls delete and returns envelope', async () => {
      axiosInstance.delete.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Meal plan deleted' },
      });

      const res = await mealPlanService.deleteMealPlan('p1');
      expect(axiosInstance.delete).toHaveBeenCalledWith('/api/meal-plans/p1');
      expect(res.isError).toBe(false);
      expect(res.message).toBe('Meal plan deleted');
    });
  });

  describe('chatService', () => {
    it('sendMessage sends message payload and returns envelope', async () => {
      axiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { messageId: 'm1' },
      });

      const res = await chatService.sendMessage({ conversationId: 'c1', text: 'Hello' });
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/chat/message', {
        conversationId: 'c1',
        text: 'Hello',
      });
      expect(res.isError).toBe(false);
    });
  });

  describe('adminService', () => {
    it('restoreAccount restores user and returns envelope', async () => {
      axiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Account restored' },
      });

      const res = await adminService.restoreAccount('u1');
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/crud/removed-accounts/u1/restore');
      expect(res.isError).toBe(false);
    });
  });

  describe('paymentService', () => {
    it('verifyPayment verifies payment and returns envelope', async () => {
      axiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { verified: true },
      });

      const res = await paymentService.verifyPayment('t123');
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/payments/verify/t123');
      expect(res.isError).toBe(false);
    });
  });
});
