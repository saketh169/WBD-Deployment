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
const {
  getUserHealthReportsDeclaration,
  executeGetUserHealthReports,
} = require("../tools/healthReports.tool");

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
      .describe("Optional date to filter (e.g. today, tomorrow, or YYYY-MM-DD)"),
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
    durationDays: z.number().optional().describe("Duration in days"),
    dailyCalories: z.number().optional().describe("Target daily calories"),
    macroTargets: z.any().optional().describe("Macronutrient targets"),
    healthFocus: z.string().optional().describe("Clinical focus"),
    allergiesExcluded: z
      .array(z.string())
      .optional()
      .describe("Excluded allergens"),
    clinicalNotes: z.string().optional().describe("Clinical notes"),
  })
  .passthrough();

const GetUserHealthReportsSchema = z
  .object({
    reportType: z
      .enum(["all", "health", "lab"])
      .optional()
      .describe("Type of report to retrieve: 'health', 'lab', or 'all'"),
    date: z
      .string()
      .optional()
      .describe("Optional date filter (YYYY-MM-DD)"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of reports to retrieve"),
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
  get_user_health_reports: {
    name: "get_user_health_reports",
    declaration: getUserHealthReportsDeclaration,
    schema: GetUserHealthReportsSchema,
    execute: executeGetUserHealthReports,
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
  getUserHealthReportsDeclaration,
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

  let cleanArgs = args || {};
  if (toolDef.schema) {
    const parsedArgs = toolDef.schema.safeParse(args || {});
    if (!parsedArgs.success) {
      const issueDetails = parsedArgs.error.issues
        .map((issue) => `${issue.path.join(".") || "parameter"}: ${issue.message}`)
        .join("; ");
      return {
        success: false,
        message: `Validation failed for tool "${toolName}": ${issueDetails}`,
        cards: [],
      };
    }
    cleanArgs = { ...(args || {}), ...parsedArgs.data };
  }

  try {
    const result = await toolDef.execute(cleanArgs, context);
    return {
      ...result,
      success: result?.success !== false,
      message: result?.message || `Executed ${toolName} successfully.`,
      cards: Array.isArray(result?.cards) ? result.cards : [],
      data: result?.data || result?.dietitians || result?.plan || null,
      openPayment: result?.openPayment || false,
      paymentDetails: result?.paymentDetails || null,
    };
  } catch (err) {
    console.error(`[executeLangGraphTool Error in ${toolName}]:`, err);
    return {
      success: false,
      message: `Execution of ${toolName} encountered an error: ${err.message}`,
      cards: [],
    };
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  GEMINI_TOOL_DECLARATIONS,
  executeLangGraphTool,
};
