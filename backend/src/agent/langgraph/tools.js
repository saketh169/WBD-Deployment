const { z } = require("zod");
const {
  searchDietitiansDeclaration,
  executeSearchDietitians,
} = require("../tools/searchDietitians.tool");
const {
  checkAvailabilityDeclaration,
  executeCheckDietitianAvailability,
  getUserScheduleDeclaration,
  executeGetUserSchedule,
} = require("../tools/schedule.tool");
const {
  bookDietitianAppointmentDeclaration,
  executeBookDietitianAppointment,
} = require("../tools/booking.tool");
const {
  lookupNutritionDeclaration,
  executeLookupNutrition,
} = require("../tools/nutrition.tool");
const {
  generateMealPlanDeclaration,
  executeGenerateMealPlan,
} = require("../tools/mealPlan.tool");

/**
 * Zod input schemas for validation and type-safety within LangGraph
 */
const SearchDietitiansSchema = z
  .object({
    specialtyOrCondition: z
      .string()
      .optional()
      .describe("Health condition, wellness goal, or clinical specialty"),
    gender: z
      .enum(["male", "female", "any"])
      .optional()
      .describe("Gender filter for the dietitian"),
    maxFee: z.number().optional().describe("Maximum consultation fee in INR"),
    name: z
      .string()
      .optional()
      .describe("Name or partial name of a specific dietitian"),
    limit: z
      .number()
      .optional()
      .describe("Number of verified dietitians to return"),
  })
  .passthrough();

const CheckAvailabilitySchema = z
  .object({
    dietitianName: z
      .string()
      .describe("Name of the dietitian or doctor to check"),
    date: z
      .string()
      .optional()
      .describe("Optional date to inspect in YYYY-MM-DD format"),
  })
  .passthrough();

const GetUserScheduleSchema = z
  .object({
    date: z
      .string()
      .optional()
      .describe(
        "Optional date to filter (e.g. today, tomorrow, or YYYY-MM-DD)"
      ),
  })
  .passthrough();

const BookDietitianAppointmentSchema = z
  .object({
    dietitianName: z
      .string()
      .describe("Name of the dietitian (e.g. Dr. Zara Ahmed)"),
    date: z.string().describe("Date in YYYY-MM-DD format"),
    time: z.string().describe("Time slot in HH:MM format (e.g. 12:30)"),
    consultationType: z
      .enum(["Online", "In-person"])
      .optional()
      .default("Online")
      .describe("Consultation mode"),
  })
  .passthrough();

const LookupNutritionSchema = z
  .object({
    foodItem: z.string().describe("Name of the single food item or ingredient"),
    quantity: z
      .string()
      .optional()
      .describe("Optional portion or quantity (e.g. 100g, 1 cup)"),
  })
  .passthrough();

const GenerateMealPlanSchema = z
  .object({
    planName: z.string().optional().describe("Clinical title of the plan"),
    dietType: z.string().optional().describe("Dietary classification"),
    daysCount: z.number().optional().describe("Total number of days"),
    durationDays: z.number().optional().describe("Duration in days"),
    dailyCalories: z.number().optional().describe("Target daily calories"),
    macroTargets: z.any().optional().describe("Macronutrient targets"),
    hydrationTargetLiters: z
      .number()
      .optional()
      .describe("Daily water target in liters"),
    healthFocus: z.string().optional().describe("Clinical focus"),
    allergiesExcluded: z
      .array(z.string())
      .optional()
      .describe("Excluded allergens"),
    supervisingDietitian: z
      .string()
      .optional()
      .describe("Supervising dietitian name"),
    clinicalNotes: z.string().optional().describe("Clinical notes"),
    days: z
      .array(z.any())
      .optional()
      .describe("Scheduled days with planned meals"),
  })
  .passthrough();

/**
 * Unified Tool Registry for LangGraph Nodes
 */
