# NutriConnect Clinical Model Context Protocol (MCP) Guide

Comprehensive reference and instructions for understanding, running, testing, and integrating the NutriConnect Clinical MCP server.

---

## 1. What Is MCP (Model Context Protocol)?

The **Model Context Protocol (MCP)** is an open standard designed to enable AI models and agents to interact with external tools, APIs, and data sources securely and consistently.

### The Problem MCP Solves
Before MCP, every AI tool integration required custom glue code:
- ChatGPT plugins had their own schema.
- LangChain / LangGraph had specific agent tool interfaces.
- Desktop assistants (Claude Desktop, Cursor) could not easily access private backend databases.

### The MCP Solution: "USB-C for AI"
MCP acts as a universal protocol for AI integrations:
- A host (like Claude Desktop, Cursor IDE, or an agent sidecar) connects to an MCP server.
- The host asks: *"What tools and resources do you have?"* (`tools/list`, `resources/list`).
- The MCP server responds with JSON Schemas.
- The host calls any tool (`tools/call`), and the server executes it and returns structured findings.

---

## 2. Why Did We Build an MCP Server for NutriConnect?

1. **External Interoperability**: Healthcare providers, dietitians, and patient apps running Claude Desktop, Cursor, or external AI agents can discover verified specialists and compute meal plans directly through NutriConnect.
2. **Zero Code Duplication**: We did not write separate tool implementations for MCP. Our MCP server imports the unified tool declarations (`GEMINI_TOOL_DECLARATIONS`) and execution engine (`executeLangGraphTool`) straight from our LangGraph core.
3. **Clinical Boundaries Everywhere**: The non-prescription guardrail and verified database constraints apply identically, whether a query originates from the NutriConnect web UI or an external MCP client.

---

## 3. How We Built the NutriConnect MCP Server

The server is built in two modular files inside `backend/src/agent/mcp/`:

### A. Core Server Definition (`mcp-server.js`)
We used the official `@modelcontextprotocol/sdk` to instantiate the server and wire up handlers:

```javascript
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { GEMINI_TOOL_DECLARATIONS, executeLangGraphTool } = require("../langgraph/tools");

function createNutriConnectMCPServer(userId = null) {
  const server = new Server(
    { name: "nutriconnect-clinical-mcp", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  // 1. Map LangGraph tool declarations directly into MCP tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = GEMINI_TOOL_DECLARATIONS.map((d) => ({
      name: d.name,
      description: d.description,
      inputSchema: {
        type: "object",
        properties: d.parameters?.properties || {},
        required: d.parameters?.required || [],
      },
    }));
    return { tools };
  });

  // 2. Route MCP tools/call directly to executeLangGraphTool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await executeLangGraphTool(name, args || {}, { userId });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.success,
    };
  });

  // 3. Expose clinical resources (safety guidelines & specialist registry info)
  server.setRequestHandler(ListResourcesRequestSchema, async () => { ... });
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => { ... });

  return server;
}
```

### B. Dual Transport Layer
1. **STDIO Transport (`mcp-server.js`)**:
   Uses standard process I/O. When executed via `node mcp-server.js`, it connects via `StdioServerTransport` so desktop apps (Claude Desktop, MCP Inspector) can pipe requests via stdin/stdout.
2. **SSE Transport (`mcp-transport-sse.js`)**:
   Uses HTTP Server-Sent Events. Mounted in `backend/src/agent/index.js`:
   - `GET /api/agent/mcp/sse` – Establishes the real-time event stream.
   - `POST /api/agent/mcp/messages` – Handles incoming JSON-RPC 2.0 messages keyed by session ID.

---

## 4. Architecture & Capabilities

