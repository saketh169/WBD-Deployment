const { getEmailTransporter, sendEmailWithRetry } = require('../utils/emailTransporter');
const { sanitizeEmailText } = require('../utils/htmlEscaper');

// Send booking confirmation email to user
const sendBookingConfirmationToUser = async (bookingData) => {
  const {
    username,
    email,
    dietitianName,
    dietitianSpecialization,
    date,
    time,
    consultationType,
    amount,
    paymentId,
    bookingId
  } = bookingData;

  // Escape user-supplied data to prevent HTML injection
  const safeName = sanitizeEmailText(username);
  const safeDietitianName = sanitizeEmailText(dietitianName);
  const safeDietitianSpec = sanitizeEmailText(dietitianSpecialization);
  const safeConsultationType = sanitizeEmailText(consultationType);
  const safePaymentId = sanitizeEmailText(paymentId);
  const safeBookingId = sanitizeEmailText(bookingId);

  const emailHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #28B463; color: white; padding: 20px; text-align: center;">
      <h1>🎉 Booking Confirmed - NutriConnect</h1>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9;">
      <h2>Hello ${safeName},</h2>
      <p>Great news! Your consultation has been successfully booked.</p>

      <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #28B463;">Booking Details:</h3>
        <p><strong>Dietitian:</strong> ${safeDietitianName}</p>
        ${safeDietitianSpec ? `<p><strong>Specialization:</strong> ${safeDietitianSpec}</p>` : ''}
        <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Consultation Type:</strong> ${safeConsultationType}</p>
        <p><strong>Amount Paid:</strong> ₹${amount}</p>
        <p><strong>Payment ID:</strong> ${safePaymentId}</p>
        <p><strong>Booking ID:</strong> ${safeBookingId}</p>
      </div>

      <div style="background-color: #e8f7e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #28B463;">What's Next?</h3>
        <ul>
          <li>The dietitian will contact you before the scheduled time</li>
          <li>Please be available 5 minutes before the consultation</li>
          <li>Keep your health records ready if applicable</li>
        </ul>
      </div>

      <p>If you need to reschedule or have any questions, please contact us.</p>
      <p>Best regards,<br>The NutriConnect Team</p>
    </div>
    <div style="background-color: #28B463; color: white; padding: 10px; text-align: center;">
      <p>Contact us: nutriconnect6@gmail.com | +91 70757 83143</p>
    </div>
  </div>`;

  try {
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '✅ Booking Confirmed - NutriConnect',
      html: emailHtml
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation email to user:', error);
    return { success: false, error };
  }
};

// Send booking notification email to dietitian
const sendBookingNotificationToDietitian = async (bookingData) => {
  const {
    username,
    email,
    userPhone,
    userAddress,
    dietitianName,
    dietitianEmail,
    date,
    time,
    consultationType,
    amount,
    bookingId
  } = bookingData;

  // Escape user-supplied data
  const safeName = sanitizeEmailText(username);
  const safeEmail = sanitizeEmailText(email);
  const safePhone = sanitizeEmailText(userPhone);
  const safeAddress = sanitizeEmailText(userAddress);
  const safeConsultationType = sanitizeEmailText(consultationType);
  const safeBookingId = sanitizeEmailText(bookingId);

  const emailHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #28B463; color: white; padding: 20px; text-align: center;">
      <h1>📅 New Booking Received - NutriConnect</h1>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9;">
      <h2>Hello ${sanitizeEmailText(dietitianName)},</h2>
      <p>You have received a new consultation booking!</p>

      <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #28B463;">Client Details:</h3>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
        ${safeAddress ? `<p><strong>Address:</strong> ${safeAddress}</p>` : ''}
      </div>

      <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #28B463;">Consultation Details:</h3>
        <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Type:</strong> ${safeConsultationType}</p>
        <p><strong>Fee:</strong> ₹${amount}</p>
        <p><strong>Booking ID:</strong> ${safeBookingId}</p>
      </div>

      <div style="background-color: #e8f7e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #28B463;">Action Required:</h3>
        <ul>
          <li>Review the booking details in your dashboard</li>
          <li>Contact the client before the scheduled time if needed</li>
          <li>Be ready for the consultation at the scheduled time</li>
        </ul>
      </div>

      <p>Best regards,<br>The NutriConnect Team</p>
    </div>
    <div style="background-color: #28B463; color: white; padding: 10px; text-align: center;">
      <p>Contact us: nutriconnect6@gmail.com | +91 70757 83143</p>
    </div>
  </div>`;

  try {
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: dietitianEmail,
      subject: '📅 New Booking Received - NutriConnect',
      html: emailHtml
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending booking notification email to dietitian:', error);
    return { success: false, error };
  }
};

module.exports = {
  sendBookingConfirmationToUser,
  sendBookingNotificationToDietitian
};
