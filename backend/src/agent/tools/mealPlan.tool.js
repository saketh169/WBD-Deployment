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

    // 1. Resolve core parameters dynamically from tool arguments or clinical records
    const planName =
      args.planName ||
      (assessment?.title ? `${assessment.title}` : "Personalized Nutrition Plan");
    const qText = (context.userQuery || "").toLowerCase();

    let dietType = args.dietType;
    if (!dietType) {
      if (
        qText.includes("non-veg") ||
        qText.includes("non veg") ||
        qText.includes("chicken") ||
        qText.includes("meat")
      ) {
        dietType = "Non-Vegetarian";
      } else if (qText.includes("vegan")) {
        dietType = "Vegan";
      } else if (qText.includes("vegetarian") || qText.includes("veg")) {
        dietType = "Vegetarian";
      } else {
        dietType = "Balanced";
      }
    }

    const daysCount =
      Number(args.daysCount) ||
      (Array.isArray(args.days) && args.days.length > 0 ? args.days.length : 1);

    const baseCal = Number(assessment?.targetCalories) || 2000;
    let dailyCalories = Number(args.dailyCalories);
    if (!dailyCalories) {
      if (qText.includes("weight gain") || qText.includes("gain weight")) {
        dailyCalories = baseCal + 400;
      } else if (qText.includes("weight loss") || qText.includes("lose weight")) {
        dailyCalories = Math.max(1500, baseCal - 400);
      } else {
        dailyCalories = baseCal;
      }
    }

    const macroTargets = args.macroTargets || assessment?.targetMacros || {
      proteinGrams: Math.round((dailyCalories * 0.25) / 4),
      carbsGrams: Math.round((dailyCalories * 0.50) / 4),
      fatsGrams: Math.round((dailyCalories * 0.25) / 9),
    };

    const hydrationTargetLiters =
      Number(args.hydrationTargetLiters) ||
      Number(assessment?.targetHydrationLiters) ||
      2.5;

    let healthFocus = args.healthFocus;
    if (!healthFocus) {
      let queryGoal = null;
      if (qText.includes("hair")) queryGoal = "Hair growth support";
      else if (qText.includes("weight gain") || qText.includes("gain weight"))
        queryGoal = "Healthy weight gain";
      else if (qText.includes("weight loss") || qText.includes("lose weight"))
        queryGoal = "Weight management";
      else if (qText.includes("pcos")) queryGoal = "PCOS hormonal balance";
      else if (qText.includes("diabetes") || qText.includes("sugar"))
        queryGoal = "Glycemic control";

      if (queryGoal && assessment?.diagnosis) {
        healthFocus = `${queryGoal} combined with ${assessment.diagnosis}`;
      } else if (queryGoal) {
        healthFocus = queryGoal;
      } else {
        healthFocus = assessment?.diagnosis || "Personalized Health & Wellness";
      }
    }

    // Deduplicate and combine allergy exclusions
    const rawAllergies = [
      ...(assessment?.allergies || []),
      ...(args.allergiesExcluded || []),
    ].filter(Boolean);
    const allergiesExcluded = Array.from(
      new Set(rawAllergies.map((a) => String(a).trim()))
    ).filter(Boolean);

    const supervisingDietitian =
      args.supervisingDietitian ||
      assessment?.dietitianName ||
      "Clinical Nutrition Specialist";
    const clinicalNotes =
      args.clinicalNotes || assessment?.dietaryRecommendations || "";

    let days =
      Array.isArray(args.days) && args.days.length > 0 ? args.days : [];

    // 2. If Gemini did not supply complete day objects in tool call, synthesize dynamically
    if (days.length === 0) {
      try {
        const synthModel = genAI.getGenerativeModel(
          {
            model: GEMINI_MODEL,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
            },
          },
          { timeout: 15000 }
        );

        const jsonPrompt = `Generate a realistic ${daysCount}-day ${dietType} meal plan matching these exact nutritional targets:
- Plan Name: ${planName}
- Health Focus: ${healthFocus}
- Target Daily Calories: ${dailyCalories} kcal
- Target Macros: Protein: ${macroTargets.proteinGrams}g, Carbs: ${macroTargets.carbsGrams}g, Fats: ${macroTargets.fatsGrams}g
- Allergies to Exclude: ${allergiesExcluded.join(", ") || "None"}
- Clinical Guidance: ${clinicalNotes || "Balanced, nutrient-dense whole foods"}

Each day must have 4 meals: Breakfast, Lunch, Snacks, Dinner.
The sum of meal calories per day must equal approximately ${dailyCalories} kcal.

Return ONLY a valid JSON object with schema:
{
  "days": [
    {
      "dayIndex": 1,
      "dayLabel": "Day 1",
      "dayCalories": ${dailyCalories},
      "proteinGrams": ${macroTargets.proteinGrams},
      "carbsGrams": ${macroTargets.carbsGrams},
      "fatsGrams": ${macroTargets.fatsGrams},
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Authentic dish name",
          "calories": number,
          "proteinGrams": number,
          "carbsGrams": number,
          "fatsGrams": number,
          "ingredients": ["ingredient with portion"],
          "prepSteps": ["step 1", "step 2"]
        }
      ]
    }
  ]
}`;

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

    // 3. Resolve dynamic food images via TheMealDB & Wikipedia
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

    const stripEmojis = (val) => {
      if (typeof val === "string") {
        return val
          .replace(
            /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu,
            ""
          )
          .trim();
      }
      if (Array.isArray(val)) return val.map(stripEmojis);
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
      message: `Generated ${finalPlan.daysCount}-Day ${finalPlan.dietType} Plan for ${finalPlan.healthFocus} (${finalPlan.dailyCalories} kcal: ${finalPlan.macroTargets.proteinGrams}g Protein, ${finalPlan.macroTargets.carbsGrams}g Carbs, ${finalPlan.macroTargets.fatsGrams}g Fats).`,
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
