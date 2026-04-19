require('./setup');
const mongoose = require('mongoose');
const Payment = require('../src/models/paymentModel');

// ============================================================
// PAYMENT MODEL TESTS
// ============================================================

const createValidPayment = (overrides = {}) => ({
  userId: new mongoose.Types.ObjectId(),
  userEmail: 'user@example.com',
  userName: 'Test User',
  transactionId: 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
  orderId: 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
  planType: 'premium',
  billingCycle: 'monthly',
  amount: 999,
  paymentMethod: 'upi',
  paymentStatus: 'success',
  ...overrides
});

describe('Payment Model - Creation', () => {
  test('should create a valid payment record', async () => {
    const payment = await Payment.create(createValidPayment());

    expect(payment._id).toBeDefined();
    expect(payment.planType).toBe('premium');
    expect(payment.amount).toBe(999);
    expect(payment.paymentMethod).toBe('upi');
    expect(payment.paymentStatus).toBe('success');
    expect(payment.createdAt).toBeDefined();
  });

  test('should set default paymentStatus to pending', async () => {
    const data = createValidPayment();
    delete data.paymentStatus;
    const payment = await Payment.create(data);
    expect(payment.paymentStatus).toBe('pending');
  });

  test('should set default currency to INR', async () => {
    const payment = await Payment.create(createValidPayment());
    expect(payment.currency).toBe('INR');
  });

  test('should reject negative amount', async () => {
    await expect(Payment.create(createValidPayment({ amount: -50 })))
      .rejects.toThrow();
  });

  test('should reject invalid plan type', async () => {
    await expect(Payment.create(createValidPayment({
      planType: 'enterprise'
    }))).rejects.toThrow();
  });

  test('should reject invalid billing cycle', async () => {
    await expect(Payment.create(createValidPayment({
      billingCycle: 'weekly'
    }))).rejects.toThrow();
  });

  test('should reject invalid payment method', async () => {
    await expect(Payment.create(createValidPayment({
      paymentMethod: 'cash'
    }))).rejects.toThrow();
  });

  test('should reject duplicate transactionId', async () => {
    const txnId = 'TXN_DUP_' + Date.now();
    await Payment.create(createValidPayment({ transactionId: txnId }));
    await expect(Payment.create(createValidPayment({ transactionId: txnId })))
      .rejects.toThrow();
  });

  test('should reject duplicate orderId', async () => {
    const ordId = 'ORD_DUP_' + Date.now();
    await Payment.create(createValidPayment({ orderId: ordId }));
    await expect(Payment.create(createValidPayment({ orderId: ordId })))
      .rejects.toThrow();
  });
});

describe('Payment Model - Plan Types', () => {
  test.each(['basic', 'premium', 'ultimate'])(
    'should accept plan type: %s',
    async (planType) => {
      const payment = await Payment.create(createValidPayment({ planType }));
      expect(payment.planType).toBe(planType);
    }
  );
});

