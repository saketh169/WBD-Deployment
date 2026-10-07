require("dotenv").config();
const path = require("path");
const Fastify = require("fastify");
const fastifySwagger = require("@fastify/swagger");
const fastifySwaggerUi = require("@fastify/swagger-ui");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../utils/jwtConfig");
const { runLangGraphAgent } = require("./langgraph");
const { ChatHistory } = require("../models/agentModel");
const { User, UserAuth } = require("../models/userModel");
const { handleMCPSSE, handleMCPMessages } = require("./mcp/mcp-transport-sse");

// Utility helpers
function generateSessionTitle(prompt, file) {
  if (file?.name) return `Doc: ${file.name.substring(0, 30)}`;
  if (!prompt || typeof prompt !== "string") return "Consultation Session";
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (clean.length <= 42) return clean;
  return clean.substring(0, 39) + "...";
}

async function resolveStorageUserId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) return null;
  const auth = await UserAuth.findById(userId).lean();
  if (auth) return auth._id;
  const user = await User.findById(userId).lean();
  if (user) {
    const userAuth = await UserAuth.findOne({ roleId: user._id }).lean();
    return userAuth ? userAuth._id : user._id;
  }
  return new mongoose.Types.ObjectId(userId);
}

function getAuthUserId(user) {
  return user?.userId || user?.roleId || user?.id || user?._id || null;
}

function getUserQueryFilter(user, storageUserId) {
  const ids = new Set();
  if (storageUserId) ids.add(storageUserId.toString());
  if (user?.userId && mongoose.isValidObjectId(user.userId)) ids.add(user.userId.toString());
  if (user?.roleId && mongoose.isValidObjectId(user.roleId)) ids.add(user.roleId.toString());
  if (user?.id && mongoose.isValidObjectId(user.id)) ids.add(user.id.toString());
  if (user?._id && mongoose.isValidObjectId(user._id)) ids.add(user._id.toString());
  const validArray = Array.from(ids).map((id) => new mongoose.Types.ObjectId(id));
  return validArray.length === 1 ? validArray[0] : validArray.length > 1 ? { $in: validArray } : null;
}

function applyBookingToMessageCards(messages, booking) {
  if (!Array.isArray(messages) || !booking?.dietitianId) return;
  messages.forEach((msg) => {
    if (!Array.isArray(msg.cards)) return;
    msg.cards.forEach((c) => {
      if (c.type === "slot_booking_card" && c.data) {
        const matchesDietitian =
          c.data.dietitianId === booking.dietitianId ||
          c.data.dietitian?._id === booking.dietitianId;
        const matchesDate = !booking.date || c.data.date === booking.date;
        if (matchesDietitian && matchesDate) {
          c.data.bookedStatus = true;
          c.data.bookingId = booking.bookingId || booking._id;
          c.data.bookedTime = booking.time;
          c.data.consultationType = booking.consultationType;
        }
      }
    });
  });
}

// Authentication hook for Fastify
function authenticateFastifyJWT(request, reply, done) {
  const authHeader = request.headers.authorization;
  const token = (authHeader && authHeader.split(" ")[1]) || request.query?.token;
  if (!token) {
    reply.code(401).send({ success: false, message: "No token provided" });
    return;
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      reply.code(401).send({ success: false, message: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
      return;
    }
    request.user = decoded;
    done();
  });
}

function optionalFastifyJWT(request, reply, done) {
  const authHeader = request.headers.authorization;
  const token = (authHeader && authHeader.split(" ")[1]) || request.query?.token;
  if (!token) {
    done();
    return;
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) request.user = decoded;
    done();
  });
}

