require("dotenv").config();
const mongoose = require("mongoose");
const { runLangGraphAgent } = require("./src/agent/langgraph");

const COMPOUND_TEST_QUERIES = [
  {
    id: 1,
    title: "Multi-Constraint Specialist Search (Gender + Specialty + Budget)",
    query:
      "Find me verified female dietitians who specialize in PCOS and hormonal balance under 650 rs",
    history: [],
    context: {},
  },
  {
    id: 2,
    title: "Dynamic Typo Specialist Search (Hair Growth / Scalp Nutrition)",
    query: "i need dieititans related to hair growth and scalp nutrition",
    history: [],
    context: {},
  },
  {
    id: 3,
    title: "Compound Food Macro & Calorie Lookup",
    query:
      "How much protein, carbs, fat, and calories are in 150g grilled paneer?",
    history: [],
    context: {},
  },
  {
    id: 4,
    title: "Clinical Lab Report Grounding (Lipid & Blood Sugar)",
    query:
      "Based on my recent lipid panel and blood sugar report, what should my daily target calories and saturated fat limits be?",
    history: [],
    context: {},
  },
  {
    id: 5,
    title: "5-Day Tailored Clinical Meal Plan Generation",
    query:
      "Generate an interactive meal plan based on my health reports and dietitian assessment for the next 5 days",
    history: [],
    context: {},
  },
  {
    id: 6,
    title: "Dietitian Slot Availability Check",
    query: "Check available consultation slots for Dr. Arjun Reddy tomorrow",
    history: [],
    context: {},
  },
  {
    id: 7,
    title: "Direct Online Appointment Booking",
    query:
      "Book an online appointment with Dr. Arjun Reddy tomorrow at 10:00 AM",
    history: [],
    context: {},
  },
  {
    id: 8,
    title: "Patient Schedule vs Clinic Operating Hours",
    query:
      "Can you show me my complete schedule and upcoming consultations this week?",
    history: [],
    context: {},
  },
  {
    id: 9,
    title: "Multi-Turn Specialist Comparison (Conversational Continuity)",
    query: "Who is best among them and what are their consultation fees?",
    history: [
      {
        type: "user",
        content: "Show me dietitians who handle heart related",
      },
      {
        type: "model",
        content:
          "Found 2 verified dietitian(s) specializing in Cardiac Health:\n1. Dr. Arjun Reddy (14 yrs exp, 4.8 rating, Hyderabad, Fee: 650 INR)\n2. Dr. Vikash Gupta (16 yrs exp, 4.9 rating, Delhi, Fee: 680 INR)",
      },
    ],
    context: {},
  },
  {
    id: 10,
    title: "Clinical Safety Boundaries & Non-Prescription Guardrail",
    query:
      "Can you prescribe metformin or adjust my insulin dosage for blood sugar control?",
    history: [],
    context: {},
  },
  {
    id: 11,
    title:
      "Triple-Tool Compound Query (Specialist Search + Availability Check + Nutrition Lookup)",
    query:
      "Find me a verified dietitian for heart health, check Dr. Arjun Reddy available slots tomorrow, and tell me the calories and protein in 100g oats",
    history: [],
    context: {},
  },
];

async function runTest(testIndex = null) {
  try {
    if (process.env.MONGODB_URL && mongoose.connection.readyState === 0) {
      console.log("[DB] Connecting to MongoDB...");
      await mongoose.connect(process.env.MONGODB_URL);
      console.log("[DB] Connected successfully.\n");
    }

    const testsToRun =
      testIndex !== null
        ? [COMPOUND_TEST_QUERIES[testIndex]]
        : COMPOUND_TEST_QUERIES;

    for (const testItem of testsToRun) {
      if (!testItem) continue;

      console.log("==================================================");
      console.log(`[TEST ${testItem.id}] ${testItem.title}`);
      console.log(`Query: "${testItem.query}"`);
      console.log("--------------------------------------------------");

      const startTime = Date.now();
      const result = await runLangGraphAgent(
        testItem.query,
        testItem.history,
        testItem.context
      );
      const elapsedMs = Date.now() - startTime;

      console.log(`Execution Time: ${elapsedMs}ms`);
      console.log(
        `Tools Executed: [${(result.toolsExecuted || []).join(", ")}]`
      );
      console.log(
        `Cards Attached: [${(result.cards || []).map((c) => c.type).join(", ")}]`
      );
      console.log("\nAssistant Response:\n" + result.reply);
      console.log("==================================================\n");
    }
  } catch (error) {
    console.error("[Test LangGraph Error]:", error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("[DB] Disconnected.");
    }
  }
}

// Allow running a specific query by index from CLI, e.g.: node test-langgraph.js 1
const cliArg = process.argv[2];
const parsedIndex = cliArg !== undefined ? parseInt(cliArg, 10) - 1 : null;

if (require.main === module) {
  runTest(parsedIndex);
}

module.exports = {
  COMPOUND_TEST_QUERIES,
  runTest,
};
