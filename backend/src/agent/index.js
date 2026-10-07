const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { runLangGraphAgent } = require("./langgraph");
const { ChatHistory } = require("../models/agentModel");
const { User, UserAuth } = require("../models/userModel");
const { checkAgentLimit } = require("../middlewares/subscriptionMiddleware");
const {
  authenticateJWT,
  optionalAuthenticateJWT,
} = require("../middlewares/authMiddleware");
const { handleMCPSSE, handleMCPMessages } = require("./mcp/mcp-transport-sse");

const { to24Hour, parseRelativeDate } = require("./utils/dateUtils");

/**
 * Generate a clean, readable consultation session title from first user query
 */
function generateSessionTitle(prompt, file) {
  if (file?.name) {
    return `Doc: ${file.name.substring(0, 30)}`;
  }
  if (!prompt || typeof prompt !== "string") return "Consultation Session";
  const clean = prompt.split(" ").filter(Boolean).join(" ").trim();
  if (clean.length <= 42) return clean;
  return clean.substring(0, 39) + "...";
}

/**
 * Resolve user ObjectId for ChatHistory storage
 */
async function resolveStorageUserId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) return null;

  // Check if it's already a User or UserAuth ID
  const auth = await UserAuth.findById(userId).lean();
  if (auth) return auth._id;

  const user = await User.findById(userId).lean();
  if (user) {
    // If it's a User ID, try finding corresponding UserAuth, or use user._id
    const userAuth = await UserAuth.findOne({ roleId: user._id }).lean();
    return userAuth ? userAuth._id : user._id;
  }

  return new mongoose.Types.ObjectId(userId);
}

function getAuthUserId(req) {
  return (
    req.user?.userId ||
    req.user?.roleId ||
    req.user?.id ||
    req.user?._id ||
    null
  );
}

function getUserQueryFilter(req, storageUserId) {
  const ids = new Set();
  if (storageUserId) ids.add(storageUserId.toString());
  if (req.user?.userId && mongoose.isValidObjectId(req.user.userId))
    ids.add(req.user.userId.toString());
  if (req.user?.roleId && mongoose.isValidObjectId(req.user.roleId))
    ids.add(req.user.roleId.toString());
  if (req.user?.id && mongoose.isValidObjectId(req.user.id))
    ids.add(req.user.id.toString());
  if (req.user?._id && mongoose.isValidObjectId(req.user._id))
    ids.add(req.user._id.toString());

  const objectIds = Array.from(ids).map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  return objectIds.length > 0 ? { $in: objectIds } : null;
}

const to24 = (t) => to24Hour(t);

const toDate = (d) => parseRelativeDate(d) || (d ? String(d).split("T")[0] : "");

function cleanDoctorName(name) {
  return (name || "")
    .toLowerCase()
    .replace("dr.", "")
    .replace("dr", "")
    .trim();
}

function applyBookingToMessageCards(messages, b) {
  if (!Array.isArray(messages) || !b) return messages;
  const bt = to24(b.time);
  const bd = toDate(b.date);
  if (!bt || !bd) return messages;
  const bDoc = cleanDoctorName(b.dietitianName);
  const bId = String(b.dietitianId || "");

  messages.forEach((msg) => {
    if (!Array.isArray(msg.cards)) return;
    msg.cards.forEach((c) => {
      if (c.type !== "slot_booking_card" || !c.data?.dailySchedules) return;
      const cDoc = cleanDoctorName(c.data.dietitian?.name);
      const cId = String(c.data.dietitian?.id || c.data.dietitian?._id || "");
      const isSame =
        (bId && cId && bId === cId) ||
        (bDoc &&
          cDoc &&
          (bDoc === cDoc || cDoc.includes(bDoc) || bDoc.includes(cDoc)));

      c.data.dailySchedules.forEach((day) => {
        if (toDate(day.date) !== bd) return;
        const booked = (day.bookedSlots || []).map(to24);
        const conf = (day.userConflictSlots || []).map((x) =>
          typeof x === "string"
            ? { time: to24(x), dietitianName: "Another Specialist" }
            : { ...x, time: to24(x.time) }
        );
        if (isSame && !booked.includes(bt)) booked.push(bt);
        if (!isSame && !conf.some((x) => x.time === bt))
          conf.push({
            time: bt,
            dietitianName: b.dietitianName || "Another Specialist",
          });
        day.bookedSlots = booked;
        day.userConflictSlots = conf;
        day.freeSlots = (day.freeSlots || []).filter(
          (s) =>
            !booked.includes(to24(s)) && !conf.some((x) => x.time === to24(s))
        );
        day.freeSlotsCount = day.freeSlots.length;
      });

      const activeD = toDate(
        c.data.selectedDate || c.data.dailySchedules[0]?.date
      );
      if (activeD === bd)
        c.data.availableSlots = (c.data.availableSlots || []).filter(
          (s) => to24(s) !== bt
        );
    });
  });
  return messages;
}

