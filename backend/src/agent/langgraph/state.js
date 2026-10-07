const { Annotation } = require("@langchain/langgraph");

/**
 * AgentState definition for NutriAgent's LangGraph architecture.
 * Channels track conversational messages, patient clinical context,
 * Gemini-identified operations, tool calls, tool results, and UI artifact cards.
 */
const AgentState = Annotation.Root({
  // Patient's natural-language input query
  userQuery: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Patient user ID for profile and record resolution
  userId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Authenticated UserAuth ID
  authUserId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Conversational message history
  messages: Annotation({
    reducer: (x, y) => (y && y.length > 0 ? y : x),
    default: () => [],
  }),

  // Optional attached clinical document
  file: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Verified clinical health profile loaded by agentContextLoader
  patientProfile: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Formatted clinical context string for LLM grounding
  clinicalContextText: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Identified operation and intent determined by Gemini
  identifiedOperation: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Extracted parameters identified during understanding
  requiredParameters: Annotation({
    reducer: (x, y) => ({ ...(x || {}), ...(y || {}) }),
    default: () => ({}),
  }),

  // Structured tool calls emitted by Gemini
  toolCalls: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Tool execution results from tool APIs
  toolResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Unique list of tool names executed across graph nodes
  toolsExecuted: Annotation({
    reducer: (x, y) => Array.from(new Set([...(x || []), ...(y || [])])),
    default: () => [],
  }),

  // Interactive UI artifact cards for frontend rendering
  cards: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Active Razorpay checkout details
  openPaymentDetails: Annotation({
    reducer: (x, y) => (y !== undefined ? y : null),
    default: () => null,
  }),

  // Raw text emitted by Gemini
  rawReply: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Synthesized patient-facing reply text
  finalReply: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Lifecycle execution status
  executionStatus: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "idle",
  }),
});

module.exports = {
  AgentState,
};
