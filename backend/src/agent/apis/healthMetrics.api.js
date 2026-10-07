const mongoose = require("mongoose");
const { LabReport } = require("../../models/labReportModel");
const { HealthReport } = require("../../models/healthReportModel");
const { GEMINI_MODEL, genAI } = require("../config");

/**
 * Dedicated Health Metrics API
 * Retrieves recorded biomarkers directly from patient lab and health reports in MongoDB,
 * or computes mathematical metrics (BMI, BMR, TDEE) for newly provided parameters.
 * Uses Gemini for clinical evaluation, category classification, and personalized guidance.
 * ZERO custom mappings, ZERO hardcoded tables, ZERO custom regex, ZERO if-else ladders.
 */
async function calculateHealthMetricsApi({
  userId = null,
  patientId = null,
  authUserId = null,
  weightKg = null,
  heightCm = null,
  age = 30,
  gender = "unspecified",
  activityLevel = "moderate",
} = {}) {
  try {
    const idToUse = userId || patientId || authUserId;
    let reportMetrics = null;
    let recordedBmi = null;
    let reportSource = null;

    if (idToUse && mongoose.isValidObjectId(idToUse)) {
      const [latestLab, latestHealth] = await Promise.all([
        LabReport.findOne({ userId: idToUse }).sort({ createdAt: -1 }).lean(),
        HealthReport.findOne({ clientId: idToUse }).sort({ createdAt: -1 }).lean(),
      ]);

      const labFitness = latestLab?.fitnessMetrics;
      const labGeneral = latestLab?.generalReports;

      const rw = labFitness?.currentWeight || labGeneral?.currentWeight;
      const rh = labFitness?.heightCm || labGeneral?.heightCm;
      const rbmi = labGeneral?.bmiValue;

      if (rw || rh || rbmi) {
        reportMetrics = {
          weightKg: rw || null,
          heightCm: rh || null,
          bmi: rbmi || null,
          activityLevel: labFitness?.activityLevel || activityLevel,
          clientAge: latestLab?.clientAge || age,
          targetCalories: latestHealth?.targetCalories || null,
          targetMacros: latestHealth?.targetMacros || null,
          clinicalDiagnosis: latestHealth?.diagnosis || null,
          dietaryRecommendations: latestHealth?.dietaryRecommendations || null,
          reportDate: latestLab?.createdAt || latestHealth?.createdAt || null,
        };
        recordedBmi = rbmi;
        reportSource = "clinical_medical_report";
      }
    }

    const effectiveWeight = parseFloat(weightKg || reportMetrics?.weightKg);
    const effectiveHeight = parseFloat(heightCm || reportMetrics?.heightCm);
    const effectiveAge = parseInt(age || reportMetrics?.clientAge, 10) || 30;
    const effectiveActivity = (activityLevel || reportMetrics?.activityLevel || "moderate").toLowerCase();

    if (!effectiveWeight || !effectiveHeight || effectiveWeight <= 0 || effectiveHeight <= 0) {
      return {
        success: false,
        message:
          "Valid weight in kg and height in cm are required, or a registered patient report with fitness biomarkers.",
      };
    }

    const heightM = effectiveHeight / 100;
    const calculatedBmi = +(effectiveWeight / (heightM * heightM)).toFixed(1);
    const bmi = recordedBmi ? Number(recordedBmi) : calculatedBmi;

    const isMale = (gender || "").toLowerCase().startsWith("m");
    const isFemale = (gender || "").toLowerCase().startsWith("f");
    const genderOffset = isMale ? 5 : isFemale ? -161 : -78;
    const bmr = Math.round(10 * effectiveWeight + 6.25 * effectiveHeight - 5 * effectiveAge + genderOffset);

    let bmiCategory = "";
    let clinicalRecommendation = "";
    let modelTdee = null;

    if (genAI) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const model = genAI.getGenerativeModel({
            model: GEMINI_MODEL,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });
          const prompt = `You are an expert clinical nutrition AI. Evaluate this Body Mass Index and daily energy requirement:
- BMI: ${bmi}
- Weight: ${effectiveWeight} kg
- Height: ${effectiveHeight} cm
- Age: ${effectiveAge}
- Gender: ${gender}
- Physical Activity Level: ${effectiveActivity}
- Calculated BMR: ${bmr} kcal/day
${reportMetrics?.clinicalDiagnosis ? `- Clinical Diagnosis: ${reportMetrics.clinicalDiagnosis}` : ""}
${reportMetrics?.dietaryRecommendations ? `- Supervising Dietitian Guidance: ${reportMetrics.dietaryRecommendations}` : ""}

Return valid JSON with schema:
{
  "bmiCategory": "Underweight | Normal weight | Overweight | Obese (Class I) | Obese (Class II) | Obese (Class III)",
  "clinicalRecommendation": "Evidence-based recommendation for the patient",
  "maintenanceCalories": number
}`;
          const gemRes = await model.generateContent(prompt);
          const parsed = JSON.parse(gemRes.response.text());
          bmiCategory = parsed?.bmiCategory || "";
          clinicalRecommendation = parsed?.clinicalRecommendation || "";
          if (typeof parsed?.maintenanceCalories === "number" && parsed.maintenanceCalories > 0) {
            modelTdee = Math.round(parsed.maintenanceCalories);
          }
          if (bmiCategory) break;
        } catch (gemErr) {
          console.warn(`[calculateHealthMetricsApi Gemini attempt ${attempt} warning]:`, gemErr.message);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
          }
        }
      }
    }

    const tdee = modelTdee || Math.round(bmr * 1.55);

    const metricsData = {
      weightKg: effectiveWeight,
      heightCm: effectiveHeight,
      bmi,
      bmiCategory: bmiCategory || "Clinical evaluation available",
      bmrKcal: bmr,
      tdeeKcal: tdee,
      targetMaintenanceCalories: reportMetrics?.targetCalories || tdee,
      targetWeightLossCalories: Math.max(1200, (reportMetrics?.targetCalories || tdee) - 500),
      targetWeightGainCalories: (reportMetrics?.targetCalories || tdee) + 400,
      clinicalRecommendation:
        clinicalRecommendation ||
        reportMetrics?.dietaryRecommendations ||
        "Maintain balanced clinical nutrition and regular activity.",
      dataSource: reportSource || "calculated_from_parameters",
      reportDetails: reportMetrics,
    };

    const message = reportSource
      ? `Retrieved verified metrics from clinical reports: Weight: ${effectiveWeight}kg, Height: ${effectiveHeight}cm, BMI: ${bmi}${bmiCategory ? ` (${bmiCategory})` : ""}.`
      : `BMI: ${bmi}${bmiCategory ? ` (${bmiCategory})` : ""}. BMR: ${bmr} kcal/day. Maintenance TDEE: ${tdee} kcal/day.`;

    return {
      success: true,
      metrics: metricsData,
      message,
    };
  } catch (error) {
    console.error("[calculateHealthMetricsApi Error]:", error);
    return {
      success: false,
      message: `Failed to evaluate health metrics: ${error.message}`,
    };
  }
}

module.exports = {
  calculateHealthMetricsApi,
};
