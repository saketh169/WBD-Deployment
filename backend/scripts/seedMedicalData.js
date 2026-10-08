const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { User, Dietitian } = require('../src/models/userModel');
const { LabReport } = require('../src/models/labReportModel');
const { HealthReport } = require('../src/models/healthReportModel');
const MealPlan = require('../src/models/mealPlanModel');

async function seedMedicalData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/NutriConnectDatabase';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Find all Saketh user accounts (Saketh R and Saketh rupa)
    const sakethUsers = await User.find({
      $or: [
        { email: 'legendarysaketh123456@gmail.com' },
        { email: 'sakethrupa123@gmail.com' },
        { name: /saketh/i }
      ]
    });

    if (!sakethUsers.length) {
      console.error('❌ No Saketh user accounts found in database.');
      process.exit(1);
    }

    console.log(`👤 Found ${sakethUsers.length} user account(s):`, sakethUsers.map(u => `${u.name} (${u.email}, ${u._id})`).join(', '));

    // 2. Find consulted Dietitians
    const drNeha = await Dietitian.findOne({ name: /neha agarwal/i });
    const drAmit = await Dietitian.findOne({ name: /amit patel/i });
    const drSneha = await Dietitian.findOne({ name: /sneha iyer/i });

    const primaryDietitian = drNeha || await Dietitian.findOne();
    const secondaryDietitian = drSneha || drAmit || primaryDietitian;

    console.log(`🩺 Primary Dietitian: ${primaryDietitian.name} (${primaryDietitian._id})`);
    console.log(`🩺 Secondary Dietitian: ${secondaryDietitian.name} (${secondaryDietitian._id})`);

    const reportDate1 = new Date();
    reportDate1.setDate(reportDate1.getDate() - 3);

    const reportDate2 = new Date();
    reportDate2.setDate(reportDate2.getDate() - 21);

    const nextFollowUp = new Date();
    nextFollowUp.setDate(nextFollowUp.getDate() + 14);

    for (const user of sakethUsers) {
      // Clear existing records & clean any fake bot meal plans from MealPlan collection
      await LabReport.deleteMany({ userId: user._id });
      await HealthReport.deleteMany({ clientId: user._id });
      await MealPlan.deleteMany({ userId: user._id });

      // Comprehensive Clinical Lab Report 1 (Recent - Prediabetes & Dyslipidemia)
      await LabReport.create({
        userId: user._id,
        dietitianId: primaryDietitian._id,
        clientName: user.name,
        clientAge: 24,
        clientPhone: user.phone || '9876543210',
        clientAddress: user.address || 'Bangalore, Karnataka, India',
        submittedCategories: [
          'Fitness_Metrics',
          'Blood_Sugar_Focus',
          'General_Reports'
        ],
        fitnessMetrics: {
          heightCm: 175,
          currentWeight: 74,
          activityLevel: 'moderate',
          additionalInfo: 'Vegetarian dietary preference, no meat or poultry'
        },
        bloodSugarFocus: {
          fastingGlucose: 108, // Impaired fasting glucose (mg/dL)
          postPrandialGlucose: 146, // Post-prandial elevation (mg/dL)
          hba1c: 5.8, // Prediabetic range (%)
          cholesterolTotal: 215, // Total cholesterol (mg/dL)
          hdlCholesterol: 42, // Suboptimal HDL (mg/dL)
          ldlCholesterol: 138, // Borderline high LDL (mg/dL)
          vldlCholesterol: 35, // Elevated VLDL (mg/dL)
          triglycerides: 175 // Elevated Triglycerides (mg/dL)
        },
        generalReports: {
          hemoglobin: 14.2, // g/dL
          serumCreatinine: 0.9, // mg/dL (Healthy renal marker)
          uricAcid: 6.4, // mg/dL
          vitaminB12: 220, // pg/mL (Borderline low)
          sgptAlt: 38, // U/L (Healthy liver enzyme)
          sgotAst: 32 // U/L
        },
        thyroid: {
          tsh: 2.4 // uIU/mL (Normal thyroid)
        },
        uploadedFiles: [],
        status: 'reviewed',
        createdAt: reportDate1
      });

      // Lab Report 2 (3 weeks prior - Baseline)
      await LabReport.create({
        userId: user._id,
        dietitianId: secondaryDietitian._id,
        clientName: user.name,
        clientAge: 24,
        clientPhone: user.phone || '9876543210',
        clientAddress: user.address || 'Bangalore, Karnataka, India',
        submittedCategories: [
          'Fitness_Metrics',
          'Blood_Sugar_Focus',
          'General_Reports'
        ],
        fitnessMetrics: {
          heightCm: 175,
          currentWeight: 75.2,
          activityLevel: 'light',
          additionalInfo: 'Vegetarian dietary preference'
        },
        bloodSugarFocus: {
          fastingGlucose: 112,
          postPrandialGlucose: 152,
          hba1c: 5.9,
          cholesterolTotal: 222,
          hdlCholesterol: 40,
          ldlCholesterol: 144,
          vldlCholesterol: 38,
          triglycerides: 190
        },
        generalReports: {
          hemoglobin: 14.0,
          serumCreatinine: 0.92,
          uricAcid: 6.6,
          vitaminB12: 210,
          sgptAlt: 41,
          sgotAst: 35
        },
        thyroid: {
          tsh: 2.6
        },
        uploadedFiles: [],
        status: 'reviewed',
        createdAt: reportDate2
      });

      // Health Assessment 1 by Dr. Neha Agarwal
      await HealthReport.create({
        dietitianId: primaryDietitian._id,
        dietitianName: primaryDietitian.name,
        clientId: user._id,
        clientName: user.name,
        title: 'Clinical Metabolic & Glycemic Optimization Assessment',
        diagnosis: 'Mild Prediabetes (HbA1c 5.8%) & Dyslipidemia (Elevated LDL 138 mg/dL, Triglycerides 175 mg/dL)',
        findings: 'Patient exhibits impaired fasting glucose (108 mg/dL) and borderline elevated LDL cholesterol. Current BMI is 24.2. Renal and hepatic markers are within normal clinical thresholds. Vitamin B12 is borderline low (220 pg/mL). Strict dietary intervention required to avert progression to clinical Type 2 Diabetes.',
        dietaryRecommendations: '1. Strict low-glycemic Mediterranean/High-protein vegetarian diet.\n2. Prioritize complex carbs: steel-cut oats, foxtail millets, brown basmati, sprouted legumes, and quinoa.\n3. Incorporate 35g+ dietary fiber daily to accelerate LDL cholesterol clearance.\n4. Strictly avoid refined sugars, trans fats, and deep-fried snacks.\n5. Note Allergies: Patient has verified sensitivity/allergies to peanuts and shellfish — strictly avoid all peanut products and crustacean derivatives.\n6. Add omega-3 rich plant sources: soaked chia seeds, flaxseed powder, and walnuts.',
        lifestyleRecommendations: '1. 40 minutes of brisk walking 5 days per week post-meals to enhance insulin sensitivity.\n2. 2 days of moderate resistance/strength training weekly.\n3. Maintain consistent sleep hygiene (7-8 hours nightly).',
        supplements: '1. Methylcobalamin (Vitamin B12) 1500 mcg tablet once weekly.\n2. Psyllium husk (Isabgol) 1 tbsp with warm water before dinner.',
        followUpInstructions: 'Repeat fasting blood sugar and lipid panel in 6 weeks.',
        additionalNotes: 'Patient is highly motivated. Prior consultation records reviewed.',
        targetCalories: 1850,
        targetMacros: {
          proteinGrams: 105,
          carbsGrams: 210,
          fatsGrams: 55
        },
        targetHydrationLiters: 3.2,
        allergies: ['Peanuts', 'Shellfish'],
        healthGoals: [
          'Reduce HbA1c to < 5.6% within 3 months',
          'Lower LDL Cholesterol to < 100 mg/dL',
          'Achieve healthy target weight of 68 kg',
          'Eliminate post-meal energy crashes'
        ],
        keyBiomarkersFlagged: [
          'Fasting Blood Glucose: 108 mg/dL (Impaired)',
          'HbA1c: 5.8% (Prediabetes)',
          'LDL Cholesterol: 138 mg/dL (Elevated)',
          'Triglycerides: 175 mg/dL (Elevated)'
        ],
        clinicalStatus: 'active',
        nextFollowUpDate: nextFollowUp,
        uploadedFiles: [],
        status: 'sent',
        createdAt: reportDate1
      });

      // Health Assessment 2 by Dr. Sneha Iyer
      await HealthReport.create({
        dietitianId: secondaryDietitian._id,
        dietitianName: secondaryDietitian.name,
        clientId: user._id,
        clientName: user.name,
        title: 'Cardioprotective Nutrition & Activity Consultation',
        diagnosis: 'Cardiometabolic Risk Reduction Protocol & Dietary Review',
        findings: 'Reviewed initial metabolic markers. Recommended shifting from high-refined carbohydrates to whole legumes and millets. Confirmed peanut allergy.',
        dietaryRecommendations: 'Ensure high soluble fiber intake, plenty of leafy greens, and cold-pressed olive or mustard oil for cooking. Exclude peanuts and shellfish.',
        lifestyleRecommendations: 'Regular cardiovascular conditioning and stress reduction techniques.',
        supplements: 'Vitamin B12 supplementation as advised by primary dietitian.',
        followUpInstructions: 'Coordinate follow-up with Dr. Neha Agarwal.',
        additionalNotes: 'Patient adheres well to nutritional instructions.',
        targetCalories: 1850,
        targetMacros: {
          proteinGrams: 105,
          carbsGrams: 210,
          fatsGrams: 55
        },
        targetHydrationLiters: 3.2,
        allergies: ['Peanuts', 'Shellfish'],
        healthGoals: [
          'Cardiovascular lipid optimization',
          'Improve insulin receptor sensitivity'
        ],
        keyBiomarkersFlagged: [
          'Borderline Elevated LDL (138 mg/dL)',
          'Impaired Fasting Glucose (108 mg/dL)'
        ],
        clinicalStatus: 'active',
        nextFollowUpDate: nextFollowUp,
        uploadedFiles: [],
        status: 'sent',
        createdAt: reportDate2
      });

      console.log(`✅ Seeded 2 Lab Reports & 2 Health Assessments for: ${user.name} (${user.email})`);
    }

    console.log('\n=========================================');
    console.log('🎉 Successfully seeded clinical records for all Saketh accounts!');
    console.log('=========================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding medical data:', err);
    process.exit(1);
  }
}

seedMedicalData();