/**
 * POST /api/agent/chat - Primary conversation endpoint with persistent MongoDB session history
 *
 * ==============================================================================
 * SUBSCRIPTION LIMIT ENFORCEMENT:
 * Currently disabled (commented out) for development and evaluation.
 * To enforce daily subscription query limits (Free: 25/day, Basic: 40/day, Premium: 75/day, Ultimate: Unlimited):
 * SIMPLY UNCOMMENT `checkAgentLimit` in the middleware chain below:
 * ==============================================================================
 */
/**
 * @swagger
 * /api/agent/chat:
 *   post:
 *     tags: ['NutriAgent']
 *     summary: Interact with NutriAgent clinical AI assistant
 *     description: Runs clinical reasoning via LangGraph and Google Gemini with multi-tool dispatch (specialist discovery, USDA nutrition, meal planning, slot booking). Supports attached health documents.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Find verified dietitians specializing in PCOS and insulin resistance"
 *               sessionId:
 *                 type: string
 *                 nullable: true
 *                 example: "session-1710000000"
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *               file:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   base64:
 *                     type: string
 *     responses:
 *       200:
 *         description: AI response with reasoning text, interactive card payloads, and executed tool logs
 *       400:
 *         description: Message or document required
 *       401:
 *         description: Unauthorized - JWT required
 *       500:
 *         description: Internal error processing consultation query
 */
// router.post('/chat', checkAgentLimit, async (req, res) => {
router.post("/chat", authenticateJWT, async (req, res) => {
  try {
    const {
      message = "",
      history = [],
      file = null,
      sessionId = null,
    } = req.body;
    if (!message?.trim() && !file) {
      return res.status(400).json({
        success: false,
        message: "Message or attached document is required.",
      });
    }

    const authenticatedUserId = getAuthUserId(req);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);

    // Sanitize and limit client-provided conversation history
    const safeHistory = Array.isArray(history)
      ? history.slice(-20).map((m) => ({
          type:
            m.type === "bot" || m.role === "model" || m.role === "assistant"
              ? "model"
              : "user",
          content:
            typeof m.content === "string" ? m.content.substring(0, 3000) : "",
        }))
      : [];

    // Session Management & Isolation
    let currentSessionId = sessionId;
    if (currentSessionId) {
      const existingSession = await ChatHistory.findOne({
        sessionId: currentSessionId,
      }).lean();
      if (
        existingSession &&
        existingSession.userId &&
        storageUserId &&
        String(existingSession.userId) !== String(storageUserId)
      ) {
        // Prevent session IDOR/hijacking; issue fresh session
        currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
    } else {
      currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    const context = {
      userId: authenticatedUserId,
      authUserId: req.user?.userId || null,
      roleId: req.user?.roleId || null,
      sessionId: currentSessionId,
    };

    // Run NutriAgent LangGraph workflow
    const result = await runLangGraphAgent(
      message?.trim() || "",
      safeHistory,
      context,
      file
    );

    const userEntry = {
      type: "user",
      content:
        message?.trim() ||
        (file
          ? `Attached clinical document: ${file.name}`
          : "Consultation query"),
      attachedFile: file
        ? { name: file.name, type: file.type, size: file.size }
        : null,
      timestamp: new Date(),
    };

    const botEntry = {
      type: "bot",
      content:
        result.reply?.trim() ||
        "Here are the consultation details based on your request.",
      cards: result.cards || [],
      toolsExecuted: result.toolsExecuted || [],
      timestamp: new Date(),
      source: "gemini",
    };

    const userFilter = getUserQueryFilter(req, storageUserId);
    let sessionDoc = await ChatHistory.findOne({
      sessionId: currentSessionId,
      ...(userFilter
        ? { $or: [{ userId: userFilter }, { userId: null }] }
        : {}),
    });
    if (!sessionDoc) {
      const generatedTitle = generateSessionTitle(message?.trim(), file);
      sessionDoc = new ChatHistory({
        sessionId: currentSessionId,
        userId: storageUserId,
        title: generatedTitle,
        messages: [userEntry, botEntry],
      });
      await sessionDoc.save();
    } else {
      if (!sessionDoc.userId && storageUserId) {
        sessionDoc.userId = storageUserId;
      }
      sessionDoc.messages.push(userEntry);
      sessionDoc.messages.push(botEntry);
      const bookingCard = (result.cards || []).find(
        (c) => c.type === "booking_confirmation_card"
      )?.data;
      if (bookingCard) {
        applyBookingToMessageCards(sessionDoc.messages, bookingCard);
        sessionDoc.markModified("messages");
      }
      await sessionDoc.save();
    }

    return res.json({
      success: true,
      sessionId: currentSessionId,
      sessionTitle: sessionDoc.title,
      ...result,
    });
  } catch (error) {
    console.error("[NutriAgent API Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Agent request failed.",
    });
  }
});

