const { generateMealPlanApi } = require("../apis/mealPlan.api");

const generateMealPlanDeclaration = {
  name: "generate_meal_plan",
  description:
    "Generate a structured clinical meal plan with daily calorie targets, macronutrients, and meal recipes.",
  parameters: {
    type: "OBJECT",
    properties: {
      planName: {
        type: "STRING",
        description: "Title of the meal plan",
      },
      dietType: {
        type: "STRING",
        description:
          "Dietary classification (e.g. Vegetarian, Non-Vegetarian, Vegan, Keto, Balanced)",
      },
      durationDays: {
        type: "NUMBER",
        description: "Number of days for the plan (1 to 7). Defaults to 3.",
      },
      daysCount: {
        type: "NUMBER",
        description: "Alias for durationDays",
      },
      dailyCalories: {
        type: "NUMBER",
        description: "Target daily calories (e.g. 1800, 2400)",
      },
      macroTargets: {
        type: "OBJECT",
        properties: {
          proteinGrams: { type: "NUMBER", description: "Daily protein in grams" },
          carbsGrams: { type: "NUMBER", description: "Daily carbohydrates in grams" },
          fatsGrams: { type: "NUMBER", description: "Daily fats in grams" },
        },
      },
      healthFocus: {
        type: "STRING",
        description:
          "Clinical focus or goal (e.g. Weight Loss, Muscle Gain, Blood Sugar Control, PCOS Management)",
      },
      allergiesExcluded: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "List of food allergens to strictly exclude",
      },
      clinicalNotes: {
        type: "STRING",
        description: "Clinical notes or dietary guidelines",
      },
      supervisingDietitian: {
        type: "STRING",
        description: "Name of the supervising dietitian",
      },
    },
  },
};

async function executeGenerateMealPlan(args = {}, context = {}) {
  try {
    const {
      planName,
      dietType,
      durationDays,
      daysCount,
      dailyCalories,
      macroTargets,
      healthFocus,
      allergiesExcluded,
      clinicalNotes,
      supervisingDietitian,
    } = args;

    let effectiveCalories = dailyCalories;
    let effectiveMacros = macroTargets;
    let effectiveDietType = dietType;
    let effectiveDietitian = supervisingDietitian || null;
    let effectiveAllergies = allergiesExcluded || [];
    let effectiveNotes = clinicalNotes || "";

    if (context.userId) {
      try {
        const { resolvePatientProfile } = require("../services/userResolver");
        const { HealthReport } = require("../../models/healthReportModel");
        const { LabReport } = require("../../models/labReportModel");
        const { userId: resolvedId } = await resolvePatientProfile(context.userId);
        const effectiveId = resolvedId || context.userId;
        if (effectiveId) {
          const report = await HealthReport.findOne({
            $or: [{ clientId: effectiveId }, { userId: effectiveId }],
          })
            .sort({ createdAt: -1 })
            .lean();
          if (report) {
            if (!effectiveCalories && report.targetCalories) {
              effectiveCalories = report.targetCalories;
            }
            if (!effectiveMacros && report.targetMacros) {
              effectiveMacros = report.targetMacros;
            }
            if (!effectiveDietitian && report.dietitianName) {
              effectiveDietitian = report.dietitianName;
            }
            if (report.allergies?.length) {
              effectiveAllergies = Array.from(
                new Set([...effectiveAllergies, ...report.allergies])
              );
            }
            if (!effectiveDietType) {
              effectiveDietType = report.dietType || report.dietaryRecommendations;
            }
            if (!effectiveNotes && report.dietaryRecommendations) {
              effectiveNotes = report.dietaryRecommendations;
            }
          }

          // If calories not found in HealthReport, check LabReport fitness metrics
          if (!effectiveCalories) {
            const lab = await LabReport.findOne({
              $or: [{ clientId: effectiveId }, { userId: effectiveId }],
              "fitnessMetrics.currentWeight": { $exists: true, $gt: 0 },
            })
              .sort({ createdAt: -1 })
              .lean();
            if (lab?.fitnessMetrics?.currentWeight && lab?.fitnessMetrics?.heightCm) {
              const w = Number(lab.fitnessMetrics.currentWeight);
              const h = Number(lab.fitnessMetrics.heightCm);
              const a = Number(lab.clientAge) || 30;
              const bmr = 10 * w + 6.25 * h - 5 * a + 5;
              effectiveCalories = Math.round(bmr * 1.35);
              if (!effectiveNotes) {
                effectiveNotes = `Calibrated to patient biological metrics (${w}kg, ${h}cm, maintenance ${effectiveCalories} kcal).`;
              }
            }
          }
        }
      } catch (err) {
        console.warn("[mealPlan.tool context grounding warning]:", err.message);
      }
    }

    const effectiveDuration = durationDays || daysCount || 3;
    const finalCalories = effectiveCalories || 2000;
    const finalDietitian = effectiveDietitian || "Unassigned (AI Clinical Protocol)";

    const result = await generateMealPlanApi({
      planName: planName || "Personalized Clinical Meal Plan",
      dietType: effectiveDietType || "Balanced",
      durationDays: effectiveDuration,
      dailyCalories: finalCalories,
      macroTargets: effectiveMacros,
      healthFocus: healthFocus || "General Wellness",
      allergiesExcluded: effectiveAllergies,
      clinicalNotes: effectiveNotes,
      supervisingDietitian: finalDietitian,
    });

    if (!result.success || !result.plan) {
      return {
        success: false,
        cards: [],
        message: result.message || "Failed to generate meal plan.",
      };
    }

    const card = {
      type: "meal_plan_card",
      data: result.plan,
    };

    return {
      success: true,
      plan: result.plan,
      cards: [card],
      message: result.message,
    };
  } catch (error) {
    console.error("[executeGenerateMealPlan Error]:", error);
    return {
      success: false,
      cards: [],
      message: "Failed to generate meal plan.",
    };
  }
}

module.exports = {
  generateMealPlanDeclaration,
  executeGenerateMealPlan,
};
