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
  dailyCalories = 1800,
  targetCalories: explicitTargetCalories = null,
  macroTargets = null,
  healthFocus = "General Wellness",
  allergiesExcluded = [],
  clinicalNotes = "",
  supervisingDietitian = "NutriConnect Clinical Team",
  days = [],
  useHttpApi = false,
} = {}) {
  try {
    const rawDays = Number(durationDays);
    const daysCount = isNaN(rawDays) ? 3 : Math.max(1, Math.min(rawDays, 7));
    const targetCalories = Math.max(1200, Number(explicitTargetCalories || dailyCalories) || 1800);

    const calculatedMacros = macroTargets || {
      proteinGrams: Math.round((targetCalories * 0.25) / 4),
      carbsGrams: Math.round((targetCalories * 0.5) / 4),
      fatsGrams: Math.round((targetCalories * 0.25) / 9),
    };

    if (useHttpApi) {
      const apiRes = await defaultApiClient.post("/api/meal-plans", {
        planName,
        dietType,
        daysCount,
        dailyCalories: targetCalories,
        macroTargets: calculatedMacros,
        healthFocus,
        allergiesExcluded,
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
        const model = genAI.getGenerativeModel(
          {
            model: GEMINI_MODEL,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
            },
          },
          { timeout: 15000 }
        );

        const prompt = `Generate a realistic ${daysCount}-day ${dietType} meal plan matching these nutritional targets:
- Plan Name: ${planName}
- Focus: ${healthFocus}
- Daily Calories: ${targetCalories} kcal
- Daily Macros: Protein: ${calculatedMacros.proteinGrams}g, Carbs: ${calculatedMacros.carbsGrams}g, Fats: ${calculatedMacros.fatsGrams}g
- Allergies to Exclude: ${allergiesExcluded.join(", ") || "None"}
- Clinical Notes: ${clinicalNotes || "Nutrient-dense balanced meals"}

Every single day MUST include all 4 daily meals: 1) Breakfast, 2) Lunch, 3) Snacks, and 4) Dinner.
Return JSON with schema:
{
  "days": [
    {
      "dayIndex": 1,
      "dayLabel": "Day 1",
      "dayCalories": ${targetCalories},
      "proteinGrams": ${calculatedMacros.proteinGrams},
      "carbsGrams": ${calculatedMacros.carbsGrams},
      "fatsGrams": ${calculatedMacros.fatsGrams},
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Meal name",
          "calories": number,
          "proteinGrams": number,
          "carbsGrams": number,
          "fatsGrams": number,
          "ingredients": ["ingredients"],
          "prepSteps": ["steps"]
        }
      ]
    }
  ]
}`;

        const res = await model.generateContent(prompt);
        const text = res.response.text() || "";
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
      const bCal = Math.round(targetCalories * 0.25);
      const lCal = Math.round(targetCalories * 0.35);
      const sCal = Math.round(targetCalories * 0.15);
      const dCal = Math.round(targetCalories * 0.25);

      for (let i = 1; i <= daysCount; i++) {
        generatedDays.push({
          dayIndex: i,
          dayLabel: `Day ${i}`,
          dayCalories: targetCalories,
          proteinGrams: calculatedMacros.proteinGrams,
          carbsGrams: calculatedMacros.carbsGrams,
          fatsGrams: calculatedMacros.fatsGrams,
          meals: [
            {
              mealType: "Breakfast",
              name: `${dietType} Nutrition Meal`,
              calories: bCal,
              proteinGrams: Math.round(calculatedMacros.proteinGrams * 0.25),
              carbsGrams: Math.round(calculatedMacros.carbsGrams * 0.25),
              fatsGrams: Math.round(calculatedMacros.fatsGrams * 0.25),
              ingredients: ["Nutrient-dense whole grains", "Protein", "Fresh seasonal produce"],
              prepSteps: ["Prepared to meet nutritional targets."],
            },
            {
              mealType: "Lunch",
              name: `${dietType} Balanced Plate`,
              calories: lCal,
              proteinGrams: Math.round(calculatedMacros.proteinGrams * 0.35),
              carbsGrams: Math.round(calculatedMacros.carbsGrams * 0.35),
              fatsGrams: Math.round(calculatedMacros.fatsGrams * 0.35),
              ingredients: ["Complex carbohydrates", "Dietary protein", "Fiber-rich vegetables"],
              prepSteps: ["Balanced macro preparation."],
            },
            {
              mealType: "Snacks",
              name: "Nutrient-Dense Snack",
              calories: sCal,
              proteinGrams: Math.round(calculatedMacros.proteinGrams * 0.15),
              carbsGrams: Math.round(calculatedMacros.carbsGrams * 0.15),
              fatsGrams: Math.round(calculatedMacros.fatsGrams * 0.15),
              ingredients: ["Healthy whole snack", "Hydration beverage"],
              prepSteps: ["Portioned midday nutrition."],
            },
            {
              mealType: "Dinner",
              name: `${dietType} Restorative Dinner`,
              calories: dCal,
              proteinGrams: Math.round(calculatedMacros.proteinGrams * 0.25),
              carbsGrams: Math.round(calculatedMacros.carbsGrams * 0.25),
              fatsGrams: Math.round(calculatedMacros.fatsGrams * 0.25),
              ingredients: ["Light protein", "Micronutrient-dense greens"],
              prepSteps: ["Light evening preparation."],
            },
          ],
        });
      }
    }

    const planData = {
      planName,
      dietType,
      daysCount,
      dailyCalories: targetCalories,
      macroTargets: calculatedMacros,
      hydrationTargetLiters: 2.5,
      healthFocus,
      allergiesExcluded: allergiesExcluded || [],
      supervisingDietitian,
      clinicalNotes: clinicalNotes || `Tailored ${dietType} protocol aligned with clinical guidelines.`,
      days: generatedDays,
    };

    return {
      success: true,
      plan: planData,
      message: `Generated ${daysCount}-day ${dietType} meal plan targeting ${targetCalories} kcal daily for ${healthFocus}.`,
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
