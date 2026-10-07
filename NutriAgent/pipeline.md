# Complete End-to-End System Pipeline

This document describes the complete end-to-end pipeline detailing how a client query travels through the AI model, LangGraph, clinical tools, the Model Context Protocol (MCP), and back to the client in NutriConnect.

---

## 1. End-to-End Architecture Overview

```
                  +----------------------------------------------+
                  |                 CLIENT LAYER                 |
                  |  [React Web UI]       OR   [External MCP]    |
                  +----------------------------------------------+
                         |                              |
            HTTP POST    |                              | JSON-RPC 2.0
      /api/agent/chat    v                              v (Stdio / SSE)
                  +---------------+             +---------------+
                  | Express Route |             |  MCP Server   |
                  +---------------+             +---------------+
                         |                              |
                         v                              |
            +---------------------------+               |
            |     LangGraph Engine      |               |
            |     (StateGraph Flow)     |               |
            |                           |               |
            |  1. groundingNode         |               |
            |         |                 |               |
            |  2. reasoningNode         |               |
            |         |                 |               |
            |  3. [Gemini Model]        |               |
            |         |                 |               |
            |  4. toolNode (Parallel)   |<--------------+
            |         |                 |   (Calls clinical tools:
            |  5. synthesisNode         |    search, nutrition,
            |         |                 |    booking, meal plans)
            +---------------------------+
                         |
                         v
      +-------------------------------------+
      |   Structured Response Delivered     |
      |   - Clinical Text Response          |
      |   - UI Cards (Doctor, Food, Slots)  |
      +-------------------------------------+
```

---

## 2. Step-by-Step Execution Pipeline

### Step 1: Client Query Origination
A user query enters the system via one of two distinct entry points:

1. **NutriConnect React Web Chat ([frontend/src/pages/Client/ChatPage.jsx](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Client/ChatPage.jsx)):**
   - The user enters a natural language query (for example: *"I have hypertension, suggest low sodium foods and book an appointment with Dr. Sarah Smith tomorrow"*).
   - The frontend issues an HTTP POST request to `/api/agent/chat` with `{ message, sessionId, patientContext }`.

2. **External AI Assistant / MCP Host (e.g., Claude Desktop, Antigravity, or CLI script):**
   - The external host connects via Stdio or SSE to the MCP Server ([backend/src/agent/mcp/mcp-server.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/mcp/mcp-server.js)).
   - It queries available tools via `tools/list` and executes functions via `tools/call`.

---

### Step 2: LangGraph Initialization & State Setup
When the request hits Express in [backend/src/agent/index.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/index.js), execution delegates to `runLangGraphAgent` ([backend/src/agent/langgraph/index.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/langgraph/index.js)).

1. LangGraph loads or creates the checkpointed state for the given `sessionId` using `MemorySaver`.
2. The initial state structure defined in [backend/src/agent/langgraph/state.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/langgraph/state.js) is populated:
   - `messages`: Appends the incoming human message.
   - `patientContext`: Attaches clinical details (allergies, health goals, dietary preferences).
   - `ragGrounding`: Initialized as empty.
   - `toolCalls` and `toolResults`: Initialized as empty arrays.
   - `uiCards`: Initialized as empty array.

---

### Step 3: Node 1 — `groundingNode` (Context & Vector Retrieval)
Before invoking the primary LLM, the graph passes through `groundingNode` in [backend/src/agent/langgraph/nodes.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/langgraph/nodes.js):

1. It extracts semantic keywords and query intent from the user message.
2. It queries [backend/src/agent/services/ragRetriever.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/services/ragRetriever.js).
3. The retriever checks the in-memory cache (`queryEmbeddingsCache`). If cached, embedding generation is bypassed (0ms). If not, it generates vector embeddings using `@google/genai` (`text-embedding-004`).
4. It performs cosine similarity search against the clinical knowledge base (conditions, dietary rules, dietitian directories) and returns the top matching clinical guidelines.
5. The retrieved guidelines are stored in `state.ragGrounding`.

