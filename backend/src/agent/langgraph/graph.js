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

/**
 * Controlled loop router after tool execution:
 * Allows Gemini to review intermediate findings and invoke follow-up tools
 * up to MAX_REASONING_LOOPS iterations. If the bound is reached, proceeds to synthesis.
 */
function routeAfterTools(state) {
  const currentLoop = state.loopCount || 0;
  if (currentLoop < MAX_REASONING_LOOPS) {
    return "reasoning";
  }
  return "synthesis";
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
