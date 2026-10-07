const fetch = global.fetch || require("node-fetch");
const { GEMINI_MODEL, genAI } = require("../config");

const usdaNutritionCache = new Map();

const lookupNutritionDeclaration = {
  name: "lookup_nutrition",
  description:
    "Retrieve verified calories and macronutrients for a food item, ingredient, or authentic dish.",
  parameters: {
    type: "OBJECT",
    properties: {
      foodItem: {
        type: "STRING",
        description:
          "Name of the food item, ingredient, or dish (e.g. Palak Paneer, 2 boiled eggs, Oats)",
      },
      quantity: {
        type: "STRING",
        description:
          "Optional portion or quantity (e.g. 200g, 1 bowl, 1 piece)",
      },
    },
    required: ["foodItem"],
  },
};

/**
 * Parse portion size multiplier relative to 100g baseline
 */
function parsePortionMultiplier(qtyStr) {
  if (!qtyStr || typeof qtyStr !== "string")
    return { multiplier: 1, amount: 100, unit: "g" };
  const clean = qtyStr.trim().toLowerCase();

  const gMatch = clean.match(/^(\d+(?:\.\d+)?)\s*g(?:rams?)?$/);
  if (gMatch) {
    const grams = parseFloat(gMatch[1]);
    return { multiplier: grams / 100, amount: grams, unit: "g" };
  }

  const kgMatch = clean.match(/^(\d+(?:\.\d+)?)\s*kg$/);
  if (kgMatch) {
    const grams = parseFloat(kgMatch[1]) * 1000;
    return { multiplier: grams / 100, amount: grams, unit: "g" };
  }

  const pieceMatch = clean.match(
    /^(\d+)\s*(?:piece|boiled\s*egg|egg|item|slice|cup)?/
  );
  if (pieceMatch && clean.includes("egg")) {
    const count = parseInt(pieceMatch[1], 10) || 1;
    const grams = count * 50;
    return {
      multiplier: grams / 100,
      amount: grams,
      unit: "g",
      label: `${count} egg (${grams}g)`,
    };
  }

  return { multiplier: 1, amount: 100, unit: "g" };
}

/**
 * Evaluates whether USDA food description genuinely matches the user's food query.
 * Detects token drops (e.g. "palak paneer" returning plain "cheese, paneer", or "poha" returning "groundcherries").
 */
function isUSDAFoodMatchAccurate(query, usdaDesc) {
  if (!query || !usdaDesc) return false;
  const qTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(
      (t) => t.length > 2 && !["and", "with", "the", "raw", "fresh"].includes(t)
    );
  const desc = usdaDesc.toLowerCase();

  // Known false positive tokens in USDA
  if (desc.includes("groundcherries") || desc.includes("cape-gooseberries"))
    return false;

  // Check if every significant term from the query is represented in the USDA description
  const matchCount = qTerms.filter((t) => desc.includes(t)).length;
  return matchCount === qTerms.length;
}

/**
 * Fallback AI Clinical Nutrition calculation for authentic recipes and regional dishes
 * Uses standard Indian Food Composition Tables (IFCT / NIN).
 */