```mermaid
flowchart TD
    subgraph Clients["MCP Clients"]
        Claude[Claude Desktop]
        Cursor[Cursor IDE]
        Inspector[MCP Inspector Web UI]
        WebClients[Remote Web Clients]
    end

    subgraph Transports["Transport Layer"]
        Claude -->|Process Stdin/Stdout| Stdio[StdioServerTransport]
        Cursor -->|Process Stdin/Stdout| Stdio
        Inspector -->|Process Stdin/Stdout| Stdio
        WebClients -->|HTTP SSE /messages| SSE[SSEServerTransport]
    end

    subgraph MCPServer["NutriConnect MCP Server"]
        Stdio --> ServerInstance[Server: nutriconnect-clinical-mcp]
        SSE --> ServerInstance
        
        ServerInstance --> ToolHandler[tools/list & tools/call]
        ServerInstance --> ResourceHandler[resources/list & resources/read]
    end

    subgraph Execution["LangGraph Execution Core"]
        ToolHandler --> UnifiedRegistry[executeLangGraphTool()]
        UnifiedRegistry --> DB[(MongoDB / Redis)]
        UnifiedRegistry --> GeminiAPI[Gemini 2.5 Flash Lite / Embedding 001]
    end
```

---

## 5. Launching the MCP Inspector

The official MCP Inspector provides a graphical browser interface to inspect tool declarations, test arguments, and view JSON-RPC responses.

### Primary Command (Copy & Paste)

Run this command from any PowerShell terminal window:

```powershell
npx @modelcontextprotocol/inspector@latest node "C:\Users\saket\Web Projects\WBD-Deployment\backend\src\agent\mcp\mcp-server.js"
```

### Alternative Command (From Inside Backend Directory)

```powershell
cd "C:\Users\saket\Web Projects\WBD-Deployment\backend"
npx @modelcontextprotocol/inspector@latest node "src/agent/mcp/mcp-server.js"
```

### What Happens on Launch
1. The proxy server initializes and displays:
   ```text
   Starting MCP inspector...
   MCP Inspector Web is up and running at:
      http://127.0.0.1:6274?MCP_INSPECTOR_API_TOKEN=...
   Opening browser...
   ```
2. Your browser will open the modern Inspector interface.
3. Verify that the **Transport** dropdown is set to **`STDIO`**.
4. Click the **Connect** button.

---

## 6. Complete Tool Reference & Test Payloads

Once connected in the Inspector, switch to the **Tools** tab. Click any tool, paste the corresponding JSON into the **Arguments** box, and click **Call Tool** (or **Run**).

### Tool 1: `search_dietitians`
Finds accredited clinical nutrition practitioners by health condition, specialty, budget, gender, or name.

**Arguments Example (PCOS & Hormonal Health):**
```json
{
  "specialtyOrCondition": "PCOS",
  "gender": "female",
  "maxFee": 650
}
```

**Arguments Example (Cardiac & Heart Health):**
```json
{
  "specialtyOrCondition": "heart",
  "limit": 3
}
```

**Arguments Example (Hair Growth & Scalp Wellness):**
```json
{
  "specialtyOrCondition": "hair growth",
  "limit": 4
}
```

---

### Tool 2: `lookup_nutrition`
Retrieves USDA-verified caloric and macronutrient values scaled to exact portions.

**Arguments Example (Paneer 100g):**
```json
{
  "foodItem": "paneer",
  "quantity": "100g"
}
```

**Arguments Example (Eggs):**
```json
{
  "foodItem": "boiled eggs",
  "quantity": "2 eggs"
}
```

**Arguments Example (Oats):**
```json
{
  "foodItem": "raw oats",
  "quantity": "100g"
}
```

---

### Tool 3: `check_dietitian_availability`
Checks live appointment slots between 09:00 AM and 08:00 PM for any dietitian.

**Arguments Example:**
```json
{
  "dietitianName": "Dr. Arjun Reddy",
  "date": "tomorrow"
}
```

---

### Tool 4: `generate_meal_plan`
Generates a 5-day clinical meal plan adhering strictly to patient health parameters and dietary preferences.

**Arguments Example:**
```json
{
  "goal": "Metabolic and blood sugar management",
  "days": 5,
  "dietaryPreference": "vegetarian"
}
```

---

### Tool 5: `book_dietitian_appointment`
Creates a verified appointment record in the database.

**Arguments Example:**
```json
{
  "dietitianName": "Dr. Arjun Reddy",
  "date": "tomorrow",
  "time": "10:00",
  "consultationType": "Online"
}
```

---

### Tool 6: `get_user_schedule`
Retrieves the authenticated patient's upcoming consultations and schedule timeline.

**Arguments Example:**
```json
{}
```

---

## 7. Clinical Resources Reference

Switch to the **Resources** tab in the Inspector and click **List Resources**.

