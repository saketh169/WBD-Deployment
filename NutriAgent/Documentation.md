# NutriAgent: Complete Master Technical Documentation

Comprehensive architectural reference, implementation guide, security model, and interview playbook for the NutriAgent Clinical Intelligence Platform.

---

## Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Architectural Blueprint](#2-architectural-blueprint)
3. [Direct Clinical Grounding (Zero-RAG Philosophy)](#3-direct-clinical-grounding-zero-rag-philosophy)
4. [LangGraph State Machine Architecture](#4-langgraph-state-machine-architecture)
5. [Model Context Protocol (MCP) Implementation](#5-model-context-protocol-mcp-implementation)
6. [Security, Identity & Multi-Tenancy Hardening](#6-security-identity--multi-tenancy-hardening)
7. [Clinical Meal Planning & Grounding Priority](#7-clinical-meal-planning--grounding-priority)
8. [Clinical Tool Registry & Strict Contracts](#8-clinical-tool-registry--strict-contracts)
9. [Frontend Interactive Artifacts & Real-Time Sync](#9-frontend-interactive-artifacts--real-time-sync)
10. [End-to-End Query Lifecycle](#10-end-to-end-query-lifecycle)
11. [Testing & Quality Verification](#11-testing--quality-verification)
12. [Placement & Interview Master Playbook](#12-placement--interview-master-playbook)

---

## 1. Executive Summary & Problem Statement

### 1.1 What is NutriAgent?
NutriAgent is an enterprise-grade Clinical Nutrition and Telehealth AI Assistant built into the NutriConnect healthcare ecosystem. It acts as an autonomous clinical co-pilot that assists patients and dietitians by:
- Ingesting verified diagnostic lab panels, metabolic assessments, and physician instructions.
- Retrieving ground-truth nutritional data from the USDA FoodData Central database.
- Finding accredited specialists across medical domains (Cardiology, Endocrinology, Diabetes, PCOS).
- Dynamically inspecting 7-day live appointment calendars with conflict detection.
- Synthesizing tailored multi-meal clinical nutrition plans based on verified biological metrics.
- Exposing clinical capabilities securely to external AI clients via the open Model Context Protocol (MCP).

### 1.2 The Failure of Standard RAG in Clinical Domains
Standard Retrieval-Augmented Generation (RAG) models rely on vector embeddings (e.g., cosine similarity over text chunks). In healthcare and clinical dietetics, this approach introduces severe risks:
1. **Numerical Drift**: Dense embeddings capture semantic similarity, not mathematical precision. A patient with HbA1c of 5.6% (normal) can be retrieved as semantically adjacent to 8.2% (uncontrolled diabetes).
2. **Hallucinatory Chunk Merging**: Chunking arbitrary text boundaries often detaches a patient's allergy warning (e.g., "Severe peanut anaphylaxis") from their diet recommendation.
3. **Stale Index Latency**: Vector caches cannot reflect real-time calendar slot bookings or recent lab report uploads without constant re-indexing overhead.

### 1.3 The NutriAgent Solution
NutriAgent completely eliminates vector embeddings in favor of **Deterministic Direct Clinical Grounding**, **LangGraph State Machine Orchestration**, and **Dual-Tier Tool Verification**.

---

## 2. Architectural Blueprint

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  +-------------------------------------+   +------------------------------------+ |
|  |     React Web UI (NutriConnect)     |   |   External Hosts (Claude, Cursor)  | |
|  +-------------------------------------+   +------------------------------------+ |
+-----------------------------------------------------------------------------------+
                   |                                           |
       HTTP POST   | JWT Bearer                                | JSON-RPC 2.0
 /api/agent/chat   v                                           v (Stdio / SSE)
+-------------------------------------+     +-------------------------------------+
|        Express Router Layer         |     |         MCP Transport Layer         |
|      (backend/src/agent/index.js)   |     |   (mcp-server.js / mcp-sse.js)      |
|  - JWT Identity Extraction          |     |  - Session Ownership Verification   |
|  - Scoped Query Isolation           |     |  - Tool Authorization Partition     |
+-------------------------------------+     +-------------------------------------+
                   |                                           |
                   +---------------------+---------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               LANGGRAPH AGENT CORE                                |
|                        (backend/src/agent/langgraph/)                             |
|                                                                                   |
|  1. Context Ingestion Node                                                        |
|     --> Ingests verified records from MongoDB: User, HealthReport, LabReport      |
|                                                                                   |
|  2. Reasoning Node                                                                |
|     --> Injects Clinical System Prompt & Guardrails                              |
|     --> Evaluates query with Google Gemini (gemini-3.1-flash-lite / 3.5-flash)    |
|     --> Emits structured tool calls                                               |
|                                                                                   |
|  3. Tool Execution Node                                                           |
|     --> Validates parameters using Zod schemas (.strict())                        |
|     --> Dispatches to Dedicated Tool APIs (APIs Layer)                            |
|                                                                                   |
|  4. Synthesis Node                                                                |
|     --> Assembles conversational response and interactive UI artifact cards       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               DATA & SERVICE LAYER                                |
|  +--------------------+  +--------------------+  +------------------------------+ |
|  |   MongoDB Atlas    |  |  USDA FoodData API |  |      Socket.IO Engine        | |
|  | - HealthReport     |  | - Calories, Macros |  | - Live Slot Broadcasting     | |
|  | - LabReport        |  | - Verified Food ID |  | - Instant State Mutation     | |
|  | - Booking / Doctor |  |                    |  |                              | |
|  +--------------------+  +--------------------+  +------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 3. Direct Clinical Grounding (Zero-RAG Philosophy)

NutriAgent enforces a zero-vector, direct-ingestion model:

1. **Deterministic Database Queries**:
   When an authenticated patient initiates a conversation, [`agentContextLoader.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/services/agentContextLoader.js) queries the patient's verified document in MongoDB directly using indexed primary identifiers.
2. **Unified Patient Resolution**:
   [`userResolver.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/services/userResolver.js) links auth accounts (`UserAuth`) and demographic profiles (`User`), extracting:
   - Biological metrics: age, gender, height, current weight, calculated BMI, and BMI categorization.
   - Clinical assessments: primary diagnoses, flagged biomarkers (fasting blood sugar, HbA1c, lipid panel, thyroid T3/T4/TSH).
   - Dietitian guidance: target daily calories, prescribed macronutrient distribution, hydration quotas, food allergies, and dietary intolerances.
3. **Structured Context Injection**:
   The extracted medical context is formatted into an unalterable system context block and injected directly into the prompt header of the reasoning node. The model is forbidden from asking the user for information already present in their clinical chart.

---

## 4. LangGraph State Machine Architecture

The agent's decision loop is implemented using LangGraph's `StateGraph` in [`backend/src/agent/langgraph/`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/langgraph/).

### 4.1 State Channels (`state.js`)
State channels define the data structure flowing between graph nodes:
- `messages`: Conversation history using message channels.
- `patientProfile`: Demographics and clinical records resolved during ingestion.
- `contextText`: Formatted medical grounding block.
- `cards`: Array of interactive UI artifact cards accumulated across tool runs.
- `loopCount`: Counter to prevent infinite execution loops (hard cap: 4 cycles).
- `modelCalls`: Telemetry tracking model execution and fallback switching.

### 4.2 Graph Topology & Nodes (`nodes.js`, `graph.js`)

```
   [START]
      |
      v
[context_ingestion]  --> Loads patient medical charts from MongoDB
      |
      v
  [reasoning]        --> Gemini analyzes query + history + medical grounding
      |
   {Has Tool Calls?}
     /         \
   YES          NO
   /             \
  v               v
[tool_execution] [synthesis] --> Packages final text and UI cards
  |               |
  +-> [Loop <= 3] +-> [END]
```

1. **`context_ingestion`**:
   - Executes once per request.
   - Loads patient records or gracefully handles anonymous/unauthenticated sessions.
2. **`reasoning`**:
   - Injects clinical guardrails from [`guardrails.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/guardrails.js).
   - Primary model: `gemini-3.1-flash-lite`.
   - Resilience: If the primary model experiences transient network failures or rate limits, the node automatically falls back to `gemini-3.5-flash`.
   - Evaluates whether tool invocations are necessary.
3. **`tool_execution`**:
   - Iterates through emitted tool calls.
   - Validates each call using strict Zod schemas.
   - Dispatches execution to the corresponding tool API.
   - Appends generated UI cards to the shared state.
4. **`synthesis`**:
   - Synthesizes the natural language response.
   - Deduplicates generated cards.
   - Verifies safety boundaries before transmitting the response payload to the client.

---

## 5. Model Context Protocol (MCP) Implementation

NutriAgent includes a full implementation of the open Model Context Protocol via [`backend/src/agent/mcp/`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/mcp/).

### 5.1 Dual Transport Architecture
1. **STDIO Transport (`mcp-server.js`)**:
   - Runs via standard input/output streams (`StdioServerTransport`).
   - Allows external developer tools (Claude Desktop, Cursor IDE, MCP Inspector) to spawn NutriAgent as a local subprocess.
2. **Server-Sent Events (SSE) Transport (`mcp-transport-sse.js`)**:
   - Runs over HTTP via Express routes:
     - `GET /api/agent/mcp/sse`: Establishes real-time SSE stream.
     - `POST /api/agent/mcp/messages`: Receives JSON-RPC 2.0 payloads.
   - Enables browser-based and remote web clients to connect over the network.

### 5.2 Clinical MCP Resources
The MCP server exposes standard clinical resources under the `clinical://` URI scheme:
- `clinical://guidelines`: Clinical safety constraints, non-prescription boundaries, mandatory meal structure.
- `clinical://registry-info`: Accredited specialist credentials, verification criteria, and practice standards.

---

## 6. Security, Identity & Multi-Tenancy Hardening

NutriAgent enforces stringent multi-tenancy and authentication controls:

### 6.1 Trusted JWT Identity Resolution
- Identity resolution strictly inspects verified token properties on `req.user`:
  ```javascript
  function getAuthUserId(req) {
    return (
      req.user?.roleId ||
      req.user?.userId ||
      req.user?.id ||
      req.user?._id ||
      null
    );
  }
  ```
- **Vulnerability Prevented**: `req.body.userId` is never trusted. This prevents unprivileged users from impersonating another patient by passing a spoofed ID in the JSON body.

### 6.2 Session Isolation & Leakage Prevention
- In `/session/:sessionId` (GET/DELETE) and `/session/message` (POST), session queries explicitly scope to the authenticated user:
  ```javascript
  const query = { sessionId };
  if (userFilter) {
    query.userId = userFilter;
  }
  ```
- **Vulnerability Prevented**: Eliminates `$or: [{ userId: userFilter }, { userId: null }]`. Authenticated users cannot read, claim, mutate, or delete sessions belonging to other tenants or unowned sessions.

### 6.3 MCP Session Ownership Verification
- In `mcp-transport-sse.js`, the authenticated identity of the session creator is stored in `activeTransports`:
  ```javascript
  activeTransports.set(sessionId, { server, transport, userId: userId ? String(userId) : null });
  ```
- When a client sends a message to `POST /api/agent/mcp/messages?sessionId=XYZ`, the endpoint verifies caller ownership:
  ```javascript
  if (sessionData.userId && sessionData.userId !== normalizedCallerId) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: You do not have ownership of this MCP session."
    });
  }
  ```
- **Vulnerability Prevented**: Prevents unauthorized clients from hijacking active MCP sessions.

### 6.4 Partitioned Tool Access (Public vs. Protected)
Tools are partitioned into two distinct security tiers:
1. **Patient-Protected Set** (`PATIENT_PROTECTED_TOOLS`):
   - `get_user_schedule`
   - `get_user_health_reports`
   - `book_dietitian_appointment`
   - `generate_meal_plan`
   - Access without verified authentication returns `UNAUTHORIZED`.
2. **Public Set**:
   - `search_dietitians`
   - `check_dietitian_availability`
   - `lookup_nutrition`
   - Public tools are executed with `{ userId: null }`, ensuring no patient-specific conflict matrix or private data is computed or exposed.

---

## 7. Clinical Meal Planning & Grounding Priority

### 7.1 Priority Inversion Defense
In [`mealPlan.api.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/apis/mealPlan.api.js), clinical targets from verified medical reports take precedence over model-suggested arguments:

```javascript
if (report) {
  if (report.targetCalories) {
    effectiveCalories = report.targetCalories;
  }
  if (report.targetMacros) {
    effectiveMacros = report.targetMacros;
  }
  // Model parameters are only used when verified report metrics are absent
}
```

### 7.2 Dynamic Caloric Computation (BMR Formula)
When explicit targets are absent but biological metrics exist in diagnostic lab records, the system calculates caloric maintenance using the clinical Mifflin-St Jeor formula:
$$\text{BMR} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (yr)} + 5$$
$$\text{Target Calories} = \text{round}(\text{BMR} \times 1.35)$$

---

## 8. Clinical Tool Registry & Strict Contracts

All 7 tools use `.strict()` Zod schemas to reject unknown arguments and enforce typed validation:

| Tool Name | Key Arguments | Zod Contract | Card Output |
| :--- | :--- | :--- | :--- |
| `search_dietitians` | `specialtyOrCondition`, `gender`, `maxFee`, `name`, `limit` | `.strict()` | `dietitian_cards` |
| `check_dietitian_availability` | `dietitianName` (required), `date` | `.strict()` | `slot_booking_card` |
| `get_user_schedule` | `date`, `dietitianName` | `.strict()` | `user_schedule_card` |
| `book_dietitian_appointment` | `dietitianName`, `date`, `time`, `consultationType` | `.strict()` | `booking_confirmation_card` |
| `lookup_nutrition` | `foodItem` (required), `quantity` | `.strict()` | `nutrition_card` |
| `generate_meal_plan` | `planName`, `dietType`, `durationDays`, `dailyCalories`, `macroTargets`, `allergiesExcluded` | `.strict()`, typed macro object | `meal_plan_card` |
| `get_user_health_reports` | `reportType` (`health`/`lab`/`all`), `date`, `limit` | `.strict()`, date format validated | `patient_profile_card` |

### Typed `macroTargets` Schema:
```javascript
macroTargets: z.object({
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatsGrams: z.number().nonnegative(),
}).optional()
```

### Strict Date Validation:
In [`healthReports.tool.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/agent/tools/healthReports.tool.js), invalid date formats immediately return an explicit error rather than silently falling back:
```javascript
if (targetDate) {
  const d = new Date(targetDate);
  if (isNaN(d.getTime())) {
    return {
      success: false,
      cards: [],
      message: `Invalid date format "${targetDate}". Please provide a valid date in YYYY-MM-DD format.`
    };
  }
  // Apply date range filter
}
```

---

## 9. Frontend Interactive Artifacts & Real-Time Sync

The frontend renders 8 interactive UI artifact cards located in [`frontend/src/agent/features/`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/agent/features/):

1. **`dietitian_cards`** (`DietitianCard.jsx`): Specialist profiles with credentials, fee in INR, rating, and direct booking trigger.
2. **`slot_booking_card`** (`SlotBookingCard.jsx`): Interactive 7-day slot selector (09:00 AM to 08:00 PM, 23 slots per day) with three statuses:
   - **Open (Green)**: Available to book.
   - **Booked (Red)**: Reserved by this user with this specialist.
   - **Busy (Orange)**: Unavailable due to another patient, doctor block, or cross-doctor conflict.
3. **`user_schedule_card`** (`UserScheduleCard.jsx`): Upcoming booked consultations with date, time, and dashboard links.
4. **`nutrition_card`** (`NutritionCard.jsx`): USDA nutritional breakdown displaying calories, protein, carbs, and fats.
5. **`meal_plan_card`** (`MealPlanCard.jsx`): Multi-day clinical diet plans with daily calorie badges and meal accordions.
6. **`patient_profile_card`** (`PatientProfileCard.jsx`): Clinical metrics, diagnoses, and biomarker indicators.
7. **`booking_confirmation_card`** (`BookingConfirmationCard.jsx`): Booking receipts with doctor details and video links.
8. **`uploaded_document_card`** (`UploadedDocumentCard.jsx`): Multimodal document parsing status indicator.

### Real-Time WebSocket Synchronization
[`NutriAgentPage.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/agent/NutriAgentPage.jsx) listens for Socket.IO events (`new_booking`, `booking_updated`). When an event arrives, `applyBookingToCards` mutates the active cards in memory immediately, disabling booked slots in real time without requiring HTTP polling or database refetches.

---

## 10. End-to-End Query Lifecycle

```
1. USER ACTION
   Patient sends: "Check my health reports and book a slot tomorrow with Dr. Amit Patel at 5:00 PM"
   
2. ROUTE HANDLING (Express)
   - authenticateJWT resolves token claims to req.user.
   - getAuthUserId resolves authenticated roleId.
   - ChatHistory retrieves conversation scoped to userFilter.

3. LANGGRAPH EXECUTION
   - Node 1 (context_ingestion): Ingests patient records from HealthReport and LabReport.
   - Node 2 (reasoning): gemini-3.1-flash-lite receives prompt + context. Emits tool calls:
     a) get_user_health_reports
     b) book_dietitian_appointment { dietitianName: "Dr. Amit Patel", date: "2026-10-09", time: "17:00" }
   - Node 3 (tool_execution):
     - Validates arguments against Zod strict schemas.
     - Fetches reports and generates patient_profile_card.
     - Verifies slot availability, writes Booking document, generates booking_confirmation_card.
   - Node 4 (synthesis):
     - Synthesizes friendly confirmation text grounded in clinical targets.
     - Combines response with generated cards.

4. REAL-TIME BROADCAST & DELIVERY
   - Booking engine emits new_booking via Socket.IO.
   - Response arrives in React UI: renders message text + PatientProfileCard + BookingConfirmationCard.
   - All active SlotBookingCards in other open tabs instantly update the 5:00 PM slot to "Busy".
```

---

## 11. Testing & Quality Verification

All components are verified using automated test suites across backend and frontend:

- **Backend**: 125/125 tests passing (`npm test` in `backend`)
  - `tests/agent.test.js`: Validates tool execution, API isolation, date validation, meal plan clinical priority, and session queries.
  - `tests/auth.test.js`: Validates JWT verification and role models.
  - `tests/booking.test.js`: Validates booking schemas, operating hours, and conflict constraints.
  - `tests/payment.test.js`: Validates subscription tiers and payment gateways.
  - `tests/blog.test.js`: Validates clinical blog publishing.
- **Frontend**: 93/93 tests passing (`npm run test:run` in `frontend`)
  - `src/__tests__/components.test.jsx`: Validates component mounting and props.
  - `src/__tests__/apiServices.test.js`: Validates API service contracts.
  - `src/__tests__/services.test.js`: Validates utility functions.

---

## 12. Placement & Interview Master Playbook

Use this section to articulate your project during technical placement interviews:

### 12.1 The 30-Second Elevator Pitch
> *"I built NutriAgent, a clinical nutrition intelligence platform integrated into NutriConnect. Unlike standard chatbots that rely on probabilistic vector RAG—which can hallucinate critical medical values—NutriAgent uses deterministic Direct Clinical Grounding with a LangGraph state machine. It integrates with USDA FoodData Central, manages multi-specialist live scheduling with conflict detection, and exposes tools over the open Model Context Protocol (MCP) with end-to-end multi-tenant session security."*

### 12.2 High-Frequency Interview Questions & Technical Answers

#### Q1: Why didn't you use standard Vector RAG with LangChain?
**Answer**:
> *"Standard vector RAG has two critical flaws in clinical healthcare: semantic drift and latency. Vector similarity cannot differentiate between an HbA1c of 5.6% and 8.2% because both are semantically related to blood sugar. In our system, clinical data must be deterministic. By querying MongoDB directly and feeding structured clinical documents into LangGraph's state, we achieve 100% data grounding with zero vector hallucination and zero embedding indexing costs."*

#### Q2: What is the Model Context Protocol (MCP) and why did you implement it?
**Answer**:
> *"MCP is an open standard—often called the 'USB-C for AI'—that enables AI clients to discover and invoke tools using standard JSON-RPC. We implemented dual transports: STDIO for local AI hosts like Claude Desktop and Cursor, and SSE over HTTP for distributed web clients. We also implemented strict security partitioning: public tools like nutrition search run with null user context, while sensitive tools like health reports and bookings enforce authenticated patient session ownership."*

#### Q3: How do you prevent a malicious user from claiming another user's session or booking on their behalf?
**Answer**:
> *"We implemented defense-in-depth across three layers: First, `getAuthUserId` derives identity strictly from cryptographically verified JWT token claims on `req.user`, never trusting user-supplied body fields. Second, session queries in MongoDB are strictly scoped to the authenticated user's object IDs, disallowing queries matching `userId: null`. Third, on MCP SSE transports, each session is bound to the creator's ID, rejecting post messages from other identities with HTTP 403 Forbidden."*

#### Q4: How does live scheduling handle cross-doctor conflicts?
**Answer**:
> *"Our scheduling API computes availability across clinic operating hours (09:00 to 20:00 in 23 half-hour intervals). When a patient inspects Doctor A's calendar, the API checks existing bookings across the entire platform. If the patient already has an appointment with Doctor B at 10:00 AM, that slot is rendered as 'Busy' on Doctor A's calendar. When a booking occurs, the event is broadcast via Socket.IO, updating all active UI cards across connected clients in real time without polling."*

#### Q5: How do you handle LLM unreliability or infinite tool loops?
**Answer**:
> *"LangGraph uses explicit state channels and loop guards. In `nodes.js`, we track `loopCount` with a hard limit of 4 iterations. If the primary model `gemini-3.1-flash-lite` experiences network latency or rate limits, the system catches the exception and falls back to `gemini-3.5-flash`. Furthermore, all tool arguments are strictly validated against `.strict()` Zod schemas before API execution, ensuring corrupt or hallucinated parameters are rejected immediately."*
