const nodemailer = require('nodemailer');
const { User, Dietitian, Organization } = require('../models/userModel');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email function
const sendEmail = async (to, subject, htmlMessage) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlMessage
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send policy change email to users
const sendPolicyChangeEmail = async (recipients, subject, message) => {
  try {
    let users = [];

    if (recipients.includes('users')) {
      const regularUsers = await User.find();
      users.push(...regularUsers);
    }

    if (recipients.includes('dietitians')) {
      const dietitians = await Dietitian.find();
      users.push(...dietitians);
    }

    if (recipients.includes('organizations')) {
      const organizations = await Organization.find();
      users.push(...organizations);
    }


    // Create HTML email template
    const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #28B463; color: white; padding: 20px; text-align: center;">
        <h1>NutriConnect</h1>
        <p>Important Policy Update</p>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9;">
        <h2>Hello,</h2>
        <p>We have updated our policies. Please review the changes below:</p>

        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28B463;">
          <h3>Policy Update Details:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>

        <p>Please log in to your account to view the complete updated terms and conditions.</p>

        <p>If you have any questions about these changes, please contact our support team.</p>

        <p>Best regards,<br>The NutriConnect Team</p>
      </div>
      <div style="background-color: #28B463; color: white; padding: 10px; text-align: center;">
        <p>Contact us: nutriconnect6@gmail.com | +91 70757 83143</p>
      </div>
    </div>`;

    // Send emails
    const emailPromises = users.map(user => sendEmail(user.email, subject, htmlTemplate));
    await Promise.all(emailPromises);

    return { success: true, count: users.length };
  } catch (error) {
    console.error('Error sending policy emails:', error);
    throw error;
  }
};

// Send account removal email to the removed user
const sendAccountRemovalEmail = async (to, userName, reason) => {
  const htmlTemplate = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1E6F5C; color: white; padding: 20px; text-align: center;">
      <h1 style="margin:0;">NutriConnect</h1>
      <p style="margin:4px 0 0;">Account Notification</p>
    </div>
    <div style="padding: 24px; background-color: #f9f9f9;">
      <h2 style="color:#2C3E50;">Hello, ${userName}</h2>
      <p>We regret to inform you that your <strong>NutriConnect account</strong> has been removed by an administrator.</p>

      <div style="background-color: #fff3cd; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #DC3545;">
        <h3 style="margin:0 0 8px; color:#DC3545;">Reason for Removal</h3>
        <p style="margin:0; color:#555;">${reason}</p>
      </div>

      <p>If you believe this action was taken in error, or if you have any questions, please reach out to our support team — we'll do our best to help.</p>

      <p style="margin-top:24px;">Best regards,<br><strong>The NutriConnect Team</strong></p>
    </div>
    <div style="background-color: #1E6F5C; color: white; padding: 12px; text-align: center; font-size: 13px;">
      <p style="margin:0;">Contact Support: nutriconnect6@gmail.com | +91 70757 83143</p>
    </div>
  </div>`;

  await sendEmail(to, 'Your NutriConnect Account Has Been Removed', htmlTemplate);
};

// Send leave notification email to admin when dietitian blocks days
const sendLeaveNotificationEmail = async (dietitianName, dietitianEmail, dates, reason) => {
  const adminEmail = process.env.EMAIL_USER; // send to admin inbox
  const dateList = dates.map(d =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  ).join('<br>');

  const htmlTemplate = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1E6F5C; color: white; padding: 20px; text-align: center;">
      <h1 style="margin:0;">NutriConnect</h1>
      <p style="margin:4px 0 0;">Dietitian Leave Notification</p>
    </div>
    <div style="padding: 24px; background-color: #f9f9f9;">
      <h2 style="color:#2C3E50;">Leave Request from ${dietitianName}</h2>
      <p><strong>Dietitian Email:</strong> ${dietitianEmail}</p>

      <div style="background-color: #fff8e1; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B;">
        <h3 style="margin:0 0 8px; color:#B45309;">Dates Being Blocked</h3>
        <p style="margin:0; color:#555;">${dateList}</p>
      </div>

      <div style="background-color: #e8f5e9; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28B463;">
        <h3 style="margin:0 0 8px; color:#1E6F5C;">Reason for Leave</h3>
        <p style="margin:0; color:#555;">${reason}</p>
      </div>

      <p>Please review this leave request and take any necessary action in the admin panel.</p>
      <p style="margin-top:24px;">Best regards,<br><strong>NutriConnect System</strong></p>
    </div>
    <div style="background-color: #1E6F5C; color: white; padding: 12px; text-align: center; font-size: 13px;">
      <p style="margin:0;">NutriConnect Admin | nutriconnect6@gmail.com | +91 70757 83143</p>
    </div>
  </div>`;

  await sendEmail(adminEmail, `Leave Request: ${dietitianName} — ${dates.length} day(s)`, htmlTemplate);
};

// Send payment cancellation email to user
const sendPaymentCancellationEmail = async (userEmail, userName, planType, cancellationDate) => {
  const htmlTemplate = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1E6F5C; color: white; padding: 20px; text-align: center;">
      <h1 style="margin:0;">NutriConnect</h1>
      <p style="margin:4px 0 0;">Subscription Cancellation Confirmation</p>
    </div>
    <div style="padding: 24px; background-color: #f9f9f9;">
      <h2 style="color:#2C3E50;">Hello, ${userName}</h2>
      <p>We're sorry to see you go! Your <strong>NutriConnect subscription</strong> has been successfully cancelled.</p>

      <div style="background-color: #e8f5e9; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28B463;">
        <h3 style="margin:0 0 8px; color:#1E6F5C;">Cancellation Details</h3>
        <p style="margin:4px 0;"><strong>Plan Type:</strong> ${planType.charAt(0).toUpperCase() + planType.slice(1)}</p>
        <p style="margin:4px 0;"><strong>Cancellation Date:</strong> ${new Date(cancellationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <p>Your subscription access will be deactivated immediately. If you have any outstanding sessions or services scheduled, please contact our support team for assistance.</p>

      <p>We'd love to hear your feedback on how we can improve. Feel free to reach out to us anytime if you'd like to reactivate your subscription or have any questions.</p>

      <p style="margin-top:24px;">Best regards,<br><strong>The NutriConnect Team</strong></p>
    </div>
    <div style="background-color: #1E6F5C; color: white; padding: 12px; text-align: center; font-size: 13px;">
      <p style="margin:0;">Contact Support: nutriconnect6@gmail.com | +91 70757 83143</p>
    </div>
  </div>`;

  await sendEmail(userEmail, 'Your NutriConnect Subscription Has Been Cancelled', htmlTemplate);
};

module.exports = {
  sendEmail,
  sendPolicyChangeEmail,
  sendAccountRemovalEmail,
  sendLeaveNotificationEmail,
  sendPaymentCancellationEmail
};