### Resource 1: `clinical://guidelines`
- **Name**: NutriConnect Clinical Guidelines & Safety Standards
- **Content**: Evidence-based clinical boundaries, strict prohibition of pharmaceutical prescriptions (metformin, insulin adjustments, statins), and requirements for daily nutritional balance.

### Resource 2: `clinical://registry-info`
- **Name**: NutriConnect Accredited Specialist Registry
- **Content**: Specialist accreditation standards, clinical credentialing criteria, and verification procedures.

---

## 8. Integrating with External AI Hosts & Coding Agents

When an external coding agent or LLM tool (like **Cursor**, **Claude Desktop**, **Windsurf**, or **Continue.dev**) needs to access your MCP server, here is exactly what happens step-by-step:

---

### Step 1: You Give the Agent the URL in Its Settings

The external agent doesn't browse websites like a human. Instead, you add your URL to its MCP settings file (e.g., in Cursor under `Settings > Features > MCP`, or in Claude Desktop's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "nutriconnect": {
      "url": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse"
    }
  }
}
```

> **Note on Authentication**: 
> - The NutriConnect MCP endpoint uses `optionalAuthenticateJWT`. External agents can discover tools, query clinical guidelines, search dietitians, check availability, and look up nutrition completely unauthenticated.
> - If personalized patient actions (`get_user_schedule`, `book_dietitian_appointment`, `generate_meal_plan`) are needed, pass the user's token via headers:
>   ```json
>   "headers": {
>     "Authorization": "Bearer YOUR_JWT_TOKEN"
>   }
>   ```
>   or append `?token=YOUR_JWT_TOKEN` to the URL.

---

### Step 2: The Agent Automatically Connects in the Background

As soon as the agent boots up:
1. **Connects to SSE**: The agent opens `GET /api/agent/mcp/sse`.
2. **Receives Session ID**: Your server responds with an active session ID:
   ```text
   event: endpoint
   data: /api/agent/mcp/messages?sessionId=c4fe7b3c...
   ```
3. **Discovers Tools (`tools/list`)**: The agent sends a background JSON-RPC call asking: *"What tools do you have?"*
   Your server responds with your 6 registered clinical tools:
   - `search_dietitians`
   - `check_dietitian_availability`
   - `book_dietitian_appointment`
   - `get_user_schedule`
   - `lookup_nutrition`
   - `generate_meal_plan`

---

### Step 3: How the Agent Uses It During a Chat

Now, when a user asks the external agent a question:

1. **User asks**: *"Find me a sports nutritionist on NutriConnect who charges under 500 INR."*
2. **The external agent notices**: *"I have an MCP tool called `search_dietitians` from NutriConnect that can answer this."*
3. **The agent executes the tool**: In the background, it sends a POST request:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "search_dietitians",
       "arguments": { "specialtyOrCondition": "sports", "maxFee": 500 }
     }
   }
   ```
4. **Your backend runs your MongoDB query and returns the live data**.
5. **The external agent reads the result** and answers the user with the real dietitian names, credentials, and booking links.

---

### Summary
The external coding agent uses the **URL as an API bridge**. It queries the tools list automatically, decides when to call them based on what the user asks, and feeds your platform's live data right into its answer.

---

### Local Stdio Configuration (Alternative)

If running locally on your machine without HTTP, desktop clients can also run via Node process stdio:

#### Claude Desktop (Stdio)
Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):

```json
{
  "mcpServers": {
    "nutriconnect-clinical": {
      "command": "node",
      "args": [
        "C:/Users/saket/Web Projects/WBD-Deployment/backend/src/agent/mcp/mcp-server.js"
      ]
    }
  }
}
```

#### Cursor IDE (Stdio)
In Cursor Settings -> Features -> MCP Servers:
- **Name**: `nutriconnect-clinical`
- **Type**: `command`
- **Command**: `node "C:/Users/saket/Web Projects/WBD-Deployment/backend/src/agent/mcp/mcp-server.js"`

---

## 9. Remote HTTP / SSE Endpoints (Local & Production Deployment)

The NutriConnect MCP server is accessible via HTTP Server-Sent Events (SSE) across both local development and the deployed production cloud backend:

- **Local Development URL**: `http://localhost:5000`
- **Production Deployment URL**: `https://nutri-connect-wbd-backend.vercel.app`

