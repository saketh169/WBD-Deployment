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
// MIXED FAILING TEST CASES (Long & Short - comment out one at a time)
// ============================================================

// SHORT TEST 1: Invalid email format
// test('should reject invalid email - EXPECTED TO FAIL', async () => {
//   const b = await Booking.create({ userId: new mongoose.Types.ObjectId(), email: 'notanemail', dietitianId: new mongoose.Types.ObjectId(), paymentId: 'T1_' + Date.now(), status: 'confirmed' });
//   expect(b.email).toMatch(/@.*\./);
// });

// LONG TEST 2: Empty username validation
// test('should fail when username is empty - EXPECTED TO FAIL', async () => {
//   const createBooking = (overrides = {}) => ({
//     userId: new mongoose.Types.ObjectId(),
//     username: 'Default',
//     email: 'test@example.com',
//     dietitianId: new mongoose.Types.ObjectId(),
//     dietitianName: 'Dr. Test',
//     dietitianEmail: 'dr@clinic.com',
//     amount: 500,
//     paymentMethod: 'card',
//     paymentId: 'PAY_' + Date.now(),
//     status: 'confirmed',
//     ...overrides
//   });
//   const booking = await Booking.create(createBooking({ username: '' }));
//   expect(booking.username).not.toBe('');
//   expect(booking.username.length).toBeGreaterThan(0);
// });

// SHORT TEST 3: Zero amount
// test('should reject zero amount - EXPECTED TO FAIL', async () => {
//   const b = await Booking.create({ userId: new mongoose.Types.ObjectId(), email: 'test@test.com', amount: 0, dietitianId: new mongoose.Types.ObjectId(), paymentId: 'T3_' + Date.now(), status: 'confirmed' });
//   expect(b.amount).toBeGreaterThan(0);
// });

// LONG TEST 4: Bad time format validation
// test('should reject malformed time format - EXPECTED TO FAIL', async () => {
//   const createBooking = (overrides = {}) => ({
//     userId: new mongoose.Types.ObjectId(),
//     username: 'Time Test',
//     email: 'timetest@example.com',
//     dietitianId: new mongoose.Types.ObjectId(),
//     dietitianName: 'Dr. Clock',
//     dietitianEmail: 'clock@clinic.com',
//     date: new Date('2026-06-01'),
//     consultationType: 'Online',
//     amount: 300,
//     paymentMethod: 'upi',
//     paymentId: 'PAY_TIME_' + Date.now(),
//     status: 'confirmed',
//     ...overrides
//   });
//   const booking = await Booking.create(createBooking({ time: '25:61' }));
//   const [h, m] = booking.time.split(':').map(Number);
//   expect(h).toBeLessThan(24);
//   expect(m).toBeLessThan(60);
// });

// SHORT TEST 5: Past date
// test('should reject past date - EXPECTED TO FAIL', async () => {
//   const b = await Booking.create({ userId: new mongoose.Types.ObjectId(), email: 'test@test.com', date: new Date('2020-01-01'), dietitianId: new mongoose.Types.ObjectId(), paymentId: 'T5_' + Date.now(), status: 'confirmed' });
//   expect(b.date).toBeGreaterThan(new Date());
// });

// LONG TEST 6: Invalid dietitian email validation
// test('should fail when dietitian email is invalid - EXPECTED TO FAIL', async () => {
//   const createBooking = (overrides = {}) => ({
//     userId: new mongoose.Types.ObjectId(),
//     username: 'Email Test User',
//     email: 'emailtest@example.com',
//     dietitianId: new mongoose.Types.ObjectId(),
//     dietitianName: 'Dr. Email',
//     dietitianEmail: 'valid@clinic.com',
//     date: new Date('2026-06-15'),
//     time: '10:00',
//     consultationType: 'Online',
//     amount: 400,
//     paymentMethod: 'card',
//     paymentId: 'PAY_EMAIL_' + Date.now(),
//     status: 'confirmed',
//     ...overrides
//   });
//   const booking = await Booking.create(createBooking({ dietitianEmail: 'invalidemail' }));
//   expect(booking.dietitianEmail).toMatch(/@/);
// });

// SHORT TEST 7: Huge amount
// test('should reject huge amount - EXPECTED TO FAIL', async () => {
//   const b = await Booking.create({ userId: new mongoose.Types.ObjectId(), email: 'test@test.com', amount: 999999999, dietitianId: new mongoose.Types.ObjectId(), paymentId: 'T7_' + Date.now(), status: 'confirmed' });
//   expect(b.amount).toBeLessThan(1000000);
// });

// LONG TEST 8: Invalid consultation type validation
// test('should validate consultation type consistency - EXPECTED TO FAIL', async () => {
//   const createBooking = (overrides = {}) => ({
//     userId: new mongoose.Types.ObjectId(),
//     username: 'Consult Test',
//     email: 'consult@example.com',
//     dietitianId: new mongoose.Types.ObjectId(),
//     dietitianName: 'Dr. Consult',
//     dietitianEmail: 'consult@clinic.com',
//     date: new Date('2026-06-20'),
//     time: '14:00',
//     consultationType: 'Online',
//     amount: 550,
//     paymentMethod: 'netbanking',
//     paymentId: 'PAY_CONSULT_' + Date.now(),
//     status: 'confirmed',
//     ...overrides
//   });
//   const booking = await Booking.create(createBooking({ consultationType: 'Hybrid' }));
//   expect(['Online', 'In-person']).toContain(booking.consultationType);
// });

//SHORT TEST 9: Case sensitive payment method
test('should normalize payment method case - EXPECTED TO FAIL', async () => {
  const b = await Booking.create({ userId: new mongoose.Types.ObjectId(), email: 'test@test.com', paymentMethod: 'UPI', dietitianId: new mongoose.Types.ObjectId(), paymentId: 'T9_' + Date.now(), status: 'confirmed' });
  expect(b.paymentMethod).toBe('upi');
});

// LONG TEST 10: Invalid booking status validation
// test('should transition through valid states only - EXPECTED TO FAIL', async () => {
//   const createBooking = (overrides = {}) => ({
//     userId: new mongoose.Types.ObjectId(),
//     username: 'Status Test User',
//     email: 'status@example.com',
//     dietitianId: new mongoose.Types.ObjectId(),
//     dietitianName: 'Dr. Status',
//     dietitianEmail: 'status@clinic.com',
//     date: new Date('2026-07-01'),
//     time: '09:30',
//     consultationType: 'In-person',
//     amount: 600,
//     paymentMethod: 'card',
//     paymentId: 'PAY_STATUS_' + Date.now(),
//     status: 'confirmed',
//     ...overrides
//   });
//   const booking = await Booking.create(createBooking({ status: 'pending' }));
//   expect(['confirmed', 'cancelled', 'completed', 'no-show']).toContain(booking.status);
// });
