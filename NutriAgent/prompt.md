# NutriConnect MCP Prompts & Testing Guide

This guide contains copy-paste prompts and instructions to trigger the NutriConnect MCP tools inside **VS Code GitHub Copilot**, **Cursor**, **Claude Desktop**, or any external coding assistant.

---

## 1. Quick Troubleshooting: If Copilot Searches the Web Instead of Calling MCP

When you ask Copilot a question and it opens Google/Bing (`web_fetch`), do either of the following:

### Quick Fix A: Explicit Tool Tag (`#`)
Prefix your prompt with `#`:
```text
#search_dietitians Find dietitians specializing in diabetes
```

### Quick Fix B: Attach Tools via Tools / Plug Icon
1. In the Copilot Chat input box, click the **Tools / Plug icon** (or the Attach context button).
2. Check/enable the **nutriconnect-local** or **nutriconnect-cloud** tools.

### Quick Fix C: Explicit Prompt Instruction
Explicitly tell the model:
```text
Use the MCP tool search_dietitians from nutriconnect to find verified diabetes specialists.
```

---

## 2. Ready-to-Use Copy-Paste Prompts

### Tool 1: `search_dietitians` (Find Specialists)

#### Generic Search
```text
Use the search_dietitians MCP tool to find dietitians specializing in PCOS and hormonal health.
```

#### Filter by Fee and Gender
```text
Use the search_dietitians MCP tool to find female nutritionists specializing in weight management with a fee under 1000 INR.
```

#### Find a Specific Doctor
```text
Use the search_dietitians MCP tool to search for Dr. Arjun Reddy.
```

---

### Tool 2: `check_dietitian_availability` (Check Available Slots)

#### Check Tomorrow's Slots
```text
Use the check_dietitian_availability MCP tool to see available consultation slots for Dr. Arjun Reddy tomorrow.
```

#### Check Specific Date
```text
Use the check_dietitian_availability MCP tool to check available slots for Dr. Zara Ahmed on 2026-10-15.
```

---

### Tool 3: `lookup_nutrition` (Macronutrient & Calorie Breakdown)

#### Single Food Item
```text
Use the lookup_nutrition MCP tool to get the calories, protein, carbs, and fats for 100g of paneer.
```

#### Cooked Dish or Multiple Items
```text
Use the lookup_nutrition MCP tool to analyze 2 boiled eggs and 1 bowl of cooked oats.
```

---

### Tool 4: `generate_meal_plan` (Structured Clinical Meal Plan)

#### Diabetes / Metabolic Management
```text
Use the generate_meal_plan MCP tool to create a 3-day vegetarian meal plan for metabolic and blood sugar management with 1800 daily calories.
```

#### High-Protein Muscle Gain
```text
Use the generate_meal_plan MCP tool to generate a 5-day meal plan focusing on high-protein nutrition, excluding dairy.
```

---

### Tool 5: `get_user_schedule` (Personal Consultation Schedule)
*(Requires authenticated patient token configured in `.vscode/mcp.json`)*

```text
Use the get_user_schedule MCP tool to check my upcoming dietitian appointments.
```

---

### Tool 6: `book_dietitian_appointment` (Reserve a Slot)

```text
Use the book_dietitian_appointment MCP tool to schedule an Online consultation with Dr. Arjun Reddy on 2026-10-12 at 10:30.
```

---

## 3. The 2 Places to Add MCP Configuration in VS Code

You can define MCP servers either **per project** or **globally for all projects**:

### Location 1: Workspace Folder Config (Project Level - Recommended)
- **Path**: Inside your project root: `.vscode/mcp.json`
- **Scope**: Active only when this project folder is open.
- **How to Open / Create**:
  1. Press `Ctrl + Shift + P`.
  2. Type: `MCP: Open Workspace Folder MCP Configuration`.
  3. Press Enter. VS Code will create and open `.vscode/mcp.json`.

### Location 2: Global User Config (All Projects)
- **Path**: In your user settings directory:
  - Windows: `%APPDATA%\Code\User\mcp.json`
  - macOS: `~/Library/Application Support/Code/User/mcp.json`
  - Linux: `~/.config/Code/User/mcp.json`
- **Scope**: Available in every VS Code window and repository you open.
- **How to Open / Create**:
  1. Press `Ctrl + Shift + P`.
  2. Type: `MCP: Open User Configuration`.
  3. Press Enter.

---

## 4. How to Create or Add an MCP Server

