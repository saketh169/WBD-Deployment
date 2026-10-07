const mongoose = require("mongoose");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const {
  GEMINI_TOOL_DECLARATIONS,
  executeLangGraphTool,
} = require("../langgraph/tools");

const CLINICAL_RESOURCES = {
  "clinical://guidelines": {
    name: "NutriConnect Clinical Guidelines & Safety Standards",
    description:
      "Evidence-based protocols, zero pharmaceutical prescription boundaries, and safety constraints.",
    text: `# NutriConnect Clinical Guidelines & Boundaries\n\n1. Strictly prohibited from prescribing pharmaceutical medications (metformin, insulin dosages, statins).\n2. All dietary plans must honor verified biomarkers (HbA1c, fasting glucose, lipid panels).\n3. Complete daily coverage: Breakfast, Lunch, Snacks, Dinner must all be accounted for.\n4. Consultation bookings are pending until secured via payment checkout.`,
  },
  "clinical://registry-info": {
    name: "NutriConnect Accredited Specialist Registry",
    description:
      "Overview of verified clinical nutrition practitioners, specialties, and fee schedules.",
    text: `# Accredited Specialist Registry\n\nAll practitioners on NutriConnect have completed clinical credential verification and maintain accredited licenses in Dietetics, Clinical Nutrition, and Endocrinology Support.`,
  },
};

/**
 * Create and configure the NutriConnect MCP Server instance
 */
function createNutriConnectMCPServer(userId = null) {
  const server = new Server(
    { name: "nutriconnect-clinical-mcp", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  // Helper to convert uppercase Gemini types to standard JSON Schema types
  function toStandardJsonSchema(schema) {
    if (!schema || typeof schema !== "object") return schema;
    const copy = Array.isArray(schema) ? [...schema] : { ...schema };
    if (typeof copy.type === "string") {
      const t = copy.type.toUpperCase();
      if (t === "STRING") copy.type = "string";
      else if (t === "NUMBER") copy.type = "number";
      else if (t === "INTEGER") copy.type = "integer";
      else if (t === "BOOLEAN") copy.type = "boolean";
      else if (t === "ARRAY") copy.type = "array";
      else if (t === "OBJECT") copy.type = "object";
      else copy.type = copy.type.toLowerCase();
    }
    if (copy.properties && typeof copy.properties === "object") {
      const convertedProps = {};
      for (const [k, v] of Object.entries(copy.properties)) {
        convertedProps[k] = toStandardJsonSchema(v);
      }
      copy.properties = convertedProps;
    }
    if (copy.items && typeof copy.items === "object") {
      copy.items = toStandardJsonSchema(copy.items);
    }
    return copy;
  }

  // 1. MCP Tools Listing - mapped dynamically from LangGraph tool declarations
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = GEMINI_TOOL_DECLARATIONS.map((d) => ({
      name: d.name,
      description: d.description,
      inputSchema: {
        type: "object",
        properties: toStandardJsonSchema(d.parameters?.properties || {}),
        required: d.parameters?.required || [],
      },
    }));
    return { tools };
  });

  // 2. MCP Tool Execution with authenticated context
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeLangGraphTool(name, args || {}, { userId });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Tool execution failed: ${err.message}` },
        ],
        isError: true,
      };
    }
  });

  // 3. MCP Clinical Resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = Object.entries(CLINICAL_RESOURCES).map(([uri, res]) => ({
      uri,
      name: res.name,
      description: res.description,
      mimeType: "text/markdown",
    }));
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const res = CLINICAL_RESOURCES[uri];
    if (!res) throw new Error(`Resource ${uri} not found.`);
    return {
      contents: [{ uri, mimeType: "text/markdown", text: res.text }],
    };
  });

  return server;
}

// Standalone CLI Stdio execution for MCP hosts
async function runStdioServer() {
  require("dotenv").config({
    path: require("path").join(__dirname, "..", "..", "..", ".env"),
  });
  if (process.env.MONGODB_URL && mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URL);
  }

  const server = createNutriConnectMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    "[MCP] NutriConnect Clinical MCP Server listening via stdio transport."
  );
}

if (require.main === module) {
  runStdioServer().catch((err) => {
    console.error("[MCP Fatal Error]:", err);
    process.exit(1);
  });
}

module.exports = {
  createNutriConnectMCPServer,
  runStdioServer,
};
