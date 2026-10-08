# NutriAgent Frontend UI Cards Architecture

This document describes the interactive UI artifact cards rendered in NutriAgent chat (`frontend/src/agent/features/`).

---

## 1. Card Architecture Overview

When the backend LangGraph engine executes clinical tools, it returns an array of structured card objects alongside the synthesized textual response:

```json
{
  "success": true,
  "reply": "Here are the available specialists and consultation times.",
  "cards": [
    {
      "type": "dietitian_cards",
      "data": { "dietitians": [...] }
    },
    {
      "type": "slot_booking_card",
      "data": { "dietitian": { ... }, "dailySchedules": [...] }
    }
  ]
}
```

In `frontend/src/agent/NutriAgentPage.jsx`, the card registry dynamically resolves and mounts the corresponding React component inline inside the chat transcript.

---

## 2. Supported Card Types

| Card Type | Component File | Description & Key Features |
| :--- | :--- | :--- |
| `dietitian_cards` | `DietitianCard.jsx` | Grid of specialist profile cards displaying credentials, rating, experience, fee in INR, and a "Book Consultation" action button. |
| `slot_booking_card` | `SlotBookingCard.jsx` | Interactive 7-day calendar slot picker with real-time status (Open, Booked, Busy), daily slots up to 8:00 PM, and past slot filtering. |
| `user_schedule_card` | `UserScheduleCard.jsx` | Summary card displaying upcoming consultations with doctor names, dates, times, consultation types, and a direct link to the user schedule dashboard. |
| `nutrition_card` | `NutritionCard.jsx` | Nutritional breakdown card displaying calories, protein, carbohydrates, fats, fiber, and portion size badges. |
| `meal_plan_card` | `MealPlanCard.jsx` | Multi-day dietary plan card with tabs for each day, calorie and macro breakdowns, and four meal accordions (Breakfast, Lunch, Snacks, Dinner). |
| `patient_profile_card` | `PatientProfileCard.jsx` | Medical grounding card displaying patient demographics, latest diagnosis, lab biomarkers (HbA1c, fasting glucose), and supervising dietitian targets. |
| `booking_confirmation_card` | `BookingConfirmationCard.jsx` | Transaction success receipt confirming appointment reservation details and consultation links. |
| `uploaded_document_card` | `UploadedDocumentCard.jsx` | Attachment indicator displaying medical lab report PDF/image status and vision analysis confirmation. |

---

## 3. SlotBookingCard Specification

`SlotBookingCard.jsx` handles consultation booking interactions:

### 1. Operating Hours & Daily Slots
- Clinic hours: **09:00 AM to 08:00 PM (20:00)** daily.
- Exactly 23 distinct 30-minute intervals:
  `09:00`, `09:30`, `10:00`, `10:30`, `11:00`, `11:30`, `12:00`, `12:30`, `13:00`, `13:30`, `14:00`, `14:30`, `15:00`, `15:30`, `16:00`, `16:30`, `17:00`, `17:30`, `18:00`, `18:30`, `19:00`, `19:30`, `20:00`.

### 2. Normalized Slot Statuses
The UI cleanly displays 3 clear statuses:
1. **Open (Green)**: The slot is available for booking.
2. **Booked (Red)**: The slot is already booked by the currently signed-in user with this doctor.
3. **Busy (Orange)**: The slot is unavailable (booked by another patient, booked by the user with another specialist, or marked blocked by the clinic).

### 3. Dynamic Real-Time Past Slot Filtering
- For today's date (`isToday(date) === true`), slots whose start time has already elapsed in local client time are dynamically filtered out.
- They are completely omitted from the UI display and excluded from open slot count badges.
- Applies seamlessly to newly rendered cards as well as existing cards loaded from chat history.

### 4. Live Updates & Deduplication
- Multiple cards in the same chat session do not open independent Socket.IO connections.
- The parent `NutriAgentPage` maintains a single stable Socket.IO listener.
- Upon receiving a live booking update, it emits a lightweight `window.dispatchEvent(new CustomEvent("nutri_booking_update"))`, prompting visible cards to refresh availability in place.
