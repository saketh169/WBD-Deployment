require('./setup');
const mongoose = require('mongoose');
const Booking = require('../src/models/bookingModel');
const { BlockedSlot } = require('../src/models/bookingModel');

// ============================================================
// BOOKING MODEL TESTS
// ============================================================

describe('Booking Model - Creation', () => {
  const createValidBooking = (overrides = {}) => ({
    userId: new mongoose.Types.ObjectId(),
    username: 'Test User',
    email: 'testuser@example.com',
    dietitianId: new mongoose.Types.ObjectId(),
    dietitianName: 'Dr. Sarah',
    dietitianEmail: 'sarah@clinic.com',
    date: new Date('2026-06-01'),
    time: '10:00',
    consultationType: 'Online',
    amount: 500,
    paymentMethod: 'upi',
    paymentId: 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    status: 'confirmed',
    ...overrides
  });

  test('should create a valid booking', async () => {
    const booking = await Booking.create(createValidBooking());

    expect(booking._id).toBeDefined();
    expect(booking.username).toBe('Test User');
    expect(booking.email).toBe('testuser@example.com');
    expect(booking.dietitianName).toBe('Dr. Sarah');
    expect(booking.status).toBe('confirmed');
    expect(booking.paymentStatus).toBe('completed');
    expect(booking.createdAt).toBeDefined();
  });

  test('should set default paymentStatus to completed', async () => {
    const booking = await Booking.create(createValidBooking());
    expect(booking.paymentStatus).toBe('completed');
  });

  test('should reject booking without userId', async () => {
    const data = createValidBooking();
    delete data.userId;
    await expect(Booking.create(data)).rejects.toThrow();
  });

  test('should reject booking without dietitianId', async () => {
    const data = createValidBooking();
    delete data.dietitianId;
    await expect(Booking.create(data)).rejects.toThrow();
  });

  test('should reject booking without required email', async () => {
    const data = createValidBooking();
    delete data.email;
    await expect(Booking.create(data)).rejects.toThrow();
  });

  test('should reject booking with invalid time format', async () => {
    await expect(Booking.create(createValidBooking({
      time: 'invalid-time',
      paymentId: 'PAY_TIME_TEST'
    }))).rejects.toThrow();
  });

  test('should accept time in HH:MM format', async () => {
    const booking = await Booking.create(createValidBooking({
      time: '14:30',
      paymentId: 'PAY_TIME_VALID_' + Date.now()
    }));
    expect(booking.time).toBe('14:30');
  });

  test('should reject invalid consultation type', async () => {
    await expect(Booking.create(createValidBooking({
      consultationType: 'Telehealth',
      paymentId: 'PAY_CONSULT_TEST'
    }))).rejects.toThrow();
  });

  test('should accept Online consultation type', async () => {
    const booking = await Booking.create(createValidBooking({
      consultationType: 'Online',
      paymentId: 'PAY_ONLINE_' + Date.now()
    }));
    expect(booking.consultationType).toBe('Online');
  });

  test('should accept In-person consultation type', async () => {
    const booking = await Booking.create(createValidBooking({
      consultationType: 'In-person',
      paymentId: 'PAY_INPERSON_' + Date.now()
    }));
    expect(booking.consultationType).toBe('In-person');
  });

  test('should reject negative amount', async () => {
    await expect(Booking.create(createValidBooking({
      amount: -100,
      paymentId: 'PAY_NEG_' + Date.now()
    }))).rejects.toThrow();
  });

  test('should reject duplicate paymentId', async () => {
    const paymentId = 'PAY_UNIQUE_' + Date.now();
    await Booking.create(createValidBooking({ paymentId }));

    await expect(Booking.create(createValidBooking({ paymentId })))
      .rejects.toThrow();
  });
});