const TOOL_DEFINITIONS = {
  search_dietitians: {
    name: "search_dietitians",
    declaration: searchDietitiansDeclaration,
    schema: SearchDietitiansSchema,
    execute: executeSearchDietitians,
  },
  check_dietitian_availability: {
    name: "check_dietitian_availability",
    declaration: checkAvailabilityDeclaration,
    schema: CheckAvailabilitySchema,
    execute: executeCheckDietitianAvailability,
  },
  get_user_schedule: {
    name: "get_user_schedule",
    declaration: getUserScheduleDeclaration,
    schema: GetUserScheduleSchema,
    execute: executeGetUserSchedule,
  },
  book_dietitian_appointment: {
    name: "book_dietitian_appointment",
    declaration: bookDietitianAppointmentDeclaration,
    schema: BookDietitianAppointmentSchema,
    execute: executeBookDietitianAppointment,
  },
  lookup_nutrition: {
    name: "lookup_nutrition",
    declaration: lookupNutritionDeclaration,
    schema: LookupNutritionSchema,
    execute: executeLookupNutrition,
  },
  generate_meal_plan: {
    name: "generate_meal_plan",
    declaration: generateMealPlanDeclaration,
    schema: GenerateMealPlanSchema,
    execute: executeGenerateMealPlan,
  },
};

/**
 * Declarations array to bind to Gemini in reasoningNode
 */
const GEMINI_TOOL_DECLARATIONS = [
  searchDietitiansDeclaration,
  checkAvailabilityDeclaration,
  getUserScheduleDeclaration,
  bookDietitianAppointmentDeclaration,
  lookupNutritionDeclaration,
  generateMealPlanDeclaration,
];

/**
 * Execute a specific tool by name within LangGraph tool node
 */
async function executeLangGraphTool(toolName, args, context = {}) {
  const toolDef = TOOL_DEFINITIONS[toolName];
  if (!toolDef) {
    return {
      success: false,
      message: `Tool "${toolName}" is not registered in the agent registry.`,
      cards: [],
    };
  }

  // Parse and validate arguments against Zod schema without discarding nested structures
  const parsedArgs = toolDef.schema
    ? toolDef.schema.safeParse(args || {})
    : { success: false };
  const cleanArgs = parsedArgs.success
    ? { ...(args || {}), ...parsedArgs.data }
    : args || {};

  // Execute specialist registry discovery
  if (toolName === "search_dietitians") {
    const res = await toolDef.execute(cleanArgs, context);
    const cards = [];
    if (res.success && res.dietitians?.length) {
      cards.push({ type: "dietitian_cards", data: res.dietitians });
    }
    return {
      success: res.success,
      message: res.message,
      data: res.dietitians,
      cards,
    };
  }

  // Inspect specialist 7-day schedule and slot availability
  if (toolName === "check_dietitian_availability") {
    const res = await toolDef.execute(cleanArgs, context);
    const cards = [];
    if (res.success && res.card) {
      cards.push(res.card);
    }
    return {
      success: res.success,
      message: res.message,
      data: res.dailySchedules,
      cards,
    };
  }

  // Inspect logged-in patient consultation schedule and appointments
  if (toolName === "get_user_schedule") {
    const res = await toolDef.execute(cleanArgs, context);
    const cards = [];
    if (res.success && res.card) {
      cards.push(res.card);
    }
    return {
      success: res.success,
      message: res.message,
      data: res.bookings,
      cards,
    };
  }

  // Validate and initiate consultation appointment booking
  if (toolName === "book_dietitian_appointment") {
    const res = await toolDef.execute(cleanArgs, context);
    const cards = [];
    if (res.success && res.booking) {
      cards.push({ type: "booking_confirmation_card", data: res.booking });
    }
    return {
      success: res.success,
      message: res.message,
      openPayment: res.openPayment || false,
      paymentDetails: res.paymentDetails || null,
      cards,
    };
  }

  // Query USDA FoodData Central for macronutrients
  if (toolName === "lookup_nutrition") {
    const res = await toolDef.execute(cleanArgs);
    const cards = [];
    if (res.success && res.card) {
      cards.push(res.card);
    }
    return {
      success: res.success,
      message: res.message,
      nutrients: res.nutrients,
      data: res.nutrients,
      cards,
    };
  }

  // Formulate tailored clinical meal plan with culinary recipes
  if (toolName === "generate_meal_plan") {
    const res = await toolDef.execute(cleanArgs, context);
    const cards = [];
    if (res.success && res.plan) {
      cards.push({ type: "meal_plan_card", data: res.plan });
    }
    return {
      success: res.success,
      message:
        res.message ||
        `Generated clinical meal plan (${res.plan?.planName || ""}).`,
      plan: res.plan,
      cards,
    };
  }

  return { success: false, message: "Unrecognized tool execution.", cards: [] };
}

module.exports = {
  TOOL_DEFINITIONS,
  GEMINI_TOOL_DECLARATIONS,
  executeLangGraphTool,
};