### Method A: Using Command Palette Prompts (Interactive)
1. Press `Ctrl + Shift + P`.
2. Type `MCP: Add Server` and press Enter.
3. Select server type: `SSE`.
4. Enter server name: `nutriconnect-local` (or `nutriconnect-cloud`).
5. Enter server URL:
   - Local: `http://localhost:5000/api/agent/mcp/sse`
   - Cloud: `https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse`
6. Press Enter. VS Code automatically writes the config into `.vscode/mcp.json`.

### Method B: Manual JSON File Editing (Fastest)
Open `.vscode/mcp.json` and paste the following configuration:

```json
{
  "servers": {
    "nutriconnect-local": {
      "type": "sse",
      "url": "http://localhost:5000/api/agent/mcp/sse"
    },
    "nutriconnect-cloud": {
      "type": "sse",
      "url": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse"
    }
  }
}
```

---

## 5. How to View and Manage Connected MCP Servers

There are 3 ways to view and verify your servers in VS Code:

### 1. View Active Servers List
1. Press `Ctrl + Shift + P`.
2. Type `MCP: List Servers` and press Enter.
3. A dropdown shows each server and its status (`Running`, `Connected`, or `Stopped`).

### 2. View in the Extensions Sidebar
1. Press `Ctrl + Shift + X` to open the Extensions sidebar.
2. Scroll to the **MCP Servers** section.
3. View your servers and click the gear icon to manage, edit, or restart them.

### 3. View Live Handshake & Tool Discovery Logs
1. Press `Ctrl + ~` (tilde) or go to `View > Output`.
2. Click the **Output** tab.
3. In the dropdown at the top-right of the Output panel, choose **MCP**.
4. You will see connection messages and tool discovery:
   ```text
   [info] Starting server nutriconnect-local
   [info] Connection state: Running
   [info] Discovered 6 tools
   ```

---

## 6. How to Use MCP in Antigravity

Antigravity natively supports MCP servers through its global configuration file.

### 1. Configuration File Location
Antigravity reads MCP servers from:
```text
C:\Users\saket\.gemini\config\mcp_config.json
```

### 2. Configuration Format
To configure NutriConnect MCP servers (both Local and Cloud):
```json
{
  "mcpServers": {
    "nutriconnect-local": {
      "serverUrl": "http://localhost:5000/api/agent/mcp/sse"
    },
    "nutriconnect-cloud": {
      "serverUrl": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse"
    }
  }
}
```

### 3. How to View in Antigravity UI
1. Look at the top-right or sidebar menu in the Antigravity IDE.
2. Navigate to **Additional Options (`...`) > MCP Servers**.
3. You will see `nutriconnect-local` and `nutriconnect-cloud` listed with all 6 tools active.

### 4. How the Antigravity Agent Executes Tools
Once configured in `mcp_config.json`, the Antigravity agent discovers the tools on session start and calls them automatically whenever relevant clinical nutrition or dietitian questions are asked.

---

## 7. How the Agent Calls MCP: Native Toolbelt vs JSON-RPC Protocol Handshake

When testing or using MCP tools with an AI assistant, there are two execution paths:

### Path A: Native Client Toolbelt (No Terminal Commands)
- When a new chat session starts *after* `mcp_config.json` is saved, the IDE client contacts the SSE endpoint during startup.
- The 6 tools are loaded directly into the AI model's native function calling schema.
- When you ask a question like *"Find dietitians for hair growth"*, the AI invokes `search_dietitians` seamlessly in the background without needing terminal access.
- **Requirement to activate**: Start a **New Conversation** or reload the window (`Ctrl + R`) after updating `mcp_config.json`.

### Path B: Programmatic JSON-RPC Protocol Handshake (Direct SSE Call)
If an existing chat session does not yet have the updated configuration loaded in its live context, the agent connects via the official MCP SSE handshake protocol:

1. **Establish Stream**: Opens `GET http://localhost:5000/api/agent/mcp/sse`.
2. **Retrieve Session**: Receives `/api/agent/mcp/messages?sessionId=<ID>`.
3. **Execute Tool via JSON-RPC**:
   ```http
   POST http://localhost:5000/api/agent/mcp/messages?sessionId=<ID>
   Content-Type: application/json

   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "search_dietitians",
       "arguments": { "specialtyOrCondition": "hair growth" }
     }
   }
   ```
4. **Returns Live Data**: The backend executes the tool in MongoDB and streams the result back over SSE.



