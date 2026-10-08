const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");
const { createNutriConnectMCPServer } = require("./mcp-server");

// Active transports keyed by session/connection ID
const activeTransports = new Map();

/**
 * Handle GET /api/agent/mcp/sse - Establishes SSE stream for MCP client
 */
async function handleMCPSSE(req, res) {
  try {
    const userId =
      req.user?.roleId ||
      req.user?.userId ||
      req.user?.id ||
      req.user?._id ||
      null;
    const server = createNutriConnectMCPServer(userId);
    const transport = new SSEServerTransport("/api/agent/mcp/messages", res);
    const sessionId = transport.sessionId;

    activeTransports.set(sessionId, {
      server,
      transport,
      userId: userId ? String(userId) : null,
    });

    transport.onclose = () => {
      activeTransports.delete(sessionId);
    };

    await server.connect(transport);
  } catch (err) {
    console.error("[MCP SSE Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to establish MCP SSE connection.",
      });
    }
  }
}

/**
 * Handle POST /api/agent/mcp/messages - Receives client JSON-RPC messages
 */
async function handleMCPMessages(req, res) {
  try {
    const sessionId = req.query.sessionId;
    if (!sessionId || !activeTransports.has(sessionId)) {
      return res.status(400).json({
        success: false,
        message:
          "Active MCP session not found. Please connect to /api/agent/mcp/sse first.",
      });
    }

    const sessionData = activeTransports.get(sessionId);
    const callerUserId =
      req.user?.roleId ||
      req.user?.userId ||
      req.user?.id ||
      req.user?._id ||
      null;
    const normalizedCallerId = callerUserId ? String(callerUserId) : null;

    if (sessionData.userId && sessionData.userId !== normalizedCallerId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have ownership of this MCP session.",
      });
    }

    const { transport } = sessionData;
    await transport.handlePostMessage(req, res, req.body);
  } catch (err) {
    console.error("[MCP Message Error]:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ success: false, message: "Failed to handle MCP message." });
    }
  }
}

module.exports = {
  handleMCPSSE,
  handleMCPMessages,
};
