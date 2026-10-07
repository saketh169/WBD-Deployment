const mongoose = require("mongoose");
const { User, UserAuth } = require("../../models/userModel");
const { HealthReport } = require("../../models/healthReportModel");
const { LabReport } = require("../../models/labReportModel");
const specialistService = require("./specialistService");

const IGNORED_SYSTEM_KEYS = new Set([
  "_id",
  "__v",
  "userId",
  "clientId",
  "dietitianId",
  "uploadedFiles",
  "isDeleted",
  "password",
  "roleId",
  "createdAt",
  "updatedAt",
  "phone",
  "userPhone",
  "dietitianPhone",
  "phoneNumber",
  "email",
  "userEmail",
  "dietitianEmail",
  "address",
  "userAddress",
  "dietitianAddress",
  "street",
  "city",
  "zipCode",
  "postalCode",
  "aadhar",
  "ssn",
  "pan",
  "emergencyContact",
  "tokens",
  "resetPasswordToken",
]);

// Format camelCase key into human-readable label
function camelToHuman(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Recursively serialize MongoDB clinical record objects into clean markdown bullets
function serializeRecordObject(obj, indent = "") {
  if (!obj || typeof obj !== "object") return "";
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (IGNORED_SYSTEM_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    if (Buffer.isBuffer(value) || value?._bsontype === "Binary") continue;

    const label = camelToHuman(key);

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      const isPrimitiveArray = value.every(
        (v) => typeof v !== "object" || v === null
      );
      if (isPrimitiveArray) {
        lines.push(`${indent}- ${label}: ${value.join(", ")}`);
      } else {
        lines.push(`${indent}- ${label}:`);
        value.forEach((item) => {
          if (typeof item === "object" && item !== null) {
            lines.push(serializeRecordObject(item, indent + "  "));
          } else {
            lines.push(`${indent}  - ${item}`);
          }
        });
      }
    } else if (typeof value === "object" && !(value instanceof Date)) {
      const nested = serializeRecordObject(value, indent + "  ");
      if (nested.trim()) {
        lines.push(`${indent}- ${label}:\n${nested}`);
      }
    } else {
      const displayVal =
        value instanceof Date
          ? value.toISOString().split("T")[0]
          : String(value);
      lines.push(`${indent}- ${label}: ${displayVal}`);
    }
  }

  return lines.join("\n");
}

/**
 * Pure Patient Clinical Context Retriever
 * Grounding pipeline: retrieves verified patient lab tests, metabolic panels, and dietitian assessments.
 * Strips PII and minimizes payload to recent, clinically relevant records.
 */
async function retrieveRAGContext(query, context = {}, history = []) {
  const qClean = (query || "").toLowerCase().trim();
  const contextParts = [];
  const cards = [];
  const toolsExecuted = [];

  if (!context.userId || !mongoose.isValidObjectId(context.userId)) {
    return { contextText: "", cards, toolsExecuted };
  }

  try {
    // Resolve patient identity across User and UserAuth models
    const { resolvePatientProfile } = require("./userResolver");
    const { user, userId: resolvedId } = await resolvePatientProfile(
      context.userId
    );

    if (!resolvedId) {
      return { contextText: "", cards, toolsExecuted };
    }

    // Fetch latest 2 clinical lab reports and health assessments (recency-first minimization)
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

    if (labReports.length > 0 || assessments.length > 0) {
      toolsExecuted.push("patient_record_retriever");
      const latestLab = labReports[0];
      const latestAssessment = assessments[0];
      const metrics = latestLab?.fitnessMetrics || {};
      const calculatedBmi =
        metrics.bmi ||
        (metrics.heightCm && metrics.currentWeight
          ? +(metrics.currentWeight / (metrics.heightCm / 100) ** 2).toFixed(1)
          : null);

      // Attach patient_profile_card only when inspecting health profile or records
      const isMealPlanQuery =
        /(meal\s*plan|diet\s*plan|diet\s*chart|\b\d+\s*days?\s*plan|\bweek\s*plan|menu)/i.test(
          qClean
        );
      const isProfileCardIntent =
        !isMealPlanQuery &&
        /(profile|report|records|test|biomarker|hba1c|glucose|cholesterol|bmi|weight|metrics|my doctor|diagnosis|allerg)/i.test(
          qClean
        );

      if (isProfileCardIntent) {
        cards.push({
          type: "patient_profile_card",
          data: {
            patientName: user?.name || "Patient",
            gender: user?.gender || null,
            clinicalDiagnosis:
              latestAssessment?.diagnosis || latestLab?.diagnosis || null,
            activeDietitian: latestAssessment?.dietitianName || null,
            dietitianRecommendations:
              latestAssessment?.dietaryRecommendations || null,
            supervisingDietitians: assessments.map((a) => ({
              dietitianName: a.dietitianName || null,
              reportDate: a.createdAt
                ? new Date(a.createdAt).toISOString().split("T")[0]
                : "",
              dietaryProtocol: a.dietaryRecommendations || a.diagnosis || null,
            })),
            targetCalories: latestAssessment?.targetCalories,
            targetMacros: latestAssessment?.targetMacros,
            allergies: latestAssessment?.allergies || [],
            healthGoals: latestAssessment?.healthGoals || [],
            fitnessMetrics: {
              ...metrics,
              bmi: calculatedBmi,
            },
          },
        });
      }

      // Compile formatted sections for clinical LLM grounding with citations
      const clinicalSections = [
        `### Verified Patient Profile: ${user?.name || "Patient"}`,
      ];

      if (assessments.length > 0) {
        clinicalSections.push("### Dietitian Clinical Assessments:");
        assessments.forEach((assessmentDoc, idx) => {
          const dateStr = assessmentDoc.createdAt
            ? new Date(assessmentDoc.createdAt).toISOString().split("T")[0]
            : `Assessment #${idx + 1}`;
          const specialist = assessmentDoc.dietitianName
            ? ` (Supervising Dietitian: ${assessmentDoc.dietitianName})`
            : "";
          const serialized = serializeRecordObject(assessmentDoc, "  ");
          if (serialized.trim()) {
            clinicalSections.push(
              `[Clinical Assessment ${idx + 1} - Date: ${dateStr}${specialist}]\n${serialized}`
            );
          }
        });
      }

      if (labReports.length > 0) {
        clinicalSections.push("### Diagnostic Laboratory Reports:");
        labReports.forEach((labDoc, idx) => {
          const dateStr = labDoc.createdAt
            ? new Date(labDoc.createdAt).toISOString().split("T")[0]
            : `Lab Report #${idx + 1}`;
          const serialized = serializeRecordObject(labDoc, "  ");
          if (serialized.trim()) {
            clinicalSections.push(
              `[Laboratory Diagnostic Report ${idx + 1} - Date: ${dateStr}]\n${serialized}`
            );
          }
        });
      }

      contextParts.push(clinicalSections.join("\n\n"));
    } else {
      contextParts.push(
        `### Patient Medical Records Status:\nNo medical lab reports or health assessments found on file for ${user?.name || "this patient"}.\n- Sufficient Recent Medical Data: NO (Zero clinical records found).`
      );
    }
  } catch (err) {
    console.warn("Patient context retrieval error:", err.message);
  }

  return {
    contextText: contextParts.join("\n\n"),
    cards,
    toolsExecuted,
  };
}

module.exports = {
  retrieveRAGContext,
  ...specialistService,
};
