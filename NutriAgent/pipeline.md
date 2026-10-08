# Complete End-to-End System Pipeline

This document describes the complete end-to-end pipeline detailing how a patient query travels through Express routes, the LangGraph state machine, clinical tool APIs, the Model Context Protocol (MCP), and back to the client in NutriConnect.

---

## 1. End-to-End Architecture Overview

```text
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
            |  1. context_ingestion     |               |
            |         |                 |               |
            |  2. reasoning             |               |
            |         |                 |               |
            |  3. [Google Gemini]       |               |
            |         |                 |               |
            |  4. tool_execution        |<--------------+
            |         |                 |   (Calls clinical tools:
            |  5. synthesis             |    search, nutrition,
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

1. **NutriConnect React Web Chat (`frontend/src/agent/NutriAgentPage.jsx`):**
   - The user enters a natural language query (for example: *"I have hypertension, suggest low sodium foods and book an appointment with Dr. Sarah Smith tomorrow"*).
   - The frontend issues an HTTP POST request to `/api/agent/chat` with `{ message, sessionId, patientContext, file }` including authorization headers.

2. **External AI Assistant / MCP Host (e.g., Claude Desktop, Antigravity, or Cursor):**
   - The external host connects via Stdio or SSE to the MCP Server (`backend/src/agent/mcp/mcp-server.js`).
   - It queries available tools via `tools/list` and executes functions via `tools/call`.

---

### Step 2: LangGraph Initialization & State Setup
When the request hits Express in `backend/src/agent/index.js`, execution delegates to `runLangGraphAgent` (`backend/src/agent/langgraph/index.js`).

1. LangGraph loads or creates the checkpointed state for the given `sessionId` using `MemorySaver`.
2. The initial state structure defined in `backend/src/agent/langgraph/state.js` is populated:
   - `userQuery`: The incoming patient message string.
   - `userId`: Resolved MongoDB patient identifier.
   - `authUserId`: Authenticated UserAuth identifier.
   - `messages`: Appends user message to conversational history.
   - `file`: Attached clinical report or image if provided.
   - `cards`: Empty array initialized for interactive artifacts.

---

### Step 3: Node 1 — `context_ingestion` (Direct MongoDB Grounding)
Before invoking the primary LLM, the graph passes through `contextIngestionNode`:

1. It invokes `loadAgentPatientContext(userId)` from `backend/src/agent/services/agentContextLoader.js`.
2. Queries verified MongoDB records:
   - Client profile and demographic parameters.
   - Latest `HealthReport` record containing clinical diagnosis, lab biomarkers (HbA1c, fasting sugar, lipid profiles), and dietary targets.
   - Supervising dietitian recommendations and known allergies.
3. Formats clinical facts into a concise `clinicalContextText` string and attaches a `patient_profile_card` if a profile exists.
4. **Zero RAG**: No vector embeddings, no chunking, and no similarity lookups. Context is grounded directly in authoritative MongoDB medical records.

---

### Step 4: Node 2 — `reasoning` (Google Gemini Tool Selection)
Next, the graph executes `reasoningNode`:

1. It constructs system instructions using `buildSystemPrompt`:
   - Clinical scope and boundaries (diet, nutrition, specialists, appointments).
   - Strict zero-emoji rules.
   - Temporal context (today's date, current time in IST, clinic operating hours 09:00 AM to 08:00 PM).
   - Real-time patient clinical context from Node 1.
2. It binds `GEMINI_TOOL_DECLARATIONS` (all 7 clinical tools defined with structured parameter schemas in `backend/src/agent/langgraph/tools.js`).
3. Sends the prompt and message history to Google Gemini (`gemini-3.1-flash-lite` or candidate models).
4. **Gemini analyzes the query and decides:**
   - **Informational / Conversational**: If no database lookup is needed, produces a direct conversational response without tool calls.
   - **Clinical Action / Lookup Required**: Emits structured tool calls with validated parameters (e.g., `search_dietitians`, `check_dietitian_availability`, `lookup_nutrition`, `generate_meal_plan`).
5. Tool calls are stored in `state.toolCalls`.

---

### Step 5: Conditional Edge Routing — `routeAfterReasoning`
The graph evaluates the conditional edge in `backend/src/agent/langgraph/graph.js`:

- If `state.toolCalls.length > 0` routes to **`tool_execution`**.
- If `state.toolCalls.length === 0` routes directly to **`synthesis`**.

---

### Step 6: Node 3 — `tool_execution` (Concurrent Parallel Execution)
If tools were requested, `toolNode` runs:

1. All tool calls execute concurrently using `Promise.all` via `executeLangGraphTool`.
2. **Clinical Tool Processing:**
   - **`search_dietitians`**: Queries MongoDB specialists matching condition, specialty, gender, rating, and fee.
   - **`check_dietitian_availability`**: Retrieves live booked/busy calendar slots (09:00 AM to 08:00 PM) for the specialist.
   - **`get_user_schedule`**: Retrieves the authenticated patient's upcoming consultations.
   - **`book_dietitian_appointment`**: Validates collision-free slots and creates the consultation record.
   - **`lookup_nutrition`**: Retrieves validated nutritional facts from USDA FoodData Central.
   - **`generate_meal_plan`**: Builds structured multi-meal calorie-targeted daily schedules aligned with health targets.
   - **`get_user_health_reports`**: Retrieves verified clinical health records, diagnostic lab tests, doctor notes, and clinical metrics.
3. Each tool returns both **structured raw data** for the LLM and pre-formatted **UI cards** (`dietitian_cards`, `slot_booking_card`, `nutrition_card`, `meal_plan_card`, `user_schedule_card`, `patient_profile_card`).
4. Results are appended to `state.toolResults` and `state.cards`.
5. The graph transitions to `synthesisNode`.

---

### Step 7: How MCP Intersects with This Architecture
While LangGraph handles the internal multi-step loop described above, **MCP (`backend/src/agent/mcp/mcp-server.js`)** wraps the exact same underlying clinical tools:

- When an **external MCP host** calls `tools/call`, it reaches the MCP server directly over JSON-RPC 2.0.
- The MCP server delegates execution directly to `executeLangGraphTool` from `backend/src/agent/langgraph/tools.js`.
- Both internal LangGraph workflows and external MCP clients share the same clinical database, validation rules, and business logic.

---

### Step 8: Node 4 — `synthesis` & Final Response Delivery
The graph executes `synthesisNode`:

1. It combines the patient inquiry, clinical context, and tool results.
2. Performs a synthesis pass through Gemini to produce a clear, medically sound, and empathetic conversational reply.
3. Strictly enforces zero emojis, plain language, and zero fabricated doctor names.
4. UI cards are deduplicated and attached to the response envelope.
5. The final payload is returned to Express and saved to MongoDB `ChatHistory`:
   ```json
   {
     "success": true,
     "reply": "Here is the nutritional breakdown for paneer and available appointments with Dr. Kavita Menon.",
     "cards": [
       { "type": "nutrition_card", "data": { ... } },
       { "type": "slot_booking_card", "data": { ... } }
     ],
     "patientContext": { ... }
   }
   ```
6. The React frontend receives the payload:
   - The message bubble renders the synthesized text.
   - Interactive card components render specialist cards, live booking calendars, and nutrition badges inline.
