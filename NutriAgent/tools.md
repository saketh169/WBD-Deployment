# NutriAgent Clinical Tools & APIs Reference

This document provides a complete technical reference for all 7 clinical tools and dedicated APIs in the NutriAgent platform.

---

## 1. Overview of Tools Architecture

Every tool follows a clean two-layer structure:
1. **LangGraph / MCP Tool Layer (`backend/src/agent/tools/` & `backend/src/agent/langgraph/tools.js`)**:
   - Declares the Gemini function calling schema (`parameters`).
   - Validates inputs using Zod schemas (`safeParse`).
   - Resolves patient identity and extracts relevant clinical grounding from MongoDB.
   - Formats return payloads containing both structured raw data for the LLM and pre-built interactive UI cards for the frontend.
2. **Dedicated Tool API Layer (`backend/src/agent/apis/`)**:
   - Independent, modular APIs with zero custom regex mappings.
   - Executes authoritative database queries and remote service calls (e.g., USDA FoodData Central).
   - Fully testable in isolation.

---

## 2. Comprehensive Tool Matrix

| Tool Name | Underlying API | Auth Required | UI Card Produced | Primary Purpose |
| :--- | :--- | :---: | :--- | :--- |
| `search_dietitians` | `apis/specialist.api.js` | No | `dietitian_cards` | Search verified specialists by condition, specialty, name, gender, or fee. |
| `check_dietitian_availability` | `apis/schedule.api.js` | No | `slot_booking_card` | Retrieve open/busy consultation slots (09:00 AM to 08:00 PM) for any doctor. |
| `get_user_schedule` | `apis/schedule.api.js` | Yes | `user_schedule_card` | Retrieve the authenticated patient's upcoming booked appointments. |
| `book_dietitian_appointment` | `apis/booking.api.js` | Yes | `booking_confirmation_card` | Reserve a consultation slot with conflict detection. |
| `lookup_nutrition` | `apis/nutrition.api.js` | No | `nutrition_card` | Query macronutrients and calories via USDA FoodData Central. |
| `generate_meal_plan` | `apis/mealPlan.api.js` | No (Grounded if Auth) | `meal_plan_card` | Generate structured multi-meal daily clinical diet plans. |
| `get_user_health_reports` | `tools/healthReports.tool.js` | Yes | `patient_profile_card` | Retrieve verified clinical health reports, lab tests, and doctor notes. |

---

## 3. Tool Specifications

### 1. `search_dietitians`
- **File**: `backend/src/agent/tools/searchDietitians.tool.js` -> `backend/src/agent/apis/specialist.api.js`
- **Parameters**:
  - `specialtyOrCondition` (string): Clinical condition or specialty (e.g. "Diabetes", "PCOS", "Heart Health", "Weight Loss").
  - `gender` (string): Preferred doctor gender ("Female", "Male").
  - `maxFee` (number): Maximum consultation fee in INR.
  - `name` (string): Doctor or dietitian name.
  - `limit` (number): Number of results (default: 6).
- **Behavior**: Queries MongoDB `Dietitian` collection. If no dietitians match, returns an honest empty state without fabricating doctor names.

### 2. `check_dietitian_availability`
- **File**: `backend/src/agent/tools/schedule.tool.js` -> `backend/src/agent/apis/schedule.api.js`
- **Parameters**:
  - `dietitianName` (string, required): Full or partial name of the specialist.
  - `date` (string, optional): Target appointment date (YYYY-MM-DD). Defaults to today or tomorrow.
- **Behavior**:
  - Validates clinic operating hours: **09:00 AM to 08:00 PM (20:00)** daily.
  - Generates 23 slots in 30-minute intervals (`09:00` to `20:00`).
  - Fetches existing `Booking` records to mark booked slots.
  - Resolves patient's own bookings vs other patients' bookings.

### 3. `get_user_schedule`
- **File**: `backend/src/agent/tools/schedule.tool.js` -> `backend/src/agent/apis/schedule.api.js`
- **Parameters**:
  - `date` (string, optional): Filter bookings for a specific date.
- **Behavior**:
  - Resolves `effectiveUserId` via `userResolver.js`.
  - Queries active and upcoming `Booking` records for the user.
  - Returns structured `user_schedule_card`.

### 4. `book_dietitian_appointment`
- **File**: `backend/src/agent/tools/booking.tool.js` -> `backend/src/agent/apis/booking.api.js`
- **Parameters**:
  - `dietitianName` (string, required): Name of the doctor.
  - `date` (string, required): Appointment date (YYYY-MM-DD).
  - `time` (string, required): Slot time in HH:MM format (between 09:00 and 20:00).
  - `consultationType` (string): "Online" or "In-person".
- **Behavior**:
  - Validates operating hours and rejects past dates/times.
  - Verifies slot availability to prevent double-booking.
  - Inserts the new `Booking` record with status `confirmed`.

### 5. `lookup_nutrition`
- **File**: `backend/src/agent/tools/nutrition.tool.js` -> `backend/src/agent/apis/nutrition.api.js`
- **Parameters**:
  - `foodItem` (string, required): Food name or recipe (e.g. "Paneer", "Brown Rice", "Eggs").
  - `quantity` (string, optional): Portion size (e.g. "100g", "1 cup", "2 pieces").
- **Behavior**:
  - Checks in-memory cache first for fast 0ms resolution.
  - Queries USDA FoodData Central HTTP API.
  - Scales calories, protein, carbohydrates, fats, and fiber to the requested portion.

### 6. `generate_meal_plan`
- **File**: `backend/src/agent/tools/mealPlan.tool.js` -> `backend/src/agent/apis/mealPlan.api.js`
- **Parameters**:
  - `planName` (string): Title of the meal plan.
  - `dietType` (string): "Vegetarian", "Non-Vegetarian", "Vegan", "Keto", "Balanced", etc.
  - `durationDays` (number): Number of days (1 to 7).
  - `dailyCalories` (number): Target daily calories (e.g. 1800 kcal).
  - `macroTargets` (object): Targets for protein, carbs, and fats in grams.
  - `allergiesExcluded` (array): Food allergens to strictly exclude (e.g. ["Peanuts", "Shellfish"]).
  - `healthFocus` (string): Health goal (e.g. "Metabolic Control", "PCOS Management").
- **Behavior**:
  - If authenticated, grounds targets directly in the patient's latest `HealthReport`.
  - Every day contains 4 discrete meals: Breakfast, Lunch, Snacks, Dinner.
  - Returns `meal_plan_card` with macro charts and recipe prep instructions.

### 7. `get_user_health_reports`
- **File**: `backend/src/agent/tools/healthReports.tool.js`
- **Parameters**:
  - `reportType` (string, optional): Filter by report category ("all", "health", "lab"). Default: "all".
  - `date` (string, optional): Target report date or cutoff date (YYYY-MM-DD).
  - `limit` (number, optional): Maximum reports to retrieve (default: 5).
- **Behavior**:
  - Resolves authenticated patient ID and queries MongoDB `HealthReport` and `LabReport` collections.
  - Returns full clinical diagnosis, doctor notes, vital signs, lipid/metabolic panels, and diagnostic findings sorted by most recent date.
  - Automatically attaches interactive `patient_profile_card` for frontend display.
  - If patient asks for health calculations (BMI, caloric needs, metabolic rate) not explicitly stored in the report, Gemini reasons over the clinical data and performs the calculations directly without relying on a rigid hardcoded tool.
