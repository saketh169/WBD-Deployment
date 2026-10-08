const mongoose = require("mongoose");
const { resolvePatientProfile } = require("../services/userResolver");
const { HealthReport } = require("../../models/healthReportModel");
const { LabReport } = require("../../models/labReportModel");

const getUserHealthReportsDeclaration = {
  name: "get_user_health_reports",
  description:
    "Retrieve the authenticated patient's clinical health reports, lab test records, dietitian assessments, and medical findings from MongoDB. Supports retrieving the most recent reports or filtering by date and report type.",
  parameters: {
    type: "OBJECT",
    properties: {
      reportType: {
        type: "STRING",
        enum: ["all", "health", "lab"],
        description: "Type of report to retrieve: 'health' for dietitian assessments, 'lab' for laboratory diagnostic panels, or 'all' for both.",
      },
      date: {
        type: "STRING",
        description: "Optional date filter (YYYY-MM-DD or year/month) to inspect reports from a specific timeframe.",
      },
      limit: {
        type: "NUMBER",
        description: "Maximum number of recent reports to retrieve (e.g. 1 for latest/most recent, 3, 5). Defaults to 5.",
      },
    },
    required: [],
  },
};

async function executeGetUserHealthReports(args = {}, context = {}) {
  try {
    const idToUse = context.userId || context.authUserId || context.patientId;
    if (!idToUse) {
      return {
        success: false,
        cards: [],
        message: "Please sign in to view your clinical health reports and medical records.",
      };
    }

    const { user, userId: resolvedId } = await resolvePatientProfile(idToUse);
    const effectiveId = resolvedId || idToUse;

    if (!effectiveId || !mongoose.isValidObjectId(effectiveId)) {
      return {
        success: false,
        cards: [],
        message: "Please sign in to access your personal health reports.",
      };
    }

    const reportType = (args.reportType || "all").toLowerCase();
    const limit = Math.max(1, Math.min(Number(args.limit) || 5, 20));
    const targetDate = args.date ? String(args.date).trim() : null;

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

    const fetchHealth = reportType === "all" || reportType === "health";
    const fetchLab = reportType === "all" || reportType === "lab";

    const [healthReports, labReports] = await Promise.all([
      fetchHealth
        ? HealthReport.find(healthQuery).sort({ createdAt: -1 }).limit(limit).lean()
        : Promise.resolve([]),
      fetchLab
        ? LabReport.find(labQuery).sort({ createdAt: -1 }).limit(limit).lean()
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
      uploadedFiles: Array.isArray(h.uploadedFiles) ? h.uploadedFiles.map((f) => f.originalName || f.fieldName) : [],
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
        cards: [],
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
      supervisingDietitian: latestHealth.dietitianName || "Clinical Team",
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

    const cards = [
      {
        type: "patient_profile_card",
        data: profileData,
      },
    ];

    return {
      success: true,
      data: {
        patientName: user?.name || "Patient",
        healthReports: formattedHealth,
        labReports: formattedLabs,
      },
      cards,
      message: `Retrieved ${formattedHealth.length} clinical health report(s) and ${formattedLabs.length} lab report(s) for ${user?.name || "patient"}.`,
    };
  } catch (err) {
    console.error("[executeGetUserHealthReports Error]:", err);
    return {
      success: false,
      cards: [],
      message: "Failed to retrieve patient health reports.",
    };
  }
}

module.exports = {
  getUserHealthReportsDeclaration,
  executeGetUserHealthReports,
};
