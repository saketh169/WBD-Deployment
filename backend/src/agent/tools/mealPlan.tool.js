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
    const userId = context.userId || context.authUserId || null;
    const result = await generateMealPlanApi({
      ...args,
      userId,
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
