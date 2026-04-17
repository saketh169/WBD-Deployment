const mongoose = require('mongoose');
const path = require('path');
const { UserAuth, Dietitian } = require('../models/userModel');

require('dotenv').config({
  path: path.join(__dirname, '..', 'utils', '.env')
});


const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URL || "mongodb://localhost:27017/NutriConnectDatabase";
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully!');
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  }
};

// Mock data converted to seed format (full data)
const mockDietitians = [
  {
    name: "Dr. Sarah Johnson",
    photo: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Weight Loss", "Metabolic Health", "Sports Nutrition"],
    experience: 8,
    fees: 500,
    languages: ["English", "Hindi"],
    location: "Mumbai, India",
    rating: 4.8,
    online: true,
    offline: true,
    about: "Certified nutritionist with 8 years of experience in weight management and sports nutrition. I help clients achieve sustainable weight loss through personalized nutrition plans.",
    education: ["M.Sc. in Nutrition", "B.Sc. in Dietetics"],
    expertise: ["Weight Loss Planning", "Sports Nutrition", "Metabolism Optimization"],
    certifications: [
      { name: "Registered Dietitian", issuer: "ICMR", year: 2016 },
    ],
    testimonials: [
      { author: "Rajesh K.", rating: 5, text: "Amazing results in 3 months!" },
      { author: "Priya M.", rating: 4.5, text: "Very professional and supportive." },
    ],
  },
  {
    name: "Dr. Amit Patel",
    photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Diabetes Management", "Type 2 Diabetes", "Thyroid Health"],
    experience: 12,
    fees: 600,
    languages: ["English", "Hindi", "Gujarati"],
    location: "Ahmedabad, India",
    rating: 4.9,
    online: true,
    offline: true,
    about: "Diabetes and thyroid specialist with 12 years of clinical experience. I specialize in managing metabolic disorders through targeted nutrition interventions.",
    education: ["M.D. in Nutrition", "B.Sc. in Biochemistry"],
    expertise: ["Diabetes Management", "Thyroid Support", "Metabolic Disorders"],
    certifications: [
      { name: "Certified Diabetes Educator", issuer: "IDA", year: 2015 },
    ],
    testimonials: [
      { author: "Arun S.", rating: 5, text: "My blood sugar is under control now!" },
    ],
  },
  {
    name: "Dr. Emily Rodriguez",
    photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Women's Health", "PCOS", "Pregnancy Nutrition", "Fertility"],
    experience: 10,
    fees: 550,
    languages: ["English", "Spanish", "Hindi"],
    location: "Bangalore, India",
    rating: 4.7,
    online: true,
    offline: false,
    about: "Specialized in women's health and hormonal balance. I help women manage PCOS, fertility issues, and pregnancy nutrition with evidence-based strategies.",
    education: ["M.Sc. in Women's Health", "B.Sc. in Nutrition"],
    expertise: ["PCOS Management", "Fertility Nutrition", "Pregnancy Wellness"],
    certifications: [
      { name: "Women's Health Specialist", issuer: "INFS", year: 2017 },
    ],
    testimonials: [
      { author: "Sophia D.", rating: 4.5, text: "Helped me with my PCOS symptoms." },
    ],
  },
  {
    name: "Dr. Vikram Singh",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Gut Health", "IBS Management", "Food Sensitivities"],
    experience: 9,
    fees: 500,
    languages: ["English", "Hindi", "Punjabi"],
    location: "Delhi, India",
    rating: 4.6,
    online: true,
    offline: true,
    about: "Gut health specialist with focus on digestive issues and food sensitivities. I use a holistic approach to heal the gut and improve overall health.",
    education: ["M.Sc. in Gut Microbiome", "B.Sc. in Food Science"],
    expertise: ["Gut Healing", "Microbiome Restoration", "Food Sensitivity Testing"],
    certifications: [
      { name: "Certified Gut Health Coach", issuer: "IGHS", year: 2018 },
    ],
    testimonials: [
      { author: "Aman K.", rating: 5, text: "Finally found relief from IBS!" },
    ],
  },
  {
    name: "Dr. Lisa Zhang",
    photo: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Skin & Hair", "Anti-Aging", "Acne Management", "Hair Health"],
    experience: 7,
    fees: 450,
    languages: ["English", "Mandarin", "Hindi"],
    location: "Hyderabad, India",
    rating: 4.8,
    online: true,
    offline: false,
    about: "Dermatological nutritionist focusing on skin and hair health. I create personalized nutrition plans to address acne, hair loss, and aging concerns.",
    education: ["M.Sc. in Cosmetic Nutrition", "B.Sc. in Dermatology"],
    expertise: ["Skin Glow Enhancement", "Hair Restoration", "Anti-Aging Nutrition"],
    certifications: [
      { name: "Cosmetic Nutrition Specialist", issuer: "ICIN", year: 2019 },
    ],
    testimonials: [
      { author: "Neha S.", rating: 5, text: "My skin has never looked better!" },
    ],
  },
  {
    name: "Dr. Priya Sharma",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Weight Loss", "Mindful Eating", "Holistic Nutrition"],
    experience: 6,
    fees: 400,
    languages: ["English", "Hindi", "Telugu"],
    location: "Chennai, India",
    rating: 4.7,
    online: true,
    offline: true,
    about: "Holistic nutritionist focused on sustainable weight loss and mindful eating practices. I believe in creating lasting lifestyle changes.",
    education: ["M.Sc. in Holistic Nutrition", "B.Sc. in Food Science"],
    expertise: ["Sustainable Weight Loss", "Mindful Eating", "Lifestyle Coaching"],
    certifications: [
      { name: "Certified Holistic Nutritionist", issuer: "IHN", year: 2020 },
    ],
    testimonials: [
      { author: "Kavita R.", rating: 5, text: "Life-changing approach to nutrition!" },
    ],
  },
  {
    name: "Dr. Rajesh Kumar",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Diabetes Management", "Hypothyroidism", "Metabolic Health"],
    experience: 11,
    fees: 550,
    languages: ["English", "Hindi", "Tamil"],
    location: "Chennai, India",
    rating: 4.8,
    online: true,
    offline: true,
    about: "Endocrinology nutrition specialist with expertise in diabetes and thyroid management. I combine medical knowledge with nutritional science.",
    education: ["M.Sc. in Clinical Nutrition", "B.Sc. in Biochemistry"],
    expertise: ["Diabetes Control", "Thyroid Nutrition", "Metabolic Disorders"],
    certifications: [
      { name: "Clinical Nutrition Specialist", issuer: "ICN", year: 2016 },
    ],
    testimonials: [
      { author: "Suresh M.", rating: 4.5, text: "Very knowledgeable about thyroid issues." },
    ],
  },
  {
    name: "Dr. Anjali Gupta",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Women's Health", "Menopause", "Hormonal Balance", "Post-Partum Diet"],
    experience: 9,
    fees: 500,
    languages: ["English", "Hindi", "Bengali"],
    location: "Kolkata, India",
    rating: 4.6,
    online: true,
    offline: false,
    about: "Women's health nutritionist specializing in hormonal balance and life-stage nutrition. I support women through all phases of life.",
    education: ["M.Sc. in Women's Nutrition", "B.Sc. in Dietetics"],
    expertise: ["Menopause Nutrition", "Hormonal Health", "Postpartum Recovery"],
    certifications: [
      { name: "Women's Health Nutritionist", issuer: "IWHN", year: 2018 },
    ],
    testimonials: [
      { author: "Rina B.", rating: 5, text: "Helped me through menopause beautifully." },
    ],
  },
  {
    name: "Dr. Karan Mehta",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Gut Health", "GERD", "Food Intolerances", "Leaky Gut Syndrome"],
    experience: 8,
    fees: 480,
    languages: ["English", "Hindi", "Gujarati"],
    location: "Surat, India",
    rating: 4.7,
    online: true,
    offline: true,
    about: "Digestive health specialist focusing on gut microbiome restoration and food sensitivity management. I help heal the gut from the inside out.",
    education: ["M.Sc. in Functional Medicine", "B.Sc. in Nutrition"],
    expertise: ["Gut Microbiome", "Food Sensitivity", "Digestive Healing"],
    certifications: [
      { name: "Functional Medicine Practitioner", issuer: "IFM", year: 2019 },
    ],
    testimonials: [
      { author: "Deepak S.", rating: 4.5, text: "Finally understood my gut issues!" },
    ],
  },
  {
    name: "Dr. Maya Singh",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Skin & Hair", "Hair Loss", "Skin Glow", "Scalp Health"],
    experience: 7,
    fees: 420,
    languages: ["English", "Hindi", "Punjabi"],
    location: "Jaipur, India",
    rating: 4.9,
    online: true,
    offline: false,
    about: "Beauty nutritionist specializing in skin and hair health from within. I create targeted nutrition plans for radiant skin and strong hair.",
    education: ["M.Sc. in Beauty Nutrition", "B.Sc. in Cosmetology"],
    expertise: ["Hair Restoration", "Skin Radiance", "Beauty from Within"],
    certifications: [
      { name: "Beauty Nutrition Specialist", issuer: "IBNS", year: 2020 },
    ],
    testimonials: [
      { author: "Simran K.", rating: 5, text: "My hair has grown back beautifully!" },
    ],
  },
  {
    name: "Dr. Arjun Reddy",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Cardiac Health", "Hypertension", "Post-Cardiac Surgery"],
    experience: 14,
    fees: 650,
    languages: ["English", "Hindi", "Telugu"],
    location: "Hyderabad, India",
    rating: 4.8,
    online: true,
    offline: true,
    about: "Cardiovascular nutrition expert with extensive experience in post-surgery recovery and heart disease prevention through diet.",
    education: ["M.D. in Cardiac Nutrition", "B.Sc. in Medical Nutrition"],
    expertise: ["Heart Disease Prevention", "Post-Surgery Nutrition", "BP Control"],
    certifications: [
      { name: "Cardiac Rehabilitation Specialist", issuer: "ICRS", year: 2015 },
    ],
    testimonials: [
      { author: "Venkat R.", rating: 5, text: "Recovered faster after bypass surgery!" },
    ],
  },
  {
    name: "Dr. Fatima Khan",
    photo: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Weight Management", "Obesity Management", "Sports Nutrition"],
    experience: 10,
    fees: 520,
    languages: ["English", "Hindi", "Urdu"],
    location: "Lucknow, India",
    rating: 4.7,
    online: true,
    offline: true,
    about: "Sports and weight management nutritionist helping athletes and individuals achieve optimal body composition and performance.",
    education: ["M.Sc. in Sports Nutrition", "B.Sc. in Exercise Science"],
    expertise: ["Athletic Performance", "Body Composition", "Weight Management"],
    certifications: [
      { name: "Certified Sports Nutritionist", issuer: "ISSN", year: 2017 },
    ],
    testimonials: [
      { author: "Ahmed H.", rating: 4.5, text: "Great for my fitness goals!" },
    ],
  },
  {
    name: "Dr. Sneha Iyer",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Diabetes Management", "Type 1 Diabetes", "Blood Sugar Control"],
    experience: 9,
    fees: 580,
    languages: ["English", "Hindi", "Tamil", "Kannada"],
    location: "Bangalore, India",
    rating: 4.8,
    online: true,
    offline: true,
    about: "Diabetes care specialist with focus on both Type 1 and Type 2 diabetes management through comprehensive nutritional strategies.",
    education: ["M.Sc. in Diabetes Education", "B.Sc. in Nutrition"],
    expertise: ["Type 1 Diabetes", "Blood Sugar Management", "Carb Counting"],
    certifications: [
      { name: "Certified Diabetes Care Specialist", issuer: "IDCS", year: 2018 },
    ],
    testimonials: [
      { author: "Ravi I.", rating: 5, text: "Best diabetes nutritionist I've worked with!" },
    ],
  },
  {
    name: "Dr. Rohit Agarwal",
    photo: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Gut Health", "IBD", "Food Sensitivities", "Gut Inflammation"],
    experience: 11,
    fees: 530,
    languages: ["English", "Hindi"],
    location: "Delhi, India",
    rating: 4.6,
    online: true,
    offline: true,
    about: "Inflammatory bowel disease and gut health specialist. I work with complex digestive cases to restore gut health and reduce inflammation.",
    education: ["M.Sc. in Gastroenterology Nutrition", "B.Sc. in Biology"],
    expertise: ["IBD Management", "Anti-Inflammatory Diet", "Gut Healing Protocols"],
    certifications: [
      { name: "IBD Nutrition Specialist", issuer: "IIN", year: 2016 },
    ],
    testimonials: [
      { author: "Meera A.", rating: 4.5, text: "Finally managing my Crohn's disease better." },
    ],
  },
  {
    name: "Dr. Zara Ahmed",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Women's Health", "Fertility", "Pregnancy Nutrition", "Breastfeeding Support"],
    experience: 8,
    fees: 490,
    languages: ["English", "Hindi", "Urdu"],
    location: "Mumbai, India",
    rating: 4.9,
    online: true,
    offline: false,
    about: "Fertility and pregnancy nutrition specialist supporting women through preconception, pregnancy, and postpartum phases.",
    education: ["M.Sc. in Reproductive Nutrition", "B.Sc. in Dietetics"],
    expertise: ["Fertility Enhancement", "Pregnancy Wellness", "Postpartum Nutrition"],
    certifications: [
      { name: "Reproductive Health Nutritionist", issuer: "IRHN", year: 2019 },
    ],
    testimonials: [
      { author: "Aisha Z.", rating: 5, text: "Got pregnant after following her plan!" },
    ],
  },
  {
    name: "Dr. Naveen Joshi",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Skin & Hair", "Anti-Aging", "Skin Elasticity", "Hair Strength"],
    experience: 6,
    fees: 460,
    languages: ["English", "Hindi", "Marathi"],
    location: "Pune, India",
    rating: 4.7,
    online: true,
    offline: true,
    about: "Anti-aging nutritionist specializing in skin elasticity, collagen production, and hair strengthening through targeted supplementation and diet.",
    education: ["M.Sc. in Anti-Aging Nutrition", "B.Sc. in Biochemistry"],
    expertise: ["Collagen Enhancement", "Skin Aging Prevention", "Hair Vitality"],
    certifications: [
      { name: "Anti-Aging Specialist", issuer: "IAAS", year: 2021 },
    ],
    testimonials: [
      { author: "Poonam J.", rating: 4.5, text: "My skin looks 10 years younger!" },
    ],
  },
  {
    name: "Dr. Sunita Rao",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Weight Loss", "Metabolic Health", "Mindful Eating"],
    experience: 13,
    fees: 570,
    languages: ["English", "Hindi", "Kannada"],
    location: "Bangalore, India",
    rating: 4.8,
    online: true,
    offline: true,
    about: "Senior nutritionist with 13 years of experience in metabolic health and sustainable weight management. I focus on long-term lifestyle changes.",
    education: ["M.D. in Nutrition", "B.Sc. in Home Science"],
    expertise: ["Metabolic Syndrome", "Sustainable Weight Loss", "Lifestyle Medicine"],
    certifications: [
      { name: "Metabolic Health Specialist", issuer: "IMHS", year: 2014 },
    ],
    testimonials: [
      { author: "Vijay R.", rating: 5, text: "Lost 25kg and kept it off!" },
    ],
  },
  {
    name: "Dr. Imran Khan",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Diabetes Management", "Hyperthyroidism", "Metabolic Disorders"],
    experience: 10,
    fees: 540,
    languages: ["English", "Hindi", "Urdu"],
    location: "Hyderabad, India",
    rating: 4.7,
    online: true,
    offline: true,
    about: "Thyroid and metabolic disorders specialist with comprehensive approach to hormonal health and diabetes management.",
    education: ["M.Sc. in Endocrine Nutrition", "B.Sc. in Medical Biochemistry"],
    expertise: ["Thyroid Disorders", "Metabolic Diseases", "Hormonal Balance"],
    certifications: [
      { name: "Endocrine Nutrition Specialist", issuer: "IENS", year: 2017 },
    ],
    testimonials: [
      { author: "Farhan K.", rating: 4.5, text: "Finally stable thyroid levels!" },
    ],
  },
  {
    name: "Dr. Kavita Menon",
    photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Women's Health", "PCOS", "Hormonal Balance", "Fertility"],
    experience: 12,
    fees: 560,
    languages: ["English", "Hindi", "Malayalam"],
    location: "Kochi, India",
    rating: 4.9,
    online: true,
    offline: false,
    about: "Women's hormonal health expert specializing in PCOS management, fertility optimization, and comprehensive women's wellness.",
    education: ["M.Sc. in Reproductive Endocrinology", "B.Sc. in Nutrition"],
    expertise: ["PCOS Treatment", "Fertility Nutrition", "Women's Hormones"],
    certifications: [
      { name: "PCOS Nutrition Specialist", issuer: "IPNS", year: 2015 },
    ],
    testimonials: [
      { author: "Lakshmi M.", rating: 5, text: "PCOS under control, feeling amazing!" },
    ],
  },
  {
    name: "Dr. Aravind Nair",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Gut Health", "Microbiome", "Food Intolerances"],
    experience: 7,
    fees: 470,
    languages: ["English", "Hindi", "Malayalam"],
    location: "Thiruvananthapuram, India",
    rating: 4.6,
    online: true,
    offline: true,
    about: "Microbiome specialist focusing on gut health optimization and food sensitivity management. I use advanced testing to identify and heal gut issues.",
    education: ["M.Sc. in Microbiome Science", "B.Sc. in Biotechnology"],
    expertise: ["Gut Microbiome Testing", "Food Sensitivity", "Digestive Wellness"],
    certifications: [
      { name: "Microbiome Specialist", issuer: "IMS", year: 2020 },
    ],
    testimonials: [
      { author: "Sanjay N.", rating: 4.5, text: "Gut health transformed!" },
    ],
  },
  {
    name: "Dr. Meera Krishnan",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Skin & Hair", "Acne Management", "Anti-Aging"],
    experience: 8,
    fees: 440,
    languages: ["English", "Hindi", "Tamil"],
    location: "Chennai, India",
    rating: 4.8,
    online: true,
    offline: false,
    about: "Dermatology nutritionist specializing in acne treatment and anti-aging through nutrition. I combine skin science with nutritional biochemistry.",
    education: ["M.Sc. in Dermatology Nutrition", "B.Sc. in Biochemistry"],
    expertise: ["Acne Nutrition", "Anti-Aging Supplements", "Skin Health"],
    certifications: [
      { name: "Dermatology Nutritionist", issuer: "IDN", year: 2019 },
    ],
    testimonials: [
      { author: "Divya K.", rating: 5, text: "Clear skin after years of struggle!" },
    ],
  },
  {
    name: "Dr. Vikash Gupta",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Cardiac Health", "Cholesterol Management", "Hypertension"],
    experience: 16,
    fees: 680,
    languages: ["English", "Hindi"],
    location: "Delhi, India",
    rating: 4.9,
    online: true,
    offline: true,
    about: "Senior cardiac nutritionist with 16 years of experience in preventive cardiology and post-heart event recovery through dietary interventions.",
    education: ["M.D. in Preventive Cardiology", "B.Sc. in Nutrition"],
    expertise: ["Cholesterol Control", "Heart Attack Prevention", "Cardiac Recovery"],
    certifications: [
      { name: "Preventive Cardiology Specialist", issuer: "IPCS", year: 2013 },
    ],
    testimonials: [
      { author: "Rajendra G.", rating: 5, text: "Heart healthy and feeling great!" },
    ],
  },
  {
    name: "Dr. Priyanka Jain",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Weight Management", "Sports Nutrition", "Metabolic Health"],
    experience: 9,
    fees: 510,
    languages: ["English", "Hindi", "Marathi"],
    location: "Nagpur, India",
    rating: 4.7,
    online: true,
    offline: true,
    about: "Sports performance and weight management nutritionist working with athletes and fitness enthusiasts to optimize body composition and performance.",
    education: ["M.Sc. in Exercise Nutrition", "B.Sc. in Sports Science"],
    expertise: ["Athletic Nutrition", "Body Composition", "Performance Enhancement"],
    certifications: [
      { name: "Sports Dietitian", issuer: "ISDA", year: 2018 },
    ],
    testimonials: [
      { author: "Rahul J.", rating: 4.5, text: "Improved my marathon time significantly!" },
    ],
  },
  {
    name: "Dr. Sameer Desai",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Diabetes Management", "Thyroid Health", "Metabolic Disorders"],
    experience: 12,
    fees: 590,
    languages: ["English", "Hindi", "Gujarati"],
    location: "Ahmedabad, India",
    rating: 4.8,
    online: true,
    offline: true,
    about: "Endocrine disorders specialist with comprehensive expertise in diabetes, thyroid conditions, and metabolic syndrome management.",
    education: ["M.Sc. in Endocrine Nutrition", "B.Sc. in Medical Biochemistry"],
    expertise: ["Diabetes Complications", "Thyroid Autoimmunity", "Metabolic Syndrome"],
    certifications: [
      { name: "Endocrine Disorders Specialist", issuer: "IEDS", year: 2015 },
    ],
    testimonials: [
      { author: "Nisha D.", rating: 5, text: "Finally managing my Hashimoto's thyroiditis!" },
    ],
  },
  {
    name: "Dr.Neha Agarwal",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    specialties: ["Weight Management", "Diabetes Management", "Sports Nutrition", "Pediatric Nutrition", "Therapeutic Nutrition"],
    experience: 8,
    yearsOfExperience: 8,
    fees: 1500,
    languages: ["English", "Hindi", "Marathi"],
    location: "Mumbai, Maharashtra",
    rating: 4.8,
    online: true,
    offline: true,
    onlineConsultation: true,
    offlineConsultation: true,
    about: "Dr. Neha Agarwal is a certified clinical nutritionist with over 8 years of experience in helping individuals achieve their health goals through personalized nutrition plans. She specializes in weight management, diabetes care, and sports nutrition, combining evidence-based approaches with holistic wellness principles.",
    education: ["M.Sc. in Food Science & Nutrition - SNDT Women's University, Mumbai", "Post Graduate Diploma in Dietetics - VLCC Institute, Mumbai"],
    expertise: ["Medical Nutrition Therapy", "Weight Loss & Gain Programs", "Diabetes & Metabolic Disorders", "Sports & Performance Nutrition", "Pediatric & Adolescent Nutrition", "Pregnancy & Lactation Nutrition", "Gut Health & Digestive Disorders", "Thyroid & Hormonal Imbalances"],
    certifications: [
      { name: "Certified Clinical Nutritionist", issuer: "Indian Dietetic Association", year: 2018 },
      { name: "Certified Diabetes Educator", issuer: "International Diabetes Federation", year: 2020 },
      { name: "Sports Nutrition Specialist", issuer: "ISSN (International Society of Sports Nutrition)", year: 2022 },
      { name: "Ayurvedic Nutrition Consultant", issuer: "Ayurvedic Institute of India", year: 2019 }
    ],
    testimonials: [
      { author: "Priya Sharma", rating: 5, text: "Dr. Neha completely transformed my approach to nutrition. Her personalized diet plan helped me lose 15kg in 6 months while maintaining energy levels. Highly recommend!", authorId: "user_001" },
      { author: "Rahul Mehta", rating: 5, text: "As a diabetic, I was struggling with blood sugar control. Dr. Neha's guidance and meal planning made managing my condition so much easier. My HbA1c improved significantly.", authorId: "user_002" },
      { author: "Anjali Patel", rating: 4, text: "Great experience with Dr. Neha for my teenage son's nutrition needs. She was patient, knowledgeable, and created meals that my picky eater actually enjoyed.", authorId: "user_003" },
      { author: "Vikram Singh", rating: 5, text: "Dr. Neha helped me optimize my nutrition for better athletic performance. My endurance improved and recovery time decreased noticeably. Professional and dedicated.", authorId: "user_004" }
    ],
    title: "Clinical Nutritionist & Diabetes Educator",
    description: "Dr. Neha Agarwal is a certified clinical nutritionist with over 8 years of experience in helping individuals achieve their health goals through personalized nutrition plans. She specializes in weight management, diabetes care, and sports nutrition, combining evidence-based approaches with holistic wellness principles.",
    awards: [],
    publications: [],
    consultationTypes: [
      { type: "Initial Consultation", duration: 60, fee: 1500 },
      { type: "Follow-up Session", duration: 30, fee: 800 }
    ],
    availability: {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      workingHours: { start: "09:00", end: "18:00" }
    },
    socialMedia: {
      linkedin: "https://linkedin.com/in/neha-agarwal-nutritionist",
      twitter: "@NehaNutritionist"
    }
  }
];

