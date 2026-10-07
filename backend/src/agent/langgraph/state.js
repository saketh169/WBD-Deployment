const { Annotation } = require("@langchain/langgraph");

/**
 * AgentState definition for NutriAgent's LangGraph architecture.
 * Channels track conversational messages, clinical grounding context,
 * executed tool identifiers, UI artifact cards, and booking/payment details.
 */
const AgentState = Annotation.Root({
  // Conversational messages history (uses latest validated history snapshot without duplication)
  messages: Annotation({
    reducer: (x, y) => (y && y.length > 0 ? y : x),
    default: () => [],
  }),

  // Current patient input message
  userQuery: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Patient user ID for clinical record resolution
  userId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Authenticated UserAuth ID
  authUserId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Verified clinical health profile (lab reports, biomarkers, allergies, dietitian notes)
  patientProfile: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Grounding context retrieved from specialist registry and clinical records
  groundingContext: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Array of executed tool names across all nodes
  toolsExecuted: Annotation({
    reducer: (x, y) => Array.from(new Set([...(x || []), ...(y || [])])),
    default: () => [],
  }),

  // Tool calls emitted by reasoning node
  toolCalls: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Unprocessed text from LLM response
  rawReply: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Execution results from tool node
  toolResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Interactive UI cards to be rendered on the client
  cards: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // Active payment and checkout payload for consultation booking (resets each turn)
  openPaymentDetails: Annotation({
    reducer: (x, y) => (y !== undefined ? y : null),
    default: () => null,
  }),

  // Final synthesized response message for the patient
  finalReply: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Optional uploaded clinical document (PDF/Image) for multimodal analysis
  file: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

module.exports = {
  AgentState,
};
