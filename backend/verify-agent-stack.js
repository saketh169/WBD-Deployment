require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");

async function main() {
  console.log("==================================================");
  console.log("NUTRIAGENT GENAI AGENT & MCP STACK AUDIT");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function report(name, isSuccess, details = "") {
    if (isSuccess) {
      passed++;
      console.log(`[PASS] ${name}${details ? ` -> ${details}` : ""}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ""}`);
    }
  }

  // 1. FILE EXISTENCE & SYNTAX AUDIT
  console.log("\n--- 1. File Module & Require Integrity Check ---");
  const agentFiles = [
    "src/agent/config.js",
    "src/agent/index.js",
    "src/agent/guardrails.js",
    "src/agent/apis/apiClient.js",
    "src/agent/apis/specialist.api.js",
    "src/agent/apis/schedule.api.js",
    "src/agent/apis/booking.api.js",
    "src/agent/apis/nutrition.api.js",
    "src/agent/apis/mealPlan.api.js",
    "src/agent/langgraph/graph.js",
    "src/agent/langgraph/index.js",
    "src/agent/langgraph/nodes.js",
    "src/agent/langgraph/state.js",
    "src/agent/langgraph/tools.js",
    "src/agent/mcp/mcp-server.js",
    "src/agent/mcp/mcp-transport-sse.js",
    "src/agent/services/agentContextLoader.js",
    "src/agent/services/presentationFormatter.js",
    "src/agent/services/userResolver.js",
    "src/agent/tools/booking.tool.js",
    "src/agent/tools/healthReports.tool.js",
    "src/agent/tools/mealPlan.tool.js",
    "src/agent/tools/nutrition.tool.js",
    "src/agent/tools/schedule.tool.js",
    "src/agent/tools/searchDietitians.tool.js",
    "src/agent/utils/dateUtils.js",
  ];

  for (const relPath of agentFiles) {
    try {
      const fullPath = path.join(__dirname, relPath);
      require(fullPath);
      report(`Require ${relPath}`, true);
    } catch (err) {
      report(`Require ${relPath}`, false, err.message);
    }
  }

  // 2. DEDICATED TOOL APIS AUDIT
  console.log("\n--- 2. Dedicated Customizable APIs Audit ---");
  try {
    const { findDietitiansApi } = require("./src/agent/apis/specialist.api");
    const { lookupNutritionApi } = require("./src/agent/apis/nutrition.api");
    const { executeGetUserHealthReports } = require("./src/agent/tools/healthReports.tool");
    const { generateMealPlanApi } = require("./src/agent/apis/mealPlan.api");

    // Test Nutrition API (external USDA or fallback)
    const nutResult = await lookupNutritionApi({ foodItem: "paneer", quantity: "100g" });
    report(
      "Dedicated API: lookupNutritionApi (100g paneer)",
      nutResult.success && nutResult.data?.calories > 0,
      `Calories: ${nutResult.data?.calories} kcal, Protein: ${nutResult.data?.protein}g`
    );

    // Test Health Reports Tool
    const reportsResult = await executeGetUserHealthReports(
      { reportType: "all", limit: 3 },
      { userId: null }
    );
    report(
      "Dedicated Tool: executeGetUserHealthReports",
      reportsResult.success !== undefined,
      `Result message: ${reportsResult.message}`
    );

    // Test Meal Plan API
    const mealPlanResult = await generateMealPlanApi({
      targetCalories: 2000,
      dietType: "Vegetarian",
      healthConditions: ["Diabetes"],
      durationDays: 1,
    });
    report(
      "Dedicated API: generateMealPlanApi",
      mealPlanResult.success && mealPlanResult.plan?.dailyCalories > 0,
      `Plan Type: ${mealPlanResult.plan?.dietType}, Calories: ${mealPlanResult.plan?.dailyCalories}`
    );

    // Connect DB for specialist and scheduling APIs
    if (process.env.MONGODB_URL && mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL);
    }

    if (mongoose.connection.readyState === 1) {
      const specResult = await findDietitiansApi({ specialtyOrCondition: "Diabetes" });
      report(
        "Dedicated API: findDietitiansApi (Diabetes)",
        specResult.success && specResult.count > 0,
        `Found ${specResult.count} verified specialist(s)`
      );
    }
  } catch (err) {
    report("Dedicated Tool APIs Audit", false, err.message);
  }

  // 3. TOOL REGISTRY & DECLARATIONS AUDIT
  console.log("\n--- 3. Tool Registry & Declarations Audit ---");
  try {
    const { TOOL_DEFINITIONS, GEMINI_TOOL_DECLARATIONS, executeLangGraphTool } = require("./src/agent/langgraph/tools");
    const expectedTools = [
      "search_dietitians",
      "check_dietitian_availability",
      "get_user_schedule",
      "book_dietitian_appointment",
      "lookup_nutrition",
      "generate_meal_plan",
      "get_user_health_reports",
    ];

    const registeredKeys = Object.keys(TOOL_DEFINITIONS);
    const hasAllTools = expectedTools.every((t) => registeredKeys.includes(t));
    report("All 7 tools present in TOOL_DEFINITIONS", hasAllTools, registeredKeys.join(", "));

    const declaredNames = GEMINI_TOOL_DECLARATIONS.map((d) => d.name);
    const hasAllDeclarations = expectedTools.every((t) => declaredNames.includes(t));
    report("All 7 declarations present in GEMINI_TOOL_DECLARATIONS", hasAllDeclarations, declaredNames.join(", "));
  } catch (err) {
    report("Tool Registry Audit", false, err.message);
  }

  // 4. MCP SERVER PROTOCOL AUDIT
  console.log("\n--- 4. MCP Server & Protocol Compliance Audit ---");
  try {
    const { createNutriConnectMCPServer } = require("./src/agent/mcp/mcp-server");
    const { ListToolsRequestSchema, CallToolRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

    const mcpServer = createNutriConnectMCPServer();
    report("createNutriConnectMCPServer instance initialization", !!mcpServer);

    const listToolsHandler = mcpServer._requestHandlers?.get(ListToolsRequestSchema.shape.method.value);
    if (listToolsHandler) {
      const listToolsResponse = await listToolsHandler({ method: "tools/list" });
      const toolCount = listToolsResponse?.tools?.length || 0;
      report(
        "MCP ListTools Request",
        toolCount >= 7,
        `Returned ${toolCount} tools: ${listToolsResponse.tools.map((t) => t.name).join(", ")}`
      );
    }

    const callToolHandler = mcpServer._requestHandlers?.get(CallToolRequestSchema.shape.method.value);
    if (callToolHandler) {
      const callToolResponse = await callToolHandler({
        method: "tools/call",
        params: {
          name: "lookup_nutrition",
          arguments: { foodItem: "paneer", quantity: "100g" },
        },
      });
      const content = callToolResponse?.content?.[0]?.text;
      const parsed = content ? JSON.parse(content) : null;
      report(
        "MCP CallTool Request (lookup_nutrition)",
        !callToolResponse?.isError && parsed?.success,
        `Result: ${parsed?.message}`
      );
    }
  } catch (err) {
    report("MCP Server Audit", false, err.message);
  }

  // 5. CONTEXT INGESTION AUDIT
  console.log("\n--- 5. Direct Clinical Context Ingestion Audit ---");
  try {
    const { loadAgentPatientContext } = require("./src/agent/services/agentContextLoader");
    const emptyCtx = await loadAgentPatientContext(null);
    report(
      "loadAgentPatientContext safe handling of unauthenticated guest",
      emptyCtx.patientProfile === null && (emptyCtx.clinicalContextText === "" || emptyCtx.contextText === ""),
      "Handled null userId gracefully"
    );
  } catch (err) {
    report("Context Ingestion Audit", false, err.message);
  }

  // 6. LANGGRAPH AGENT LIVE EXECUTION AUDIT
  console.log("\n--- 6. LangGraph Agent Live Execution Audit ---");
  try {
    const { runLangGraphAgent } = require("./src/agent/langgraph");

    console.log("Executing live query: 'what is a tumor'...");
    const tumorRes = await runLangGraphAgent("what is a tumor", [], {});
    const lowerTumor = tumorRes.reply ? tumorRes.reply.toLowerCase() : "";
    const answeredTumor =
      tumorRes.reply &&
      (lowerTumor.includes("tumor") || lowerTumor.includes("cells") || lowerTumor.includes("tissue")) &&
      !lowerTumor.includes("cannot assist with non-health");
    report("In-Domain Medical Query ('what is a tumor')", answeredTumor, `Response length: ${tumorRes.reply.length} chars`);

    console.log("Executing live query: 'what is a school'...");
    const schoolRes = await runLangGraphAgent("what is a school", [], {});
    const lowerSchool = schoolRes.reply ? schoolRes.reply.toLowerCase() : "";
    const refusedSchool =
      schoolRes.reply &&
      (lowerSchool.includes("health") || lowerSchool.includes("nutrition") || lowerSchool.includes("cannot assist")) &&
      !lowerSchool.includes("is an educational institution");
    report("Out-of-Domain Refusal ('what is a school')", refusedSchool, `Response: ${schoolRes.reply.substring(0, 100)}...`);
  } catch (err) {
    report("LangGraph Agent Live Execution", false, err.message);
  }

  console.log("\n==================================================");
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal audit crash:", err);
  process.exit(1);
});
