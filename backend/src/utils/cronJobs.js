const cron = require('node-cron');
const { sendEmail } = require('../services/emailService');
const { User, Dietitian } = require('../models/userModel');

const startCronJobs = () => {
  // Schedule a job to run every Sunday at midnight (0 0 * * 0)
  // Run weekly digest
  cron.schedule('0 0 * * 0', async () => {
    try {
      console.log('Running weekly digest cron job...');

      // Calculate date from 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch new users
      const newUsersCount = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo }, role: 'user' });
      const newDietitiansCount = await Dietitian.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

      // For revenue, it could be complex. We'll just provide a simple snapshot.
      const totalUsers = await User.countDocuments({ role: 'user' });
      const totalDietitians = await Dietitian.countDocuments();

      const htmlTemplate = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #1E6F5C; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin:0;">NutriConnect</h1>
                        <p style="margin:4px 0 0;">Weekly Activity Digest</p>
                    </div>
                    <div style="padding: 24px; background-color: #f9f9f9;">
                        <h2 style="color:#2C3E50;">Hello Admin,</h2>
                        <p>Here is your weekly summary of platform activity for the last 7 days.</p>
                        
                        <div style="background-color: #e8f5e9; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28B463;">
                            <h3 style="margin:0 0 8px; color:#1E6F5C;">New Registrations this week</h3>
                            <p style="margin:4px 0;"><strong>New Clients:</strong> ${newUsersCount}</p>
                            <p style="margin:4px 0;"><strong>New Dietitians:</strong> ${newDietitiansCount}</p>
                        </div>
                        
                        <div style="background-color: #fff8e1; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                            <h3 style="margin:0 0 8px; color:#B45309;">Total Platform Snapshot</h3>
                            <p style="margin:4px 0;"><strong>Total Active Clients:</strong> ${totalUsers}</p>
                            <p style="margin:4px 0;"><strong>Total Active Dietitians:</strong> ${totalDietitians}</p>
                        </div>

                        <p>Log in to the Admin Dashboard to see detailed analytics, export reports, and more.</p>
                        <p style="margin-top:24px;">Best regards,<br><strong>NutriConnect System</strong></p>
                    </div>
                </div>
            `;

      // Identify admins
      const adminUsers = await User.find({ role: 'admin' });
      const emailResults = [];
      
      if (adminUsers.length > 0) {
        // Use Promise.all to wait for all emails to send
        const sendPromises = adminUsers.map(admin => 
          sendEmail(admin.email, 'NutriConnect - Weekly Digest', htmlTemplate)
            .then(result => {
              emailResults.push(result);
              return result;
            })
            .catch(err => {
              console.error(`Failed to send weekly digest to ${admin.email}:`, err);
              emailResults.push({ success: false, to: admin.email, error: err.message });
            })
        );
        
        await Promise.all(sendPromises);
        
        const successCount = emailResults.filter(r => r.success).length;
        const failureCount = emailResults.filter(r => !r.success).length;
        console.log(`Weekly digest emails: ${successCount} sent, ${failureCount} failed`);
      } else if (process.env.EMAIL_USER) {
        // Fallback to process.env.EMAIL_USER if no admins found
        const result = await sendEmail(process.env.EMAIL_USER, 'NutriConnect - Weekly Digest', htmlTemplate);
        if (result.success) {
          console.log('Weekly digest email sent to fallback admin email');
        } else {
          console.error('Failed to send weekly digest to fallback admin email:', result.error);
        }
      }

      console.log('Weekly digest email batch completed.');
    } catch (error) {
      console.error('Error running weekly digest cron job:', error);
    }
  });

  console.log('Cron jobs initialized.');
};

module.exports = { startCronJobs };