async function seedDietitians() {
  try {
    await connectDB();

    for (const mock of mockDietitians) {
      // Generate fake data for required fields
      const email = mock.name === 'Dr.Neha Agarwal' ? 'dietitian1@gmail.com' : mock.name.toLowerCase().replace(/\s+/g, '').replace(/\./g, '') + '@dietitian.com';

      // Check if already exists
      const existingUser = await UserAuth.findOne({ email });
      if (existingUser) {
        console.log(`Dietitian ${mock.name} already exists, skipping...`);
        continue;
      }

      const passwordHash = await require('bcrypt').hash('123456', 10); // Fixed password
      const phone = '9' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
      const age = mock.age || 30; // Use provided age or default
      const licenseNumber = 'DLN' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

      // Handle profile image - download if URL provided
      let profileImageBuffer = null;
      if (mock.photo) {
        try {
          const axios = require('axios');
          const response = await axios.get(mock.photo, { responseType: 'arraybuffer' });
          profileImageBuffer = Buffer.from(response.data);
          console.log(`Downloaded profile image for ${mock.name}`);
        } catch (imageError) {
          console.log(`Failed to download image for ${mock.name}, using null`);
          profileImageBuffer = null;
        }
      }

      // Map interestedField based on specialties
      let interestedField = '';
      if (mock.specialties.some(s => s.toLowerCase().includes('weight'))) interestedField = 'weight_loss_gain';
      else if (mock.specialties.some(s => s.toLowerCase().includes('diabetes') || s.toLowerCase().includes('thyroid'))) interestedField = 'diabetes_thyroid_management';
      else if (mock.specialties.some(s => s.toLowerCase().includes('cardiac'))) interestedField = 'cardiac_health';
      else if (mock.specialties.some(s => s.toLowerCase().includes('women'))) interestedField = 'women_health';
      else if (mock.specialties.some(s => s.toLowerCase().includes('skin') || s.toLowerCase().includes('hair'))) interestedField = 'skin_hair_care';
      else if (mock.specialties.some(s => s.toLowerCase().includes('gut'))) interestedField = 'gut_digestive_health';

      // Create Dietitian first
      const dietitian = new Dietitian({
        name: mock.name,
        email,
        age,
        phone,
        licenseNumber,
        interestedField,
        degreeType: 'msc', // Default
        licenseIssuer: 'ida', // Default
        idProofType: 'aadhaar', // Default
        specializationDomain: 'sports_nutrition', // Default
        profileImage: mock.photo, // Just use the Unsplash URL directly
        files: {}, // Empty
        verificationStatus: {
          resume: 'Verified',
          degreeCertificate: 'Verified',
          licenseDocument: 'Verified',
          idProof: 'Verified',
          experienceCertificates: 'Verified',
          specializationCertifications: 'Verified',
          internshipCertificate: 'Verified',
          researchPapers: 'Verified',
          finalReport: 'Verified'
        }, // Set to verified
        documentUploadStatus: 'verified',
        lastDocumentUpdate: new Date(),
        specialization: mock.specialties,
        specialties: mock.specialties,
        experience: mock.experience,
        fees: mock.fees,
        languages: mock.languages,
        location: mock.location,
        rating: mock.rating,
        online: mock.online,
        offline: mock.offline,
        about: mock.about || mock.description,
        education: mock.education,
        bookedslots: [], // Empty
        isDeleted: false,
        title: mock.title || mock.name,
        description: mock.description || mock.about,
        expertise: mock.expertise,
        certifications: mock.certifications,
        awards: mock.awards || [],
        publications: mock.publications || [],
        testimonials: mock.testimonials,
        consultationTypes: mock.consultationTypes || [{ type: 'online', duration: 60, fee: mock.fees }],
        availability: mock.availability || {
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          workingHours: { start: '09:00', end: '17:00' }
        },
        socialMedia: mock.socialMedia || {}
      });
      await dietitian.save();

      // Create UserAuth with roleId
      const userAuth = new UserAuth({
        email,
        passwordHash,
        role: 'dietitian',
        roleId: dietitian._id
      });
      await userAuth.save();

      console.log(`Seeded dietitian: ${mock.name}`);
    }

    console.log('Seeding completed');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedDietitians();