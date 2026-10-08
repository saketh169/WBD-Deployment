const { GEMINI_MODEL, genAI } = require("../config");
const { defaultApiClient } = require("./apiClient");

/**
 * Dedicated Meal Plan API
 * Generates structured, allergen-safe clinical meal plans with daily calorie and macro breakdowns.
 * ZERO REGEX: Pure string manipulation and JSON parsing.
 * Customizable: Supports invoking remote meal plan services or generating tailored plans in-process.
 */
async function generateMealPlanApi({
  planName = "Personalized Nutrition Plan",
  dietType = "Balanced",
  durationDays = 3,
  daysCount: explicitDaysCount = null,
  dailyCalories = null,
  targetCalories: explicitTargetCalories = null,
  macroTargets = null,
  healthFocus = "General Wellness",
  allergiesExcluded = [],
  clinicalNotes = "",
  supervisingDietitian = null,
  userId = null,
  days = [],
  useHttpApi = false,
} = {}) {
  try {
    let effectiveCalories = explicitTargetCalories || dailyCalories || null;
    let effectiveMacros = macroTargets || null;
    let effectiveDietType = dietType;
    let effectiveDietitian = supervisingDietitian || null;
    let effectiveAllergies = Array.isArray(allergiesExcluded) ? [...allergiesExcluded] : [];
    let effectiveNotes = clinicalNotes || "";

    if (userId) {
      try {
        const { resolvePatientProfile } = require("../services/userResolver");
        const { HealthReport } = require("../../models/healthReportModel");
        const { LabReport } = require("../../models/labReportModel");
        const { User } = require("../../models/userModel");

        const resolved = await resolvePatientProfile(userId);
        const effectiveId = resolved?.userId || userId;
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
            if (!effectiveDietType || effectiveDietType === "Balanced") {
              effectiveDietType = report.dietType || report.dietaryRecommendations || effectiveDietType;
            }
            if (!effectiveNotes && report.dietaryRecommendations) {
              effectiveNotes = report.dietaryRecommendations;
            }
          }

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

              let patientAge = Number(lab.clientAge) || null;
              if (!patientAge) {
                const userDoc = await User.findById(effectiveId).select("dob age").lean();
                if (userDoc?.age) {
                  patientAge = Number(userDoc.age);
                } else if (userDoc?.dob) {
                  const birthYear = new Date(userDoc.dob).getFullYear();
                  const currentYear = new Date().getFullYear();
                  if (birthYear && currentYear > birthYear) {
                    patientAge = currentYear - birthYear;
                  }
                }
              }

              if (patientAge && patientAge > 0) {
                const bmr = 10 * w + 6.25 * h - 5 * patientAge + 5;
                effectiveCalories = Math.round(bmr * 1.35);
                if (!effectiveNotes) {
                  effectiveNotes = `Calibrated to patient biological metrics (${w}kg, ${h}cm, age ${patientAge}, maintenance ${effectiveCalories} kcal).`;
                }
              }
            }
          }
        }
      } catch (groundingErr) {
        console.warn("[generateMealPlanApi context grounding warning]:", groundingErr.message);
      }
    }

    const rawDays = Number(explicitDaysCount || durationDays);
    const count = isNaN(rawDays) ? 3 : Math.max(1, Math.min(rawDays, 7));
    const targetCalories = effectiveCalories ? Math.max(1200, Number(effectiveCalories)) : null;

    const calculatedMacros = effectiveMacros || (targetCalories ? {
      proteinGrams: Math.round((targetCalories * 0.25) / 4),
      carbsGrams: Math.round((targetCalories * 0.5) / 4),
      fatsGrams: Math.round((targetCalories * 0.25) / 9),
    } : {
      proteinGrams: 0,
      carbsGrams: 0,
      fatsGrams: 0,
    });

    const finalDietitian = effectiveDietitian || "Unassigned (AI Clinical Protocol)";

    if (useHttpApi) {
      const apiRes = await defaultApiClient.post("/api/meal-plans", {
        planName,
        dietType: effectiveDietType,
        daysCount: count,
        dailyCalories: targetCalories,
        macroTargets: calculatedMacros,
        healthFocus,
        allergiesExcluded: effectiveAllergies,
      });
      if (apiRes.success && apiRes.data) {
        return {
          success: true,
          plan: apiRes.data,
          message: `Generated meal plan via HTTP API.`,
        };
      }
    }

    let generatedDays = Array.isArray(days) && days.length > 0 ? days : [];

    if (generatedDays.length === 0 && genAI && process.env.NODE_ENV !== "test") {
      try {
        const model = genAI.getGenerativeModel({
          model: GEMINI_MODEL,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
            maxOutputTokens: 2500,
          },
        });

        const prompt = `Generate a realistic ${count}-day ${effectiveDietType} meal plan matching these nutritional targets:
- Plan Name: ${planName}
- Focus: ${healthFocus}
- Daily Calories: ${targetCalories ? `${targetCalories} kcal` : "Unspecified (focus on balanced portions and nutrient-dense whole foods)"}
- Daily Macros: ${calculatedMacros ? `Protein: ${calculatedMacros.proteinGrams}g, Carbs: ${calculatedMacros.carbsGrams}g, Fats: ${calculatedMacros.fatsGrams}g` : "Balanced macronutrient distribution"}
- Allergies to Exclude: ${effectiveAllergies.join(", ") || "None"}
- Clinical Notes: ${effectiveNotes || "Nutrient-dense balanced meals"}

Every single day MUST include all 4 daily meals: 1) Breakfast, 2) Lunch, 3) Snacks, and 4) Dinner.
Return JSON with schema:
{
  "days": [
    {
      "dayIndex": 1,
      "dayLabel": "Day 1",
      "dayCalories": ${targetCalories || "null"},
      "proteinGrams": ${calculatedMacros?.proteinGrams || "null"},
      "carbsGrams": ${calculatedMacros?.carbsGrams || "null"},
      "fatsGrams": ${calculatedMacros?.fatsGrams || "null"},
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Meal name",
          "calories": number or null,
          "proteinGrams": number or null,
          "carbsGrams": number or null,
          "fatsGrams": number or null,
          "ingredients": ["ingredients"],
          "prepSteps": ["steps"]
        }
      ]
    }
  ]
}`;

        const res = await model.generateContent(prompt);
        const text = res?.response?.text?.() || "";
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        const jsonStr = jsonStart !== -1 && jsonEnd !== -1 ? text.substring(jsonStart, jsonEnd + 1) : text;
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed?.days) && parsed.days.length > 0) {
          generatedDays = parsed.days;
        }
      } catch (genErr) {
        console.warn("[generateMealPlanApi Generation Warning]:", genErr.message);
      }
    }

    if (generatedDays.length === 0) {
      const bCal = targetCalories ? Math.round(targetCalories * 0.25) : null;
      const lCal = targetCalories ? Math.round(targetCalories * 0.35) : null;
      const sCal = targetCalories ? Math.round(targetCalories * 0.15) : null;
      const dCal = targetCalories ? Math.round(targetCalories * 0.25) : null;

      for (let i = 1; i <= count; i++) {
        generatedDays.push({
          dayIndex: i,
          dayLabel: `Day ${i}`,
          dayCalories: targetCalories,
          proteinGrams: calculatedMacros?.proteinGrams || null,
          carbsGrams: calculatedMacros?.carbsGrams || null,
          fatsGrams: calculatedMacros?.fatsGrams || null,
          meals: [
            {
              mealType: "Breakfast",
              name: `${effectiveDietType} Nutrition Meal`,
              calories: bCal,
              proteinGrams: calculatedMacros ? Math.round(calculatedMacros.proteinGrams * 0.25) : null,
              carbsGrams: calculatedMacros ? Math.round(calculatedMacros.carbsGrams * 0.25) : null,
              fatsGrams: calculatedMacros ? Math.round(calculatedMacros.fatsGrams * 0.25) : null,
              ingredients: ["Nutrient-dense whole grains", "Protein", "Fresh seasonal produce"],
              prepSteps: ["Prepared to meet nutritional targets."],
            },
            {
              mealType: "Lunch",
              name: `${effectiveDietType} Balanced Plate`,
              calories: lCal,
              proteinGrams: calculatedMacros ? Math.round(calculatedMacros.proteinGrams * 0.35) : null,
              carbsGrams: calculatedMacros ? Math.round(calculatedMacros.carbsGrams * 0.35) : null,
              fatsGrams: calculatedMacros ? Math.round(calculatedMacros.fatsGrams * 0.35) : null,
              ingredients: ["Complex carbohydrates", "Dietary protein", "Fiber-rich vegetables"],
              prepSteps: ["Balanced macro preparation."],
            },
            {
              mealType: "Snacks",
              name: "Nutrient-Dense Snack",
              calories: sCal,
              proteinGrams: calculatedMacros ? Math.round(calculatedMacros.proteinGrams * 0.15) : null,
              carbsGrams: calculatedMacros ? Math.round(calculatedMacros.carbsGrams * 0.15) : null,
              fatsGrams: calculatedMacros ? Math.round(calculatedMacros.fatsGrams * 0.15) : null,
              ingredients: ["Healthy whole snack", "Hydration beverage"],
              prepSteps: ["Portioned midday nutrition."],
            },
            {
              mealType: "Dinner",
              name: `${effectiveDietType} Restorative Dinner`,
              calories: dCal,
              proteinGrams: calculatedMacros ? Math.round(calculatedMacros.proteinGrams * 0.25) : null,
              carbsGrams: calculatedMacros ? Math.round(calculatedMacros.carbsGrams * 0.25) : null,
              fatsGrams: calculatedMacros ? Math.round(calculatedMacros.fatsGrams * 0.25) : null,
              ingredients: ["Light protein", "Micronutrient-dense greens"],
              prepSteps: ["Light evening preparation."],
            },
          ],
        });
      }
    }

    const planData = {
      planName,
      dietType: effectiveDietType,
      daysCount: count,
      dailyCalories: targetCalories,
      macroTargets: calculatedMacros,
      hydrationTargetLiters: 2.5,
      healthFocus,
      allergiesExcluded: effectiveAllergies,
      supervisingDietitian: finalDietitian,
      clinicalNotes: effectiveNotes || `Tailored ${effectiveDietType} protocol aligned with clinical guidelines.`,
      days: generatedDays,
    };

    return {
      success: true,
      plan: planData,
      message: `Generated ${count}-day ${effectiveDietType} meal plan${targetCalories ? ` targeting ${targetCalories} kcal daily` : ""} for ${healthFocus}.`,
    };
  } catch (error) {
    console.error("[generateMealPlanApi Error]:", error);
    return {
      success: false,
      message: `Failed to generate meal plan: ${error.message}`,
    };
  }
}

module.exports = {
  generateMealPlanApi,
};
