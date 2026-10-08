const { StateGraph, START, END, MemorySaver } = require("@langchain/langgraph");
const { AgentState } = require("./state");
const {
  contextIngestionNode,
  reasoningNode,
  toolNode,
  synthesisNode,
} = require("./nodes");

const MAX_REASONING_LOOPS = 2;

/**
 * Conditional router after reasoning:
 * Routes to tool_execution if Gemini identified tool actions, else straight to synthesis.
 */
function routeAfterReasoning(state) {
  if (state.toolCalls && state.toolCalls.length > 0) {
    return "tool_execution";
  }
  return "synthesis";
}

const TERMINAL_TOOLS = new Set([
  "lookup_nutrition",
  "generate_meal_plan",
  "get_user_schedule",
  "get_user_health_reports",
  "book_dietitian_appointment",
]);

/**
 * Controlled loop router after tool execution:
 * Optimizes the reasoning loop by routing terminal tool executions straight to synthesis.
 * If exploratory tools were executed (e.g. search_dietitians), permits controlled follow-up
 * reasoning up to MAX_REASONING_LOOPS iterations.
 */
function routeAfterTools(state) {
  const currentLoop = state.loopCount || 0;
  if (currentLoop >= MAX_REASONING_LOOPS) {
    return "synthesis";
  }

  const results = state.toolResults || [];
  if (results.length > 0) {
    const onlyTerminal = results.every((r) => TERMINAL_TOOLS.has(r.tool));
    if (onlyTerminal) {
      return "synthesis";
    }
  }

  return "reasoning";
}

/**
 * Construct and compile the NutriAgent LangGraph StateGraph
 */
function createNutriAgentGraph() {
  const workflow = new StateGraph(AgentState);

  // Add agent nodes
  workflow.addNode("context_ingestion", contextIngestionNode);
  workflow.addNode("reasoning", reasoningNode);
  workflow.addNode("tool_execution", toolNode);
  workflow.addNode("synthesis", synthesisNode);

  // Define edges
  workflow.addEdge(START, "context_ingestion");
  workflow.addEdge("context_ingestion", "reasoning");

  workflow.addConditionalEdges("reasoning", routeAfterReasoning, {
    tool_execution: "tool_execution",
    synthesis: "synthesis",
  });

  // Controlled multi-turn reasoning loop: tools -> reasoning -> tools -> synthesis
  workflow.addConditionalEdges("tool_execution", routeAfterTools, {
    reasoning: "reasoning",
    synthesis: "synthesis",
  });

  workflow.addEdge("synthesis", END);

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}

const nutriAgentGraph = createNutriAgentGraph();

module.exports = {
  nutriAgentGraph,
  createNutriAgentGraph,
};
