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
async function loadAgentPatientContext(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
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

    const cards = [];
    return {
      patientProfile,
      contextText: contextLines.join("\n"),
      cards,
      toolsExecuted: ["patient_context_loader"],
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