describe('Booking Model - Status', () => {
  const createBooking = async (status) => {
    return Booking.create({
      userId: new mongoose.Types.ObjectId(),
      username: 'Status Test User',
      email: 'status@example.com',
      dietitianId: new mongoose.Types.ObjectId(),
      dietitianName: 'Dr. Test',
      dietitianEmail: 'drtest@clinic.com',
      date: new Date('2026-06-15'),
      time: '09:00',
      consultationType: 'Online',
      amount: 300,
      paymentMethod: 'card',
      paymentId: `PAY_STATUS_${status}_${Date.now()}`,
      status
    });
  };

  test('should allow confirmed status', async () => {
    const booking = await createBooking('confirmed');
    expect(booking.status).toBe('confirmed');
  });

  test('should allow cancelled status', async () => {
    const booking = await createBooking('cancelled');
    expect(booking.status).toBe('cancelled');
  });

  test('should allow completed status', async () => {
    const booking = await createBooking('completed');
    expect(booking.status).toBe('completed');
  });

  test('should allow no-show status', async () => {
    const booking = await createBooking('no-show');
    expect(booking.status).toBe('no-show');
  });

  test('should reject invalid status', async () => {
    await expect(createBooking('pending-review')).rejects.toThrow();
  });
});

describe('Booking Model - Payment Methods', () => {
  const createWithPayment = async (method) => {
    return Booking.create({
      userId: new mongoose.Types.ObjectId(),
      username: 'Payment Test',
      email: 'payment@example.com',
      dietitianId: new mongoose.Types.ObjectId(),
      dietitianName: 'Dr. Pay',
      dietitianEmail: 'pay@clinic.com',
      date: new Date('2026-07-01'),
      time: '11:00',
      consultationType: 'Online',
      amount: 200,
      paymentMethod: method,
      paymentId: `PAY_METHOD_${method}_${Date.now()}_${Math.random()}`
    });
  };

  test.each(['card', 'netbanking', 'upi', 'emi', 'UPI', 'Credit Card', 'PayPal'])(
    'should accept payment method: %s',
    async (method) => {
      const booking = await createWithPayment(method);
      expect(booking.paymentMethod).toBe(method);
    }
  );

  test('should reject invalid payment method', async () => {
    await expect(createWithPayment('bitcoin')).rejects.toThrow();
  });
});

describe('BlockedSlot Model', () => {
  test('should create a valid blocked slot', async () => {
    const slot = await BlockedSlot.create({
      dietitianId: new mongoose.Types.ObjectId(),
      date: '2026-06-15',
      time: '10:00',
      reason: 'Personal leave'
    });

    expect(slot.date).toBe('2026-06-15');
    expect(slot.time).toBe('10:00');
    expect(slot.reason).toBe('Personal leave');
  });

  test('should set default reason', async () => {
    const slot = await BlockedSlot.create({
      dietitianId: new mongoose.Types.ObjectId(),
      date: '2026-06-16',
      time: '11:00'
    });

    expect(slot.reason).toBe('Manually blocked');
  });

  test('should reject duplicate slot for same dietitian, date, time', async () => {
    const dietitianId = new mongoose.Types.ObjectId();
    await BlockedSlot.create({ dietitianId, date: '2026-06-20', time: '09:00' });
    await expect(BlockedSlot.create({ dietitianId, date: '2026-06-20', time: '09:00' }))
      .rejects.toThrow();
  });
});

describe('Intentional CI Failure Demo', () => {
  test('should fail intentionally for pipeline validation', () => {
    expect(1).toBe(2);
  });
});

//  // 1. Invalid Email Format
// test('CI Fail: email validation regex check', async () => {
//   await expect(Booking.create(createValidBooking({
//     email: 'not-an-email',
//     paymentId: 'PAY_EMAIL_' + Date.now()
//   }))).rejects.toThrow(); // ValidationError: invalid email
// });

// // 2. Past Date Booking
// test('CI Fail: past date validation fails', async () => {
//   const pastDate = new Date();
//   pastDate.setDate(pastDate.getDate() - 5);
//   await expect(Booking.create(createValidBooking({
//     date: pastDate,
//     paymentId: 'PAY_PAST_' + Date.now()
//   }))).rejects.toThrow(); // ValidationError: date must be future
// });

// 3. Duplicate Payment ID
test('CI Fail: unique payment ID constraint', async () => {
  const paymentId = 'PAY_UNIQUE_123';
  await Booking.create(createValidBooking({ paymentId }));
  await expect(Booking.create(createValidBooking({ paymentId })))
    .rejects.toThrow(); // E11000: duplicate key error
});