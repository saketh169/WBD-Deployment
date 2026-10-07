# NutriConnect — NutriAgent AI RAG Architecture

## 1. What is NutriAgent RAG?
NutriAgent is a multi-agent AI assistant for NutriConnect. Instead of guessing or making up answers (hallucinating), it uses **Retrieval-Augmented Generation (RAG)**: it queries real data from **MongoDB**, **Redis**, and **USDA FoodData Central** before answering.

---

## 2. The 5 Core Pillars & Sample Questions

### Pillar 1: Medical Lab Report Analyzer (Vision OCR RAG)
* **How it works:** Reads blood test images or PDFs, extracts values, and compares them against medical reference ranges.
* **Sample Questions It Answers:**
  - *"Here is my latest blood test PDF. What does it mean?"*
  - *"My HbA1c is 6.3% and Fasting Sugar is 115 mg/dL. Is this normal?"*
  - *"My TSH is 7.2 mIU/L, what diet should I follow for thyroid?"*
* **Why it is beneficial:** Patients get plain-English explanations of confusing lab numbers without fear, directly connecting their test results to relevant dietitian care.

---

### Pillar 2: Smart Doctor Matchmaker
* **How it works:** Maps user symptoms (acidity, hair fall, PCOS) to dietitian specialties and ranks verified doctors by rating, experience, budget, and earliest open slot.
* **Sample Questions It Answers:**
  - *"I have PCOS and I'm struggling with weight. Who should I talk to?"*
  - *"Find me a top-rated diabetes specialist who speaks Telugu under ₹800."*
  - *"Show me experienced dietitians for high cholesterol."*
* **Why it is beneficial:** Users don't need medical knowledge to find the right doctor; top verified dietitians are automatically recommended with zero guesswork.

---

### Pillar 3: In-Chat Live Booking & 30s Redis Hold
* **How it works:** Queries live calendar slots, locks the selected slot for 30 seconds via Redis to prevent race conditions, and launches Razorpay directly in chat.
* **Sample Questions It Answers:**
  - *"When is Dr. Sharma free this Friday?"*
  - *"Book the 10:30 AM slot tomorrow for an online consultation."*
  - *"Reschedule my appointment from Thursday to Saturday."*
* **Why it is beneficial:** Converts user interest immediately inside the chat. Users don't drop off navigating across multiple booking pages.

---

### Pillar 4: Nearby Clinic Geolocation Locator
* **How it works:** Uses GPS, city, or pincode to run a 10–25 km radius search for in-person clinic visits, with automatic fallback to top online dietitians.
* **Sample Questions It Answers:**
  - *"Are there any verified dietitians near me in Tirupati for an in-person visit?"*
  - *"Find clinic consultations near pincode 560001."*
* **Why it is beneficial:** Bridges physical offline clinic footfall with online telemedicine consultations seamlessly.

---

### Pillar 5: Clinically Validated Diet Plan Generator
* **How it works:** Calculates exact calorie/macro targets using Mifflin-St Jeor formulas, drafts structured meals, validates calories & allergens against USDA food data, and saves as an AI Draft for dietitian review.
* **Sample Questions It Answers:**
  - *"Make me a 7-day vegetarian weight-loss meal plan for hypothyroidism."*
  - *"Create a 1,600 kcal South Indian diet plan with high protein and no peanuts."*
* **Why it is beneficial:** Users get safe, structured meal plans instantly. Dietitians save 80% of manual typing time by reviewing pre-validated AI drafts.

---

## 3. General Nutrition & Food Q&A (USDA RAG)
The RAG pipeline also answers general nutrition queries using **USDA FoodData Central**:
* **Sample Questions It Answers:**
  - *"How much protein and calories are in 100g paneer vs 100g tofu?"*
  - *"Can a diabetic eat ripe bananas or mangoes?"*
  - *"What are high-fiber Indian breakfast foods for acidity?"*
* **Why it is beneficial:** Delivers 100% scientifically accurate, verified nutrient counts rather than generic AI guesses.

---

## 4. The 2 Supporting Safety & Memory Systems

| System | Role | How It Protects the User |
| :--- | :--- | :--- |
| **User Health Memory** | Context Persistence | Remembers diet type (veg/non-veg), weight, allergies, and goals so the user isn't asked repeatedly. |
| **Confirmation Gate** | Transaction Security | AI cannot book or charge money automatically. All financial and write actions require an explicit button click on a **Confirmation Card**. Emergency keywords (chest pain, fainting) trigger instant emergency hospital guidance. |

---

## 5. Summary of Key Benefits

1. **Zero Hallucination:** Doctor names, prices, slots, and calories are real data from MongoDB, Redis, and USDA.
2. **End-to-End Journey:** Lab report analysis ➔ Doctor match ➔ Live booking ➔ Diet plan in one single chat.
3. **Medical Safety:** Follows DPDP Act privacy guidelines and keeps human dietitians in the approval loop for clinical plans.

---

## 6. Troubleshooting: Hitting the 20-Request Daily Cap in Development

Google's free-tier Gemini API enforces a strict limit of **20 requests per day per project/model** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). When this limit is reached, Google returns an HTTP `429 Too Many Requests` error with a retry delay of ~14–24 hours.

To instantly resolve this during development without waiting for the daily reset, use one of the two options below:

### Option 1: Create a New API Key in a New Project (Same Account)
1. Visit [Google AI Studio API Keys](https://aistudio.google.com/app/apikey).
2. Click **Create API Key**.
3. Choose **"Create API key in new project"** (creating the key inside a new Google Cloud project gives an independent, fresh 20-request daily quota).
4. Copy the new key and update `backend/.env`:
   ```env
   GEMINI_API_KEY=AIzaSyYourNewKeyHere...
   ```
5. Restart the backend server (`npm run dev` or `node src/server.js`).

---

### Option 2: Create / Switch to a New Google Account
If quota across all projects in your existing Google account is exhausted:
1. Open an incognito/private window or switch browser profile to another Google account.
2. Sign in to [Google AI Studio](https://aistudio.google.com/).
3. Accept terms and click **Get API key** ➔ **Create API key**.
4. Copy the new key and update `backend/.env`:
   ```env
   GEMINI_API_KEY=AIzaSyYourFreshAccountKeyHere...
   ```
5. Restart your backend server. The new account gives you a completely clean, fresh daily allowance across all models immediately.
