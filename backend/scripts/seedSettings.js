const mongoose = require('mongoose');
const path = require('path');
const Settings = require('../models/settingsModel');

require('dotenv').config({ 
  path: path.join(__dirname, '..', 'utils', '.env') 
});

const connectDB = require('../utils/db');

// Connect to MongoDB
connectDB();

// Default content for terms of service and privacy policy
const DEFAULT_TERMS_OF_SERVICE = `# Terms of Service

## 1. Acceptance of Terms
By accessing and using NutriConnect, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

## 2. Use License
Permission is granted to temporarily download one copy of the materials on NutriConnect for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
- Modify or copy the materials
- Use the materials for any commercial purpose or for any public display
- Attempt to reverse engineer any software contained on NutriConnect
- Remove any copyright or other proprietary notations from the materials

## 3. User Accounts
When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.

## 4. Service Description
NutriConnect provides an online platform connecting users with certified dietitians and nutrition experts. Services include:
- Video consultations
- Personalized diet plans
- Health tracking and analytics
- Educational content and blogs
- AI-powered chatbot assistance

## 5. Professional Services Disclaimer
The information provided through NutriConnect is for educational and informational purposes only. It is not intended as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.

## 6. Payment Terms
- All fees are charged in Indian Rupees (INR)
- Subscription fees are billed in advance on a recurring basis
- Refunds are processed according to our refund policy
- Failed payments may result in service suspension

## 7. Cancellation and Refund Policy
- Users may cancel subscriptions at any time
- Refunds are provided within 7 days of purchase for unused services
- No refunds for consumed consultations or services
- Cancellation takes effect at the end of the current billing period

## 8. Privacy and Data Protection
Your privacy is important to us. Please review our Privacy Policy, which also governs your use of NutriConnect, to understand our practices.

## 9. Prohibited Uses
You may not use our services:
- For any unlawful purpose or to solicit others to perform unlawful acts
- To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances
- To infringe upon or violate our intellectual property rights or the intellectual property rights of others
- To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate
- To submit false or misleading information

## 10. Content Policy
Users are responsible for the content they post. We reserve the right to remove content that violates these terms or is deemed inappropriate.

## 11. Intellectual Property Rights
The service and its original content, features, and functionality are and will remain the exclusive property of NutriConnect and its licensors.

## 12. Termination
We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.

## 13. Limitation of Liability
In no event shall NutriConnect, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.

## 14. Indemnification
You agree to defend, indemnify, and hold harmless NutriConnect and its licensee and licensors, and their employees, contractors, agents, officers and directors.

## 15. Governing Law
These Terms shall be interpreted and governed by the laws of India, without regard to its conflict of law provisions.

## 16. Changes to Terms
We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.

## Contact Information
If you have any questions about these Terms of Service, please contact us at support@nutriconnect.com.`;

const DEFAULT_PRIVACY_POLICY = `# Privacy Policy

## 1. Introduction
Welcome to NutriConnect. We are committed to protecting your personal information and your right to privacy. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.

## 2. Information We Collect
We collect information you provide directly to us, information we obtain automatically when you use our services, and information from third-party sources.

### Personal Information
- Name, email address, phone number
- Date of birth, gender, medical history
- Dietary preferences and restrictions
- Health goals and measurements
- Payment information and billing details

### Usage Information
- Device information and identifiers
- Log data and usage patterns
- Location data (with permission)
- Consultation records and chat history

## 3. How We Use Your Information
We use collected information for various purposes:
- Providing and maintaining our services
- Processing payments and managing subscriptions
- Personalizing your experience and diet plans
- Communicating with you about services and updates
- Ensuring platform security and preventing fraud
- Complying with legal obligations
- Improving our services through analytics

## 4. Information Sharing and Disclosure
We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.

### Service Providers
We may share information with trusted third-party service providers who assist us in operating our platform, processing payments, or providing services.

### Legal Requirements
We may disclose information if required by law, court order, or government request, or to protect our rights and safety.

### Business Transfers
In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity.

## 5. Data Security
We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

### Security Measures
- Encryption of data in transit and at rest
- Regular security audits and updates
- Access controls and authentication
- Secure payment processing
- Regular backups and disaster recovery

## 6. Data Retention
We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.

## 7. Your Rights and Choices
You have certain rights regarding your personal information:

### Access and Portability
You can request access to your personal information and obtain a copy in a portable format.

### Correction
You can update or correct your personal information at any time through your account settings.

### Deletion
You can request deletion of your personal information, subject to legal and legitimate business requirements.

### Opt-out
You can opt out of marketing communications and certain data processing activities.

## 8. Cookies and Tracking Technologies
We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content.

### Types of Cookies
- Essential cookies for platform functionality
- Analytics cookies to understand usage patterns
- Marketing cookies for targeted advertising
- Preference cookies to remember your settings

## 9. Third-Party Services
Our platform may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these external services.

## 10. Children's Privacy
Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.

## 11. International Data Transfers
Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.

## 12. Changes to This Policy
We may update this privacy policy from time to time. We will notify you of any material changes by email or through our platform.

## 13. Contact Us
If you have any questions about this privacy policy or our data practices, please contact us:

**Email:** privacy@nutriconnect.com
**Phone:** +91-XXXXXXXXXX
**Address:** [Company Address]

## 14. Consent
By using NutriConnect, you consent to the collection and use of information in accordance with this privacy policy.

## 15. Effective Date
This privacy policy is effective as of November 26, 2025.`;

const seedSettings = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    console.log('Seeding settings...');

    // Always update the same settings document using upsert
    const settings = await Settings.findOneAndUpdate(
      {}, // Empty filter to match any document (there should only be one)
      {
        termsOfService: DEFAULT_TERMS_OF_SERVICE,
        privacyPolicy: DEFAULT_PRIVACY_POLICY
      },
      {
        upsert: true, // Create if doesn't exist
        new: true, // Return the updated document
        runValidators: true // Run schema validations
      }
    );

    console.log('✅ Settings seeded/updated successfully with default content');

    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed.');

  } catch (error) {
    console.error('❌ Error seeding settings:', error);
    process.exit(1);
  }
};

module.exports = { seedSettings, DEFAULT_TERMS_OF_SERVICE, DEFAULT_PRIVACY_POLICY };

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedSettings();
}