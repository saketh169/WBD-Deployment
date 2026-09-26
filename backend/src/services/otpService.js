const nodemailer = require('nodemailer');
const crypto = require('crypto');

const { setStoredOTP, getStoredOTPData, removeStoredOTP } = require('../utils/redisClient');

// In-memory fallback storage for OTPs
const otpStore = new Map();

// OTP configuration
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;           // Max wrong attempts before lockout
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minute lockout after max attempts

// Create transporter for Gmail (singleton pattern)
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
};

// Generate a 6-digit random OTP using crypto for better randomness
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP in Redis with 10-minute auto-expiry and in-memory fallback
const storeOTP = async (email, otp) => {
  const otpData = {
    otp,
    timestamp: Date.now(),
    attempts: 0,
    lockedUntil: null,
  };
  otpStore.set(email.toLowerCase().trim(), otpData);
  await setStoredOTP(email, otpData, 600);
};

// Get stored OTP for email (checks Redis first, then in-memory fallback)
const getStoredOTP = async (email) => {
  const data = await getStoredOTPData(email) || otpStore.get(email.toLowerCase().trim());
  if (!data) return null;

  if (Date.now() - data.timestamp > OTP_EXPIRY_MS) {
    await removeStoredOTP(email);
    otpStore.delete(email.toLowerCase().trim());
    return null;
  }

  return data.otp;
};

// Remove OTP after successful verification
const removeOTP = async (email) => {
  await removeStoredOTP(email);
  otpStore.delete(email.toLowerCase().trim());
};

// Send OTP email to user (for password reset)
const sendOTPEmail = async (email, otp) => {
  const otpHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1E6F5C; color: white; padding: 20px; text-align: center;">
      <h1>NutriConnect Password Reset</h1>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9;">
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password for your NutriConnect account.</p>

      <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; border: 2px solid #1E6F5C;">
        <h3 style="color: #1E6F5C; margin-bottom: 10px;">Your OTP Code</h3>
        <div style="font-size: 32px; font-weight: bold; color: #1E6F5C; letter-spacing: 5px; font-family: monospace;">
          ${otp}
        </div>
        <p style="margin-top: 15px; color: #666; font-size: 14px;">
          Please use this code to reset your password.
        </p>
      </div>

      <p><strong>Important:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.</p>

      <p>If you have any questions, please contact our support team.</p>

      <p>Best regards,<br>The NutriConnect Team</p>
    </div>
    <div style="background-color: #1E6F5C; color: white; padding: 10px; text-align: center;">
      <p>Contact us: nutriconnect6@gmail.com | +91 70757 83143</p>
    </div>
  </div>`;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - NutriConnect',
      html: otpHtml
    });
    console.log('Password reset OTP email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    return { success: false, error };
  }
};

// Send Login 2FA OTP email to user (includes role label)
const sendLoginOTPEmail = async (email, otp, roleLabel = '') => {
  const roleLine = roleLabel ? `<p style="margin-bottom: 15px; color: #555;"><strong>Account Type:</strong> ${roleLabel}</p>` : '';
  const otpHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1E6F5C; color: white; padding: 20px; text-align: center;">
      <h1>NutriConnect Login Verification</h1>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9;">
      <h2>Two-Factor Authentication</h2>
      <p>A sign-in attempt has been made on your NutriConnect account. Please use the OTP below to complete your login.</p>

      ${roleLine}

      <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; border: 2px solid #1E6F5C;">
        <h3 style="color: #1E6F5C; margin-bottom: 10px;">Your Login OTP</h3>
        <div style="font-size: 32px; font-weight: bold; color: #1E6F5C; letter-spacing: 5px; font-family: monospace;">
          ${otp}
        </div>
        <p style="margin-top: 15px; color: #666; font-size: 14px;">
          Enter this code on the login page to verify your identity.
        </p>
      </div>

      <p><strong>Important:</strong> If you did not attempt to log in, please change your password immediately as someone may have your credentials.</p>

      <p>If you have any questions, please contact our support team.</p>

      <p>Best regards,<br>The NutriConnect Team</p>
    </div>
    <div style="background-color: #1E6F5C; color: white; padding: 10px; text-align: center;">
      <p>Contact us: nutriconnect6@gmail.com | +91 70757 83143</p>
    </div>
  </div>`;

  try {
    const transporter = getTransporter();
    const subjectRole = roleLabel ? ` (${roleLabel})` : '';
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Login Verification OTP${subjectRole} - NutriConnect`,
      html: otpHtml
    });
    console.log('Login 2FA OTP email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending login OTP email:', error);
    return { success: false, error };
  }
};

// Main function to send OTP for login 2FA
const sendLoginOTP = async (email, roleLabel = '') => {
  try {
    const otp = generateOTP();
    await storeOTP(email, otp);

    // DEV MODE: OTP logging disabled for security
    // In development, check email or database for OTP values
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n\uD83D\uDD10 [DEV] LOGIN OTP for ${email} (${roleLabel || 'unknown role'}): ${otp}\n`);
    }

    const emailResult = await sendLoginOTPEmail(email, otp, roleLabel);

    if (emailResult.success) {
      return { success: true, message: 'Login OTP sent successfully' };
    } else {
      await removeOTP(email);
      return { success: false, message: 'Failed to send login OTP email', error: emailResult.error };
    }
  } catch (error) {
    console.error('Error in sendLoginOTP:', error);
    return { success: false, message: 'Internal server error', error };
  }
};

