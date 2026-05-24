const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Create email transporter for Gmail SMTP and force IPv4 (family: 4)
 * This avoids environments that prefer IPv6 and may return ENETUNREACH.
 */
const DEFAULT_TIME_MS = 20000;

/**
 * Create and verify a Gmail transporter (uses Nodemailer `service: 'gmail'`).
 * This file intentionally uses the Gmail service shortcut only.
 */
const createTransporter = async () => {
  const options = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4, // force IPv4
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: DEFAULT_TIME_MS,
    greetingTimeout: Math.floor(DEFAULT_TIME_MS / 2),
    socketTimeout: DEFAULT_TIME_MS,
    logger: false,
    debug: false,
    tls: { rejectUnauthorized: false }
  };

  const t = nodemailer.createTransport(options);
  // verify to fail fast in runtime when SMTP access is blocked
  await t.verify();
  return t;
};

/**
 * Get or create email transporter
 */
const getEmailTransporter = async () => {
  if (!transporter) {
    // createTransporter is async and verifies connection
    transporter = await createTransporter();
  }
  return transporter;
};

/**
 * Send email with retry logic (up to 3 attempts with exponential backoff)
 */
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const emailTransporter = await getEmailTransporter();
      const result = await emailTransporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        transporter = null; // Reset transporter for next attempt
      }
    }
  }
  
  throw lastError;
};

module.exports = {
  getEmailTransporter,
  sendEmailWithRetry
};