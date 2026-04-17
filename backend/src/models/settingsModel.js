const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  termsOfService: {
    type: String,
    default: ''
  },
  privacyPolicy: {
    type: String,
    default: ''
  },
  consultationCommission: {
    type: Number,
    default: 15,
    min: 0,
    max: 100
  },
  platformShare: {
    type: Number,
    default: 20,
    min: 0,
    max: 100
  },
  monthlyTiers: {
    type: [{
      name: { type: String, required: true },
      price: { type: Number, required: true },
      desc1: { type: String },
      desc2: { type: String },
      features: [{ type: String }]
    }],
    default: [
      { 
        name: 'Basic', 
        price: 299, 
        desc1: 'Perfect starter plan for your wellness journey',
        desc2: '3 consultations/month • 5 days advance booking • 5 progress plans • 25 daily chatbot queries • No blog posting',
        features: [
          '3 Consultations per month',
          'Book up to 5 days in advance',
          '5 Personalized Progress Plans',
          '25 AI Chatbot queries per day',
          'No Blog posting',
          'Unlimited Chat & Video Calls',
          'Blog Reading Access',
          'Email Support'
        ]
      },
      { 
        name: 'Premium', 
        price: 599, 
        desc1: 'Most popular for serious health goals',
        desc2: '5 consultations/month • 7 days advance booking • 10 progress plans • 40 daily chatbot queries • 3 blog posts/month',
        features: [
          '5 Consultations per month',
          'Book up to 7 days in advance',
          '10 Personalized Progress Plans',
          '40 AI Chatbot queries per day',
          'Create 3 Blog posts per month',
          'Unlimited Chat & Video Calls',
          'Full Blog Access',
          'Priority Email Support',
          'Advanced Progress Analytics',
          'Lab Report Analysis'
        ]
      },
      { 
        name: 'Ultimate', 
        price: 899, 
        desc1: 'Complete wellness package with unlimited features',
        desc2: '12 consultations/month • 14 days advance booking • 20 progress plans • 75 daily chatbot queries • 10 blog posts/month',
        features: [
          '12 Consultations per month',
          'Book up to 14 days in advance',
          '20 Personalized Progress Plans',
          '75 AI Chatbot queries per day',
          'Create 10 Blog posts per month',
          'Unlimited Chat & Video Calls',
          'Full Blog Access & Priority',
          '24/7 Priority Support',
          'Premium Analytics Dashboard',
          'AI-Powered Health Insights',
          'Exclusive Health Resources',
          'Priority Dietitian Matching'
        ]
      }
    ]
  },
  yearlyTiers: {
    type: [{
      name: { type: String, required: true },
      price: { type: Number, required: true },
      desc1: { type: String },
      desc2: { type: String },
      features: [{ type: String }]
    }],
    default: [
      { 
        name: 'Basic', 
        price: 999, 
        desc1: 'Save 72% with yearly subscription!',
        desc2: '3 consultations/month • 5 days advance booking • 5 progress plans • 25 daily chatbot queries • No blog posting',
        features: [
          '3 Consultations per month',
          'Book up to 5 days in advance',
          '5 Personalized Progress Plans',
          '25 AI Chatbot queries per day',
          'No Blog posting',
          'Unlimited Chat & Video Calls',
          'Blog Reading Access',
          'Email Support'
        ]
      },
      { 
        name: 'Premium', 
        price: 1999, 
        desc1: 'Save 72% compared to monthly billing!',
        desc2: '5 consultations/month • 7 days advance booking • 10 progress plans • 40 daily chatbot queries • 3 blog posts/month',
        features: [
          '5 Consultations per month',
          'Book up to 7 days in advance',
          '10 Personalized Progress Plans',
          '40 AI Chatbot queries per day',
          'Create 3 Blog posts per month',
          'Unlimited Chat & Video Calls',
          'Full Blog Access',
          'Priority Email Support',
          'Advanced Progress Analytics',
          'Lab Report Analysis'
        ]
      },
      { 
        name: 'Ultimate', 
        price: 2999, 
        desc1: 'Best Value! Save 72% on yearly plan',
        desc2: '12 consultations/month • 14 days advance booking • 20 progress plans • 75 daily chatbot queries • 10 blog posts/month',
        features: [
          '12 Consultations per month',
          'Book up to 14 days in advance',
          '20 Personalized Progress Plans',
          '75 AI Chatbot queries per day',
          'Create 10 Blog posts per month',
          'Unlimited Chat & Video Calls',
          'Full Blog Access & Priority',
          '24/7 Priority Support',
          'Premium Analytics Dashboard',
          'AI-Powered Health Insights',
          'Exclusive Health Resources',
          'Priority Dietitian Matching'
        ]
      }
    ]
  },
  // Add other settings as needed
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);