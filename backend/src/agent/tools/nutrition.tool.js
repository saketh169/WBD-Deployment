const { lookupNutritionApi } = require("../apis/nutrition.api");

const lookupNutritionDeclaration = {
  name: "lookup_nutrition",
  description:
    "Retrieve verified calories, protein, carbohydrates, and fats for a food item or ingredient.",
  parameters: {
    type: "OBJECT",
    properties: {
      foodItem: {
        type: "STRING",
        description:
          "Name of the food item, ingredient, or dish (e.g. paneer, 2 boiled eggs, oats, chicken breast)",
      },
      quantity: {
        type: "STRING",
        description:
          "Portion or quantity (e.g. 100g, 200g, 1 cup, 2 pieces). Defaults to 100g.",
      },
    },
    required: ["foodItem"],
  },
};

async function executeLookupNutrition(args = {}, context = {}) {
  try {
    const { foodItem, quantity } = args;

    const result = await lookupNutritionApi({
      foodItem,
      quantity: quantity || "100g",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        cards: [],
        message: result.message || `Nutritional facts for "${foodItem}" could not be retrieved.`,
      };
    }

    const card = {
      type: "nutrition_card",
      data: result.data,
    };

    return {
      success: true,
      data: result.data,
      cards: [card],
      message: result.message,
    };
  } catch (error) {
    console.error("[executeLookupNutrition Error]:", error);
    return {
      success: false,
      cards: [],
      message: "Failed to look up nutritional data.",
    };
  }
}

module.exports = {
  lookupNutritionDeclaration,
  executeLookupNutrition,
};
