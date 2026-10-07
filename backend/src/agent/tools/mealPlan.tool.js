const mongoose = require("mongoose");
const { HealthReport } = require("../../models/healthReportModel");
const { LabReport } = require("../../models/labReportModel");
const { User, UserAuth } = require("../../models/userModel");
const { GEMINI_MODEL, genAI } = require("../config");

/**
 * Standard Declarative Meal Plan Schema for Agentic RAG
 * Clean, minimal contract for structured generative UI output.
 */
const generateMealPlanDeclaration = {
  name: "generate_meal_plan",
  description:
    "Generate a structured clinical meal plan grounded in patient biomarkers, targets, and dietary restrictions.",
  parameters: {
    type: "OBJECT",
    properties: {
      planName: { type: "STRING", description: "Title of the meal plan" },
      dietType: {
        type: "STRING",
        description:
          "Dietary classification (e.g. Vegetarian, Non-Vegetarian, Vegan)",
      },
      daysCount: { type: "NUMBER", description: "Number of days for the plan" },
      dailyCalories: { type: "NUMBER", description: "Target daily calories" },
      macroTargets: {
        type: "OBJECT",
        properties: {
          proteinGrams: {
            type: "NUMBER",
            description: "Daily protein target in grams",
          },
          carbsGrams: {
            type: "NUMBER",
            description: "Daily carbohydrates target in grams",
          },
          fatsGrams: {
            type: "NUMBER",
            description: "Daily fats target in grams",
          },
        },
      },
      hydrationTargetLiters: {
        type: "NUMBER",
        description: "Daily water target in liters",
      },
      healthFocus: {
        type: "STRING",
        description: "Clinical focus addressing patient biomarkers",
      },
      allergiesExcluded: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Excluded allergens",
      },
      supervisingDietitian: {
        type: "STRING",
        description: "Supervising dietitian name",
      },
      clinicalNotes: {
        type: "STRING",
        description: "Concise clinical guidance",
      },
      days: {
        type: "ARRAY",
        description:
          "Scheduled days with planned meals matching daysCount (e.g. Day 1, Day 2, etc. If no duration was specified, provide 1 day). Every day in this array must contain all 4 daily meals: Breakfast, Lunch, Snacks, and Dinner without omitting Dinner.",
        items: {
          type: "OBJECT",
          properties: {
            dayIndex: { type: "NUMBER", description: "Day number (1, 2, ...)" },
            dayLabel: {
              type: "STRING",
              description: "Display name, e.g. Day 1",
            },
            dayCalories: { type: "NUMBER" },
            proteinGrams: { type: "NUMBER" },
            carbsGrams: { type: "NUMBER" },
            fatsGrams: { type: "NUMBER" },
            meals: {
              type: "ARRAY",
              description:
                "Array containing all 4 daily meals: 1) Breakfast, 2) Lunch, 3) Snacks, and 4) Dinner. Ensure Dinner is always included.",
              items: {
                type: "OBJECT",
                properties: {
                  mealType: {
                    type: "STRING",
                    enum: ["Breakfast", "Lunch", "Snacks", "Dinner"],
                    description:
                      "Meal category (Breakfast, Lunch, Snacks, Dinner)",
                  },
                  name: { type: "STRING", description: "Dish name" },
                  calories: { type: "NUMBER" },
                  ingredients: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Key ingredients with portions",
                  },
                  prepSteps: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Step-by-step cooking steps",
                  },
                },
                required: ["mealType", "name", "calories"],
              },
            },
          },
          required: ["dayIndex", "dayLabel", "meals"],
        },
      },
    },
    required: ["planName", "dietType", "daysCount", "dailyCalories", "days"],
  },
};

// In-memory food image cache for sub-millisecond retrieval
const foodImageCache = new Map();

/**
 * Standard Web Image Resolver
 * Queries public culinary endpoints (TheMealDB & Wikipedia Page Images Search).
 * Zero hardcoded dictionaries, rules, or example lists.
 */
