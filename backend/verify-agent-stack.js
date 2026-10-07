require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");

async function main() {
  console.log("==================================================");
  console.log("NUTRIAGENT & RAG / MCP FULL SYSTEM AUDIT");
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
    "src/agent/langgraph/graph.js",
    "src/agent/langgraph/index.js",
    "src/agent/langgraph/nodes.js",
    "src/agent/langgraph/state.js",
    "src/agent/langgraph/tools.js",
    "src/agent/mcp/mcp-server.js",
    "src/agent/mcp/mcp-transport-sse.js",
    "src/agent/services/attentionAnalyzer.js",
    "src/agent/services/ragRetriever.js",
    "src/agent/services/specialistService.js",
    "src/agent/services/userResolver.js",
    "src/agent/tools/booking.tool.js",
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

  // 2. TOOL DEFINITIONS & REGISTRY AUDIT
  console.log("\n--- 2. Tool Registry & Schema Declarations Audit ---");
  try {
    const { TOOL_DEFINITIONS, GEMINI_TOOL_DECLARATIONS, executeLangGraphTool } = require("./src/agent/langgraph/tools");
    const expectedTools = [
      "search_dietitians",
      "check_dietitian_availability",
      "get_user_schedule",
      "book_dietitian_appointment",
      "lookup_nutrition",
      "generate_meal_plan",
    ];

    const registeredKeys = Object.keys(TOOL_DEFINITIONS);
    const hasAllTools = expectedTools.every((t) => registeredKeys.includes(t));
    report("All 6 tools present in TOOL_DEFINITIONS", hasAllTools, registeredKeys.join(", "));

    const declaredNames = GEMINI_TOOL_DECLARATIONS.map((d) => d.name);
    const hasAllDeclarations = expectedTools.every((t) => declaredNames.includes(t));
    report("All 6 declarations present in GEMINI_TOOL_DECLARATIONS", hasAllDeclarations, declaredNames.join(", "));

    // Test nutritional lookup directly via tool execution
    const nutritionResult = await executeLangGraphTool("lookup_nutrition", {
      foodItem: "boiled egg",
      quantity: "2 whole",
    });
    report(
      "Direct Tool Execution: lookup_nutrition (2 boiled eggs)",
      nutritionResult.success && nutritionResult.data?.calories > 0,
      `Calories: ${nutritionResult.data?.calories} kcal, Protein: ${nutritionResult.data?.protein}g`
    );
  } catch (err) {
    report("Tool Registry Audit", false, err.message);
  }

  // 3. MCP SERVER & PROTOCOL AUDIT
  console.log("\n--- 3. MCP Server & Protocol Compliance Audit ---");
  try {
    const { createNutriConnectMCPServer } = require("./src/agent/mcp/mcp-server");
    const { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

    const mcpServer = createNutriConnectMCPServer();
    report("createNutriConnectMCPServer instance initialization", !!mcpServer);

    // Test ListTools
    const listToolsHandler = mcpServer._requestHandlers?.get(ListToolsRequestSchema.shape.method.value);
    if (listToolsHandler) {
      const listToolsResponse = await listToolsHandler({ method: "tools/list" });
      const toolCount = listToolsResponse?.tools?.length || 0;
      report(
        "MCP ListTools Request",
        toolCount === 6,
        `Returned ${toolCount} tools: ${listToolsResponse.tools.map((t) => t.name).join(", ")}`
      );
    } else {
      report("MCP ListTools handler lookup", false, "Handler not found in server registry");
    }

    // Test CallTool via MCP handler
    const callToolHandler = mcpServer._requestHandlers?.get(CallToolRequestSchema.shape.method.value);
    if (callToolHandler) {
      const callToolResponse = await callToolHandler({
        method: "tools/call",
        params: {
          name: "lookup_nutrition",
          arguments: { foodItem: "banana", quantity: "1 medium" },
        },
      });
      const content = callToolResponse?.content?.[0]?.text;
      const parsed = content ? JSON.parse(content) : null;
      report(
        "MCP CallTool Request (lookup_nutrition: banana)",
        !callToolResponse?.isError && parsed?.success,
        `Result: ${parsed?.message}`
      );
    } else {
      report("MCP CallTool handler lookup", false, "Handler not found in server registry");
    }

    // Test ListResources
    const listResourcesHandler = mcpServer._requestHandlers?.get(ListResourcesRequestSchema.shape.method.value);
    if (listResourcesHandler) {
      const listResourcesResponse = await listResourcesHandler({ method: "resources/list" });
      const resCount = listResourcesResponse?.resources?.length || 0;
      report("MCP ListResources Request", resCount >= 2, `Resources: ${listResourcesResponse.resources.map((r) => r.uri).join(", ")}`);
    } else {
      report("MCP ListResources handler lookup", false, "Handler not found in server registry");
    }
  } catch (err) {
    report("MCP Server Audit", false, err.message);
  }

  // 4. RAG RETRIEVER AUDIT
  console.log("\n--- 4. Clinical RAG Retriever Audit ---");
  try {
    const { retrieveRAGContext } = require("./src/agent/services/ragRetriever");
    // Test unauthenticated/empty context handling
    const emptyRAG = await retrieveRAGContext("my lab reports", {}, []);
    report(
      "retrieveRAGContext safe fallback on missing userId",
      emptyRAG.contextText === "" && Array.isArray(emptyRAG.cards) && emptyRAG.cards.length === 0,
      "Returned empty context safely without crashing"
    );

    // If connected to DB, test with a dummy or real lookup
    if (process.env.MONGODB_URL && mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL);
    }

    if (mongoose.connection.readyState === 1) {
      report("MongoDB Connection for RAG", true, "Connected to MongoDB successfully");
      const { User } = require("./src/models/userModel");
      const sampleUser = await User.findOne({}).lean();
      if (sampleUser) {
        const userRAG = await retrieveRAGContext("show my health summary", { userId: sampleUser._id.toString() }, []);
        report(
          `retrieveRAGContext live database lookup (User: ${sampleUser.name || sampleUser._id})`,
          true,
          `Tools executed: [${(userRAG.toolsExecuted || []).join(", ")}], Context Length: ${userRAG.contextText.length} chars`
        );
      }
    } else {
      report("MongoDB Connection for RAG", false, "Database not connected; skipped live DB retrieval");
    }
  } catch (err) {
    report("RAG Retriever Audit", false, err.message);
  }

  // 5. INTENT ANALYZER AUDIT
  console.log("\n--- 5. Query Attention & Intent Analyzer Audit ---");
  try {
    const { analyzeQueryAttention } = require("./src/agent/services/attentionAnalyzer");

    const tests = [
      { q: "Book an appointment with Dr. Arjun Reddy tomorrow at 10:00 AM", expected: "APPOINTMENT_BOOKING" },
      { q: "Show my consultations and schedule for this week", expected: "PATIENT_SCHEDULE" },
      { q: "Is Dr. Arjun Reddy available tomorrow?", expected: "SCHEDULE_AVAILABILITY" },
      { q: "Find verified female dietitians for PCOS under 700 rs", expected: "SPECIALIST_SEARCH" },
      { q: "How many calories and protein in 100g chicken breast?", expected: "NUTRITION_LOOKUP" },
      { q: "Generate a 3-day meal plan for diabetes", expected: "MEAL_PLAN" },
      { q: "what is a school", expected: "GENERAL_HEALTH" },
      { q: "what is a tumor", expected: "GENERAL_HEALTH" },
    ];

    for (const t of tests) {
      const res = analyzeQueryAttention(t.q);
      const isOk = res.primaryIntent === t.expected;
      report(`Intent Analyzer: "${t.q.substring(0, 40)}..."`, isOk, `Detected: ${res.primaryIntent} (Expected: ${t.expected})`);
    }
  } catch (err) {
    report("Intent Analyzer Audit", false, err.message);
  }

  // 6. LANGGRAPH AGENT LIVE EXECUTION AUDIT
  console.log("\n--- 6. LangGraph Agent Live Execution Audit ---");
  try {
    const { runLangGraphAgent } = require("./src/agent/langgraph");

    // Test A: In-Domain Medical Explanation ("what is a tumor")
    console.log("Executing live query: 'what is a tumor'...");
    const tumorRes = await runLangGraphAgent("what is a tumor", [], {});
    const answeredTumor =
      tumorRes.reply &&
      /tumor|lump|growth|cells/i.test(tumorRes.reply) &&
      !/cannot assist with non-health/i.test(tumorRes.reply);
    report("In-Domain Medical Query ('what is a tumor')", answeredTumor, `Response length: ${tumorRes.reply.length} chars`);

    // Test B: Out-of-Domain Refusal ("what is a school")
    console.log("Executing live query: 'what is a school'...");
    const schoolRes = await runLangGraphAgent("what is a school", [], {});
    const refusedSchool =
      schoolRes.reply &&
      /only assist with|specialized in|cannot assist with|health, nutrition/i.test(schoolRes.reply) &&
      !/is an educational institution designed to provide learning/i.test(schoolRes.reply);
    report("Out-of-Domain Refusal ('what is a school')", refusedSchool, `Response: ${schoolRes.reply.substring(0, 100)}...`);

    // Test C: Nutrition calculation query
    console.log("Executing live query: 'How many calories in 200g Greek yogurt?'...");
    const nutritionRes = await runLangGraphAgent("How many calories in 200g Greek yogurt?", [], {});
    const hasNutrition =
      nutritionRes.reply &&
      /calories|protein|yogurt/i.test(nutritionRes.reply);
    report("Nutrition Query ('How many calories in 200g Greek yogurt?')", hasNutrition, `Response length: ${nutritionRes.reply.length} chars`);
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
