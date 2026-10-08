const mongoose = require("mongoose");
const { resolvePatientProfile } = require("../services/userResolver");
const { HealthReport } = require("../../models/healthReportModel");
const { LabReport } = require("../../models/labReportModel");

/**
 * Dedicated Patient Health Reports & Medical Records API
 * Retrieves patient diagnostic records, dietitian assessments, and lab panels.
 * Encapsulates MongoDB querying and clinical profile metrics calculation.
 */
async function getUserHealthReportsApi({
  userId = null,
  authUserId = null,
  patientId = null,
  reportType = "all",
  date = null,
  limit = 5,
} = {}) {
  try {
    const idToUse = userId || authUserId || patientId;
    if (!idToUse) {
      return {
        success: false,
        message: "Please sign in to view your clinical health reports and medical records.",
      };
    }

    const { user, userId: resolvedId } = await resolvePatientProfile(idToUse);
    const effectiveId = resolvedId || idToUse;

    if (!effectiveId || !mongoose.isValidObjectId(effectiveId)) {
      return {
        success: false,
        message: "Please sign in to access your personal health reports.",
      };
    }

    const cleanReportType = (reportType || "all").toLowerCase();
    const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 50));
    const targetDate = date ? String(date).trim() : null;

    const healthQuery = {
      $or: [{ clientId: effectiveId }, { userId: effectiveId }],
    };
    const labQuery = {
      $or: [{ userId: effectiveId }, { clientId: effectiveId }],
    };

    if (targetDate) {
      const d = new Date(targetDate);
      if (!isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        healthQuery.createdAt = { $gte: start, $lte: end };
        labQuery.createdAt = { $gte: start, $lte: end };
      }
    }

    const fetchHealth = cleanReportType === "all" || cleanReportType === "health";
    const fetchLab = cleanReportType === "all" || cleanReportType === "lab";

    const [healthReports, labReports] = await Promise.all([
      fetchHealth
        ? HealthReport.find(healthQuery).sort({ createdAt: -1 }).limit(safeLimit).lean()
        : Promise.resolve([]),
      fetchLab
        ? LabReport.find(labQuery).sort({ createdAt: -1 }).limit(safeLimit).lean()
        : Promise.resolve([]),
    ]);

    const formattedHealth = healthReports.map((h) => ({
      id: h._id,
      title: h.title,
      dietitianName: h.dietitianName,
      date: h.createdAt ? new Date(h.createdAt).toISOString().split("T")[0] : null,
      diagnosis: h.diagnosis || null,
      findings: h.findings || null,
      dietaryRecommendations: h.dietaryRecommendations || null,
      lifestyleRecommendations: h.lifestyleRecommendations || null,
      supplements: h.supplements || null,
      followUpInstructions: h.followUpInstructions || null,
      targetCalories: h.targetCalories || null,
      targetMacros: h.targetMacros || null,
      targetHydrationLiters: h.targetHydrationLiters || null,
      allergies: h.allergies || [],
      biomarkersFlagged: h.keyBiomarkersFlagged || [],
      clinicalStatus: h.clinicalStatus || "active",
      uploadedFiles: Array.isArray(h.uploadedFiles)
        ? h.uploadedFiles.map((f) => f.originalName || f.fieldName)
        : [],
    }));

    const formattedLabs = labReports.map((l) => ({
      id: l._id,
      submittedCategories: l.submittedCategories || [],
      date: l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : null,
      bloodSugar: l.bloodSugar || null,
      thyroid: l.thyroid || null,
      cardiovascular: l.cardiovascular || null,
      fitnessMetrics: l.fitnessMetrics || null,
      hormonalIssues: l.hormonalIssues || null,
      generalReports: l.generalReports || null,
    }));

    const totalCount = formattedHealth.length + formattedLabs.length;
    if (totalCount === 0) {
      return {
        success: true,
        data: {
          patientName: user?.name || "Patient",
          healthReports: [],
          labReports: [],
        },
        message: targetDate
          ? `No clinical health reports or lab records found for date ${targetDate}.`
          : "You currently have no recorded clinical health reports or lab tests on file.",
      };
    }

    const latestHealth = formattedHealth[0] || {};
    const latestLab = formattedLabs[0] || {};
    const metrics = latestLab.fitnessMetrics || {};
    const calculatedBmi =
      metrics.bmi ||
      (metrics.heightCm && metrics.currentWeight
        ? +(metrics.currentWeight / (metrics.heightCm / 100) ** 2).toFixed(1)
        : null);

    const profileData = {
      patientName: user?.name || "Patient",
      gender: user?.gender || "unspecified",
      clinicalDiagnosis: latestHealth.diagnosis || null,
      supervisingDietitian: latestHealth.dietitianName || null,
      dietitianRecommendations: latestHealth.dietaryRecommendations || null,
      supervisingDietitians: formattedHealth.map((h) => ({
        dietitianName: h.dietitianName,
        reportDate: h.date,
        dietaryProtocol: h.dietaryRecommendations || h.diagnosis || null,
      })),
      targetCalories: latestHealth.targetCalories,
      targetMacros: latestHealth.targetMacros,
      allergies: latestHealth.allergies,
      fitnessMetrics: {
        ...metrics,
        bmi: calculatedBmi,
      },
      healthReportsCount: formattedHealth.length,
      labReportsCount: formattedLabs.length,
    };

    return {
      success: true,
      data: {
        patientName: user?.name || "Patient",
        healthReports: formattedHealth,
        labReports: formattedLabs,
        profileData,
      },
      message: `Retrieved ${formattedHealth.length} clinical health report(s) and ${formattedLabs.length} lab report(s) for ${user?.name || "patient"}.`,
    };
  } catch (err) {
    console.error("[getUserHealthReportsApi Error]:", err);
    return {
      success: false,
      message: `Failed to retrieve patient health reports: ${err.message}`,
    };
  }
}

module.exports = {
  getUserHealthReportsApi,
};
