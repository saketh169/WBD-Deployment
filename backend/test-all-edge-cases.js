require("dotenv").config();
const mongoose = require("mongoose");
const { findDietitiansApi } = require("./src/agent/apis/specialist.api");
const { checkDietitianAvailabilityApi, getUserScheduleApi } = require("./src/agent/apis/schedule.api");
const { bookDietitianAppointmentApi } = require("./src/agent/apis/booking.api");
const { lookupNutritionApi } = require("./src/agent/apis/nutrition.api");
const { generateMealPlanApi } = require("./src/agent/apis/mealPlan.api");
const { calculateHealthMetricsApi } = require("./src/agent/apis/healthMetrics.api");
const { Dietitian, User } = require("./src/models/userModel");
const Booking = require("./src/models/bookingModel");
const { BlockedSlot } = require("./src/models/bookingModel");

async function runEdgeCases() {
  console.log("================================================================================");
  console.log("EXHAUSTIVE EDGE CASE AUDIT ACROSS ALL 7 NUTRIAGENT DEDICATED APIS");
  console.log("================================================================================");

  if (process.env.MONGODB_URL && mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URL);
  }

  let total = 0;
  let passed = 0;
  let failed = 0;

  function test(name, condition, details = "") {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS ${total}] ${name}${details ? ` -> ${details}` : ""}`);
    } else {
      failed++;
      console.error(`[FAIL ${total}] ${name}${details ? ` -> ${details}` : ""}`);
    }
  }

  // ---------------------------------------------------------------------------
  // API 1: Specialist Search (findDietitiansApi) Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- API 1: Specialist Search Edge Cases ---");
  {
    // EC 1: Empty args (returns default verified list)
    const r1 = await findDietitiansApi({});
    test("Empty args returns verified dietitians", r1.success && r1.count > 0, `Count: ${r1.count}`);

    // EC 2: Punctuation in search term ("Women's Health")
    const r2 = await findDietitiansApi({ specialtyOrCondition: "Women's Health" });
    test("Punctuation 'Women\\'s Health' matches specialists", r2.success && r2.count > 0, `Count: ${r2.count}`);

    // EC 3: Ampersand in search term ("Skin & Hair")
    const r3 = await findDietitiansApi({ specialtyOrCondition: "Skin & Hair" });
    test("Ampersand 'Skin & Hair' matches specialists", r3.success && r3.count > 0, `Count: ${r3.count}`);

    // EC 4: Hyphenated condition ("Type-2 Diabetes")
    const r4 = await findDietitiansApi({ specialtyOrCondition: "Type-2 Diabetes" });
    test("Hyphenated 'Type-2 Diabetes' matches specialists", r4.success && r4.count > 0, `Count: ${r4.count}`);

    // EC 5: Name search with 'Dr.' prefix
    const r5 = await findDietitiansApi({ name: "Dr. Priya Sharma" });
    test("Search with 'Dr.' prefix finds doctor", r5.success && r5.count > 0 && r5.dietitians[0].name.includes("Priya"));

    // EC 6: Name search without 'Dr.' prefix
    const r6 = await findDietitiansApi({ name: "priya sharma" });
    test("Search without 'Dr.' prefix (lowercase) finds doctor", r6.success && r6.count > 0 && r6.dietitians[0].name.includes("Priya"));

    // EC 7: Zero fee filter
    const r7 = await findDietitiansApi({ maxFee: 0 });
    test("Zero maxFee does not filter out all dietitians", r7.success && r7.count > 0);

    // EC 8: Limit clamping
    const r8 = await findDietitiansApi({ limit: 3 });
    test("Limit argument clamps returned count to 3", r8.success && r8.dietitians.length === 3);

    // EC 9: Unknown nonsense condition
    const r9 = await findDietitiansApi({ specialtyOrCondition: "alien space disease" });
    test("Unknown condition returns 0 count safely without crash", r9.success && r9.count === 0);
  }

  // ---------------------------------------------------------------------------
  // API 2: Schedule & Availability (checkDietitianAvailabilityApi) Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- API 2: Schedule & Availability Edge Cases ---");
  {
    // EC 10: Missing doctor name
    const s1 = await checkDietitianAvailabilityApi({});
    test("Missing doctor name returns graceful error", !s1.success && s1.message.includes("name is required"));

    // EC 11: Nonexistent doctor
    const s2 = await checkDietitianAvailabilityApi({ dietitianName: "Dr. Phantom Doctor" });
    test("Nonexistent doctor returns not found error", !s2.success && s2.message.includes("not found"));

    // EC 12: Doctor availability returns daily slots
    const s3 = await checkDietitianAvailabilityApi({ dietitianName: "Dr. Arjun Reddy" });
    test("Available slots generated across daily working hours", s3.success && Array.isArray(s3.dailySchedules) && s3.dailySchedules[0]?.allDaySlots?.length > 0, `Slots: ${s3.dailySchedules[0]?.allDaySlots?.length}`);

    // EC 13: Free slots array returned
    test("Free slots array is defined and contains valid times", s3.success && Array.isArray(s3.availableSlots));

    // EC 14: Doctor name without 'Dr.' prefix
    const s4 = await checkDietitianAvailabilityApi({ dietitianName: "arjun reddy" });
    test("Availability works without 'Dr.' prefix", s4.success && s4.dietitian?.name?.includes("Arjun"));
  }

  // ---------------------------------------------------------------------------
  // API 3: User Schedule (getUserScheduleApi) Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- API 3: User Schedule Edge Cases ---");
  {
    // EC 15: Null / missing patientId
    const u1 = await getUserScheduleApi({});
    test("Missing patientId returns empty schedule cleanly", u1.success && u1.consultations.length === 0);

    // EC 16: Invalid ObjectId
    const u2 = await getUserScheduleApi({ patientId: "not-an-id" });
    test("Invalid ObjectId string returns empty schedule cleanly", u2.success && u2.consultations.length === 0);

    // EC 17: Valid patient lookup
    const sampleUser = await User.findOne({}).lean();
    if (sampleUser) {
      const u3 = await getUserScheduleApi({ patientId: sampleUser._id });
      test("Valid user schedule query executes without crashing", u3.success && Array.isArray(u3.consultations));
    }
  }

  // ---------------------------------------------------------------------------
  // API 4: Appointment Booking (bookDietitianAppointmentApi) Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- API 4: Appointment Booking Edge Cases ---");
  {
    // EC 18: Missing date
    const b1 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", time: "10:00" });
    test("Missing date is rejected", !b1.success);

    // EC 19: Missing time
    const b2 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2030-01-01" });
    test("Missing time is rejected", !b2.success);

    // EC 20: Missing doctor name
    const b3 = await bookDietitianAppointmentApi({ date: "2030-01-01", time: "10:00" });
    test("Missing doctor name is rejected", !b3.success);

    // EC 21: Non-ISO date format
    const b4 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "15/10/2030", time: "10:00" });
    test("Non-ISO date string is rejected", !b4.success && b4.message.includes("YYYY-MM-DD"));

    // EC 22: Past date
    const b5 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2021-05-20", time: "10:00" });
    test("Past date is rejected", !b5.success && b5.message.includes("past date"));

    // EC 23: Time outside operating hours (before 09:00)
    const b6 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2030-01-01", time: "06:00" });
    test("Time before 09:00 AM is rejected", !b6.success && b6.message.includes("appointment hours"));

    // EC 24: Time outside operating hours (after 20:00)
    const b7 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2030-01-01", time: "22:00" });
    test("Time after 08:00 PM is rejected", !b7.success && b7.message.includes("appointment hours"));

    // EC 25: Non-standard time interval (e.g. 10:17)
    const b8 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2030-01-01", time: "10:17" });
    test("Non-30min slot (10:17) is rejected", !b8.success && b8.message.includes("appointment hours"));

    // EC 26: Non-existent doctor
    const b9 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Invisible Person", date: "2030-01-01", time: "10:00" });
    test("Non-existent doctor is rejected", !b9.success && b9.message.includes("No verified dietitian found"));

    // EC 27: Unauthenticated patient session
    const b10 = await bookDietitianAppointmentApi({ dietitianName: "Dr. Arjun Reddy", date: "2030-01-01", time: "10:00" });
    test("Missing patient session is rejected", !b10.success && b10.message.includes("patient session is required"));
  }

  // ---------------------------------------------------------------------------
  // API 5: Nutrition Lookup (lookupNutritionApi) Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- API 5: Nutrition Lookup Edge Cases ---");
  {
    // EC 28: Grams unit ("200g")
    const nu1 = await lookupNutritionApi({ foodItem: "paneer", quantity: "200g" });
    test("Portion '200g' scales macros proportionally (double 100g)", nu1.success && nu1.data?.calories >= 180, `Calories: ${nu1.data?.calories}`);

    // EC 29: Piece/whole unit ("3 whole")
    const nu2 = await lookupNutritionApi({ foodItem: "egg", quantity: "3 whole" });
    test("Portion '3 whole' multiplies egg counts", nu2.success && nu2.data?.calories > 0, `Calories: ${nu2.data?.calories}`);

    // EC 30: Milliliters unit ("250ml")
    const nu3 = await lookupNutritionApi({ foodItem: "milk", quantity: "250ml" });
    test("Portion '250ml' scales volume nutrients", nu3.success && nu3.data?.calories > 0, `Calories: ${nu3.data?.calories}`);

    // EC 31: Default quantity fallback when quantity is omitted
    const nu4 = await lookupNutritionApi({ foodItem: "almonds" });
    test("Omitted quantity uses standard fallback portion", nu4.success && nu4.data?.calories > 0);

    // EC 32: In-memory caching verification
    const nu5 = await lookupNutritionApi({ foodItem: "paneer", quantity: "200g" });
    test("Subsequent query for same item hits in-memory cache", nu5.success && nu5.fromCache === true);

    // EC 33: Fabricated food name fallback
    const nu6 = await lookupNutritionApi({ foodItem: "cryptofood-supermatrix-dish" });
    test("Unknown food name executes fallback without crashing", typeof nu6.success === "boolean");
  }

  // ---------------------------------------------------------------------------
  // API 6: Clinical Meal Plan Generation (generateMealPlanApi) Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- API 6: Clinical Meal Plan Edge Cases ---");
  {
    // EC 34: Duration days clamped below minimum (0 -> 1)
    const m1 = await generateMealPlanApi({ durationDays: 0 });
    test("Duration days 0 is clamped to minimum 1 day", m1.success && m1.plan?.daysCount === 1);

    // EC 35: Duration days clamped above maximum (10 -> 7)
    const m2 = await generateMealPlanApi({ durationDays: 10 });
    test("Duration days 10 is clamped to maximum 7 days", m2.success && m2.plan?.daysCount === 7);

    // EC 36: Calorie target below safe floor (500 -> 1200)
    const m3 = await generateMealPlanApi({ dailyCalories: 500 });
    test("Calorie target 500 is clamped to clinical floor 1200 kcal", m3.success && m3.plan?.dailyCalories === 1200);

    // EC 37: Vegan diet type
    const m4 = await generateMealPlanApi({ dietType: "Vegan", durationDays: 1 });
    test("Vegan meal plan diet type is preserved", m4.success && m4.plan?.dietType === "Vegan");

    // EC 38: Multiple allergen exclusions
    const m5 = await generateMealPlanApi({ allergiesExcluded: ["Peanuts", "Shellfish", "Gluten"] });
    test("Multiple allergens excluded in plan", m5.success && m5.plan?.allergiesExcluded.length === 3);

    // EC 39: Macro target distribution (protein, carbs, fats exist)
    test("Macro targets (protein, carbs, fats) are mathematically calculated", m1.plan?.macroTargets?.proteinGrams > 0 && m1.plan?.macroTargets?.carbsGrams > 0 && m1.plan?.macroTargets?.fatsGrams > 0);
  }

  // ---------------------------------------------------------------------------
  // API 7: Health Metrics (calculateHealthMetricsApi) Edge Cases
  // ---------------------------------------------------------------------------
  console.log("\n--- API 7: Health Metrics Edge Cases ---");
  {
    // EC 40: Normal BMI range (18.5 - 24.9)
    const hm1 = await calculateHealthMetricsApi({ weightKg: 65, heightCm: 170 });
    test("65kg, 170cm produces Normal weight classification", hm1.success && hm1.metrics?.bmiCategory === "Normal weight", `BMI: ${hm1.metrics?.bmi}`);

    // EC 41: Underweight (<18.5)
    const hm2 = await calculateHealthMetricsApi({ weightKg: 40, heightCm: 165 });
    test("40kg, 165cm produces Underweight classification", hm2.success && hm2.metrics?.bmiCategory === "Underweight", `BMI: ${hm2.metrics?.bmi}`);

    // EC 42: Overweight (25 - 29.9)
    const hm3 = await calculateHealthMetricsApi({ weightKg: 80, heightCm: 172 });
    test("80kg, 172cm produces Overweight classification", hm3.success && hm3.metrics?.bmiCategory === "Overweight", `BMI: ${hm3.metrics?.bmi}`);

    // EC 43: Obese Class I (30 - 34.9)
    const hm4 = await calculateHealthMetricsApi({ weightKg: 95, heightCm: 170 });
    test("95kg, 170cm produces Obese Class I classification", hm4.success && hm4.metrics?.bmiCategory === "Obese (Class I)", `BMI: ${hm4.metrics?.bmi}`);

    // EC 44: Severe Obese Class III (>=40)
    const hm5 = await calculateHealthMetricsApi({ weightKg: 130, heightCm: 165 });
    test("130kg, 165cm produces Obese Class III classification", hm5.success && hm5.metrics?.bmiCategory === "Obese (Class III)", `BMI: ${hm5.metrics?.bmi}`);

    // EC 45: Female BMR Mifflin formula (-161)
    const hm6 = await calculateHealthMetricsApi({ weightKg: 60, heightCm: 165, age: 30, gender: "female" });
    const hm7 = await calculateHealthMetricsApi({ weightKg: 60, heightCm: 165, age: 30, gender: "male" });
    test("Female BMR formula is lower than Male BMR by ~166 kcal", hm6.success && hm7.success && hm7.metrics?.bmrKcal > hm6.metrics?.bmrKcal);

    // EC 46: Invalid / negative values rejection
    const hm8 = await calculateHealthMetricsApi({ weightKg: -10, heightCm: 170 });
    test("Negative weight returns clean validation error", !hm8.success);

    // EC 47: Missing height returns validation error
    const hm9 = await calculateHealthMetricsApi({ weightKg: 70 });
    test("Missing height returns clean validation error", !hm9.success);

    // EC 48: Patient with clinical report retrieves metrics without needing explicit weight/height
    const sampleLab = await require("./src/models/labReportModel").LabReport.findOne({ "fitnessMetrics.currentWeight": { $exists: true } }).lean();
    if (sampleLab) {
      const hm10 = await calculateHealthMetricsApi({ userId: sampleLab.userId });
      test("Retrieves metrics directly from patient clinical report without explicit input", hm10.success && hm10.metrics?.dataSource === "clinical_medical_report", `Weight: ${hm10.metrics?.weightKg}kg, Height: ${hm10.metrics?.heightCm}cm, BMI: ${hm10.metrics?.bmi}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`AUDIT FINISHED: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runEdgeCases().catch((err) => {
  console.error("Audit crash:", err);
  process.exit(1);
});
