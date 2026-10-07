const { StateGraph, START, END, MemorySaver } = require("@langchain/langgraph");
const { AgentState } = require("./state");
const {
  groundingNode,
  reasoningNode,
  toolNode,
  synthesisNode,
} = require("./nodes");

/**
 * Conditional router: determines whether Gemini requested tool execution
 */
function routeAfterReasoning(state) {
  if (state.toolCalls && state.toolCalls.length > 0) {
    return "tool_execution";
  }
  return "synthesis";
}

/**
 * Construct and compile the NutriAgent LangGraph StateGraph
 */
function createNutriAgentGraph() {
  const workflow = new StateGraph(AgentState);

  // Add functional nodes
  workflow.addNode("grounding", groundingNode);
  workflow.addNode("reasoning", reasoningNode);
  workflow.addNode("tool_execution", toolNode);
  workflow.addNode("synthesis", synthesisNode);

  // Add deterministic & conditional edges
  workflow.addEdge(START, "grounding");
  workflow.addEdge("grounding", "reasoning");

  workflow.addConditionalEdges("reasoning", routeAfterReasoning, {
    tool_execution: "tool_execution",
    synthesis: "synthesis",
  });

  workflow.addEdge("tool_execution", "synthesis");
  workflow.addEdge("synthesis", END);

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}

const nutriAgentGraph = createNutriAgentGraph();

module.exports = {
  nutriAgentGraph,
  createNutriAgentGraph,
};
