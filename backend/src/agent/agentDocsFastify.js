const Fastify = require("fastify");

/**
 * NutriAgent Fastify Swagger Documentation Module
 * Generates and serves dedicated OpenAPI / Swagger UI for NutriAgent AI & MCP
 * within the same Node.js server process without spawning separate ports or servers.
 */
async function createAgentDocsHandler() {
  const fastify = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        strict: false,
      },
    },
  });

  await fastify.register(require("@fastify/swagger"), {
    openapi: {
      info: {
        title: "NutriAgent Clinical AI & MCP Documentation (Powered by Fastify)",
        description:
          "Dedicated API & Tooling documentation for NutriAgent LangGraph Clinical Assistant and Model Context Protocol (MCP) SSE Transport. Generated with schema validation via Fastify.",
        version: "1.0.0",
        contact: {
          name: "NutriConnect AI Team",
          email: "support@nutriconnect.com",
        },
      },
      servers: [
        {
          url: "http://localhost:5000",
          description: "Local Development Server",
        },
        {
          url:
            process.env.PRODUCTION_URL ||
            "https://nutri-connect-wbd-backend.vercel.app",
          description: "Production Server",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT Authorization header using Bearer token",
          },
        },
      },
      tags: [
        {
          name: "NutriAgent AI",
          description: "Conversational Clinical AI Assistant endpoints",
        },
        {
          name: "Consultation Sessions",
          description: "Patient consultation history management",
        },
        {
          name: "Model Context Protocol (MCP)",
          description: "Standards-based MCP SSE and JSON-RPC tool endpoints",
        },
      ],
    },
  });

  await fastify.register(require("@fastify/swagger-ui"), {
    routePrefix: "/api/agent/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });

  // 1. POST /api/agent/chat
  fastify.post(
    "/api/agent/chat",
    {
      schema: {
        tags: ["NutriAgent AI"],
        summary: "Interact with NutriAgent Clinical Assistant",
        description:
          "Sends a consultation query or attached lab document to the LangGraph clinical reasoning engine.",
        security: [{ BearerAuth: [] }],
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              description: "User inquiry or clinical question",
              example:
                "Find verified dietitians specializing in PCOS and insulin resistance",
            },
            sessionId: {
              type: "string",
              nullable: true,
              description: "Optional existing session ID to resume conversation",
            },
            history: {
              type: "array",
              description: "Optional recent message history for multi-turn context",
              items: { type: "object" },
            },
            file: {
              type: "object",
              nullable: true,
              description: "Optional attached document (lab report, diet chart)",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                base64: { type: "string" },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            description: "Agent response with reasoning and interactive cards",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              cards: { type: "array", items: { type: "object" } },
              sessionId: { type: "string" },
              toolsExecuted: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    async () => ({ success: true })
  );

  // 2. GET /api/agent/sessions
  fastify.get(
    "/api/agent/sessions",
    {
      schema: {
        tags: ["Consultation Sessions"],
        summary: "Retrieve past consultation sessions",
        description:
          "Returns all consultation sessions and message previews for the authenticated user.",
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              sessions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sessionId: { type: "string" },
                    title: { type: "string" },
                    messageCount: { type: "integer" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                    preview: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async () => ({ success: true, sessions: [] })
  );

  // 3. GET /api/agent/session/:sessionId
  fastify.get(
    "/api/agent/session/:sessionId",
    {
      schema: {
        tags: ["Consultation Sessions"],
        summary: "Retrieve full consultation session history",
        description:
          "Fetches complete message logs, reasoning steps, and clinical cards for a specific session.",
        security: [{ BearerAuth: [] }],
        params: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string", description: "Unique session ID" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              session: {
                type: "object",
                properties: {
                  sessionId: { type: "string" },
                  title: { type: "string" },
                  createdAt: { type: "string" },
                  updatedAt: { type: "string" },
                  messages: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
    async () => ({ success: true })
  );

  // 4. POST /api/agent/session/:sessionId/message
  fastify.post(
    "/api/agent/session/:sessionId/message",
    {
      schema: {
        tags: ["Consultation Sessions"],
        summary: "Append message to consultation session",
        description: "Appends and saves a message into session history.",
        security: [{ BearerAuth: [] }],
        params: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "object",
              properties: {
                content: { type: "string" },
                type: { type: "string", enum: ["user", "bot"] },
                cards: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({ success: true })
  );

  // 5. DELETE /api/agent/session/:sessionId
  fastify.delete(
    "/api/agent/session/:sessionId",
    {
      schema: {
        tags: ["Consultation Sessions"],
        summary: "Delete a consultation session",
        description:
          "Permanently deletes a consultation session and its message logs.",
        security: [{ BearerAuth: [] }],
        params: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({ success: true })
  );

  // 6. DELETE /api/agent/sessions/clear
  fastify.delete(
    "/api/agent/sessions/clear",
    {
      schema: {
        tags: ["Consultation Sessions"],
        summary: "Clear all consultation sessions",
        description:
          "Permanently clears all consultation sessions for the authenticated user.",
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({ success: true })
  );

  // 7. GET /api/agent/mcp/sse
  fastify.get(
    "/api/agent/mcp/sse",
    {
      schema: {
        tags: ["Model Context Protocol (MCP)"],
        summary: "Establish MCP Server-Sent Events (SSE) Stream",
        description:
          "Establishes a persistent SSE stream for Model Context Protocol hosts (Claude Desktop, Cursor IDE, Antigravity, MCP Inspector). Exposes 6 clinical tools.",
        security: [{ BearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "Optional JWT token to bind session to patient profile",
            },
          },
        },
      },
    },
    async () => ({ status: "sse_stream" })
  );

  // 8. POST /api/agent/mcp/messages
  fastify.post(
    "/api/agent/mcp/messages",
    {
      schema: {
        tags: ["Model Context Protocol (MCP)"],
        summary: "Submit JSON-RPC message to MCP session",
        description:
          "Receives JSON-RPC 2.0 messages (e.g., tools/list, tools/call) keyed by sessionId.",
        security: [{ BearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: {
              type: "string",
              description: "Active MCP session ID from SSE handshake",
            },
          },
        },
        body: {
          type: "object",
          required: ["jsonrpc", "method"],
          properties: {
            jsonrpc: { type: "string", example: "2.0" },
            id: { type: "integer", example: 1 },
            method: { type: "string", example: "tools/call" },
            params: { type: "object" },
          },
        },
      },
    },
    async () => ({ jsonrpc: "2.0" })
  );

  await fastify.ready();
  return fastify;
}

module.exports = { createAgentDocsHandler };
