require('./setup');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserAuth, User, Admin, Dietitian, Organization } = require('../src/models/userModel');

// ============================================================
// AUTH MODEL TESTS
// ============================================================

describe('User Model - Validation', () => {
  test('should create a valid user profile', async () => {
    const user = await User.create({
      name: 'Test User One',
      email: 'testuser@example.com',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'male',
      address: 'Chennai, Tamil Nadu, India'
    });

    expect(user._id).toBeDefined();
    expect(user.name).toBe('Test User One');
    expect(user.email).toBe('testuser@example.com');
    expect(user.gender).toBe('male');
    expect(user.createdAt).toBeDefined();
  });

  test('should reject user with name shorter than 5 characters', async () => {
    await expect(User.create({
      name: 'AB',
      email: 'short@example.com',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'male',
      address: 'Chennai, India'
    })).rejects.toThrow();
  });

  test('should reject user with invalid gender', async () => {
    await expect(User.create({
      name: 'Valid User Name',
      email: 'gender@example.com',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'invalid',
      address: 'Chennai, India'
    })).rejects.toThrow();
  });

  test('should reject user without required email', async () => {
    await expect(User.create({
      name: 'No Email User',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'male',
      address: 'Chennai, India'
    })).rejects.toThrow();
  });

  test('should reject user without required address', async () => {
    await expect(User.create({
      name: 'No Address User',
      email: 'noaddr@example.com',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'male'
    })).rejects.toThrow();
  });

  test('should trim email and convert to lowercase', async () => {
    const user = await User.create({
      name: 'Trim user test',
      email: '  Upper@TEST.COM  ',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'female',
      address: 'Hyderabad, India'
    });

    expect(user.email).toBe('upper@test.com');
  });
});

describe('UserAuth Model - Authentication', () => {
  test('should create a UserAuth entry with hashed password', async () => {
    const hash = await bcrypt.hash('SecurePass123', 10);
    const user = await User.create({
      name: 'Auth Test User',
      email: 'auth@example.com',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'male',
      address: 'Delhi, India'
    });

    const userAuth = await UserAuth.create({
      email: 'auth@example.com',
      passwordHash: hash,
      role: 'user',
      roleId: user._id
    });

    expect(userAuth.email).toBe('auth@example.com');
    expect(userAuth.role).toBe('user');
    expect(userAuth.passwordHash).not.toBe('SecurePass123');
    expect(userAuth.roleId.toString()).toBe(user._id.toString());
  });

  test('should not allow duplicate email in UserAuth', async () => {
    const hash = await bcrypt.hash('Password123', 10);
    const user1 = await User.create({
      name: 'First Auth User',
      email: 'dup@example.com',
      phone: '9876543210',
      dob: new Date('1995-05-15'),
      gender: 'male',
      address: 'Mumbai, India'
    });

    await UserAuth.create({
      email: 'dup@example.com',
      passwordHash: hash,
      role: 'user',
      roleId: user1._id
    });

    await expect(UserAuth.create({
      email: 'dup@example.com',
      passwordHash: hash,
      role: 'admin',
      roleId: new mongoose.Types.ObjectId()
    })).rejects.toThrow();
  });

  test('should only allow valid roles', async () => {
    const hash = await bcrypt.hash('Password123', 10);
    await expect(UserAuth.create({
      email: 'badrole@example.com',
      passwordHash: hash,
      role: 'superuser',
      roleId: new mongoose.Types.ObjectId()
    })).rejects.toThrow();
  });
});

describe('Password Hashing', () => {
  test('should correctly hash and verify passwords', async () => {
    const password = 'MySecurePassword123';
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);

    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const hash = await bcrypt.hash('CorrectPassword', 10);
    const isMatch = await bcrypt.compare('WrongPassword', hash);
    expect(isMatch).toBe(false);
  });

  test('should produce unique hashes for same password', async () => {
    const password = 'SamePassword123';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);

    expect(hash1).not.toBe(hash2); // Different salts
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});

