const mongoose = require('mongoose');
const path = require('path');
const { FAQ, HardcodedResponse, NutritionCache } = require('../models/chatbotModels');

require('dotenv').config({ 
  path: path.join(__dirname, '..', 'utils', '.env') 
});

const connectDB = require('../utils/db');

// Connect to MongoDB
connectDB();

// Seed FAQs
const seedFAQs = [
    {
        question: 'What is NutriConnect?',
        answer: 'NutriConnect is your comprehensive nutrition and wellness platform. We connect you with certified dietitians, provide personalized meal plans, track your progress, and offer AI-powered nutrition assistance. Our goal is to help you achieve your health and wellness goals through expert guidance and smart technology.',
        category: 'platform',
        keywords: ['nutriconnect', 'what is', 'platform', 'about'],
        clickCount: 100
    },
    {
        question: 'How to use the ChatBot?',
        answer: 'Using the chatbot is easy! Just type your questions about nutrition, diet plans, healthy recipes, or wellness tips. I can provide nutritional information, answer common health questions, and guide you through our platform features. Feel free to ask me anything related to health and nutrition!',
        category: 'platform',
        keywords: ['chatbot', 'how to use', 'help', 'guide'],
        clickCount: 85
    },
    {
        question: 'What are the benefits?',
        answer: 'NutriConnect offers many benefits: ✓ Personalized nutrition plans tailored to your goals, ✓ Direct access to certified dietitians via video/chat, ✓ AI-powered instant answers to nutrition questions, ✓ Progress tracking and meal logging, ✓ Evidence-based health insights, ✓ Flexible scheduling for consultations. We\'re here to support your health journey 24/7!',
        category: 'platform',
        keywords: ['benefits', 'advantages', 'features', 'why'],
        clickCount: 75
    },
    {
        question: 'How can I lose weight?',
        answer: 'For healthy weight loss, focus on: 1) Creating a moderate calorie deficit (500-750 cal/day), 2) Eating whole foods rich in protein and fiber, 3) Regular physical activity, 4) Adequate sleep (7-9 hours), 5) Staying hydrated. I recommend booking a consultation with one of our dietitians for a personalized plan!',
        category: 'weight-loss',
        keywords: ['weight loss', 'lose weight', 'slim down', 'fat loss'],
        clickCount: 90
    },
    {
        question: 'How do I book a consultation?',
        answer: 'Booking a consultation is simple! Go to the Dietitian Profiles section, filter by your needs (weight loss, diabetes, etc.), browse certified dietitians, and select an available time slot. You can choose video or chat consultations based on your preference.',
        category: 'platform',
        keywords: ['book', 'consultation', 'appointment', 'dietitian'],
        clickCount: 70
    },
    {
        question: 'What foods are high in protein?',
        answer: 'Excellent protein sources include: lean meats (chicken, turkey, lean beef), fish (salmon, tuna, cod), eggs, dairy (Greek yogurt, cottage cheese), legumes (lentils, chickpeas, beans), nuts, and tofu. Aim for 0.8-1g protein per kg of body weight daily.',
        category: 'nutrition',
        keywords: ['protein', 'high protein', 'protein foods', 'muscle'],
        clickCount: 65
    },
    {
        question: 'How much water should I drink daily?',
        answer: 'General recommendation is 8 glasses (64 oz or 2 liters) per day, but individual needs vary based on activity level, climate, and body size. A good rule: drink when thirsty and check your urine color - pale yellow indicates good hydration.',
        category: 'health',
        keywords: ['water', 'hydration', 'drink', 'daily intake'],
        clickCount: 55
    },
    {
        question: 'Are carbs bad for weight loss?',
        answer: 'No! Carbs aren\'t bad - it\'s about choosing the right types and amounts. Focus on complex carbs (whole grains, vegetables, fruits) which provide energy and nutrients. Limit refined carbs (white bread, sugary snacks). Balance is key for sustainable weight loss.',
        category: 'nutrition',
        keywords: ['carbs', 'carbohydrates', 'weight loss', 'diet'],
        clickCount: 60
    }
];