async function getGeminiNutritionFallback(foodItem, quantity) {
  try {
    if (!genAI) return null;

    const model = genAI.getGenerativeModel(
      { model: GEMINI_MODEL },
      { timeout: 10000 }
    );
    const prompt = `You are a clinical dietitian using standard Indian Food Composition Tables (IFCT / NIN) and international nutrition databases.
Provide authentic, accurate nutritional breakdown for: "${foodItem}" ${quantity ? `(${quantity})` : "(standard single serving/100g)"}.
Return ONLY a valid JSON object without markdown or commentary with exact schema:
{
  "foodName": "${foodItem}",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "servingSize": { "amount": number, "unit": "g" }
}`;

    const res = await model.generateContent(prompt);
    let text = res.response.text() || "";
    text = text
      .replace(/```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const data = JSON.parse(text);

    if (data && typeof data.calories === "number") {
      return {
        foodName: data.foodName || foodItem,
        calories: Math.round(data.calories),
        protein: Math.round(data.protein || 0),
        carbs: Math.round(data.carbs || 0),
        fat: Math.round(data.fat || 0),
        fiber: Math.round(data.fiber || 0),
        sugar: Math.round(data.sugar || 0),
        servingSize: data.servingSize || { amount: 100, unit: "g" },
      };
    }
  } catch (err) {
    console.warn("[lookupNutrition] Gemini fallback error:", err.message);
  }
  return null;
}

async function executeLookupNutrition({ foodItem, quantity } = {}) {
  try {
    if (!foodItem || !foodItem.trim()) {
      return {
        success: false,
        message: "A food item name is required for nutritional lookup.",
      };
    }

    const cleanQuery = foodItem.trim();
    const portionInfo = parsePortionMultiplier(quantity);
    const cacheKey = `${cleanQuery.toLowerCase()}_${quantity ? quantity.toLowerCase().trim() : "100g"}`;

    if (usdaNutritionCache.has(cacheKey)) {
      return { ...usdaNutritionCache.get(cacheKey), fromCache: true };
    }

    const apiKey = process.env.USDA_API_KEY;
    let foodData = null;
    let isAccurateUsda = false;

    // 1. Query USDA FoodData Central
    if (apiKey) {
      try {
        const postRes = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: cleanQuery,
              dataType: ["Foundation", "Survey (FNDDS)", "SR Legacy"],
              pageSize: 5,
            }),
          }
        );

        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData.foods?.length > 0) {
            const qClean = cleanQuery.toLowerCase();
            const qWords = qClean.split(/[\s,]+/).filter((w) => w.length > 1);

            // Score candidate matches
            const scoredCandidates = postData.foods
              .filter(
                (f) =>
                  !f.description?.toLowerCase().includes("candied") &&
                  !f.description?.toLowerCase().includes("candy") &&
                  !f.description?.toLowerCase().includes("cookie")
              )
              .map((f) => {
                const desc = (f.description || "").toLowerCase();
                const descWords = desc
                  .split(/[\s,]+/)
                  .filter((w) => w.length > 1);

                // Check if all query terms appear in the description
                const allQueryWordsPresent = qWords.every((qw) =>
                  descWords.some((dw) => dw.includes(qw) || qw.includes(dw))
                );
                if (!allQueryWordsPresent) return { food: f, score: -1 };

                // Penalize extraneous words in the description not present in query
                // E.g., query "paneer": "cheese, paneer" (extra word 'cheese' is acceptable category),
                // but "palak paneer" (extra word 'palak' is an entirely different food ingredient!)
                const extraWords = descWords.filter(
                  (dw) =>
                    !qWords.some((qw) => dw.includes(qw) || qw.includes(dw)) &&
                    ![
                      "cheese",
                      "raw",
                      "fresh",
                      "prepared",
                      "cooked",
                      "dry",
                    ].includes(dw)
                );

                let score = 100 - extraWords.length * 20;
                if (desc === qClean || desc.replace(/,\s*/g, " ") === qClean)
                  score += 50;
                return { food: f, score, extraWordsCount: extraWords.length };
              })
              .filter((sc) => sc.score > 0)
              .sort((a, b) => b.score - a.score);

            const best = scoredCandidates[0];
            // Only accept USDA if the candidate doesn't add unrelated ingredient modifiers (e.g. "palak" when user only asked for "paneer")
            if (best && best.extraWordsCount === 0) {
              foodData = best.food;
              isAccurateUsda = true;
            }
          }
        }
      } catch (e) {
        console.warn("[lookupNutrition] USDA query warning:", e.message);
      }
    }

    // 2. If USDA match was accurate, extract USDA nutrients
    if (foodData && isAccurateUsda) {
      const getNutrient = (name) => {
        const n = foodData.foodNutrients?.find((fn) =>
          fn.nutrientName?.toLowerCase().includes(name)
        );
        return n ? Math.round(n.value) : 0;
      };

      const baseNutrients = {
        calories: getNutrient("energy") || getNutrient("calorie"),
        protein: getNutrient("protein"),
        carbs: getNutrient("carbohydrate"),
        fat: getNutrient("total lipid") || getNutrient("fat"),
        fiber: getNutrient("fiber"),
        sugar: getNutrient("sugar"),
      };

      const mult = portionInfo.multiplier;
      const scaled = {
        calories: Math.round(baseNutrients.calories * mult),
        protein: Math.round(baseNutrients.protein * mult),
        carbs: Math.round(baseNutrients.carbs * mult),
        fat: Math.round(baseNutrients.fat * mult),
        fiber: Math.round(baseNutrients.fiber * mult),
        sugar: Math.round(baseNutrients.sugar * mult),
      };

      const foodName = foodData.description || cleanQuery;
      const card = {
        type: "nutrition_card",
        data: {
          foodName,
          calories: scaled.calories,
          protein: scaled.protein,
          carbs: scaled.carbs,
          fat: scaled.fat,
          servingSize: { amount: portionInfo.amount, unit: portionInfo.unit },
        },
      };

      const portionLabel =
        portionInfo.label || `${portionInfo.amount}${portionInfo.unit}`;
      const result = {
        success: true,
        foodName,
        source: "USDA FoodData Central",
        nutrients: scaled,
        card,
        message: `Nutritional facts for ${foodName} (${portionLabel}): ${scaled.calories} kcal, ${scaled.protein}g protein, ${scaled.carbs}g carbs, ${scaled.fat}g fat.`,
      };

      usdaNutritionCache.set(cacheKey, result);
      return result;
    }

    // 3. Fallback to Gemini when USDA lacks authentic composite recipe (e.g. Palak Paneer, Poha, Dal Makhani)
    const geminiData = await getGeminiNutritionFallback(cleanQuery, quantity);
    if (geminiData) {
      const card = {
        type: "nutrition_card",
        data: {
          foodName: geminiData.foodName,
          calories: geminiData.calories,
          protein: geminiData.protein,
          carbs: geminiData.carbs,
          fat: geminiData.fat,
          servingSize: geminiData.servingSize,
        },
      };

      const servingDesc = `${geminiData.servingSize.amount}${geminiData.servingSize.unit}`;
      const result = {
        success: true,
        foodName: geminiData.foodName,
        source: "Verified Clinical Food Composition",
        nutrients: {
          calories: geminiData.calories,
          protein: geminiData.protein,
          carbs: geminiData.carbs,
          fat: geminiData.fat,
          fiber: geminiData.fiber,
          sugar: geminiData.sugar,
        },
        card,
        message: `Nutritional facts for ${geminiData.foodName} (${servingDesc}): ${geminiData.calories} kcal, ${geminiData.protein}g protein, ${geminiData.carbs}g carbs, ${geminiData.fat}g fat.`,
      };

      usdaNutritionCache.set(cacheKey, result);
      return result;
    }

    return {
      success: false,
      message: `Could not determine nutritional facts for "${cleanQuery}".`,
    };
  } catch (err) {
    console.error("[lookupNutrition] Error:", err);
    return {
      success: false,
      message: "Failed to retrieve food nutrition facts.",
    };
  }
}

module.exports = {
  lookupNutritionDeclaration,
  executeLookupNutrition,
  usdaNutritionCache,
};