### A. Testing Remote MCP via Inspector

You can connect the MCP Inspector directly to the production deployment URL via SSE (no token required for tool discovery):

```powershell
npx @modelcontextprotocol/inspector@latest --transport sse --server-url https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse
```

*(If testing locally while `npm start` is running):*
```powershell
npx @modelcontextprotocol/inspector@latest --transport sse --server-url http://localhost:5000/api/agent/mcp/sse
```

---

### B. Direct API Handshake

#### 1. Establish SSE Connection
```http
GET https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse
```
*(Optional JWT header: `Authorization: Bearer <JWT_TOKEN>` or query parameter: `?token=<JWT_TOKEN>`)*

The server opens an event stream and assigns a unique `sessionId`:
```text
event: endpoint
data: /api/agent/mcp/messages?sessionId=01938b82-628a-7965-b74a-67520e71b281
```

#### 2. Send JSON-RPC 2.0 Tool Execution Request
Post your tool call to the returned messages endpoint with the session ID:

```http
POST https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/messages?sessionId=01938b82-628a-7965-b74a-67520e71b281
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_dietitians",
    "arguments": {
      "specialtyOrCondition": "PCOS",
      "gender": "female"
    }
  }
}
```

---

## 10. Authenticated vs Anonymous Access (Token vs No Token)

External AI agents (such as Cursor, Claude Desktop, Windsurf, or VS Code Copilot) can connect in two distinct modes depending on whether authentication credentials are provided.

### Configuration Comparison

#### Mode A: Anonymous / Public Mode (No Token)
```json
{
  "mcpServers": {
    "nutriconnect": {
      "url": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse"
    }
  }
}
```

#### Mode B: Authenticated Patient Mode (With Token)
Via Query Parameter:
```json
{
  "mcpServers": {
    "nutriconnect": {
      "url": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse?token=YOUR_JWT_TOKEN"
    }
  }
}
```
Or via HTTP Headers (where supported):
```json
{
  "mcpServers": {
    "nutriconnect": {
      "url": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

### Server Resolution (`optionalAuthenticateJWT`)
The backend route uses `optionalAuthenticateJWT`:
1. When a connection arrives, it inspects the `Authorization` header and the `token` query param.
2. If verified, `req.user.id` is extracted and bound to `context.userId` for all tool executions in that session.
3. If absent or invalid, the session runs in public guest mode with `context.userId = null`.

### Tool Behavior Matrix

| Tool | Without Token (`userId = null`) | With Token (`userId = <patient_id>`) |
| :--- | :--- | :--- |
| `search_dietitians` | Full access. Queries MongoDB directory of verified dietitians. | Full access. Identical directory search. |
| `lookup_nutrition` | Full access. Queries USDA / nutritional database. | Full access. Queries nutritional database. |
| `check_dietitian_availability` | Full access. Returns live available slots. | Full access. Returns live available slots. |
| `get_user_schedule` | Blocked. Returns `{ success: false, message: "Please sign in to view your consultations schedule." }`. | Full access. Retrieves patient's confirmed consultations from MongoDB. |
| `book_dietitian_appointment` | Requires full client identity parameters or fails if account context is missing. | Authenticated. Automatically binds appointment to patient profile. |
| `generate_meal_plan` | Generic baseline guidelines without clinical lab report grounding. | Clinical RAG. Retrieves patient's HbA1c, fasting glucose, and targets to tailor nutrition recommendations. |

---

## 11. Troubleshooting & Common Pitfalls

1. **`Cannot find module ... mcp-server.js`**:
   - Cause: Running `node "src/agent/mcp/mcp-server.js"` from outside the `backend/` directory.
   - Fix: Use the full path: `node "C:\Users\saket\Web Projects\WBD-Deployment\backend\src\agent\mcp\mcp-server.js"`.

2. **MongoDB Buffering Timeout**:
   - Ensure `MONGODB_URL` is configured in `backend/.env`. The standalone stdio runner automatically loads `backend/.env`.

3. **Port In Use / Already Running**:
   - The MCP Inspector runs on port 6274 (web UI) and 6275/6277 (proxy). If interrupted, close existing Node processes before relaunching.

4. **Zero Emojis Enforced**:
   - The clinical agent strictly enforces zero emojis across all code, tools, logs, and responses.
