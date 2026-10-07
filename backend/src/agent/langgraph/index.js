const { nutriAgentGraph } = require("./graph");

/**
 * High-level invocation entrypoint for the NutriAgent LangGraph workflow.
 *
 * @param {string} userMessage - Patient prompt
 * @param {Array} history - Previous messages
 * @param {Object} context - Session and patient metadata (e.g. userId, sessionId, authUserId)
 * @param {Object|null} file - Optional uploaded lab report or medical document
 * @returns {Promise<Object>} { reply, toolsExecuted, cards, openPaymentDetails }
 */
async function runLangGraphAgent(
  userMessage,
  history = [],
  context = {},
  file = null
) {
  const cards = [];
  const toolsExecuted = [];

  if (file?.base64 && file?.type) {
    toolsExecuted.push("document_analysis");
    cards.unshift({
      type: "uploaded_document_card",
      data: {
        name: file.name || "Medical Document",
        type: file.type,
        size: file.size,
      },
    });
  }

  const threadId = context?.sessionId
    ? `sess_${context.sessionId}`
    : context?.userId
      ? `user_${context.userId}`
      : `thread_${Date.now()}`;

  const initialState = {
    userQuery:
      userMessage?.trim() ||
      (file ? "Analyze this medical document for my diet." : ""),
    userId: context?.userId || null,
    authUserId: context?.authUserId || null,
    messages: history || [],
    cards,
    toolsExecuted,
    openPaymentDetails: null,
    clinicalContextText: "",
    patientProfile: null,
    identifiedOperation: null,
    requiredParameters: {},
    toolCalls: [],
    toolResults: [],
    rawReply: "",
    finalReply: "",
    executionStatus: "idle",
    file: file || null,
  };

  const finalState = await nutriAgentGraph.invoke(initialState, {
    configurable: {
      thread_id: threadId,
    },
  });

  return {
    reply: finalState.finalReply,
    toolsExecuted: finalState.toolsExecuted || [],
    cards: finalState.cards || [],
    openPaymentDetails: finalState.openPaymentDetails || null,
  };
}

module.exports = {
  runLangGraphAgent,
  nutriAgentGraph,
};
