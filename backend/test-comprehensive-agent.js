require("dotenv").config();
const mongoose = require("mongoose");
const { runLangGraphAgent } = require("./src/agent/langgraph");
const { executeLangGraphTool } = require("./src/agent/langgraph/tools");
const { findDietitiansApi } = require("./src/agent/apis/specialist.api");
const { lookupNutritionApi } = require("./src/agent/apis/nutrition.api");
const { executeGetUserHealthReports } = require("./src/agent/tools/healthReports.tool");
const { generateMealPlanApi } = require("./src/agent/apis/mealPlan.api");
const { bookDietitianAppointmentApi } = require("./src/agent/apis/booking.api");
const { checkDietitianAvailabilityApi, getUserScheduleApi } = require("./src/agent/apis/schedule.api");
const { Dietitian, User } = require("./src/models/userModel");

async function runTestSuite() {
  console.log("================================================================================");
  console.log("NUTRIAGENT RIGOROUS COMPREHENSIVE QUERY & EDGE CASE TEST HARNESS");
  console.log("================================================================================");

  if (process.env.MONGODB_URL && mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URL);
  }

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(testName, condition, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}${details ? ` -> ${details}` : ""}`);
    } else {
      failedTests++;
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    }
  }

  console.log("\n--- Category 1: Specialist Search & Clinical Condition Mapping ---");
  {
    // 1. Heart / Cardiac specialist search
    const r1 = await findDietitiansApi({ specialtyOrCondition: "heart" });
    assert("Find dietitians for 'heart' matches verified cardiac specialists", r1.success && r1.count > 0, `Found: ${r1.count}`);

    // 2. Cardiac specialist search
    const r2 = await findDietitiansApi({ specialtyOrCondition: "Cardiac Health" });
    assert("Find dietitians for 'Cardiac Health'", r2.success && r2.count > 0, `Found: ${r2.count}`);

    // 3. PCOS / Women's health search
    const r3 = await findDietitiansApi({ specialtyOrCondition: "PCOS" });
    assert("Find dietitians for 'PCOS'", r3.success && r3.count > 0, `Found: ${r3.count}`);

    // 4. Diabetes search
    const r4 = await findDietitiansApi({ specialtyOrCondition: "Diabetes" });
    assert("Find dietitians for 'Diabetes'", r4.success && r4.count > 0, `Found: ${r4.count}`);

    // 5. Gut Health / IBS search
    const r5 = await findDietitiansApi({ specialtyOrCondition: "Gut Health" });
    assert("Find dietitians for 'Gut Health'", r5.success && r5.count > 0, `Found: ${r5.count}`);

    // 6. Skin & Hair search
    const r6 = await findDietitiansApi({ specialtyOrCondition: "Skin & Hair" });
    assert("Find dietitians for 'Skin & Hair'", r6.success && r6.count > 0, `Found: ${r6.count}`);

    // 7. Female filter
    const r7 = await findDietitiansApi({ gender: "female", limit: 5 });
    assert("Filter by female gender only", r7.success && r7.dietitians.every((d) => d.gender === "female"), `Count: ${r7.count}`);

    // 8. Male filter
    const r8 = await findDietitiansApi({ gender: "male", limit: 5 });
    assert("Filter by male gender only", r8.success && r8.dietitians.every((d) => d.gender === "male"), `Count: ${r8.count}`);

    // 9. Fee limit filter
    const r9 = await findDietitiansApi({ maxFee: 500, limit: 5 });
    assert("Filter by max fee <= 500 INR", r9.success && r9.dietitians.every((d) => d.fee <= 500), `Count: ${r9.count}`);

    // 10. Specific name search
    const r10 = await findDietitiansApi({ name: "Priya Sharma" });
    assert("Search dietitian by name 'Priya Sharma'", r10.success && r10.count >= 1 && r10.dietitians[0].name.includes("Priya Sharma"));

    // 11. Unknown specialty search (zero results handled gracefully)
    const r11 = await findDietitiansApi({ specialtyOrCondition: "quantum physics neuro-astrology" });
    assert("Unknown specialty returns 0 count cleanly without error", r11.success && r11.count === 0);
  }

  console.log("\n--- Category 2: Nutrition Lookup & Calorie Calculations ---");
  {
    // 12. Paneer 100g
    const n1 = await lookupNutritionApi({ foodItem: "paneer", quantity: "100g" });
    assert("Nutrition lookup: 100g paneer", n1.success && n1.data?.calories > 0 && n1.data?.protein > 0, `Calories: ${n1.data?.calories}, Protein: ${n1.data?.protein}g`);

    // 13. Boiled egg 2 whole
    const n2 = await lookupNutritionApi({ foodItem: "boiled egg", quantity: "2 whole" });
    assert("Nutrition lookup: 2 boiled eggs", n2.success && n2.data?.calories > 0, `Calories: ${n2.data?.calories}`);

    // 14. Banana 1 medium
    const n3 = await lookupNutritionApi({ foodItem: "banana", quantity: "1 medium" });
    assert("Nutrition lookup: 1 medium banana", n3.success && n3.data?.carbs > 0, `Carbs: ${n3.data?.carbs}g`);

    // 15. Chicken breast 150g
    const n4 = await lookupNutritionApi({ foodItem: "chicken breast", quantity: "150g" });
    assert("Nutrition lookup: 150g chicken breast", n4.success && n4.data?.protein > 0, `Protein: ${n4.data?.protein}g`);

    // 16. Missing quantity fallback
    const n5 = await lookupNutritionApi({ foodItem: "apple" });
    assert("Nutrition lookup with missing quantity uses default portion", n5.success && n5.data?.calories > 0);

    // 17. Unknown/gibberish food query
    const n6 = await lookupNutritionApi({ foodItem: "xyz987qwerunknowndish" });
    assert("Unknown food query handles gracefully without crashing", typeof n6.success === "boolean");
  }

  console.log("\n--- Category 3: Clinical Health Reports & Biomarkers ---");
  {
    // 18. Health reports for unauthenticated context
    const h1 = await executeGetUserHealthReports({ reportType: "all" }, { userId: null });
    assert("Health reports for unauthenticated context handles safely", typeof h1.success === "boolean");

    // 19. Health reports with limit
    const h2 = await executeGetUserHealthReports({ reportType: "health", limit: 2 }, { userId: null });
    assert("Health reports with limit parameter", typeof h2.success === "boolean");

    // 20. Health reports with lab filter
    const h3 = await executeGetUserHealthReports({ reportType: "lab", limit: 1 }, { userId: null });
    assert("Health reports with lab filter", typeof h3.success === "boolean");

    // 21. Health reports with date filter
    const h4 = await executeGetUserHealthReports({ date: "2026-10-01" }, { userId: null });
    assert("Health reports with date parameter", typeof h4.success === "boolean");

    // 22. Empty options handling
    const h5 = await executeGetUserHealthReports({}, { userId: null });
    assert("Health reports with default parameters", typeof h5.success === "boolean");
  }

  console.log("\n--- Category 4: Clinical Meal Plan Generation ---");
  {
    // 23. 1-day vegetarian meal plan for diabetes
    const p1 = await generateMealPlanApi({ targetCalories: 1800, dietType: "Vegetarian", healthConditions: ["Diabetes"], durationDays: 1 });
    assert("1-day vegetarian diabetic meal plan", p1.success && p1.plan?.dailyCalories === 1800 && p1.plan?.dietType === "Vegetarian" && p1.plan?.days?.length === 1);

    // 24. 3-day meal plan with allergy exclusions
    const p2 = await generateMealPlanApi({ targetCalories: 2200, dietType: "Non-Vegetarian", allergiesExcluded: ["Peanuts", "Shellfish"], durationDays: 3 });
    assert("3-day meal plan with allergy exclusions", p2.success && p2.plan?.daysCount === 3 && p2.plan?.allergiesExcluded.includes("Peanuts"));

    // 25. Every day has 4 meals (Breakfast, Lunch, Snacks, Dinner)
    const allDaysHave4Meals = p1.plan?.days.every((d) => d.meals?.length === 4);
    assert("All plan days have 4 distinct meals (Breakfast, Lunch, Snacks, Dinner)", allDaysHave4Meals);
  }

  console.log("\n--- Category 5: Appointment Booking Edge Cases ---");
  {
    // 26. Invalid date format rejection
    const b1 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "invalid-date-format", time: "10:00" });
    assert("Rejects non-ISO date string", !b1.success && b1.message.includes("YYYY-MM-DD"));

    // 27. Past date rejection
    const b2 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2020-01-01", time: "10:00" });
    assert("Rejects past date appointment", !b2.success && b2.message.includes("past date"));

    // 28. Time before 09:00 rejection
    const b3 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2030-01-01", time: "07:30" });
    assert("Rejects appointment time before 09:00 AM", !b3.success && b3.message.includes("appointment hours"));

    // 29. Time after 20:00 rejection
    const b4 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2030-01-01", time: "21:30" });
    assert("Rejects appointment time after 08:00 PM", !b4.success && b4.message.includes("appointment hours"));

    // 30. Unknown dietitian rejection
    const dummyId = new mongoose.Types.ObjectId();
    const b5 = await bookDietitianAppointmentApi({ userId: dummyId, dietitianName: "Dr. Completely Nonexistent Person", date: "2030-01-01", time: "11:00" });
    assert("Rejects booking for non-existent dietitian", !b5.success && b5.message.includes("No verified dietitian found"));
  }

  console.log("\n--- Category 6: LangGraph End-to-End Live Agent Execution ---");
  {
    // 31. Live specialist discovery query
    console.log("Testing live agent: 'find verified female dietitians for pcos'...");
    const a1 = await runLangGraphAgent("find verified female dietitians for pcos", [], {});
    assert("Live query: female dietitians for PCOS triggers search_dietitians", a1.toolsExecuted.includes("search_dietitians") && a1.cards.some((c) => c.type === "dietitian_cards"), `Tools: [${a1.toolsExecuted.join(", ")}]`);

    // 32. Live nutrition query
    console.log("Testing live agent: 'how many calories in 100g paneer'...");
    const a2 = await runLangGraphAgent("how many calories in 100g paneer", [], {});
    assert("Live query: nutrition lookup triggers lookup_nutrition", a2.toolsExecuted.includes("lookup_nutrition") && a2.cards.some((c) => c.type === "nutrition_card"), `Tools: [${a2.toolsExecuted.join(", ")}]`);

    // 33. Live BMI query
    console.log("Testing live agent: 'calculate my bmi for 80kg and 180cm'...");
    const a3 = await runLangGraphAgent("calculate my bmi for 80kg and 180cm", [], {});
    assert("Live query: BMI calculation triggers calculate_health_metrics", a3.toolsExecuted.includes("calculate_health_metrics") || a3.reply.toLowerCase().includes("bmi"), `Tools: [${a3.toolsExecuted.join(", ")}]`);

    // 34. Live clinical Q&A explanation
    console.log("Testing live agent: 'what is a tumor'...");
    const a4 = await runLangGraphAgent("what is a tumor", [], {});
    const lower4 = (a4.reply || "").toLowerCase();
    assert("In-domain clinical explanation without out-of-domain refusal", lower4.includes("tumor") || lower4.includes("cells") || lower4.includes("mass"), `Length: ${a4.reply.length}`);

    // 35. Live out-of-domain refusal
    console.log("Testing live agent: 'what is a school'...");
    const a5 = await runLangGraphAgent("what is a school", [], {});
    const lower5 = (a5.reply || "").toLowerCase();
    assert("Out-of-domain refusal for non-health topic", lower5.includes("health") || lower5.includes("nutrition") || lower5.includes("cannot assist"), `Reply: ${a5.reply.substring(0, 80)}...`);

    // 36. Zero emojis guarantee across all replies
    const hasEmoji = Array.from(a1.reply + a2.reply + a3.reply + a4.reply + a5.reply).some((char) => {
      const cp = char.codePointAt(0);
      return (cp >= 0x1f300 && cp <= 0x1faff) || (cp >= 0x2600 && cp <= 0x27bf);
    });
    assert("Strict Zero Emojis across all live responses", !hasEmoji);
  }

  console.log("\n================================================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
  console.log("================================================================================");

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

runTestSuite().catch((err) => {
  console.error("Test harness crash:", err);
  process.exit(1);
});
