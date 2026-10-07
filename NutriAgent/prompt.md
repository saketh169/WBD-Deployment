# NutriConnect MCP Prompts & Testing Guide

Comprehensive copy-paste prompts, tested execution results, and configuration reference for **VS Code (GitHub Copilot)**, **Antigravity**, **Cursor**, and **Claude Desktop**.

---

## 1. Copilot Server & Tool Mention Syntax

In GitHub Copilot Chat (VS Code / Cursor), you can trigger tools in two ways:

### Server-Level Mention (Recommended):
Use `#nutriconnect-local` in front of any prompt:
```text
#nutriconnect-local Find dietitians specializing in heart health
```

### Tool-Level Mention:
Use the specific tool tag:
```text
#search_dietitians Find dietitians specializing in PCOS under 600 INR
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

#### 1. `search_dietitians`
```text
#nutriconnect-local Find dietitians specializing in cardiac and heart health
```
```text
#nutriconnect-local Find female nutritionists specializing in PCOS and hormonal health under 600 INR
```
```text
#nutriconnect-local Search for Dr. Arjun Reddy and show his experience, fee, and specialties
```

#### 2. `check_dietitian_availability`
```text
#nutriconnect-local Check available consultation slots for Dr. Arjun Reddy tomorrow
```
```text
#nutriconnect-local Show open appointment slots for Dr. Zara Ahmed on 2026-10-15
```

#### 3. `lookup_nutrition`
```text
#nutriconnect-local What are the calories, protein, carbs, and fats for 100g of paneer?
```
```text
#nutriconnect-local Analyze the nutrition facts of 2 boiled eggs and 1 bowl of cooked oats
```

#### 4. `generate_meal_plan`
```text
#nutriconnect-local Create a 3-day vegetarian meal plan for metabolic and blood sugar management with 1800 daily calories
```
```text
#nutriconnect-local Generate a 5-day high-protein meal plan excluding dairy products
```

---

### Group B: Authenticated Patient Tools (Requires JWT Token)

These tools access personal medical records and booking appointments. 

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

To unlock `get_user_schedule` and `book_dietitian_appointment` in VS Code:

Add `?token=YOUR_JWT_TOKEN` to your URL in `mcp.json`:

```json
{
  "servers": {
    "nutriconnect-local": {
      "type": "sse",
      "url": "http://localhost:5000/api/agent/mcp/sse?token=eyJhbGciOi..."
    }
  }
}
```

---

## 5. The 2 Configuration File Locations

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
