const { GEMINI_MODEL, genAI } = require("../config");
const { retrieveRAGContext } = require("../services/ragRetriever");
const { analyzeQueryAttention } = require("../services/attentionAnalyzer");
const { getTemporalContext } = require("../utils/dateUtils");
const { TOOL_DEFINITIONS, executeLangGraphTool } = require("./tools");

const BASE_SYSTEM_PROMPT = `You are NutriAgent, a nutrition and clinical discovery assistant for NutriConnect.

Capabilities:
- Finding verified dietitians across specialties (PCOS, hormonal health, weight management, diabetes, thyroid, heart health, sports nutrition, gut health).
- Checking live dietitian schedule availability and booking consultations (09:00 AM to 08:00 PM).
- Practical nutrition guidance, food calories/macros, and balanced meal planning.
- Explaining lab test results (blood sugar, HbA1c, cholesterol, BMI) in simple, everyday language.

Guidelines:
- Simple, everyday language: The user is an everyday person, NOT a biologist or pharmacist. Do NOT use heavy biological or pharmacological jargon (avoid phrases like "glycemic optimization", "metabolic regulation protocols", "dyslipidemia pathways"). Use plain words like "managing blood sugar", "heart health", "balanced meals", or "eating well".
- Temporal Clarity: Today's date, current time, and tomorrow's date are provided in [TEMPORAL CONTEXT]. Use them accurately.
- Patient Schedule vs Clinic Hours: When the patient asks about their own schedule, consultations, or appointments (e.g., "can i get my schedule", "my complete schedule this week"):
  1. Retrieve and confirm upcoming appointments using their real-time verified bookings (dietitian name, date, time, and consultation type).
  2. Let them know they can view their full interactive schedule and join meetings at /user/schedule.
  3. Do NOT output general clinic operating hours or dietitian booking availability unless the patient specifically asks to book new appointments.
- Conversational Continuity & Specialist Comparisons: When the patient asks a follow-up question referencing recently mentioned specialists or options (e.g. "who is best among them", "compare them", "which one should I pick"):
  1. Ground your answer STRICTLY in the specialists presented in the immediate preceding assistant message (e.g., Dr. Arjun Reddy vs Dr. Vikash Gupta).
  2. Compare their specific qualifications, years of experience, ratings, and sub-specialties from that message.
  3. Do NOT substitute them with or pivot back to historical supervising dietitians (like Dr. Neha Agarwal or Dr. Sneha Iyer) from [CLINICAL CONTEXT]. The patient is asking about the options just shown to them.
- Clinical Records: Background lab records in [CLINICAL CONTEXT] provide personalized medical context. NEVER use existing lab records to override, dismiss, or ignore recent conversational context or dietitian searches.
- Zero Doctor Hallucinations: NEVER fabricate, invent, or hallucinate doctor or dietitian names under ANY circumstances. You may ONLY reference verified specialists provided directly in Findings or context from the search_dietitians tool. If no matching specialists are found, state clearly that no specialists matched the criteria.
- Strict Health & Nutrition Domain Guardrail: You are exclusively an AI clinical nutrition and wellness assistant for NutriConnect.
  * Greetings & Pleasantries: Warmly greet the user and offer assistance with nutrition, dietitians, meal plans, or health consultations (for example, "Hello! I am NutriAgent. How can I assist you with your nutrition or health goals today?").
  * Out-of-Domain Inquiries: If the user asks about topics completely unrelated to health, diet, wellness, medicine, medical reports, or NutriConnect services (such as schools, history, programming, coding, math, general trivia, politics, sports news, or general encyclopedic definitions):
    1. Do NOT answer or explain the off-topic question.
    2. Explicitly and politely state that you are specialized exclusively in health and clinical nutrition on NutriConnect.
    3. Direct the user to how you can help them with their health, diet, or dietitian consultations.
    Example refusal: "I am NutriAgent, specialized exclusively in clinical nutrition, dietitian discovery, and wellness on NutriConnect. I cannot assist with non-health topics like schools. If you have questions about balanced diets, meal plans, lab results, or consulting a verified dietitian, I would be glad to help!"
- Zero Emojis: Strictly NO emojis in any response text.`;

const CANDIDATE_MODELS = [GEMINI_MODEL];
const OVERALL_TIMEOUT_MS = 28000;
const MAX_RETRIES_PER_MODEL = 2;

/**
 * 1. Grounding Node: Retrieves verified clinical patient records
 */
