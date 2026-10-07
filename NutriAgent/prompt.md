# NutriConnect MCP Prompts & Testing Guide

Comprehensive copy-paste prompts, tested execution results, and configuration reference for **VS Code (GitHub Copilot)**, **Antigravity**, **Cursor**, and **Claude Desktop**.

---

## 1. Quick Troubleshooting: If the Model Searches the Web Instead of Calling MCP

When you ask a question and the model opens a browser search (`web_fetch`), do any of the following:

- **Quick Fix A (Server Mention `#`)**: Prefix your prompt with `#nutriconnect-local`:
  ```text
  #nutriconnect-local Find dietitians specializing in diabetes
  ```
- **Quick Fix B (Tool Mention `#`)**: Prefix your prompt with `#search_dietitians`:
  ```text
  #search_dietitians Find dietitians specializing in diabetes
  ```
- **Quick Fix C (Tools Icon in Chat)**: Click the **Tools / Plug icon** in the chat bar and verify **`nutriconnect-local`** is checked.
- **Quick Fix D (Prompt Instruction)**: Explicitly tell the model:
  ```text
  Use the MCP tool search_dietitians from nutriconnect-local to find verified specialists.
  ```

---

## 2. Test Verification Matrix (Tested Live)

We executed all 6 tools live against `http://localhost:5000/api/agent/mcp/sse`:

| Tool | Public (No Token) | Authenticated (With JWT Token) | Status | What It Returns |
| :--- | :---: | :---: | :---: | :--- |
| `search_dietitians` | **Works** | **Works** | Verified | Live MongoDB specialist directory with credentials and fees |
| `check_dietitian_availability` | **Works** | **Works** | Verified | Live consultation slots (9:00 AM - 8:00 PM) for any doctor |
| `lookup_nutrition` | **Works** | **Works** | Verified | Calories, protein, carbs, and fats scaled to portion |
| `generate_meal_plan` | **Works** | **Works** | Verified | 3 to 5-day structured meal plans (Breakfast, Lunch, Snacks, Dinner) |
| `get_user_schedule` | **Requires Token** | **Works** | Verified | *"Please sign in to view your consultations schedule"* without token; returns live bookings when JWT token is passed |
| `book_dietitian_appointment` | **Requires Token** | **Works** | Verified | *"A valid patient profile session is required to book an appointment"* without token; reserves slot when JWT token is passed |

---

## 3. Ready-to-Use Copy-Paste Prompts

### Group A: Public Clinical Tools (Works Instantly - Zero Token Needed)

#### 1. `search_dietitians` (Specialist Discovery)
```text
#nutriconnect-local Find dietitians specializing in cardiac and heart health
```
```text
#nutriconnect-local Find female nutritionists specializing in PCOS and hormonal health under 600 INR
```
```text
#nutriconnect-local Search for Dr. Arjun Reddy and show his experience, fee, and specialties
```
```text
#nutriconnect-local Find clinical nutritionists specializing in diabetes and weight management
```

#### 2. `check_dietitian_availability` (Calendar & Slots)
```text
#nutriconnect-local Check available consultation slots for Dr. Arjun Reddy tomorrow
```
```text
#nutriconnect-local Show open appointment slots for Dr. Zara Ahmed on 2026-10-15
```

#### 3. `lookup_nutrition` (Macronutrients & Calories)
```text
#nutriconnect-local What are the calories, protein, carbs, and fats for 100g of paneer?
```
```text
#nutriconnect-local Analyze the nutrition facts of 2 boiled eggs and 1 bowl of cooked oats
```
```text
#nutriconnect-local What is the nutritional breakdown of 150g chicken breast vs 150g tofu?
```

#### 4. `generate_meal_plan` (Structured Clinical Meal Plans)
```text
#nutriconnect-local Create a 3-day vegetarian meal plan for metabolic and blood sugar management with 1800 daily calories
```
```text
#nutriconnect-local Generate a 5-day high-protein meal plan excluding dairy products
```
```text
#nutriconnect-local Create a 3-day cardiac diet meal plan with under 1500mg sodium and 1600 daily calories
```

---

### Group B: Authenticated Patient Tools (Requires JWT Token)

These tools access personal patient records and booking tables.

- **Without Token**: Returns a clean explanation asking you to sign in.
- **With Token**: Returns your personal consultation schedule and confirms appointments.

#### 5. `get_user_schedule`
```text
#nutriconnect-local Check my upcoming dietitian consultations schedule
```
*(Without Token response: "Please sign in to view your consultations schedule.")*

#### 6. `book_dietitian_appointment`
```text
#nutriconnect-local Book an Online consultation with Dr. Arjun Reddy on 2026-10-15 at 10:30
```
*(Without Token response: "A valid patient profile session is required to book an appointment. Please sign in first.")*

---

## 4. How to Add a JWT Token to Unlock Patient Tools

To unlock `get_user_schedule` and `book_dietitian_appointment`:

Add `?token=YOUR_JWT_TOKEN` to your URL in `mcp.json`:

```json
{
  "servers": {
    "nutriconnect-local": {
      "type": "sse",
      "url": "http://localhost:5000/api/agent/mcp/sse?token=YOUR_JWT_TOKEN"
    }
  }
}
```

---

## 5. How to Create or Open the MCP Configuration File in VS Code

You can open or create your MCP configuration directly from VS Code using the **Command Palette**:

### Command to Open Global User Config:
1. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on macOS).
2. Type:
   ```text
   MCP: Open User Configuration
   ```
3. Press **Enter**. This opens `C:\Users\saket\AppData\Roaming\Code\User\mcp.json`.

### Command to Open Project Workspace Config:
1. Press `Ctrl + Shift + P`.
2. Type:
   ```text
   MCP: Open Workspace Folder MCP Configuration
   ```
3. Press **Enter**. This creates and opens `.vscode/mcp.json` inside your project folder.

### Command to Add Server Interactively:
1. Press `Ctrl + Shift + P`.
2. Type:
   ```text
   MCP: Add Server
   ```
3. Select `SSE` $\to$ Enter name `nutriconnect-local` $\to$ Enter URL `http://localhost:5000/api/agent/mcp/sse`.

---

## 6. The 2 Configuration File Locations

Configuration files are maintained strictly in these **2 places**:

### Location 1: Visual Studio Code (Global User)
- **Path**: `C:\Users\saket\AppData\Roaming\Code\User\mcp.json`
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

### Location 2: Antigravity IDE (Global)
- **Path**: `C:\Users\saket\.gemini\config\mcp_config.json`
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

## 7. How to View and Manage Connected MCP Servers

### In Visual Studio Code:
1. **Server List**: Press `Ctrl + Shift + P` $\to$ `MCP: List Servers` $\to$ verify `nutriconnect-local` is **Running**.
2. **Extensions Sidebar**: Press `Ctrl + Shift + X` $\to$ scroll down to **MCP Servers**.
3. **Live Logs**: `View > Output` (`Ctrl + ~`) $\to$ select **MCP** from the top-right dropdown to inspect tool discovery logs:
   ```text
   [info] Starting server nutriconnect-local
   [info] Connection state: Running
   [info] Discovered 6 tools
   ```

### In Antigravity:
1. Navigate to **Additional Options (`...`) > MCP Servers** (or **Skills & Customizations > MCP Servers**).
2. Verify `nutriconnect-local` is connected and the 6 clinical tools are toggled on.

---

## 8. How the Agent Calls MCP: Native Toolbelt vs JSON-RPC Protocol Handshake

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