describe('JWT Token', () => {
  const JWT_SECRET = 'test_secret_key_12345';

  test('should generate and verify a valid JWT token', () => {
    const payload = {
      userId: new mongoose.Types.ObjectId().toString(),
      role: 'user',
      roleId: new mongoose.Types.ObjectId().toString()
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3);

    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe('user');
    expect(decoded.roleId).toBe(payload.roleId);
  });

  test('should reject token with wrong secret', () => {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '1h' });

    expect(() => {
      jwt.verify(token, 'wrong_secret');
    }).toThrow();
  });

  test('should reject expired token', () => {
    const token = jwt.sign({ userId: '123' }, JWT_SECRET, { expiresIn: '0s' });

    expect(() => {
      jwt.verify(token, JWT_SECRET);
    }).toThrow();
  });
});

describe('Dietitian Model - Validation', () => {
  test('should create a valid dietitian', async () => {
    const dietitian = await Dietitian.create({
      name: 'Dr. Sarah Smith',
      email: 'sarah@clinic.com',
      age: 35,
      licenseNumber: 'DLN123456'
    });

    expect(dietitian.name).toBe('Dr. Sarah Smith');
    expect(dietitian.licenseNumber).toBe('DLN123456');
  });

  test('should reject invalid license number format', async () => {
    await expect(Dietitian.create({
      name: 'Dr. Invalid License',
      email: 'invalid@clinic.com',
      age: 30,
      licenseNumber: 'INVALID123'
    })).rejects.toThrow();
  });

  test('should reject dietitian under 18', async () => {
    await expect(Dietitian.create({
      name: 'Young Dietitian',
      email: 'young@clinic.com',
      age: 16,
      licenseNumber: 'DLN654321'
    })).rejects.toThrow();
  });
});

describe('Organization Model - Validation', () => {
  test('should create a valid organization', async () => {
    const org = await Organization.create({
      name: 'City Hospital Chennai',
      email: 'contact@cityhospital.com',
      phone: '9876543210',
      licenseNumber: 'OLN123456',
      organizationType: 'private',
      address: 'Anna Nagar, Chennai, India'
    });

    expect(org.name).toBe('City Hospital Chennai');
    expect(org.organizationType).toBe('private');
  });

  test('should reject invalid organization type', async () => {
    await expect(Organization.create({
      name: 'Invalid Org Test',
      email: 'invalid@org.com',
      phone: '9876543210',
      licenseNumber: 'OLN654321',
      organizationType: 'invalid_type',
      address: 'Delhi, India'
    })).rejects.toThrow();
  });

  test('should reject invalid org license format', async () => {
    await expect(Organization.create({
      name: 'Bad License Org',
      email: 'badlic@org.com',
      phone: '9876543210',
      licenseNumber: 'INVALID',
      organizationType: 'ngo',
      address: 'Pune, India'
    })).rejects.toThrow();
  });
});


// 1. Name Too Short
test('CI Fail: short username rejected', async () => {
  await expect(User.create({
    name: 'AB',
    email: 'short@example.com',
    phone: '9876543210',
    dob: new Date('1995-05-15'),
    gender: 'male',
    address: 'Chennai, India'
  })).rejects.toThrow(); // ValidationError: name must be min 5 chars
});

// 2. Invalid Gender Value
test('CI Fail: invalid gender enum fails', async () => {
  await expect(User.create({
    name: 'Valid User Name',
    email: 'gender@example.com',
    phone: '9876543210',
    dob: new Date('1995-05-15'),
    gender: 'unknown',
    address: 'Chennai, India'
  })).rejects.toThrow(); // ValidationError: invalid gender
});

// 3. Missing Required Email
test('CI Fail: email is required field', async () => {
  await expect(User.create({
    name: 'No Email User',
    phone: '9876543210',
    dob: new Date('1995-05-15'),
    gender: 'male',
    address: 'Chennai, India'
  })).rejects.toThrow(); // ValidationError: email required
});