/**
 * @swagger
 * /api/agent/sessions:
 *   get:
 *     tags: ['NutriAgent']
 *     summary: Retrieve consultation sessions list
 *     description: Fetch all past consultation sessions and conversation previews for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of consultation sessions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch consultation sessions
 */
router.get("/sessions", authenticateJWT, async (req, res) => {
  try {
    const authenticatedUserId = getAuthUserId(req);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(req, storageUserId);
    if (!userFilter) {
      return res.json({ success: true, sessions: [] });
    }

    const sessions = await ChatHistory.find({ userId: userFilter })
      .sort({ updatedAt: -1 })
      .select("sessionId title createdAt updatedAt messages")
      .lean();

    const formattedSessions = sessions.map((s) => {
      const msgs = s.messages || [];
      const lastMsg = msgs[msgs.length - 1];
      return {
        sessionId: s.sessionId,
        title: s.title || "Consultation Session",
        messageCount: msgs.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        preview: lastMsg?.content ? lastMsg.content.substring(0, 80) : "",
      };
    });

    return res.json({ success: true, sessions: formattedSessions });
  } catch (error) {
    console.error("[NutriAgent Sessions Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch consultation sessions.",
    });
  }
});

/**
 * @swagger
 * /api/agent/session/{sessionId}:
 *   get:
 *     tags: ['NutriAgent']
 *     summary: Retrieve full consultation session history
 *     description: Fetch complete message logs, reasoning steps, and clinical cards for a specific session
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique consultation session ID
 *     responses:
 *       200:
 *         description: Session details and message history
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch session history
 */
router.get("/session/:sessionId", authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const authenticatedUserId = getAuthUserId(req);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(req, storageUserId);

    const query = { sessionId };
    if (userFilter) {
      query.$or = [{ userId: userFilter }, { userId: null }];
    }

    const session = await ChatHistory.findOne(query).lean();
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }

    const messages = session.messages || [];
    const confirmationCards = messages
      .flatMap((m) => m.cards || [])
      .filter((c) => c.type === "booking_confirmation_card" && c.data)
      .map((c) => c.data);

    confirmationCards.forEach((booking) => {
      applyBookingToMessageCards(messages, booking);
    });

    return res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        title: session.title || "Consultation Session",
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages,
      },
    });
  } catch (error) {
    console.error("[NutriAgent Session History Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch session history." });
  }
});

/**
 * @swagger
 * /api/agent/session/{sessionId}/message:
 *   post:
 *     tags: ['NutriAgent']
 *     summary: Append message to consultation session
 *     description: Save user or bot message card payload into the session chat history
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: object
 *                 properties:
 *                   content:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [user, bot]
 *                   cards:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       200:
 *         description: Message appended successfully
 *       400:
 *         description: Invalid message payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to save message
 */