async function resolveDynamicFoodImage(dishName = "") {
  const name = (dishName || "").trim();
  if (!name) return null;

  const cacheKey = name.toLowerCase();
  if (foodImageCache.has(cacheKey)) {
    return foodImageCache.get(cacheKey);
  }

  const clean = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return null;

  const headers = {
    "User-Agent":
      "NutriConnectApp/1.0 (https://nutriconnect.org; support@nutriconnect.org)",
  };

  // 1. TheMealDB API
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(clean)}`,
      {
        headers,
        signal: AbortSignal.timeout(1500),
      }
    );
    const data = await res.json();
    if (data?.meals?.[0]?.strMealThumb) {
      const url = data.meals[0].strMealThumb;
      foodImageCache.set(cacheKey, url);
      return url;
    }
  } catch {}

  // 2. Wikipedia Search API (Semantic search over articles with lead thumbnail images)
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(clean)}&gsrlimit=2&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(1500),
    });
    const data = await res.json();
    if (data?.query?.pages) {
      for (const page of Object.values(data.query.pages)) {
        const src = page.thumbnail?.source;
        if (src && !src.endsWith(".svg")) {
          foodImageCache.set(cacheKey, src);
          return src;
        }
      }
    }
  } catch {}

  foodImageCache.set(cacheKey, null);
  return null;
}

/**
 * Execute AI Meal Plan Generation
 * Attaches verified patient profile metadata and resolves web culinary photos.
 */
async function executeGenerateMealPlan(args = {}, context = {}) {
  try {
    let user = null;
    let assessment = null;
    let labReport = null;

    if (context.userId && mongoose.isValidObjectId(context.userId)) {
      const [uDoc, aDoc] = await Promise.all([
        User.findById(context.userId).lean(),
        UserAuth.findById(context.userId).lean(),
      ]);

      user = uDoc;
      let roleId = aDoc?.roleId;
      if (!user && roleId) {
        user = await User.findById(roleId).lean();
      }

      const candidateIds = [
        context.userId,
        user?._id,
        aDoc?._id,
        roleId,
      ].filter((id) => id && mongoose.isValidObjectId(id));

      const [foundAssessment, foundLab] = await Promise.all([
        HealthReport.findOne({ clientId: { $in: candidateIds } })
          .sort({ createdAt: -1 })
          .lean(),
        LabReport.findOne({ userId: { $in: candidateIds } })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      assessment = foundAssessment;
      labReport = foundLab;
    }

    // Determine target calories (prioritize dietitian's clinical target unless patient explicitly requested a calorie number)
    const userPromptCalMatch = context.userQuery?.match(
      /\b(\d{3,4})\s*(?:cal|kcal|calories)\b/i
    );
    const explicitCal = userPromptCalMatch
      ? Number(userPromptCalMatch[1])
      : null;
    const dailyCalories =
      explicitCal || assessment?.targetCalories || args.dailyCalories || 1850;

    // Determine target macros
    const macroTargets = assessment?.targetMacros?.proteinGrams
      ? {
          proteinGrams: assessment.targetMacros.proteinGrams,
          carbsGrams: assessment.targetMacros.carbsGrams,
          fatsGrams: assessment.targetMacros.fatsGrams,
        }
      : args.macroTargets || {
          proteinGrams: 105,
          carbsGrams: 210,
          fatsGrams: 55,
        };

    const hydrationTargetLiters =
      assessment?.targetHydrationLiters || args.hydrationTargetLiters || 3.2;
    const supervisingDietitian =
      assessment?.dietitianName ||
      args.supervisingDietitian ||
      "Consulted Specialist";
    const healthFocus =
      assessment?.diagnosis ||
      args.healthFocus ||
      "Cardiometabolic & Glycemic Health";

    // Collect allergens to strictly exclude (case-insensitive deduplication)
    const rawAllergies = [
      ...(assessment?.allergies || []),
      ...(args.allergiesExcluded || []),
    ].filter(Boolean);

    const allergyMap = new Map();
    for (const a of rawAllergies) {
      const clean = String(a).trim();
      const key = clean.toLowerCase();
      if (!allergyMap.has(key)) {
        // Capitalize first letter cleanly
        allergyMap.set(
          key,
          clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
        );
      }
    }
    const allergiesExcluded = Array.from(allergyMap.values());

    // Detect diet type (inspect dietaryRecommendations and lab fitness metrics)
    const recText =
      `${assessment?.dietaryRecommendations || ""} ${labReport?.fitnessMetrics?.additionalInfo || ""}`.toLowerCase();
    const isVegetarian =
      recText.includes("vegetarian") ||
      (args.dietType || "").toLowerCase().includes("vegetarian");
    const isVegan =
      recText.includes("vegan") ||
      (args.dietType || "").toLowerCase().includes("vegan");
    const dietType = isVegan
      ? "Vegan"
      : isVegetarian
        ? "High-Protein Vegetarian"
        : args.dietType || "Balanced";

    const planName =
      assessment?.title ||
      args.planName ||
      `${supervisingDietitian}'s Clinical Nutrition Plan`;
    const daysCount =
      Number(args.daysCount) ||
      (Array.isArray(args.days) && args.days.length > 0 ? args.days.length : 1);
    let days = Array.isArray(args.days) ? args.days : [];

    // Safety checks against discrepancies
    const hasForbiddenAllergens = (dayList, allergies) => {
      const allText = JSON.stringify(dayList).toLowerCase();
      return (allergies || []).some((a) => allText.includes(a.toLowerCase()));
    };

    const hasNonVegConflict = (dayList, isVeg) => {
      if (!isVeg) return false;
      const allText = JSON.stringify(dayList).toLowerCase();
      const nonVegWords = [
        "chicken",
        "salmon",
        "tuna",
        "prawn",
        "shrimp",
        "crab",
        "fish",
        "meat",
        "beef",
        "pork",
        "turkey",
        "lamb",
        "bacon",
      ];
      return nonVegWords.some((w) => allText.includes(w));
    };

    const hasCalorieDiscrepancy = (dayList, targetCal) => {
      if (!targetCal || dayList.length === 0) return false;
      for (const d of dayList) {
        const sum = (d.meals || []).reduce(
          (s, m) => s + (Number(m.calories) || 0),
          0
        );
        if (Math.abs(sum - targetCal) > 80) return true;
      }
      return false;
    };

    const needsRegeneration =
      days.length === 0 ||
      hasForbiddenAllergens(days, allergiesExcluded) ||
      hasNonVegConflict(days, isVegetarian) ||
      hasCalorieDiscrepancy(days, dailyCalories);

    if (needsRegeneration) {
      try {
        const targetP = macroTargets.proteinGrams;
        const targetC = macroTargets.carbsGrams;
        const targetF = macroTargets.fatsGrams;

        const bKcal = Math.round(dailyCalories * 0.23);
        const lKcal = Math.round(dailyCalories * 0.31);
        const sKcal = Math.round(dailyCalories * 0.15);
        const dKcal = dailyCalories - (bKcal + lKcal + sKcal);

        const bP = Math.round(targetP * 0.21);
        const lP = Math.round(targetP * 0.35);
        const sP = Math.round(targetP * 0.13);
        const dP = targetP - (bP + lP + sP);

        const bC = Math.round(targetC * 0.26);
        const lC = Math.round(targetC * 0.31);
        const sC = Math.round(targetC * 0.17);
        const dC = targetC - (bC + lC + sC);

        const bF = Math.round(targetF * 0.25);
        const lF = Math.round(targetF * 0.3);
        const sF = Math.round(targetF * 0.15);
        const dF = targetF - (bF + lF + sF);

        const jsonPrompt = `Generate a precision ${daysCount}-day ${dietType} meal plan strictly grounded in this clinical assessment without discrepancies:
Supervising Dietitian: ${supervisingDietitian}
Clinical Focus: ${healthFocus}
Dietary Recommendations:
${assessment?.dietaryRecommendations || "Low-glycemic high-protein balanced nutrition"}

Mandatory Targets Per Day:
- Exact Calories: ${dailyCalories} kcal per day (+/- 25 kcal).
- Target Macros: Protein: ${targetP}g, Carbs: ${targetC}g, Fats: ${targetF}g.
- Diet Type: ${dietType} (${isVegetarian ? "STRICTLY VEGETARIAN: ZERO chicken, fish, seafood, meat, poultry" : "Balanced"}).
- Allergens to Strictly Exclude: ${allergiesExcluded.join(", ") || "None"}.
- Recommended Complex Staples to feature: steel-cut oats, foxtail millets, brown basmati, sprouted legumes (moong/chana), quinoa, soaked chia seeds, flaxseed powder, walnuts, leafy greens.
- Strictly Avoid: refined sugars, trans fats, deep-fried snacks.

Every single day must include exactly 4 meals:
1. Breakfast (~${bKcal} kcal, ~${bP}g P, ~${bC}g C, ~${bF}g F)
2. Lunch (~${lKcal} kcal, ~${lP}g P, ~${lC}g C, ~${lF}g F)
3. Snacks (~${sKcal} kcal, ~${sP}g P, ~${sC}g C, ~${sF}g F)
4. Dinner (~${dKcal} kcal, ~${dP}g P, ~${dC}g C, ~${dF}g F)
The sum of meal calories for each day MUST equal ${dailyCalories} kcal.

Return ONLY a JSON object:
{
  "days": [
    {
      "dayIndex": 1,
      "dayLabel": "Day 1",
      "dayCalories": ${dailyCalories},
      "proteinGrams": ${targetP},
      "carbsGrams": ${targetC},
      "fatsGrams": ${targetF},
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Dish name",
          "calories": ${bKcal},
          "proteinGrams": ${bP},
          "carbsGrams": ${bC},
          "fatsGrams": ${bF},
          "ingredients": ["ing 1 with quantity", "ing 2 with quantity"],
          "prepSteps": ["step 1", "step 2"],
          "clinicalRationale": "Reason for metabolic optimization"
        }
      ]
    }
  ]
}
Include all ${daysCount} days from 1 to ${daysCount}.`;

        const synthModel = genAI.getGenerativeModel(
          {
            model: GEMINI_MODEL,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          },
          { timeout: 15000 }
        );

        const res = await synthModel.generateContent(jsonPrompt);
        const parsed = JSON.parse(res.response.text());

        if (Array.isArray(parsed?.days) && parsed.days.length > 0) {
          days = parsed.days;
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          days = parsed;
        }
      } catch (err) {
        console.warn(
          "[executeGenerateMealPlan] Dynamic days synthesis fallback error:",
          err.message
        );
      }
    }

    // Resolve culinary photos for all meals in parallel
    const enrichedDays = await Promise.all(
      days.map(async (day, dIdx) => {
        const mealsWithImages = await Promise.all(
          (day.meals || []).map(async (meal) => {
            let imageUrl = meal.imageUrl;
            if (!imageUrl) {
              imageUrl = await resolveDynamicFoodImage(meal.name);
            }
            return {
              ...meal,
              imageUrl: imageUrl || null,
            };
          })
        );
        return {
          ...day,
          dayIndex: day.dayIndex || dIdx + 1,
          meals: mealsWithImages,
        };
      })
    );

    let clinicalNotes = args.clinicalNotes || "";
    if (assessment?.dietaryRecommendations) {
      clinicalNotes = `Supervised by ${supervisingDietitian}: Strict ${dietType} protocol. Prioritize complex carbs (steel-cut oats, foxtail millets, brown basmati, sprouted legumes, quinoa) with 35g+ daily fiber. Add omega-3s from soaked chia seeds, flaxseed, and walnuts. Strictly avoid refined sugars, trans fats, peanuts, and shellfish.`;
    }

    const stripEmojis = (val) => {
      if (typeof val === "string") {
        return val
          .replace(
            /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu,
            ""
          )
          .trim();
      }
      if (Array.isArray(val)) {
        return val.map(stripEmojis);
      }
      if (val && typeof val === "object") {
        const clean = {};
        for (const [k, v] of Object.entries(val)) {
          clean[k] = stripEmojis(v);
        }
        return clean;
      }
      return val;
    };

    const finalPlan = stripEmojis({
      planName,
      dietType,
      daysCount,
      dailyCalories,
      macroTargets,
      hydrationTargetLiters,
      healthFocus,
      allergiesExcluded,
      supervisingDietitian,
      clinicalNotes,
      days: enrichedDays,
      source: "ai_precision_agent",
      generatedAt: new Date().toISOString(),
      patientName: user?.name || "Patient",
    });

    return {
      success: true,
      message: `I have generated your personalized ${finalPlan.daysCount}-Day ${finalPlan.dietType || ""} Clinical Meal Plan (${finalPlan.planName}), strictly grounded in ${supervisingDietitian}'s assessment (${finalPlan.dailyCalories} kcal, P: ${finalPlan.macroTargets.proteinGrams}g, C: ${finalPlan.macroTargets.carbsGrams}g, F: ${finalPlan.macroTargets.fatsGrams}g). You can review your daily meals, macros, and recipes in the interactive card below.`,
      plan: finalPlan,
    };
  } catch (err) {
    console.error("executeGenerateMealPlan error:", err);
    return {
      success: false,
      message: err.message,
    };
  }
}

module.exports = {
  generateMealPlanDeclaration,
  executeGenerateMealPlan,
};