async function groundingNode(state) {
  const query = state.userQuery || "";
  const context = { userId: state.userId };
  const history = (state.messages || []).map((m) => ({
    role: m.type === "user" ? "user" : "model",
    content: m.content || "",
  }));

  const rag = await retrieveRAGContext(query, context, history);

  return {
    groundingContext: rag.contextText || "",
    cards: [...(state.cards || []), ...(rag.cards || [])],
    toolsExecuted: Array.from(
      new Set([...(state.toolsExecuted || []), ...(rag.toolsExecuted || [])])
    ),
  };
}

/**
 * 2. Reasoning Node: Query Attention & Scoped Intent Routing
 * Protects against random tool selection by scoping tool declarations to detected intent.
 */
async function reasoningNode(state) {
  const userPrompt = state.userQuery?.trim() || "";
  const temporal = getTemporalContext();

  // Attention analysis: classify intent and scope allowable tools
  const attention = analyzeQueryAttention(userPrompt, state.messages);
  const scopedToolNames = attention.scopedTools || [];

  // 1. APPOINTMENT BOOKING: If high-confidence booking parameters were extracted, execute booking directly
  if (attention.primaryIntent === "APPOINTMENT_BOOKING") {
    const { dietitianName, date, time } = attention.extractedParams || {};
    if (dietitianName && date && time) {
      return {
        toolCalls: [
          {
            name: "book_dietitian_appointment",
            args: { dietitianName, date, time, consultationType: "Online" },
          },
        ],
        rawReply: "",
      };
    }
  }

  // 2. SPECIALIST SEARCH: Guarantee search_dietitians tool execution and card rendering
  if (attention.primaryIntent === "SPECIALIST_SEARCH") {
    const params = attention.extractedParams || {};
    return {
      toolCalls: [
        {
          name: "search_dietitians",
          args: {
            specialtyOrCondition: params.specialtyOrCondition,
            gender: params.gender,
            maxFee: params.maxFee,
            limit: params.limit,
          },
        },
      ],
      rawReply: "",
    };
  }

  // 3. PATIENT SCHEDULE: Guarantee get_user_schedule tool execution and card rendering
  if (attention.primaryIntent === "PATIENT_SCHEDULE") {
    return {
      toolCalls: [
        {
          name: "get_user_schedule",
          args: {},
        },
      ],
      rawReply: "",
    };
  }

  // 4. DIETITIAN AVAILABILITY: Guarantee check_dietitian_availability tool execution
  if (attention.primaryIntent === "SCHEDULE_AVAILABILITY") {
    const params = attention.extractedParams || {};
    return {
      toolCalls: [
        {
          name: "check_dietitian_availability",
          args: {
            dietitianName: params.dietitianName,
            date: params.date,
          },
        },
      ],
      rawReply: "",
    };
  }

  // Filter tool declarations strictly to scoped intent
  const activeToolDeclarations = scopedToolNames
    .map((name) => TOOL_DEFINITIONS[name]?.declaration)
    .filter(Boolean);

  const temporalHeader = `[TEMPORAL CONTEXT]
Today: ${temporal.todayStr} (${temporal.dayOfWeek})
Current Local Time: ${temporal.currentTimeStr} IST
Tomorrow: ${temporal.tomorrowStr} (${temporal.tomorrowDayOfWeek})
Clinic Operating Hours: 09:00 AM to 08:00 PM daily. ${temporal.operatingHoursClosedToday ? "Today's clinic hours have concluded." : ""}`;

  let scheduleGuidance = "";
  if (attention.primaryIntent === "PATIENT_SCHEDULE") {
    scheduleGuidance = `\n[PATIENT SCHEDULE GUIDANCE]
The patient is inquiring about their personal appointments or schedule.
- Use the available get_user_schedule tool to look up the patient's verified upcoming appointments and consultations directly.
- Summarize any upcoming appointments (dietitian name, date, time, consultation type).
- If no appointments are found, state that they currently have no consultations scheduled.
- Mention that they can also manage or reschedule their appointments on their consultations page (/user/schedule).
- Do NOT mention general clinic operating hours (09:00 AM to 08:00 PM) unless asked.`;
  }

  let compoundGuidance = "";
  if (attention.primaryIntent === "COMPOUND") {
    compoundGuidance = `\n[COMPOUND QUERY INSTRUCTION]
The patient request contains multiple distinct questions or tasks. Call all relevant tools required to answer each part of the query completely.`;
  }

  const promptWithContext = `${temporalHeader}
${scheduleGuidance}
${compoundGuidance}
${state.groundingContext ? `[CLINICAL CONTEXT]\n${state.groundingContext}\n\n` : ""}[PATIENT QUERY]
${userPrompt}`;

  const chatHistory = (state.messages || [])
    .filter((m) => m.content)
    .map((m) => ({
      role: m.type === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

  while (chatHistory.length > 0 && chatHistory[0].role !== "user") {
    chatHistory.shift();
  }

  const messageParts = [];
  if (state.file?.base64 && state.file?.type) {
    const cleanBase64 = state.file.base64.replace(/^data:[^;]+;base64,/, "");
    messageParts.push({
      inlineData: {
        mimeType: state.file.type,
        data: cleanBase64,
      },
    });
  }
  messageParts.push({ text: promptWithContext });

  const startTime = Date.now();
  let selectedResponse = null;
  let toolCalls = [];
  let rawText = "";

  for (const modelName of CANDIDATE_MODELS) {
    let attempts = 0;
    while (attempts < MAX_RETRIES_PER_MODEL) {
      if (Date.now() - startTime >= OVERALL_TIMEOUT_MS) break;
      attempts++;

      try {
        const modelOptions = {
          model: modelName,
          systemInstruction: BASE_SYSTEM_PROMPT,
        };

        // Scoped tool attention: only supply tools relevant to detected intent
        if (activeToolDeclarations.length > 0) {
          modelOptions.tools = [
            { functionDeclarations: activeToolDeclarations },
          ];
        }

        const model = genAI.getGenerativeModel(modelOptions, {
          timeout: 14000,
        });
        const chat = model.startChat({ history: chatHistory });
        const res = await chat.sendMessage(messageParts);

        toolCalls = res.response.functionCalls() || [];
        try {
          rawText = res.response.text() || "";
        } catch {
          rawText = "";
        }

        selectedResponse = res;
        break;
      } catch (err) {
        console.warn(
          `[ReasoningNode] ${modelName} attempt ${attempts} warning:`,
          err.status || err.message
        );
        const isTransient =
          err.status === 429 ||
          err.status === 503 ||
          err.status === 500 ||
          err.message?.includes("429");
        if (!isTransient && attempts >= 1) break;
        await new Promise((r) => setTimeout(r, 600 * attempts));
      }
    }
    if (selectedResponse) break;
  }

  if (!selectedResponse && !rawText) {
    rawText =
      "The consultation service is temporarily experiencing high demand. Please try your request again in a moment.";
  }

  return {
    toolCalls,
    rawReply: rawText,
  };
}

/**
 * 3. Tool Node: Executes tools concurrently and aggregates cards
 */
async function toolNode(state) {
  const toolCalls = state.toolCalls || [];
  const toolsExecuted = [...(state.toolsExecuted || [])];
  let cards = [...(state.cards || [])];
  let openPaymentDetails = state.openPaymentDetails || null;

  const toolResults = await Promise.all(
    toolCalls.map(async (call) => {
      const { name, args } = call;
      const res = await executeLangGraphTool(name, args, {
        userId: state.userId,
        authUserId: state.authUserId,
        userQuery: state.userQuery,
      });
      return { tool: name, args, ...res };
    })
  );

  for (const tr of toolResults) {
    if (!toolsExecuted.includes(tr.tool)) toolsExecuted.push(tr.tool);

    if (tr.cards?.length > 0) {
      for (const card of tr.cards) {
        if (card.type === "nutrition_card") {
          cards = cards.filter(
            (c) =>
              c.type !== "nutrition_card" ||
              c.data?.foodName !== card.data?.foodName
          );
          cards.push(card);
        } else if (card.type === "slot_booking_card") {
          cards = cards.filter((c) => c.type !== "slot_booking_card");
          cards.push(card);
        } else if (card.type === "dietitian_cards") {
          cards = cards.filter((c) => c.type !== "dietitian_cards");
          cards.push(card);
        } else if (card.type === "meal_plan_card") {
          cards = cards.filter((c) => c.type !== "meal_plan_card");
          cards.push(card);
        } else if (card.type === "user_schedule_card") {
          cards = cards.filter((c) => c.type !== "user_schedule_card");
          cards.push(card);
        } else {
          cards.push(card);
        }
      }
    }

    if (tr.openPayment && tr.paymentDetails) {
      openPaymentDetails = tr.paymentDetails;
    }
  }

  return {
    toolsExecuted,
    cards,
    openPaymentDetails,
    toolResults,
  };
}

/**
 * 4. Synthesis Node: Synthesizes everyday human response
 */
async function synthesisNode(state) {
  const userPrompt = state.userQuery || "";
  const toolResults = state.toolResults || [];
  const cards = state.cards || [];
  const temporal = getTemporalContext();
  let replyText = "";

  if (toolResults.length > 0) {
    try {
      const toolSummary = toolResults
        .map((tr) => {
          let line = `${tr.tool}: ${tr.message || "completed"}`;
          if (tr.tool === "search_dietitians" && Array.isArray(tr.data)) {
            line += `\nMatched verified specialists (${tr.data.length}): ${tr.data.map((d) => `${d.name} [${d.gender || "unspecified"}]`).join(", ")}`;
          }
          return line;
        })
        .join("\n");

      const hasMealPlan =
        cards.some((c) => c.type === "meal_plan_card") ||
        toolResults.some((tr) => tr.tool === "generate_meal_plan");
      const mealPlanCard = cards.find((c) => c.type === "meal_plan_card")?.data;
      let targetMacroSummary = "";
      if (mealPlanCard) {
        targetMacroSummary = `\nDietitian Targets to mention in message: Daily Calories: ${mealPlanCard.dailyCalories} kcal, Protein: ${mealPlanCard.macroTargets?.proteinGrams}g, Carbs: ${mealPlanCard.macroTargets?.carbsGrams}g, Healthy Fats: ${mealPlanCard.macroTargets?.fatsGrams}g, Hydration: ${mealPlanCard.hydrationTargetLiters} L/day, Allergies Excluded: ${mealPlanCard.allergiesExcluded?.join(", ")}.`;
      }
      const mealPlanGuidance = hasMealPlan
        ? `\n- An interactive meal plan card is already displayed below. DO NOT list or repeat the meals, individual dishes, recipes, or daily menus (no Breakfast, Lunch, Snacks, Dinner) in your message text.${targetMacroSummary} Instead, highlight what your dietitian specifically advised for your daily nutritional targets: total calories, protein, carb, fat grams, hydration target, and dietary restrictions. Then invite the patient to explore the detailed meals and recipes inside the interactive card below.`
        : "";

      const isPatientSchedule =
        /\b(my\s+schedule|my\s+appointments?|my\s+bookings?|my\s+consultations?|my\s+complete\s+schedule|user\s+schedule)\b/i.test(
          userPrompt
        ) || toolResults.some((tr) => tr.tool === "get_user_schedule");
      const scheduleGuidance = isPatientSchedule
        ? `\n- The patient is inquiring about their appointments or schedule. Summarize their verified upcoming consultations clearly (doctor name, date, time, and type). An interactive schedule card is displayed below with details. Mention that they can also manage appointments or join video meetings on their consultations page (/user/schedule). Do NOT output clinic operating hours (09:00 AM to 08:00 PM) unless asked.`
        : "";

      const synthPrompt = `Patient Query: "${userPrompt}"
Date Context: Today is ${temporal.todayStr} (${temporal.dayOfWeek}), ${temporal.currentTimeStr} IST.
Findings:
${toolSummary}
${state.groundingContext ? `Context:\n${state.groundingContext}\n` : ""}

Synthesize a clear, friendly, and helpful response:
- Use simple, everyday words that anyone can understand. Do NOT use biological or pharmacological jargon.
- If today's consultation hours have passed, explain simply that today's hours have concluded, and invite them to check open dates starting tomorrow in the card. Never call it "fully booked" when slots merely passed.
- Accurately state how many verified dietitians were found based on Findings.
- Do NOT fabricate or hallucinate doctor names. Either refer the patient to explore the matching cards below, or only reference the exact verified names provided in Findings.${mealPlanGuidance}${scheduleGuidance}
- Strict ZERO emojis.`;

      const synthModel = genAI.getGenerativeModel(
        {
          model: GEMINI_MODEL,
          systemInstruction: BASE_SYSTEM_PROMPT,
          generationConfig: { maxOutputTokens: 800, temperature: 0.2 },
        },
        { timeout: 12000 }
      );

      const synthRes = await synthModel.generateContent(synthPrompt);
      const text = synthRes.response.text();
      if (text && text.trim()) {
        replyText = text.trim();
      }
    } catch (err) {
      console.warn("[synthesisNode] Synthesis fallback:", err.message);
    }
  }

  if (!replyText || !replyText.trim()) {
    const lines = toolResults.map((tr) => tr.message).filter(Boolean);
    replyText =
      lines.length > 0
        ? lines.join("\n\n")
        : state.rawReply?.trim() ||
          "Here are the consultation details based on your request.";
  }

  // Strict Zero Emojis enforcement
  replyText = replyText
    .replace(
      /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu,
      ""
    )
    .trim();

  return {
    finalReply: replyText,
    cards,
  };
}

module.exports = {
  groundingNode,
  reasoningNode,
  toolNode,
  synthesisNode,
};
