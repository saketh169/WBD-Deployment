require("./setup");
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../src/utils/jwtConfig");
const agentRoutes = require("../src/agent");
const { executeLangGraphTool } = require("../src/agent/langgraph/tools");
const { retrieveRAGContext } = require("../src/agent/services/ragRetriever");
const { AgentState } = require("../src/agent/langgraph/state");
const { Dietitian, User, UserAuth } = require("../src/models/userModel");
const { ChatHistory } = require("../src/models/agentModel");
const mongoose = require("mongoose");

// Setup minimal app mounting agent routes
const app = express();
app.use(express.json());
app.use("/api/agent", agentRoutes);

describe("NutriAgent Pipeline Security and Validation Tests", () => {
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

    test("GET /api/agent/mcp/sse should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/agent/mcp/sse");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("POST /api/agent/mcp/messages should reject unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post("/api/agent/mcp/messages")
        .send({ method: "tools/list" });
      expect(res.status).toBe(401);
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
      expect(res.message).toMatch(/valid YYYY-MM-DD format/i);
    });

    test("should reject appointments on past dates", async () => {
      const res = await executeLangGraphTool("book_dietitian_appointment", {
        dietitianName: "Neha Agarwal",
        date: "2020-01-01",
        time: "10:00",
      });
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/past date/i);
    });

    test("should reject appointment hours outside platform 09:00 to 20:00", async () => {
      const res = await executeLangGraphTool("book_dietitian_appointment", {
        dietitianName: "Neha Agarwal",
        date: "2030-01-01",
        time: "22:00",
      });
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/outside platform appointment hours/i);
    });

    test("should allow booking on weekends (Saturday/Sunday) within platform hours", async () => {
      const testUser = await User.create({
        name: "Weekend Patient Spec",
        email: "weekendpat@nutriconnect.com",
        phone: "9876543210",
        dob: new Date("1995-05-15"),
        gender: "male",
        address: "123 Medical Way, Floor 2",
      });

      const testDietitian = await Dietitian.create({
        name: "Dr. Test Weekend Spec",
        email: "testweekend@nutriconnect.com",
        age: 35,
        licenseNumber: "DLN889901",
        phone: "9988776654",
        specialties: ["Clinical Nutrition"],
        onlineFee: 500,
      });

      // 2030-01-05 is a Saturday
      const res = await executeLangGraphTool(
        "book_dietitian_appointment",
        {
          dietitianName: "Test Weekend Spec",
          date: "2030-01-05",
          time: "11:00",
        },
        { userId: testUser._id }
      );

      expect(res.success).toBe(true);

      await User.findByIdAndDelete(testUser._id);
      await Dietitian.findByIdAndDelete(testDietitian._id);
    });
  });

  describe("Specialist Search Hybrid Matching & Limit Retrieval", () => {
    test("should return all matched specialists up to requested limit without artificial cutoffs", async () => {
      const {
        invalidateDietitianEmbeddingsCache,
      } = require("../src/agent/services/specialistService");
      invalidateDietitianEmbeddingsCache();

      const dummyVector = new Array(3072).fill(0.01);
      const testDocs = await Dietitian.create([
        {
          name: "Dr. Test Zara Ahmed",
          email: "zara@test.com",
          licenseNumber: "DLN111111",
          age: 35,
          gender: "female",
          specialties: ["Women's Health", "Fertility"],
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Kavita Menon",
          email: "kavita@test.com",
          licenseNumber: "DLN222222",
          age: 38,
          gender: "female",
          specialties: ["Women's Health", "PCOS"],
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Emily Rodriguez",
          email: "emily@test.com",
          licenseNumber: "DLN333333",
          age: 34,
          gender: "female",
          specialties: ["Women's Health", "Pregnancy Nutrition"],
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Anjali Gupta",
          email: "anjali@test.com",
          licenseNumber: "DLN444444",
          age: 36,
          gender: "female",
          specialties: ["Women's Health", "Menopause"],
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
      ]);

      const res = await executeLangGraphTool(
        "search_dietitians",
        {
          specialtyOrCondition: "womes health",
          limit: 4,
        },
        {
          userQuery: "Can you recommend 4 verified dietitians for womes health",
        }
      );

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(4);
      expect(res.cards.length).toBe(1);
      expect(res.cards[0].type).toBe("dietitian_cards");
      expect(res.cards[0].data.length).toBe(4);

      await Dietitian.deleteMany({ _id: { $in: testDocs.map((d) => d._id) } });
      invalidateDietitianEmbeddingsCache();
    });

    test("should return all matching specialists when user requests all without arbitrary truncation", async () => {
      const {
        invalidateDietitianEmbeddingsCache,
      } = require("../src/agent/services/specialistService");
      invalidateDietitianEmbeddingsCache();

      const dummyVector = new Array(3072).fill(0.01);
      const testMales = await Dietitian.create([
        {
          name: "Dr. Test Male 1",
          email: "m1@test.com",
          licenseNumber: "DLN555001",
          age: 40,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 2",
          email: "m2@test.com",
          licenseNumber: "DLN555002",
          age: 41,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 3",
          email: "m3@test.com",
          licenseNumber: "DLN555003",
          age: 42,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 4",
          email: "m4@test.com",
          licenseNumber: "DLN555004",
          age: 43,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 5",
          email: "m5@test.com",
          licenseNumber: "DLN555005",
          age: 44,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 6",
          email: "m6@test.com",
          licenseNumber: "DLN555006",
          age: 45,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 7",
          email: "m7@test.com",
          licenseNumber: "DLN555007",
          age: 46,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 8",
          email: "m8@test.com",
          licenseNumber: "DLN555008",
          age: 47,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 9",
          email: "m9@test.com",
          licenseNumber: "DLN555009",
          age: 48,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
        {
          name: "Dr. Test Male 10",
          email: "m10@test.com",
          licenseNumber: "DLN555010",
          age: 49,
          gender: "male",
          verificationStatus: { finalReport: "Verified" },
          embedding: dummyVector,
        },
      ]);

      const res = await executeLangGraphTool(
        "search_dietitians",
        {
          gender: "male",
        },
        { userQuery: "get all male dietitians" }
      );

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(10);
      expect(res.cards[0].data.length).toBe(10);

      await Dietitian.deleteMany({ _id: { $in: testMales.map((d) => d._id) } });
      invalidateDietitianEmbeddingsCache();
    });
  });

  describe("Agent State Reducer History Deduplication", () => {
    test("safeHistory sanitization limits and maps conversation turns cleanly", () => {
      const raw = [
        { type: "bot", content: "hello" },
        { role: "user", content: "hi" },
      ];
      const safe = raw.map((m) => ({
        type:
          m.type === "bot" || m.role === "model" || m.role === "assistant"
            ? "model"
            : "user",
        content: m.content,
      }));
      expect(safe[0].type).toBe("model");
      expect(safe[1].type).toBe("user");
    });
  });

  describe("RAG Clinical Grounding and PII Protection", () => {
    test("should return empty context cleanly for invalid user IDs without throwing", async () => {
      const res = await retrieveRAGContext("what is my diet", {
        userId: "invalid_id",
      });
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
      expect(res.plan.dietType).toMatch(/vegetarian/i);
      expect(res.cards.length).toBe(1);
      expect(res.cards[0].type).toBe("meal_plan_card");
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

  describe("Query Attention & Intent Routing", () => {
    const {
      analyzeQueryAttention,
    } = require("../src/agent/services/attentionAnalyzer");

    test("should scope tools to nutrition only for food queries", () => {
      const att = analyzeQueryAttention("how many calories in palak paneer");
      expect(att.primaryIntent).toBe("NUTRITION_LOOKUP");
      expect(att.scopedTools).toEqual(["lookup_nutrition"]);
    });

    test("should scope tools to booking and parse relative date for booking queries", () => {
      const att = analyzeQueryAttention(
        "book at 10:30 am at october 10 for meera krishnan"
      );
      expect(att.primaryIntent).toBe("APPOINTMENT_BOOKING");
      expect(att.scopedTools).toEqual(["book_dietitian_appointment"]);
      expect(att.extractedParams.dietitianName.toLowerCase()).toContain(
        "meera krishnan"
      );
      expect(att.extractedParams.time).toBe("10:30");
      expect(att.extractedParams.date).toBe("2026-10-10");
    });

    test("should scope tools to schedule only for availability queries", () => {
      const att = analyzeQueryAttention(
        "check available appointment dates and slots for Dr. Kavita Menon"
      );
      expect(att.primaryIntent).toBe("SCHEDULE_AVAILABILITY");
      expect(att.scopedTools).toEqual(["check_dietitian_availability"]);
    });

    test("should scope tools to get_user_schedule and set PATIENT_SCHEDULE for patient schedule inquiries", () => {
      const att1 = analyzeQueryAttention("can i get my schedule");
      expect(att1.primaryIntent).toBe("PATIENT_SCHEDULE");
      expect(att1.scopedTools).toEqual(["get_user_schedule"]);

      const att2 = analyzeQueryAttention(
        "can i get my complete schedule this week"
      );
      expect(att2.primaryIntent).toBe("PATIENT_SCHEDULE");
      expect(att2.scopedTools).toEqual(["get_user_schedule"]);

      const att3 = analyzeQueryAttention("user schedule");
      expect(att3.primaryIntent).toBe("PATIENT_SCHEDULE");
      expect(att3.scopedTools).toEqual(["get_user_schedule"]);
    });

    test("should scope tools to specialist search for doctor discovery queries", () => {
      const att = analyzeQueryAttention("get all male dietitians");
      expect(att.primaryIntent).toBe("SPECIALIST_SEARCH");
      expect(att.scopedTools).toEqual(["search_dietitians"]);
    });

    test("should disable all external action tools for general health queries", () => {
      const att = analyzeQueryAttention(
        "what does high triglycerides and borderline HbA1c mean for my diet"
      );
      expect(att.primaryIntent).toBe("GENERAL_HEALTH");
      expect(att.scopedTools).toEqual([]);
    });
  });

  describe("Patient Profile Resolution Across Collections", () => {
    const {
      resolvePatientProfile,
    } = require("../src/agent/services/userResolver");

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
  });
});
