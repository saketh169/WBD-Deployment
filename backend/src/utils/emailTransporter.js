const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Create email transporter with Nodemailer's built-in Gmail service
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Get or create email transporter
 */
const getEmailTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
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
      const emailTransporter = getEmailTransporter();
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