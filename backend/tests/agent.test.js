require("./setup");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../src/utils/jwtConfig");
const agentRoutes = require("../src/agent");
const { executeLangGraphTool } = require("../src/agent/langgraph/tools");
const { loadAgentPatientContext } = require("../src/agent/services/agentContextLoader");
const { findDietitiansApi } = require("../src/agent/apis/specialist.api");
const { executeGetUserHealthReports } = require("../src/agent/tools/healthReports.tool");
const { lookupNutritionApi } = require("../src/agent/apis/nutrition.api");
const { generateMealPlanApi } = require("../src/agent/apis/mealPlan.api");
const { AgentState } = require("../src/agent/langgraph/state");
const { Dietitian, User, UserAuth } = require("../src/models/userModel");
const { ChatHistory } = require("../src/models/agentModel");
const mongoose = require("mongoose");

// Setup minimal app mounting agent routes
const app = express();
app.use(express.json());
app.use("/api/agent", agentRoutes);

describe("NutriAgent GenAI Agent Pipeline Security & Verification Tests", () => {
  describe("Route Authentication & IDOR Protection", () => {
    test("POST /api/agent/chat should reject unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post("/api/agent/chat")
        .send({ message: "Hello" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("GET /api/agent/sessions should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/agent/sessions");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("GET /api/agent/session/:sessionId should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/agent/session/sess_test_123");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("DELETE /api/agent/session/:sessionId should reject unauthenticated requests with 401", async () => {
      const res = await request(app).delete("/api/agent/session/sess_test_123");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("GET /api/agent/mcp/sse should establish SSE stream for unauthenticated external hosts", (done) => {
      const http = require("http");
      const server = app.listen(0, () => {
        const port = server.address().port;
        const req = http.get(`http://localhost:${port}/api/agent/mcp/sse`, (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers["content-type"].includes("text/event-stream")).toBe(true);
          req.destroy();
          server.close(() => done());
        });
        req.on("error", () => {});
      });
    });

    test("POST /api/agent/mcp/messages should reject missing or inactive session", async () => {
      const res = await request(app)
        .post("/api/agent/mcp/messages")
        .send({ method: "tools/list" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Booking Tool Date, Operating Hours & Dietitian Availability", () => {
    test("should reject invalid date format", async () => {
      const res = await executeLangGraphTool("book_dietitian_appointment", {
        dietitianName: "Neha Agarwal",
        date: "07-10-2026",
        time: "10:00",
      });
      expect(res.success).toBe(false);
      expect(res.message.toLowerCase().includes("valid yyyy-mm-dd format")).toBe(true);
    });

    test("should reject appointments on past dates", async () => {
      const res = await executeLangGraphTool("book_dietitian_appointment", {
        dietitianName: "Neha Agarwal",
        date: "2020-01-01",
        time: "10:00",
      });
      expect(res.success).toBe(false);
      expect(res.message.toLowerCase().includes("past date")).toBe(true);
    });

    test("should reject appointment hours outside platform 09:00 to 20:00", async () => {
      const res = await executeLangGraphTool("book_dietitian_appointment", {
        dietitianName: "Neha Agarwal",
        date: "2030-01-01",
        time: "22:00",
      });
      expect(res.success).toBe(false);
      expect(res.message.toLowerCase().includes("outside platform appointment hours")).toBe(true);
    });
  });

  describe("Dedicated Customizable Tool APIs Verification", () => {
    beforeEach(async () => {
      await Dietitian.create([
        {
          name: "Dr. Arjun Reddy",
          email: "arjun.cardiac@test.com",
          licenseNumber: "DLN123456",
          age: 42,
          gender: "male",
          specialties: ["Cardiac Health", "Hypertension", "Post-Cardiac Surgery"],
          specialization: ["Cardiac Health", "Hypertension"],
          experience: 10,
          fees: 650,
          onlineFee: 650,
          rating: 4.9,
          about: "Cardiovascular nutrition expert with extensive experience in heart disease prevention.",
          verificationStatus: { finalReport: "Verified" },
        },
        {
          name: "Dr. Amit Patel",
          email: "amit.diabetes@test.com",
          licenseNumber: "DLN654321",
          age: 39,
          gender: "male",
          specialties: ["Diabetes Management", "Type 2 Diabetes", "Thyroid Health"],
          specialization: ["Diabetes Management", "Type 2 Diabetes"],
          experience: 8,
          fees: 600,
          onlineFee: 600,
          rating: 4.8,
          about: "Specialist in metabolic and glycemic control.",
          verificationStatus: { finalReport: "Verified" },
        },
      ]);
    });

    test("findDietitiansApi searches by specialty without regex", async () => {
      const res = await findDietitiansApi({ specialtyOrCondition: "Diabetes", limit: 5 });
      expect(res.success).toBe(true);
      expect(res.count).toBeGreaterThan(0);
      expect(Array.isArray(res.dietitians)).toBe(true);
    });

    test("findDietitiansApi searches by condition 'heart' and matches cardiac specialists", async () => {
      const res = await findDietitiansApi({ specialtyOrCondition: "heart" });
      expect(res.success).toBe(true);
      expect(res.count).toBeGreaterThan(0);
      const names = res.dietitians.map((d) => d.name);
      expect(names.some((n) => n.includes("Arjun") || n.includes("Vikash"))).toBe(true);
    });

    test("executeGetUserHealthReports retrieves patient clinical reports with date and recency filters", async () => {
      const { HealthReport } = require("../src/models/healthReportModel");
      const testUserId = new mongoose.Types.ObjectId();
      const testDietitianId = new mongoose.Types.ObjectId();

      await HealthReport.create({
        clientId: testUserId,
        clientName: "Test Patient",
        dietitianId: testDietitianId,
        dietitianName: "Dr. Neha Agarwal",
        title: "Metabolic & Thyroid Evaluation",
        diagnosis: "Hypothyroidism",
        dietaryRecommendations: "High fiber iodine rich protocol",
        createdAt: new Date("2026-10-01T10:00:00Z"),
      });

      const res = await executeGetUserHealthReports(
        { reportType: "health", limit: 3 },
        { userId: testUserId }
      );
      expect(res.success).toBe(true);
      expect(res.data.healthReports.length).toBe(1);
      expect(res.data.healthReports[0].title).toBe("Metabolic & Thyroid Evaluation");
      expect(res.data.healthReports[0].diagnosis).toBe("Hypothyroidism");
      expect(res.cards.length).toBe(1);
      expect(res.cards[0].type).toBe("patient_profile_card");

      await HealthReport.deleteMany({ clientId: testUserId });
    });

    test("lookupNutritionApi retrieves calories and macros for paneer", async () => {
      const res = await lookupNutritionApi({ foodItem: "paneer", quantity: "100g" });
      expect(res.success).toBe(true);
      expect(res.data.calories).toBeGreaterThan(0);
      expect(res.data.protein).toBeGreaterThan(0);
    });

    test("generateMealPlanApi generates structured clinical meal plan", async () => {
      const res = await generateMealPlanApi({
        targetCalories: 2000,
        dietType: "Vegetarian",
        healthConditions: ["Diabetes"],
        durationDays: 1,
      });
      expect(res.success).toBe(true);
      expect(res.plan.dailyCalories).toBe(2000);
      expect(res.plan.dietType).toBe("Vegetarian");
      expect(Array.isArray(res.plan.days)).toBe(true);
      expect(res.plan.days[0].meals.length).toBe(4);
    });
  });

  describe("Direct Clinical Context Ingestion", () => {
    test("loadAgentPatientContext handles unauthenticated user gracefully without vectors", async () => {
      const res = await loadAgentPatientContext(null);
      expect(res.patientProfile).toBeNull();
      expect(res.contextText).toBe("");
      expect(res.cards).toEqual([]);
    });

    test("loadAgentPatientContext handles invalid MongoDB ObjectId safely", async () => {
      const res = await loadAgentPatientContext("invalid_id_format");
      expect(res.patientProfile).toBeNull();
      expect(res.contextText).toBe("");
      expect(res.cards).toEqual([]);
    });
  });

  describe("Clinical Meal Plan Grounding & Dietitian Target Consistency", () => {
    test("should strictly ground meal plan in dietitian health report targets", async () => {
      const { HealthReport } = require("../src/models/healthReportModel");
      const testUserId = new mongoose.Types.ObjectId();
      const testDietitianId = new mongoose.Types.ObjectId();

      await HealthReport.create({
        clientId: testUserId,
        clientName: "Test Patient",
        dietitianId: testDietitianId,
        dietitianName: "Dr. Neha Agarwal",
        title: "Clinical Metabolic & Glycemic Optimization Assessment",
        diagnosis: "Mild Prediabetes",
        dietaryRecommendations:
          "Strict high-protein vegetarian diet with foxtail millets and steel-cut oats. Exclude peanuts and shellfish.",
        targetCalories: 1850,
        targetMacros: { proteinGrams: 105, carbsGrams: 210, fatsGrams: 55 },
        targetHydrationLiters: 3.2,
        allergies: ["Peanuts", "Shellfish"],
      });

      const res = await executeLangGraphTool(
        "generate_meal_plan",
        {
          daysCount: 1,
        },
        { userId: testUserId }
      );

      expect(res.success).toBe(true);
      expect(res.plan).toBeDefined();
      expect(res.plan.dailyCalories).toBe(1850);
      expect(res.plan.macroTargets.proteinGrams).toBe(105);
      expect(res.plan.macroTargets.carbsGrams).toBe(210);
      expect(res.plan.macroTargets.fatsGrams).toBe(55);
      expect(res.plan.supervisingDietitian).toBe("Dr. Neha Agarwal");
      expect(res.plan.allergiesExcluded).toEqual(
        expect.arrayContaining(["Peanuts", "Shellfish"])
      );
      expect(res.plan.dietType.toLowerCase().includes("vegetarian")).toBe(true);
      expect(res.cards.length).toBe(1);
      expect(res.cards[0].type).toBe("meal_plan_card");

      await HealthReport.deleteMany({ clientId: testUserId });
    });
  });

  describe("Session History Retrieval and JWT Identity Resolution", () => {
    const testAuthUserId = new mongoose.Types.ObjectId();
    const testRoleId = new mongoose.Types.ObjectId();
    const token = jwt.sign(
      {
        userId: testAuthUserId.toString(),
        role: "user",
        roleId: testRoleId.toString(),
      },
      JWT_SECRET
    );

    test("GET /api/agent/sessions should return sessions matching authenticated user", async () => {
      await ChatHistory.create({
        sessionId: "sess_test_history_1",
        userId: testAuthUserId,
        title: "Dietary Consultation",
        messages: [
          { type: "user", content: "What is my protein goal?" },
          { type: "bot", content: "Your daily target is 75g." },
        ],
      });

      const res = await request(app)
        .get("/api/agent/sessions")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(res.body.sessions.length).toBe(1);
      expect(res.body.sessions[0].sessionId).toBe("sess_test_history_1");
      expect(res.body.sessions[0].title).toBe("Dietary Consultation");
      expect(res.body.sessions[0].messageCount).toBe(2);

      await ChatHistory.deleteMany({ sessionId: "sess_test_history_1" });
    });

    test("GET /api/agent/session/:sessionId should return full session message history", async () => {
      await ChatHistory.create({
        sessionId: "sess_test_history_2",
        userId: testRoleId,
        title: "Metabolic Consultation",
        messages: [
          { type: "user", content: "Check blood glucose readings" },
          { type: "bot", content: "Fasting glucose is within optimal range." },
        ],
      });

      const res = await request(app)
        .get("/api/agent/session/sess_test_history_2")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.sessionId).toBe("sess_test_history_2");
      expect(res.body.session.messages.length).toBe(2);

      await ChatHistory.deleteMany({ sessionId: "sess_test_history_2" });
    });

    test("DELETE /api/agent/session/:sessionId should delete owned session", async () => {
      await ChatHistory.create({
        sessionId: "sess_test_to_delete",
        userId: testAuthUserId,
        title: "Temporary Session",
        messages: [{ type: "user", content: "hello" }],
      });

      const res = await request(app)
        .delete("/api/agent/session/sess_test_to_delete")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await ChatHistory.findOne({
        sessionId: "sess_test_to_delete",
      });
      expect(check).toBeNull();
    });
  });

  describe("Patient Profile Resolution Across Collections", () => {
    const { resolvePatientProfile } = require("../src/agent/services/userResolver");

    test("should resolve patient profile using UserAuth id", async () => {
      const testUser = await User.create({
        name: "Anita Sharma",
        email: "anita.sharma.test@gmail.com",
        phone: "9888877777",
        gender: "female",
        dob: new Date("1990-01-01"),
        address: "123 Health Ave, Mumbai",
      });

      const testAuth = await UserAuth.create({
        email: "anita.sharma.test@gmail.com",
        role: "user",
        roleId: testUser._id,
        passwordHash: "dummyhash123",
      });

      const resolved = await resolvePatientProfile(testAuth._id);
      expect(resolved.user).toBeDefined();
      expect(resolved.user.name).toBe("Anita Sharma");
      expect(String(resolved.userId)).toBe(String(testUser._id));
      expect(String(resolved.authId)).toBe(String(testAuth._id));

      await User.deleteOne({ _id: testUser._id });
      await UserAuth.deleteOne({ _id: testAuth._id });
    });

    test("should execute get_user_schedule tool cleanly and return user_schedule_card", async () => {
      const testUser = await User.create({
        name: "Schedule Test Patient",
        email: "sched.patient@test.com",
        phone: "9999988888",
        gender: "male",
        dob: new Date("1992-05-10"),
        address: "456 Test Blvd, Pune",
      });

      const res = await executeLangGraphTool(
        "get_user_schedule",
        {},
        { userId: testUser._id }
      );
      expect(res.success).toBe(true);
      expect(Array.isArray(res.cards)).toBe(true);
      expect(res.cards[0]?.type).toBe("user_schedule_card");
      expect(res.cards[0]?.data?.patientName).toBe("Schedule Test Patient");

      await User.deleteOne({ _id: testUser._id });
    });

    test("should execute get_user_health_reports tool cleanly and return patient_profile_card", async () => {
      const { HealthReport } = require("../src/models/healthReportModel");
      const testUser = await User.create({
        name: "Report Test Patient",
        email: "report.patient@test.com",
        phone: "9999977777",
        gender: "female",
        dob: new Date("1995-03-15"),
        address: "789 Health St, Mumbai",
      });

      const testDietitianId = new mongoose.Types.ObjectId();
      await HealthReport.create({
        clientId: testUser._id,
        clientName: "Report Test Patient",
        dietitianId: testDietitianId,
        dietitianName: "Dr. Kavita Menon",
        title: "Comprehensive Metabolic Assessment",
        diagnosis: "Insulin Resistance",
        dietaryRecommendations: "Low glycemic index whole foods",
        targetCalories: 1700,
      });

      const res = await executeLangGraphTool(
        "get_user_health_reports",
        {},
        { userId: testUser._id }
      );

      expect(res.success).toBe(true);
      expect(res.data.healthReports.length).toBe(1);
      expect(res.data.healthReports[0].title).toBe("Comprehensive Metabolic Assessment");
      expect(res.data.healthReports[0].dietitianName).toBe("Dr. Kavita Menon");
      expect(res.cards.length).toBe(1);
      expect(res.cards[0].type).toBe("patient_profile_card");
      expect(res.cards[0].data.clinicalDiagnosis).toBe("Insulin Resistance");

      await HealthReport.deleteMany({ clientId: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    });
  });
});