---

### Step 4: Node 2 — `reasoningNode` (LLM Decision Engine)
Next, the graph executes `reasoningNode`:

1. It constructs the prompt payload containing:
   - Clinical context and safety boundaries.
   - Vector RAG grounding information.
   - Chat history.
   - Tool declarations defined with Zod schemas in [backend/src/agent/langgraph/tools.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/langgraph/tools.js).
2. It sends this payload to Google Gemini (`gemini-2.5-flash`).
3. **The LLM analyzes the query and decides:**
   - **Case A (Pure Informational / Conversational):** If no clinical actions or lookups are needed, the LLM produces a direct text response with no tool calls.
   - **Case B (Action / Lookup Required):** If the user asks for specialist discovery, scheduling, meal planning, or nutrient lookup, the LLM generates structured tool call directives with extracted parameters (for example, `{ name: "search_dietitians", args: { query: "hypertension" } }`).
4. The outputs are saved into `state.toolCalls` and `state.rawReply`.

---

### Step 5: Conditional Edge Routing — `shouldContinue`
The graph evaluates the conditional edge in [backend/src/agent/langgraph/graph.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/langgraph/graph.js):

- If `state.toolCalls.length > 0` routes to **`toolNode`**.
- If `state.toolCalls.length === 0` routes to **`synthesisNode`**.

---

### Step 6: Node 3 — `toolNode` (Concurrent Parallel Execution)
If tools were requested, `toolNode` runs:

1. Rather than executing sequentially, all tool calls run concurrently using `Promise.all`.
2. **Clinical Tool Processing:**
   - **`search_dietitians`:** Queries MongoDB specialists with filters (rating, fee, specialization).
   - **`lookup_nutrition`:** Checks `usdaNutritionCache`. If not cached, queries the USDA Food Data Central API, parses macronutrients, and updates the cache.
   - **`check_dietitian_availability`:** Checks active calendar slots in the database.
   - **`book_dietitian_appointment`:** Verifies collision-free slots and creates the booking record.
   - **`generate_meal_plan`:** Generates structured multi-meal calorie-targeted schedules.
3. Each tool returns both **structured raw data** for the LLM and pre-formatted **UI cards** (e.g., `dietitian_cards`, `nutrition_card`, `slot_booking_card`).
4. Results are appended to `state.toolResults` and `state.uiCards`.
5. The graph loops back to `synthesisNode`.

---

### Step 7: How MCP Intersects with This Architecture
While LangGraph handles the internal multi-step loop described above, **MCP ([backend/src/agent/mcp/mcp-server.js](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/mcp/mcp-server.js))** wraps the exact same underlying clinical tools:

- When an **external MCP host** calls `tools/call` for `lookup_nutrition` or `search_dietitians`, it hits the MCP server directly over JSON-RPC 2.0.
- The MCP server delegates the execution to the identical verified tool functions used by LangGraph.
- Both internal LangGraph workflows and external MCP clients share the same clinical database, validation rules, and caching layers.

---

### Step 8: Node 4 — `synthesisNode` & Final Response Delivery
The graph executes `synthesisNode`:

1. It combines the original user inquiry, patient context, and tool results.
2. It performs a final synthesis pass through Gemini to produce a clear, medically sound, and empathetic conversational reply that references the tool results.
3. UI cards are deduplicated by item identity (preventing card collisions across multiple foods or doctors).
4. The final payload is formatted and returned to Express:
   ```json
   {
     "success": true,
     "reply": "Here is the nutrition breakdown for oatmeal and available appointments with Dr. Sarah Smith.",
     "cards": [
       { "type": "nutrition_card", "data": { } },
       { "type": "slot_booking_card", "data": { } }
     ],
     "patientContext": { }
   }
   ```
5. The React frontend receives the response:
   - The message bubble renders the clinical explanation.
   - Interactive card components render food nutritional badges and direct booking buttons inline.