// Seed Hardcoded Responses
const seedHardcodedResponses = [
    {
        trigger: 'hello',
        response: 'Hello! 👋 I\'m your NutriConnect nutrition assistant. How can I help you today?',
        category: 'greeting'
    },
    {
        trigger: 'hi',
        response: 'Hi there! 😊 Welcome to NutriConnect! Ask me anything about nutrition, health, or our platform.',
        category: 'greeting'
    },
    {
        trigger: 'hey',
        response: 'Hey! Great to see you! How can I assist with your nutrition questions today?',
        category: 'greeting'
    },
    {
        trigger: 'thank',
        response: 'You\'re welcome! I\'m always here to help with your nutrition questions. Feel free to ask anything else or book a consultation with our expert dietitians for personalized guidance. Have a healthy day! 🌱',
        category: 'farewell'
    },
    {
        trigger: 'thanks',
        response: 'My pleasure! 😊 Remember, I\'m here 24/7 for nutrition advice. For personalized plans, don\'t hesitate to book with our dietitians!',
        category: 'farewell'
    },
    {
        trigger: 'bye',
        response: 'Goodbye! Take care and stay healthy! 💚 Come back anytime you need nutrition advice.',
        category: 'farewell'
    },
    {
        trigger: 'stay healthy',
        response: 'Remember: Small steps lead to big changes! 🌟 Stay consistent with your nutrition goals!',
        category: 'motivation'
    }
];

// Seed Basic Nutrition Data
const seedNutritionCache = [
    {
        foodName: 'apple',
        nutrients: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19 },
        servingSize: { amount: 1, unit: 'medium' },
        source: 'manual'
    },
    {
        foodName: 'banana',
        nutrients: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14 },
        servingSize: { amount: 1, unit: 'medium' },
        source: 'manual'
    },
    {
        foodName: 'chicken breast',
        nutrients: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
        servingSize: { amount: 100, unit: 'g' },
        source: 'manual'
    },
    {
        foodName: 'egg',
        nutrients: { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, sugar: 0.6 },
        servingSize: { amount: 1, unit: 'large' },
        source: 'manual'
    },
    {
        foodName: 'rice',
        nutrients: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
        servingSize: { amount: 100, unit: 'g cooked' },
        source: 'manual'
    },
    {
        foodName: 'broccoli',
        nutrients: { calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 2.4, sugar: 2.2 },
        servingSize: { amount: 100, unit: 'g' },
        source: 'manual'
    },
    {
        foodName: 'salmon',
        nutrients: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0 },
        servingSize: { amount: 100, unit: 'g' },
        source: 'manual'
    },
    {
        foodName: 'milk',
        nutrients: { calories: 103, protein: 8, carbs: 12, fat: 2.4, fiber: 0, sugar: 12 },
        servingSize: { amount: 1, unit: 'cup' },
        source: 'manual'
    }
];

async function seedDatabase() {
    try {
        // Clear existing data
        await FAQ.deleteMany({});
        await HardcodedResponse.deleteMany({});
        await NutritionCache.deleteMany({});
        
        console.log('Cleared existing data');

        // Insert FAQs
        await FAQ.insertMany(seedFAQs);
        console.log(`✅ Inserted ${seedFAQs.length} FAQs`);

        // Insert Hardcoded Responses
        await HardcodedResponse.insertMany(seedHardcodedResponses);
        console.log(`✅ Inserted ${seedHardcodedResponses.length} hardcoded responses`);

        // Insert Nutrition Cache
        await NutritionCache.insertMany(seedNutritionCache);
        console.log(`✅ Inserted ${seedNutritionCache.length} nutrition items`);

        console.log('\n🎉 Database seeded successfully!');
        console.log('\nYou can now:');
        console.log('1. Test the chatbot with questions like "What is NutriConnect?"');
        console.log('2. Ask about nutrition like "calories in apple"');
        console.log('3. Get top FAQs from /api/chatbot/top-faqs');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
