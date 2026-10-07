const { StateGraph, START, END, MemorySaver } = require("@langchain/langgraph");
const { AgentState } = require("./state");
const {
  contextIngestionNode,
  reasoningNode,
  toolNode,
  synthesisNode,
} = require("./nodes");

/**
 * Conditional router: routes to tool_execution if Gemini identified tool actions, else straight to synthesis
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