describe('Payment Model - Subscription Activation', () => {
  test('should activate subscription with correct dates (monthly)', async () => {
    const payment = await Payment.create(createValidPayment({
      billingCycle: 'monthly'
    }));

    await payment.activateSubscription();

    expect(payment.isActive).toBe(true);
    expect(payment.paymentStatus).toBe('success');
    expect(payment.subscriptionStartDate).toBeDefined();
    expect(payment.subscriptionEndDate).toBeDefined();

    // End date should be ~30 days after start
    const diff = payment.subscriptionEndDate - payment.subscriptionStartDate;
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThanOrEqual(28);
    expect(daysDiff).toBeLessThanOrEqual(31);
  });

  test('should activate subscription with correct dates (yearly)', async () => {
    const payment = await Payment.create(createValidPayment({
      billingCycle: 'yearly'
    }));

    await payment.activateSubscription();

    const diff = payment.subscriptionEndDate - payment.subscriptionStartDate;
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThanOrEqual(365);
    expect(daysDiff).toBeLessThanOrEqual(366);
  });

  test('should set correct features for basic plan', async () => {
    const payment = await Payment.create(createValidPayment({
      planType: 'basic'
    }));

    await payment.activateSubscription();

    expect(payment.features.monthlyBookings).toBe(2);
    expect(payment.features.advanceBookingDays).toBe(3);
    expect(payment.features.monthlyMealPlans).toBe(4);
    expect(payment.features.chatbotDailyQueries).toBe(20);
    expect(payment.features.monthlyBlogPosts).toBe(2);
    expect(payment.features.supportLevel).toBe('email');
  });

  test('should set correct features for premium plan', async () => {
    const payment = await Payment.create(createValidPayment({
      planType: 'premium'
    }));

    await payment.activateSubscription();

    expect(payment.features.monthlyBookings).toBe(8);
    expect(payment.features.advanceBookingDays).toBe(7);
    expect(payment.features.monthlyMealPlans).toBe(15);
    expect(payment.features.chatbotDailyQueries).toBe(50);
    expect(payment.features.supportLevel).toBe('priority');
  });

  test('should set correct features for ultimate plan (unlimited)', async () => {
    const payment = await Payment.create(createValidPayment({
      planType: 'ultimate'
    }));

    await payment.activateSubscription();

    expect(payment.features.monthlyBookings).toBe(20);
    expect(payment.features.advanceBookingDays).toBe(21);
    expect(payment.features.monthlyMealPlans).toBe(-1); // unlimited
    expect(payment.features.chatbotDailyQueries).toBe(-1); // unlimited
    expect(payment.features.monthlyBlogPosts).toBe(-1); // unlimited
    expect(payment.features.supportLevel).toBe('24/7');
  });

  test('should deactivate previous subscriptions on new activation', async () => {
    const userId = new mongoose.Types.ObjectId();

    const payment1 = await Payment.create(createValidPayment({ userId }));
    await payment1.activateSubscription();
    expect(payment1.isActive).toBe(true);

    const payment2 = await Payment.create(createValidPayment({ userId }));
    await payment2.activateSubscription();

    // Reload payment1 from DB
    const reloaded = await Payment.findById(payment1._id);
    expect(reloaded.isActive).toBe(false);
    expect(payment2.isActive).toBe(true);
  });
});

describe('Payment Model - Static Methods', () => {
  test('should find active subscription for a user', async () => {
    const userId = new mongoose.Types.ObjectId();
    const payment = await Payment.create(createValidPayment({ userId }));
    await payment.activateSubscription();

    const active = await Payment.findActiveSubscription(userId);

    expect(active).not.toBeNull();
    expect(active.userId.toString()).toBe(userId.toString());
    expect(active.isActive).toBe(true);
  });

  test('should return null when no active subscription exists', async () => {
    const userId = new mongoose.Types.ObjectId();
    const active = await Payment.findActiveSubscription(userId);
    expect(active).toBeNull();
  });

  test('should get payment history sorted by date', async () => {
    const userId = new mongoose.Types.ObjectId();

    await Payment.create(createValidPayment({ userId, amount: 100 }));
    await Payment.create(createValidPayment({ userId, amount: 200 }));
    await Payment.create(createValidPayment({ userId, amount: 300 }));

    const history = await Payment.getUserPaymentHistory(userId);

    expect(history.length).toBe(3);
    // Should be sorted most recent first
    expect(history[0].createdAt >= history[1].createdAt).toBe(true);
  });

  test('should respect limit on payment history', async () => {
    const userId = new mongoose.Types.ObjectId();

    for (let i = 0; i < 5; i++) {
      await Payment.create(createValidPayment({ userId, amount: (i + 1) * 100 }));
    }

    const history = await Payment.getUserPaymentHistory(userId, 3);
    expect(history.length).toBe(3);
  });
});

describe('Payment Model - Deactivation', () => {
  test('should deactivate subscription', async () => {
    const payment = await Payment.create(createValidPayment());
    await payment.activateSubscription();
    expect(payment.isActive).toBe(true);

    await payment.deactivateSubscription();
    expect(payment.isActive).toBe(false);
  });
});

