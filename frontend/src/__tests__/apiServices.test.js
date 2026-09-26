import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient, { getActiveAuthToken } from '../api/client';
import {
  authApi,
  bookingApi,
  dietitianApi,
  profileApi,
  blogApi,
  mealPlanApi,
  chatApi,
  adminApi,
  paymentApi,
} from '../api';

// Mock the underlying axios methods on apiClient
vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
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

describe('API Services Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Client & Token Helper Tests
  // ─────────────────────────────────────────────────────────────
  describe('Client & Token Extraction', () => {
    it('returns null when no token is present', () => {
      expect(getActiveAuthToken()).toBeNull();
    });

    it('returns role token when available in localStorage', () => {
      localStorage.setItem('authToken_user', 'user_jwt_token_123');
      expect(getActiveAuthToken()).toBe('user_jwt_token_123');
    });

    it('falls back to generic token if role token is absent', () => {
      localStorage.setItem('token', 'generic_jwt_token_456');
      expect(getActiveAuthToken()).toBe('generic_jwt_token_456');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Auth API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Auth API (authApi)', () => {
    it('signin calls correct endpoint with credentials', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true, token: 'fake_jwt' });
      const res = await authApi.signin('user', { email: 'test@example.com', password: '123' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/signin/user', {
        email: 'test@example.com',
        password: '123',
      });
      expect(res.success).toBe(true);
    });

    it('signup calls correct role endpoint', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await authApi.signup('dietitian', { name: 'Dr. Jane' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/signup/dietitian', { name: 'Dr. Jane' });
    });

    it('googleSignin calls /api/signin/user/google', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await authApi.googleSignin('google_token_abc');

      expect(apiClient.post).toHaveBeenCalledWith('/api/signin/user/google', {
        credential: 'google_token_abc',
      });
    });

    it('verifyToken calls /api/verify-token', async () => {
      apiClient.get.mockResolvedValueOnce({ valid: true });
      const res = await authApi.verifyToken();

      expect(apiClient.get).toHaveBeenCalledWith('/api/verify-token');
      expect(res.valid).toBe(true);
    });

    it('forgotPassword calls correct endpoint with email', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await authApi.forgotPassword('user', 'test@example.com');

      expect(apiClient.post).toHaveBeenCalledWith('/api/forgot-password/user', {
        email: 'test@example.com',
      });
    });

    it('resetPassword calls reset endpoint with otp and new password', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await authApi.resetPassword('user', {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newSecretPassword1!',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/reset-password/user', {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newSecretPassword1!',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Booking API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Booking API (bookingApi)', () => {
    it('holdSlot sends POST request to /api/bookings/hold', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true, message: 'Slot held' });
      const payload = { dietitianId: 'd1', date: '2026-10-01', time: '10:00' };
      const res = await bookingApi.holdSlot(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/bookings/hold', payload);
      expect(res.success).toBe(true);
    });

    it('releaseSlot sends POST request to /api/bookings/release', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      const payload = { dietitianId: 'd1', date: '2026-10-01', time: '10:00' };
      await bookingApi.releaseSlot(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/bookings/release', payload);
    });

    it('getDietitianHolds sends GET request with date param', async () => {
      apiClient.get.mockResolvedValueOnce({ heldSlots: ['10:00', '11:00'] });
      const res = await bookingApi.getDietitianHolds('d1', '2026-10-01');

      expect(apiClient.get).toHaveBeenCalledWith('/api/bookings/dietitian/d1/holds', {
        params: { date: '2026-10-01' },
      });
      expect(res.heldSlots).toEqual(['10:00', '11:00']);
    });

    it('checkLimits sends POST request to /api/bookings/check-limits', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true, withinLimits: true });
      const payload = { userId: 'u1', date: '2026-10-01', time: '10:00', dietitianId: 'd1' };
      await bookingApi.checkLimits(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/bookings/check-limits', payload);
    });

    it('createBooking sends POST request to /api/bookings/create', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true, bookingId: 'b123' });
      const bookingData = { userId: 'u1', dietitianId: 'd1', amount: 500 };
      const res = await bookingApi.createBooking(bookingData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/bookings/create', bookingData);
      expect(res.bookingId).toBe('b123');
    });

    it('getUserBookings calls /api/bookings/user/:id', async () => {
      apiClient.get.mockResolvedValueOnce({ bookings: [] });
      await bookingApi.getUserBookings('u1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/bookings/user/u1');
    });

    it('getDietitianBookedSlots handles optional userId filter', async () => {
      apiClient.get.mockResolvedValueOnce({ bookedSlots: [] });
      await bookingApi.getDietitianBookedSlots('d1', '2026-10-01', 'u1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/bookings/dietitian/d1/booked-slots', {
        params: { date: '2026-10-01', userId: 'u1' },
      });
    });

    it('cancelBooking calls /api/bookings/cancel/:id with reason', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await bookingApi.cancelBooking('b1', 'Emergency');

      expect(apiClient.post).toHaveBeenCalledWith('/api/bookings/cancel/b1', { reason: 'Emergency' });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Dietitian API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Dietitian API (dietitianApi)', () => {
    it('getAll queries /api/dietitians with filters', async () => {
      apiClient.get.mockResolvedValueOnce({ dietitians: [] });
      await dietitianApi.getAll({ specialization: 'Keto' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/dietitians', {
        params: { specialization: 'Keto' },
      });
    });

    it('getById queries /api/dietitians/:id', async () => {
      apiClient.get.mockResolvedValueOnce({ dietitian: { name: 'Dr. Jane' } });
      await dietitianApi.getById('d1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/dietitians/d1');
    });

    it('blockSlot calls /api/dietitians/:id/block-slot', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await dietitianApi.blockSlot('d1', { date: '2026-10-01', time: '14:00', reason: 'Personal' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/dietitians/d1/block-slot', {
        date: '2026-10-01',
        time: '14:00',
        reason: 'Personal',
      });
    });

    it('unblockSlot calls /api/dietitians/:id/unblock-slot', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await dietitianApi.unblockSlot('d1', { date: '2026-10-01', time: '14:00' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/dietitians/d1/unblock-slot', {
        date: '2026-10-01',
        time: '14:00',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Profile API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Profile API (profileApi)', () => {
    it('getUserDetails calls /api/getuserdetails', async () => {
      apiClient.get.mockResolvedValueOnce({ name: 'Saketh' });
      const res = await profileApi.getUserDetails();

      expect(apiClient.get).toHaveBeenCalledWith('/api/getuserdetails');
      expect(res.name).toBe('Saketh');
    });

    it('getDietitianDetails calls /api/getdietitiandetails', async () => {
      apiClient.get.mockResolvedValueOnce({ name: 'Dr. Smith' });
      await profileApi.getDietitianDetails();

      expect(apiClient.get).toHaveBeenCalledWith('/api/getdietitiandetails');
    });

    it('updateProfile sends PUT to /api/update-profile', async () => {
      apiClient.put.mockResolvedValueOnce({ success: true });
      const updateData = { phone: '9876543210' };
      await profileApi.updateProfile(updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/api/update-profile', updateData);
    });

    it('getSubscriptionStatus calls /api/subscription-status', async () => {
      apiClient.get.mockResolvedValueOnce({ plan: 'premium' });
      await profileApi.getSubscriptionStatus();

      expect(apiClient.get).toHaveBeenCalledWith('/api/subscription-status');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Blog API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Blog API (blogApi)', () => {
    it('getAll queries /api/blogs with params', async () => {
      apiClient.get.mockResolvedValueOnce({ blogs: [] });
      await blogApi.getAll({ category: 'Nutrition', page: 1 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/blogs', {
        params: { category: 'Nutrition', page: 1 },
      });
    });

    it('getById queries /api/blogs/:id', async () => {
      apiClient.get.mockResolvedValueOnce({ title: 'Eating Healthy' });
      await blogApi.getById('b1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/blogs/b1');
    });

    it('toggleLike calls POST /api/blogs/:id/like', async () => {
      apiClient.post.mockResolvedValueOnce({ liked: true });
      await blogApi.toggleLike('b1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/blogs/b1/like');
    });

    it('addComment calls POST /api/blogs/:id/comments', async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });
      await blogApi.addComment('b1', { comment: 'Great post!' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/blogs/b1/comments', { comment: 'Great post!' });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Meal Plan API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Meal Plan API (mealPlanApi)', () => {
    it('getUserMealPlans calls /api/meal-plans/user/:id', async () => {
      apiClient.get.mockResolvedValueOnce({ plans: [] });
      await mealPlanApi.getUserMealPlans('u1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/meal-plans/user/u1');
    });

    it('create calls POST /api/meal-plans', async () => {
      apiClient.post.mockResolvedValueOnce({ planId: 'p1' });
      const plan = { title: 'Weight Loss Plan' };
      await mealPlanApi.create(plan);

      expect(apiClient.post).toHaveBeenCalledWith('/api/meal-plans', plan);
    });

    it('delete calls DELETE /api/meal-plans/:id', async () => {
      apiClient.delete.mockResolvedValueOnce({ success: true });
      await mealPlanApi.delete('p1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/meal-plans/p1');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Chat API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Chat API (chatApi)', () => {
    it('getOrCreateConversation calls POST /api/chat/conversation', async () => {
      apiClient.post.mockResolvedValueOnce({ conversationId: 'c1' });
      const payload = { recipientId: 'r1', recipientType: 'dietitian' };
      await chatApi.getOrCreateConversation(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/chat/conversation', payload);
    });

    it('sendMessage calls POST /api/chat/message', async () => {
      apiClient.post.mockResolvedValueOnce({ messageId: 'm1' });
      const msg = { conversationId: 'c1', text: 'Hello' };
      await chatApi.sendMessage(msg);

      expect(apiClient.post).toHaveBeenCalledWith('/api/chat/message', msg);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Admin API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Admin API (adminApi)', () => {
    it('getUsersByRole queries /api/crud/:role-list', async () => {
      apiClient.get.mockResolvedValueOnce({ users: [] });
      await adminApi.getUsersByRole('user', { page: 1 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/crud/user-list', {
        params: { page: 1 },
      });
    });

    it('removeUser calls DELETE /api/crud/:role-list/:id', async () => {
      apiClient.delete.mockResolvedValueOnce({ success: true });
      await adminApi.removeUser('dietitian', 'd1', 'Violation');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/crud/dietitian-list/d1', {
        data: { reason: 'Violation' },
      });
    });

    it('getRemovedAccounts queries /api/crud/removed-accounts', async () => {
      apiClient.get.mockResolvedValueOnce({ accounts: [] });
      await adminApi.getRemovedAccounts();

      expect(apiClient.get).toHaveBeenCalledWith('/api/crud/removed-accounts', {
        params: {},
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Payment API Tests
  // ─────────────────────────────────────────────────────────────
  describe('Payment API (paymentApi)', () => {
    it('initialize calls POST /api/payments/initialize', async () => {
      apiClient.post.mockResolvedValueOnce({ orderId: 'order_123' });
      const order = { planId: 'plan_gold', amount: 999 };
      await paymentApi.initialize(order);

      expect(apiClient.post).toHaveBeenCalledWith('/api/payments/initialize', order);
    });

    it('getActiveSubscription calls /api/payments/subscription/active', async () => {
      apiClient.get.mockResolvedValueOnce({ active: true });
      await paymentApi.getActiveSubscription();

      expect(apiClient.get).toHaveBeenCalledWith('/api/payments/subscription/active');
    });

    it('getHistory calls /api/payments/history', async () => {
      apiClient.get.mockResolvedValueOnce({ history: [] });
      await paymentApi.getHistory();

      expect(apiClient.get).toHaveBeenCalledWith('/api/payments/history');
    });
  });
});
