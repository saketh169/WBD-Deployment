const mongoose = require("mongoose");
const { User, UserAuth } = require("../../models/userModel");
const { HealthReport } = require("../../models/healthReportModel");
const { LabReport } = require("../../models/labReportModel");
const { resolvePatientProfile } = require("./userResolver");

/**
 * Agent Patient Context Loader
 * Ingests authenticated patient profile, diagnostic biomarkers, and dietitian records
 * directly into LangGraph state as structured clinical context.
 * No vector embeddings, no cosine similarity, pure agentic context provider.
 */
async function loadAgentPatientContext(userId, userQuery = "") {
  if (!userId || !mongoose.isValidObjectId(userId) || mongoose.connection.readyState !== 1) {
    return {
      patientProfile: null,
      contextText: "",
      cards: [],
      toolsExecuted: [],
    };
  }

  try {
    const { user, userId: resolvedId } = await resolvePatientProfile(userId);
    if (!resolvedId) {
      return {
        patientProfile: null,
        contextText: "",
        cards: [],
        toolsExecuted: [],
      };
    }

    const [labReports, assessments] = await Promise.all([
      LabReport.find({ userId: resolvedId })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
      HealthReport.find({ clientId: resolvedId })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),
    ]);

    const latestLab = labReports[0] || null;
    const latestAssessment = assessments[0] || null;
    const metrics = latestLab?.fitnessMetrics || {};
    const calculatedBmi =
      metrics.bmi ||
      (metrics.heightCm && metrics.currentWeight
        ? +(metrics.currentWeight / (metrics.heightCm / 100) ** 2).toFixed(1)
        : null);

    const patientProfile = {
      patientName: user?.name || "Patient",
      gender: user?.gender || "unspecified",
      clinicalDiagnosis: latestAssessment?.diagnosis || latestLab?.diagnosis || null,
      activeDietitian: latestAssessment?.dietitianName || null,
      dietitianRecommendations: latestAssessment?.dietaryRecommendations || null,
      supervisingDietitians: assessments.map((a) => ({
        dietitianName: a.dietitianName || null,
        reportDate: a.createdAt
          ? new Date(a.createdAt).toISOString().split("T")[0]
          : "",
        dietaryProtocol: a.dietaryRecommendations || a.diagnosis || null,
      })),
      targetCalories: latestAssessment?.targetCalories || null,
      targetMacros: latestAssessment?.targetMacros || null,
      allergies: latestAssessment?.allergies || [],
      healthGoals: latestAssessment?.healthGoals || [],
      fitnessMetrics: {
        ...metrics,
        bmi: calculatedBmi,
      },
    };

    const contextLines = [
      `### Verified Patient Profile: ${user?.name || "Patient"}`,
      `- Gender: ${user?.gender || "unspecified"}`,
    ];

    if (calculatedBmi) {
      contextLines.push(
        `- Fitness Metrics: Weight: ${metrics.currentWeight || "N/A"}kg, Height: ${metrics.heightCm || "N/A"}cm, BMI: ${calculatedBmi}`
      );
    }

    if (patientProfile.allergies.length > 0) {
      contextLines.push(`- Known Allergies: ${patientProfile.allergies.join(", ")}`);
    }

    if (patientProfile.clinicalDiagnosis) {
      contextLines.push(`- Clinical Diagnosis: ${patientProfile.clinicalDiagnosis}`);
    }

    if (latestAssessment?.dietaryRecommendations) {
      contextLines.push(
        `- Supervising Dietitian Recommendations: ${latestAssessment.dietaryRecommendations}`
      );
    }

    if (assessments.length > 0) {
      contextLines.push(`### Recorded Clinical Health Reports (${assessments.length}):`);
      assessments.forEach((a, idx) => {
        const dStr = a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : "";
        contextLines.push(
          `- Report ${idx + 1}: "${a.title || 'Health Assessment'}" by ${a.dietitianName || 'Dietitian'} (${dStr})`
        );
        if (a.diagnosis) contextLines.push(`  Diagnosis: ${a.diagnosis}`);
        if (a.findings) contextLines.push(`  Clinical Findings: ${a.findings}`);
        if (a.dietaryRecommendations) contextLines.push(`  Dietary Guidance: ${a.dietaryRecommendations}`);
        if (a.lifestyleRecommendations) contextLines.push(`  Lifestyle: ${a.lifestyleRecommendations}`);
        if (a.supplements) contextLines.push(`  Supplements: ${a.supplements}`);
        if (a.targetCalories) contextLines.push(`  Target Daily Calories: ${a.targetCalories} kcal`);
        if (a.targetMacros) {
          contextLines.push(
            `  Target Macros: Protein ${a.targetMacros.proteinGrams || 0}g, Carbs ${a.targetMacros.carbsGrams || 0}g, Fats ${a.targetMacros.fatsGrams || 0}g`
          );
        }
      });
    }

    if (labReports.length > 0) {
      contextLines.push(`### Recorded Diagnostic Laboratory Reports (${labReports.length}):`);
      labReports.forEach((l, idx) => {
        const dStr = l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "";
        const lines = [];
        if (l.bloodSugar?.fastingBloodGlucose) lines.push(`Fasting Glucose: ${l.bloodSugar.fastingBloodGlucose} mg/dL`);
        if (l.bloodSugar?.hba1c) lines.push(`HbA1c: ${l.bloodSugar.hba1c}%`);
        if (l.thyroid?.tsh) lines.push(`TSH: ${l.thyroid.tsh} mIU/L`);
        if (l.cardiovascular?.totalCholesterol) lines.push(`Total Cholesterol: ${l.cardiovascular.totalCholesterol} mg/dL`);
        if (l.cardiovascular?.ldl) lines.push(`LDL: ${l.cardiovascular.ldl} mg/dL`);
        if (l.cardiovascular?.hdl) lines.push(`HDL: ${l.cardiovascular.hdl} mg/dL`);
        if (l.cardiovascular?.triglycerides) lines.push(`Triglycerides: ${l.cardiovascular.triglycerides} mg/dL`);
        contextLines.push(
          `- Lab Report ${idx + 1} (${dStr}): ${lines.join(", ") || (l.submittedCategories || []).join(", ")}`
        );
      });
    }

    return {
      patientProfile,
      contextText: contextLines.join("\n"),
      cards: [],
      toolsExecuted: [],
    };
  } catch (error) {
    console.warn("[loadAgentPatientContext Error]:", error.message);
    return {
      patientProfile: null,
      contextText: "",
      cards: [],
      toolsExecuted: [],
    };
  }
}

module.exports = {
  loadAgentPatientContext,
};