// Main function to send OTP for password reset
const sendPasswordResetOTP = async (email) => {
  try {
    // Generate new OTP
    const otp = generateOTP();

    // Store OTP with email
    await storeOTP(email, otp);

    // DEV MODE: OTP logging disabled for security
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n\uD83D\uDD11 [DEV] PASSWORD RESET OTP for ${email}: ${otp}\n`);
    }

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp);

    if (emailResult.success) {
      return { success: true, message: 'OTP sent successfully' };
    } else {
      // Remove stored OTP if email failed
      await removeOTP(email);
      return { success: false, message: 'Failed to send OTP email', error: emailResult.error };
    }
  } catch (error) {
    console.error('Error in sendPasswordResetOTP:', error);
    return { success: false, message: 'Internal server error', error };
  }
};

// Verify OTP with brute-force protection
const verifyOTP = async (email, enteredOTP) => {
  const normalizedEmail = email.toLowerCase().trim();
  const data = await getStoredOTPData(normalizedEmail) || otpStore.get(normalizedEmail);

  if (!data) {
    return { success: false, message: 'OTP expired or not found. Please request a new one.' };
  }

  // Check expiry
  if (Date.now() - data.timestamp > OTP_EXPIRY_MS) {
    await removeOTP(normalizedEmail);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Check lockout
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const minutesLeft = Math.ceil((data.lockedUntil - Date.now()) / 60000);
    return { success: false, message: `Too many failed attempts. Please try again in ${minutesLeft} minute(s).` };
  }

  if (data.otp !== enteredOTP) {
    data.attempts = (data.attempts || 0) + 1;

    // Lock out after max attempts
    if (data.attempts >= MAX_OTP_ATTEMPTS) {
      data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      otpStore.set(normalizedEmail, data);
      await setStoredOTP(normalizedEmail, data, 900); // 15 min lockout
      return { success: false, message: 'Too many failed attempts. Account locked for 15 minutes. Please request a new OTP.' };
    }

    otpStore.set(normalizedEmail, data);
    await setStoredOTP(normalizedEmail, data, 600);
    const remaining = MAX_OTP_ATTEMPTS - data.attempts;
    return { success: false, message: `Invalid OTP. ${remaining} attempt(s) remaining.` };
  }

  // OTP is valid, remove it from storage
  await removeOTP(normalizedEmail);

  return { success: true, message: 'OTP verified successfully' };
};

const cleanupExpiredOTPs = () => {};

module.exports = {
  sendPasswordResetOTP,
  sendLoginOTP,
  verifyOTP,
  getStoredOTP,
  cleanupExpiredOTPs
};