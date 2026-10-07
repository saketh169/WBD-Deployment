# NutriConnect MCP Prompts & Testing Guide

Comprehensive copy-paste prompts, tool usage instructions, and configuration reference for **VS Code (GitHub Copilot)**, **Antigravity**, **Cursor**, and **Claude Desktop**.

---

## 1. Quick Troubleshooting: If the Model Searches the Web Instead of Calling MCP

When you ask a question and the model opens a browser search (`web_fetch`), do any of the following:

- **Quick Fix A (Tool Tag `#`)**: Prefix your prompt with `#`:
  ```text
  #search_dietitians Find dietitians specializing in diabetes
  ```
- **Quick Fix B (Tools Icon in Chat)**: Click the **Tools / Plug icon** in the chat bar and verify **`nutriconnect-local`** is checked.
- **Quick Fix C (Prompt Instruction)**: Explicitly tell the model:
  ```text
  Use the MCP tool search_dietitians from nutriconnect-local to find verified specialists.
  ```

---

## 2. Ready-to-Use Copy-Paste Prompts

### Tool 1: `search_dietitians` (Specialist Discovery)
```text
#search_dietitians Find dietitians specializing in PCOS and hormonal health.
```
```text
#search_dietitians Find female nutritionists specializing in weight management under 1000 INR.
```
```text
#search_dietitians Find dietitians specializing in cardiac and heart health.
```
```text
#search_dietitians Search for Dr. Arjun Reddy.
```

### Tool 2: `check_dietitian_availability` (Appointment Slots)
```text
#check_dietitian_availability See available consultation slots for Dr. Arjun Reddy tomorrow.
```
```text
#check_dietitian_availability Check available slots for Dr. Zara Ahmed on 2026-10-15.
```

### Tool 3: `lookup_nutrition` (Macronutrient & Calorie Breakdown)
```text
#lookup_nutrition Get the calories, protein, carbs, and fats for 100g of paneer.
```
```text
#lookup_nutrition Analyze 2 boiled eggs and 1 bowl of cooked oats.
```

### Tool 4: `generate_meal_plan` (Structured Clinical Meal Plan)
```text
#generate_meal_plan Create a 3-day vegetarian meal plan for metabolic and blood sugar management with 1800 daily calories.
```
```text
#generate_meal_plan Generate a 5-day meal plan focusing on high-protein nutrition, excluding dairy.
```

### Tool 5: `get_user_schedule` (Personal Consultation Schedule)
*(Requires authenticated patient token configured in headers or query params)*
```text
#get_user_schedule Check my upcoming dietitian appointments.
```

### Tool 6: `book_dietitian_appointment` (Reserve a Slot)
```text
#book_dietitian_appointment Schedule an Online consultation with Dr. Arjun Reddy on 2026-10-12 at 10:30.
```

---

## 3. The 2 Configuration Locations

Configuration files are kept strictly in these **2 places**:

### Location 1: Visual Studio Code
- **File Path**: `C:\Users\saket\AppData\Roaming\Code\User\mcp.json`
- **Config**:
  ```json
  {
    "servers": {
      "nutriconnect-local": {
        "type": "sse",
        "url": "http://localhost:5000/api/agent/mcp/sse"
      }
      // "nutriconnect-cloud": {
      //   "type": "sse",
      //   "url": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse"
      // }
    }
  }
  ```

### Location 2: Antigravity IDE
- **File Path**: `C:\Users\saket\.gemini\config\mcp_config.json`
- **Config**:
  ```json
  {
    "mcpServers": {
      "nutriconnect-local": {
        "serverUrl": "http://localhost:5000/api/agent/mcp/sse"
      }
      // "nutriconnect-cloud": {
      //   "serverUrl": "https://nutri-connect-wbd-backend.vercel.app/api/agent/mcp/sse"
      // }
    }
  }
  ```

---

## 4. How to View and Manage Connected MCP Servers

### In Visual Studio Code:
1. **Server List**: Press `Ctrl + Shift + P` $\to$ `MCP: List Servers` $\to$ verify `nutriconnect-local` is **Running**.
2. **Extensions Sidebar**: Press `Ctrl + Shift + X` $\to$ scroll down to **MCP Servers**.
3. **Live Logs**: `View > Output` (`Ctrl + ~`) $\to$ select **MCP** from the top-right dropdown to inspect tool discovery logs.

### In Antigravity:
1. Navigate to **Additional Options (`...`) > MCP Servers** (or **Skills & Customizations > MCP Servers**).
2. Verify `nutriconnect-local` is connected and the 6 clinical tools are toggled on.

---

## 5. How the Agent Calls MCP: Native Toolbelt vs JSON-RPC Protocol Handshake

### Path A: Native Client Toolbelt (No Commands Required)
- When a new chat conversation starts after saving the configuration, the IDE client contacts `http://localhost:5000/api/agent/mcp/sse` automatically on startup.
- All 6 tools are loaded into the AI model's function-calling toolset.
- Prompts like *"Find dietitians for PCOS"* trigger `search_dietitians` seamlessly in the background.
- **To activate**: Start a **New Conversation** or reload the window (`Ctrl + R`).

### Path B: Programmatic Protocol Handshake (Direct SSE Call)
If an existing chat session has not refreshed its toolbelt, an external client or agent connects directly via the official JSON-RPC 2.0 handshake:
1. **Connect**: `GET http://localhost:5000/api/agent/mcp/sse`
2. **Receive Session**: `/api/agent/mcp/messages?sessionId=<ID>`
3. **Execute Tool**:
   ```http
   POST http://localhost:5000/api/agent/mcp/messages?sessionId=<ID>
   Content-Type: application/json

   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "search_dietitians",
       "arguments": { "specialtyOrCondition": "PCOS" }
     }
   }
   ```
4. **Result**: The backend queries MongoDB and streams live clinical findings back over SSE.