router.post(
  "/session/:sessionId/message",
  authenticateJWT,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;
      if (!message) {
        return res
          .status(400)
          .json({ success: false, message: "Message payload required" });
      }

      const authenticatedUserId = getAuthUserId(req);
      const storageUserId = await resolveStorageUserId(authenticatedUserId);
      const userFilter = getUserQueryFilter(req, storageUserId);

      const query = { sessionId };
      if (userFilter) {
        query.$or = [{ userId: userFilter }, { userId: null }];
      }

      let sessionDoc = await ChatHistory.findOne(query);
      if (!sessionDoc) {
        sessionDoc = new ChatHistory({
          sessionId,
          userId: storageUserId,
          title: "Consultation Session",
          messages: [],
        });
      } else if (!sessionDoc.userId && storageUserId) {
        sessionDoc.userId = storageUserId;
      }

      const bookingCard = (message.cards || []).find(
        (c) => c.type === "booking_confirmation_card"
      )?.data;
      if (bookingCard) {
        applyBookingToMessageCards(sessionDoc.messages, bookingCard);
      }

      sessionDoc.messages.push({
        type: message.type || "bot",
        content: message.content || "",
        cards: message.cards || [],
        toolsExecuted: message.toolsExecuted || [],
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
        source: message.source || "gemini",
      });

      if (bookingCard) {
        sessionDoc.markModified("messages");
      }

      await sessionDoc.save();
      return res.json({
        success: true,
        message: "Message saved to session history.",
      });
    } catch (err) {
      console.error("[NutriAgent Save Message Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * @swagger
 * /api/agent/session/{sessionId}:
 *   delete:
 *     tags: ['NutriAgent']
 *     summary: Delete a consultation session
 *     description: Permanently remove a specific consultation session and its message logs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation session ID
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to delete session
 */
router.delete("/session/:sessionId", authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const authenticatedUserId = getAuthUserId(req);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(req, storageUserId);

    const query = { sessionId };
    if (userFilter) {
      query.$or = [{ userId: userFilter }, { userId: null }];
    }

    const result = await ChatHistory.findOneAndDelete(query);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });
    }
    return res.json({
      success: true,
      message: "Consultation session deleted successfully.",
    });
  } catch (error) {
    console.error("[NutriAgent Delete Session Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete session." });
  }
});

/**
 * @swagger
 * /api/agent/sessions/clear:
 *   delete:
 *     tags: ['NutriAgent']
 *     summary: Clear all consultation sessions
 *     description: Permanently deletes all consultation session histories for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All consultation history cleared
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to clear consultation history
 */
router.delete("/sessions/clear", authenticateJWT, async (req, res) => {
  try {
    const authenticatedUserId = getAuthUserId(req);
    const storageUserId = await resolveStorageUserId(authenticatedUserId);
    const userFilter = getUserQueryFilter(req, storageUserId);

    if (userFilter) {
      await ChatHistory.deleteMany({ userId: userFilter });
    }

    return res.json({
      success: true,
      message: "All consultation history cleared.",
    });
  } catch (error) {
    console.error("[NutriAgent Clear All Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear consultation history.",
    });
  }
});

// --- Model Context Protocol (MCP) Endpoints ---
/**
 * @swagger
 * /api/agent/mcp/sse:
 *   get:
 *     tags: ['NutriAgent']
 *     summary: Establish Model Context Protocol (MCP) SSE stream
 *     description: Establishes a persistent Server-Sent Events (SSE) stream for Model Context Protocol hosts (Claude Desktop, Cursor IDE, VS Code Copilot, MCP Inspector). Provides 6 clinical tools and healthcare guidelines.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional JWT token to bind session to patient profile
 *     responses:
 *       200:
 *         description: Real-time SSE event stream initiated
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get("/mcp/sse", optionalAuthenticateJWT, handleMCPSSE);

/**
 * @swagger
 * /api/agent/mcp/messages:
 *   post:
 *     tags: ['NutriAgent']
 *     summary: Submit JSON-RPC message to MCP session
 *     description: Handles incoming JSON-RPC 2.0 messages (e.g. tools/list, tools/call) keyed by sessionId for connected MCP clients
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Active MCP session ID received from SSE handshake
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jsonrpc
 *               - method
 *             properties:
 *               jsonrpc:
 *                 type: string
 *                 example: "2.0"
 *               id:
 *                 type: integer
 *                 example: 1
 *               method:
 *                 type: string
 *                 example: "tools/call"
 *               params:
 *                 type: object
 *     responses:
 *       200:
 *         description: JSON-RPC response or accepted acknowledgement
 *       400:
 *         description: Missing sessionId or invalid JSON-RPC payload
 */
router.post("/mcp/messages", optionalAuthenticateJWT, handleMCPMessages);

module.exports = router;