async function buildFastifyAgentApp() {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    ajv: {
      customOptions: {
        strict: false
      }
    }
  });

  // Fastify OpenAPI / Swagger plugin
  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "NutriAgent Fastify AI & MCP Server",
        description: "Standalone high-throughput Fastify service for NutriAgent clinical AI reasoning, LangGraph state graph workflows, and Model Context Protocol (MCP) Server-Sent Events transport.",
        version: "1.0.0",
        contact: {
          name: "NutriConnect AI Engineering",
          email: "support@nutriconnect.com"
        }
      },
      servers: [
        { url: "http://localhost:5001", description: "Fastify NutriAgent Local Service" },
        { url: "http://localhost:5000/api/agent", description: "Express Gateway Forwarder" }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT Authorization header using Bearer format"
          }
        }
      },
      tags: [
        { name: "Clinical AI", description: "LangGraph reasoning, query dispatch, and cards" },
        { name: "Consultation Sessions", description: "Persistent session message history management" },
        { name: "MCP Protocol", description: "Model Context Protocol SSE & JSON-RPC 2.0 transport" }
      ]
    }
  });

  // Fastify Swagger UI Plugin
  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  // Health check route
  app.get("/health", {
    schema: {
      tags: ["Clinical AI"],
      summary: "NutriAgent Health Check",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            service: { type: "string" }
          }
        }
      }
    }
  }, async () => ({ status: "ok", service: "NutriAgent Fastify Server" }));

  // 1. POST /chat
  app.post("/chat", {
    preHandler: authenticateFastifyJWT,
    schema: {
      tags: ["Clinical AI"],
      summary: "Interact with NutriAgent clinical AI",
      description: "Dispatches clinical prompt through LangGraph state graph, checks patient profile context, and executes clinical function calling.",
      security: [{ BearerAuth: [] }],
      body: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", example: "Find dietitians specializing in PCOS and insulin resistance" },
          sessionId: { type: "string", nullable: true, example: "session-1710000000" },
          history: { type: "array", items: { type: "object" } },
          file: {
            type: "object",
            nullable: true,
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              base64: { type: "string" }
            }
          }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            response: { type: "string" },
            cards: { type: "array", items: { type: "object" } },
            toolsExecuted: { type: "array", items: { type: "string" } },
            sessionId: { type: "string" },
            sessionTitle: { type: "string" }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { message = "", history = [], file = null, sessionId = null } = request.body;
    if (!message?.trim() && !file) {
      return reply.code(400).send({ success: false, message: "Message or attached document is required." });
    }

    const authenticatedUserId = getAuthUserId(request.user);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const agentResult = await runLangGraphAgent(message, history, {
      userId: authenticatedUserId,
      uploadedFile: file,
      sessionId: currentSessionId
    });

    // Persist to MongoDB
    if (storageUserId) {
      try {
        let sessionDoc = await ChatHistory.findOne({ sessionId: currentSessionId, userId: storageUserId });
        if (!sessionDoc) {
          sessionDoc = new ChatHistory({
            sessionId: currentSessionId,
            userId: storageUserId,
            title: generateSessionTitle(message, file),
            messages: []
          });
        }

        sessionDoc.messages.push({
          type: "user",
          content: message,
          timestamp: new Date(),
          source: file ? "document_upload" : "chat"
        });

        sessionDoc.messages.push({
          type: "bot",
          content: agentResult.response,
          cards: agentResult.cards || [],
          toolsExecuted: agentResult.toolsExecuted || [],
          timestamp: new Date(),
          source: "gemini"
        });

        await sessionDoc.save();
      } catch (saveErr) {
        console.error("[NutriAgent Fastify Save Error]:", saveErr);
      }
    }

    return {
      success: true,
      response: agentResult.response,
      cards: agentResult.cards || [],
      toolsExecuted: agentResult.toolsExecuted || [],
      sessionId: currentSessionId,
      sessionTitle: generateSessionTitle(message, file)
    };
  });

  // 2. GET /sessions
  app.get("/sessions", {
    preHandler: authenticateFastifyJWT,
    schema: {
      tags: ["Consultation Sessions"],
      summary: "List consultation sessions",
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
                  preview: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  }, async (request) => {
    const authenticatedUserId = getAuthUserId(request.user);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(request.user, storageUserId);
    if (!userFilter) return { success: true, sessions: [] };

    const sessions = await ChatHistory.find({ userId: userFilter }).sort({ updatedAt: -1 }).select("sessionId title createdAt updatedAt messages").lean();
    return {
      success: true,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        title: s.title || "Consultation Session",
        messageCount: (s.messages || []).length,
        preview: s.messages?.[s.messages.length - 1]?.content?.substring(0, 80) || ""
      }))
    };
  });

  // 3. GET /session/:sessionId
  app.get("/session/:sessionId", {
    preHandler: authenticateFastifyJWT,
    schema: {
      tags: ["Consultation Sessions"],
      summary: "Get specific session history",
      security: [{ BearerAuth: [] }],
      params: {
        type: "object",
        required: ["sessionId"],
        properties: { sessionId: { type: "string" } }
      }
    }
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const authenticatedUserId = getAuthUserId(request.user);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(request.user, storageUserId);

    const query = { sessionId };
    if (userFilter) query.$or = [{ userId: userFilter }, { userId: null }];
    const session = await ChatHistory.findOne(query).lean();
    if (!session) return reply.code(404).send({ success: false, message: "Session not found." });

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        title: session.title || "Consultation Session",
        messages: session.messages || []
      }
    };
  });

  // 4. DELETE /session/:sessionId
  app.delete("/session/:sessionId", {
    preHandler: authenticateFastifyJWT,
    schema: {
      tags: ["Consultation Sessions"],
      summary: "Delete consultation session",
      security: [{ BearerAuth: [] }],
      params: {
        type: "object",
        required: ["sessionId"],
        properties: { sessionId: { type: "string" } }
      }
    }
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const authenticatedUserId = getAuthUserId(request.user);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(request.user, storageUserId);
    const query = { sessionId };
    if (userFilter) query.$or = [{ userId: userFilter }, { userId: null }];
    const result = await ChatHistory.findOneAndDelete(query);
    if (!result) return reply.code(404).send({ success: false, message: "Session not found." });
    return { success: true, message: "Consultation session deleted." };
  });

  // 5. DELETE /sessions/clear
  app.delete("/sessions/clear", {
    preHandler: authenticateFastifyJWT,
    schema: {
      tags: ["Consultation Sessions"],
      summary: "Clear all consultation sessions",
      security: [{ BearerAuth: [] }]
    }
  }, async (request) => {
    const authenticatedUserId = getAuthUserId(request.user);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(request.user, storageUserId);
    if (userFilter) await ChatHistory.deleteMany({ userId: userFilter });
    return { success: true, message: "All consultation history cleared." };
  });

  // 6. GET /mcp/sse
  app.get("/mcp/sse", {
    preHandler: optionalFastifyJWT,
    schema: {
      tags: ["MCP Protocol"],
      summary: "Model Context Protocol SSE Stream",
      description: "Persistent Server-Sent Events stream for external agents (Antigravity, Claude Desktop, Cursor, Copilot).",
      security: [{ BearerAuth: [] }],
      querystring: {
        type: "object",
        properties: { token: { type: "string", description: "Optional patient session JWT" } }
      }
    }
  }, (request, reply) => {
    handleMCPSSE(request.raw, reply.raw);
  });

  // 7. POST /mcp/messages
  app.post("/mcp/messages", {
    preHandler: optionalFastifyJWT,
    schema: {
      tags: ["MCP Protocol"],
      summary: "Submit JSON-RPC message to MCP session",
      security: [{ BearerAuth: [] }],
      querystring: {
        type: "object",
        required: ["sessionId"],
        properties: { sessionId: { type: "string" } }
      }
    }
  }, (request, reply) => {
    handleMCPMessages(request.raw, reply.raw);
  });

  return app;
}

// Standalone runner
async function start() {
  const mongoUri = process.env.MONGODB_URL || "mongodb://localhost:27017/NutriConnect";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log("[Fastify Agent] Connected to MongoDB");
  }

  const app = await buildFastifyAgentApp();
  const port = parseInt(process.env.AGENT_PORT || "5001", 10);
  const host = "0.0.0.0";

  await app.listen({ port, host });
  console.log(`[Fastify Agent Server] Running on http://localhost:${port}`);
  console.log(`[Fastify Agent Swagger UI] Live at http://localhost:${port}/docs`);
}

if (require.main === module) {
  start().catch((err) => {
    console.error("[Fastify Agent Startup Error]:", err);
    process.exit(1);
  });
}

module.exports = { buildFastifyAgentApp, start };
