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

// ============================================================
// FAILING TEST CASES - Intentional failures for CI validation
// ============================================================
// Uncomment to test: These tests are designed to FAIL and catch issues

// describe('Booking Model - Failing Validation Tests', () => {
//   const createValidBooking = (overrides = {}) => ({
//     userId: new mongoose.Types.ObjectId(),
//     username: 'Fail Test User',
//     email: 'failtest@example.com',
//     dietitianId: new mongoose.Types.ObjectId(),
//     dietitianName: 'Dr. Fail',
//     dietitianEmail: 'fail@clinic.com',
//     date: new Date('2026-06-01'),
//     time: '10:00',
//     consultationType: 'Online',
//     amount: 500,
//     paymentMethod: 'upi',
//     paymentId: 'PAY_FAIL_' + Date.now(),
//     status: 'confirmed',
//     ...overrides
//   });

//   // FAILING TEST 1: Invalid email format should be rejected
//   test('should reject invalid email format - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       email: 'not-an-email',
//       paymentId: 'PAY_INVALID_EMAIL_' + Date.now()
//     }));
//     expect(booking.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
//   });

//   // FAILING TEST 2: Missing username should be caught
//   test('should fail when username is empty - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       username: '',
//       paymentId: 'PAY_EMPTY_USERNAME_' + Date.now()
//     }));
//     expect(booking.username).not.toBe('');
//     expect(booking.username.length).toBeGreaterThan(0);
//   });

//   // FAILING TEST 3: Zero amount should not be accepted
//   test('should reject zero amount - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       amount: 0,
//       paymentId: 'PAY_ZERO_AMOUNT_' + Date.now()
//     }));
//     expect(booking.amount).toBeGreaterThan(0);
//   });

//   // FAILING TEST 4: Time format validation should fail
//   test('should reject malformed time format - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       time: '25:61',
//       paymentId: 'PAY_BAD_TIME_' + Date.now()
//     }));
//     const timeParts = booking.time.split(':');
//     expect(parseInt(timeParts[0])).toBeLessThan(24);
//     expect(parseInt(timeParts[1])).toBeLessThan(60);
//   });

//   // FAILING TEST 5: Past date should be rejected
//   test('should reject booking with past date - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       date: new Date('2020-01-01'),
//       paymentId: 'PAY_PAST_DATE_' + Date.now()
//     }));
//     expect(booking.date).toBeGreaterThan(new Date());
//   });

//   // FAILING TEST 6: Missing dietitian info should fail
//   test('should fail when dietitian email is invalid - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       dietitianEmail: 'invalid-email-format',
//       paymentId: 'PAY_DIETITIAN_EMAIL_' + Date.now()
//     }));
//     expect(booking.dietitianEmail).toMatch(/@/);
//   });

//   // FAILING TEST 7: Very large amount should be flagged
//   test('should reject unreasonably large amount - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       amount: 999999999,
//       paymentId: 'PAY_LARGE_AMOUNT_' + Date.now()
//     }));
//     expect(booking.amount).toBeLessThan(1000000);
//   });

//   // FAILING TEST 8: Consultation type mismatch
//   test('should validate consultation type consistency - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       consultationType: 'Hybrid',
//       paymentId: 'PAY_HYBRID_' + Date.now()
//     }));
//     expect(['Online', 'In-person']).toContain(booking.consultationType);
//   });

//   // FAILING TEST 9: Payment method case sensitivity
//   test('should normalize payment method case - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       paymentMethod: 'UPI',
//       paymentId: 'PAY_CASE_' + Date.now()
//     }));
//     expect(booking.paymentMethod).toBe('upi');
//   });

//   // FAILING TEST 10: Booking status validation
//   test('should transition through valid states only - EXPECTED TO FAIL', async () => {
//     const booking = await Booking.create(createValidBooking({
//       status: 'pending',
//       paymentId: 'PAY_STATUS_' + Date.now()
//     }));
//     expect(['confirmed', 'cancelled', 'completed', 'no-show']).toContain(booking.status);
//   });
// });
