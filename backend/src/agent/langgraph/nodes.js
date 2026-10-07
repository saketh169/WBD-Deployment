const { GEMINI_MODEL, genAI } = require("../config");
const { retrieveRAGContext } = require("../services/ragRetriever");
const { analyzeQueryAttention } = require("../services/attentionAnalyzer");
const { getTemporalContext } = require("../utils/dateUtils");
const {
  TOOL_DEFINITIONS,
  GEMINI_TOOL_DECLARATIONS,
  executeLangGraphTool,
} = require("./tools");

const BASE_SYSTEM_PROMPT = `You are NutriAgent, a clinical health, nutrition, and wellness assistant for NutriConnect.

Capabilities:
- Finding verified dietitians across diverse clinical and wellness specialties.
- Checking live dietitian schedule availability and booking consultations (09:00 AM to 08:00 PM).
- Practical nutrition guidance, food calories/macros, and balanced meal planning.
- Explaining lab test results, medical concepts, health conditions, symptoms, and human biology in clear, everyday language.

Guidelines:
- Simple, everyday language: The user is an everyday person, NOT a biologist or pharmacist. Do NOT use heavy biological or pharmacological jargon. Use plain words like "managing blood sugar", "heart health", "balanced meals", or "eating well".
- Temporal Clarity: Today's date, current time, and tomorrow's date are provided in [TEMPORAL CONTEXT]. Use them accurately.
- Patient Schedule vs Clinic Hours: When the patient asks about their own schedule, consultations, or appointments (e.g., "can i get my schedule", "my complete schedule this week"):
  1. Retrieve and confirm upcoming appointments using their real-time verified bookings (dietitian name, date, time, and consultation type).
  2. Let them know they can view their full interactive schedule and join meetings at /user/schedule.
  3. Do NOT output general clinic operating hours or dietitian booking availability unless the patient specifically asks to book new appointments.
- Conversational Continuity & Specialist Comparisons: When the patient asks a follow-up question referencing recently mentioned specialists or options (e.g. "who is best among them", "compare them", "which one should I pick"):
  1. Ground your answer STRICTLY in the specialists presented in the immediate preceding assistant message.
  2. Compare their specific qualifications, years of experience, ratings, and sub-specialties from that message.
  3. Do NOT substitute them with or pivot back to historical supervising dietitians from [CLINICAL CONTEXT]. The patient is asking about the options just shown to them.
- Clinical Records: Background lab records in [CLINICAL CONTEXT] provide personalized medical context. NEVER use existing lab records to override, dismiss, or ignore recent conversational context or dietitian searches.
- Meal Plan Requests vs Historical Records: When generating meal plans, the patient's explicit preferences (e.g. diet type like Non-Vegetarian or Vegetarian, goals like Weight Gain or Hair Growth) MUST BE HONORED. Adapt the plan to their requested diet type and goal (e.g. incorporate lean poultry, fish, eggs and a caloric surplus of 2300-2600 kcal for non-vegetarian weight gain), while maintaining clinical safety (strictly exclude known allergies like peanuts/shellfish from their record). NEVER override or reject the user's explicit diet type or goal based on past assessments.
- Zero Doctor Hallucinations & Specialty Integrity:
  * NEVER fabricate, invent, or hallucinate doctor or dietitian names under ANY circumstances. You may ONLY reference verified specialists provided directly in Findings or context from the search_dietitians tool.
  * NEVER invent, assume, or fabricate clinical specialties or expertise for any doctor. You may ONLY attribute the exact specialties listed in their verified profile (e.g. if Dr. Lisa Zhang's specialties are Skin & Hair, you must NEVER claim she specializes in mental health, cardiology, or gut health).
  * If the patient asks why a doctor was recommended or what they specialize in, state their exact verified specialties from the database accurately and honestly.
  * If no verified specialists in our registry match the requested specialty (e.g. mental health), state clearly and honestly that NutriConnect does not currently have verified dietitians specializing in that specific domain.
- Domain Scope:
  * In-Domain (Answer): Any question relating to health, medicine, human biology, medical conditions, symptoms, wellness, diet, nutrition, or NutriConnect services must be answered accurately, clearly, and helpfully in everyday language.
  * Out-of-Domain (Refuse): If the user asks about an off-topic subject that is NOT related to health, medicine, biology, symptoms, diseases, diet, nutrition, or wellness (such as schools, education systems, coding, software, history, geography, finance, entertainment, sports, or general trivia), you MUST IMMEDIATELY DECLINE. Do NOT provide any definition, description, or explanation of the off-topic concept. Simply respond: "I am NutriAgent, specialized exclusively in clinical health, nutrition, and wellness on NutriConnect. I cannot assist with topics outside health and wellness. Please feel free to ask any health, diet, or nutrition questions!"
- Zero Emojis: Strictly NO emojis in any response text.`;

const CANDIDATE_MODELS = [GEMINI_MODEL];
const OVERALL_TIMEOUT_MS = 38000;
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

  // Supply active tool declarations (or all tools if general/compound) to Gemini for genuine model reasoning
  const activeToolDeclarations =
    scopedToolNames.length > 0
      ? scopedToolNames
          .map((name) => TOOL_DEFINITIONS[name]?.declaration)
          .filter(Boolean)
      : GEMINI_TOOL_DECLARATIONS;

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

  let mealPlanGuidance = "";
  if (attention.primaryIntent === "MEAL_PLAN") {
    mealPlanGuidance = `\n[MEAL PLAN REASONING INSTRUCTION]
The patient is requesting a personalized meal plan.
- Call the generate_meal_plan tool with parameters matching the patient's query.
- If the patient requests a specific diet type (e.g. Non-Vegetarian, Vegetarian, Vegan) or goal (e.g. Weight Gain, Hair Growth), you MUST honor their requested diet type and goal in your generate_meal_plan arguments.
- For Weight Gain requests, set dailyCalories to an appropriate caloric surplus (e.g. 2300-2600 kcal) with high protein.
- Safely exclude known clinical allergies from [CLINICAL CONTEXT] (e.g. peanuts, shellfish), but do NOT force historical vegetarian diets if the patient specifically requested non-vegetarian.`;
  }

  let generalHealthGuidance = "";
  if (attention.primaryIntent === "GENERAL_HEALTH") {
    generalHealthGuidance = `\n[DOMAIN SCOPE INSTRUCTION]
Evaluate the query:
- If about health, human biology, medical conditions (e.g. tumor), symptoms, diet, nutrition, or wellness: Answer helpfully in plain, everyday language.
- If completely unrelated to health or wellness (e.g. schools, coding, history, trivia): Do NOT define or answer the off-topic concept. Politely decline to answer and invite them to ask a health, diet, or nutrition question.`;
  }

  let nutritionGuidance = "";
  if (attention.primaryIntent === "NUTRITION_LOOKUP") {
    nutritionGuidance = `\n[NUTRITION LOOKUP INSTRUCTION]
The patient is inquiring about calories, protein, carbs, fat, or nutrients in a food item.
- You MUST call the lookup_nutrition tool with the food item and quantity so the system can verify nutritional facts and render the interactive Nutrition Card.
- Do NOT answer with plain text alone without calling lookup_nutrition. Always invoke lookup_nutrition.`;
  }

  const promptWithContext = `${temporalHeader}
${scheduleGuidance}
${compoundGuidance}
${mealPlanGuidance}
${nutritionGuidance}
${generalHealthGuidance}
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
          timeout: 22000,
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

  // Ensure nutrition lookup tool is always executed when user inquires about food facts so card is always attached
  if (toolCalls.length === 0 && attention.primaryIntent === "NUTRITION_LOOKUP") {
    const cleanQuery = userPrompt
      .replace(
        /\b(?:how\s+much|how\s+many|what\s+are\s+the|tell\s+me|show\s+me|can\s+you\s+give|nutritional\s+value|nutritional\s+facts|calories?|protein|carbs?|carbohydrates?|fat|macros?|in|of|grams?|g|kcal|are|is|a|an)\b/gi,
        " "
      )
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const qtyMatch = userPrompt.match(
      /\b(\d+(?:\.\d+)?\s*(?:g|grams?|kg|oz|cups?|bowls?|pieces?|slices?))\b/i
    );
    const quantity = qtyMatch ? qtyMatch[1] : undefined;
    const foodItem = cleanQuery || userPrompt;

    if (foodItem && foodItem.length >= 2) {
      toolCalls = [
        {
          name: "lookup_nutrition",
          args: { foodItem, quantity },
        },
      ];
    }
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
        targetMacroSummary = `\nPlan Targets to mention in message: Diet Type: ${mealPlanCard.dietType || "Tailored"}, Focus: ${mealPlanCard.healthFocus || "Wellness"}, Daily Calories: ${mealPlanCard.dailyCalories} kcal, Protein: ${mealPlanCard.macroTargets?.proteinGrams}g, Carbs: ${mealPlanCard.macroTargets?.carbsGrams}g, Healthy Fats: ${mealPlanCard.macroTargets?.fatsGrams}g, Hydration: ${mealPlanCard.hydrationTargetLiters} L/day, Allergies Excluded: ${mealPlanCard.allergiesExcluded?.join(", ")}.`;
      }
      const mealPlanGuidance = hasMealPlan
        ? `\n- An interactive meal plan card is already displayed below. DO NOT list or repeat the individual dishes, recipes, or daily menus (no Breakfast, Lunch, Snacks, Dinner) in your message text.${targetMacroSummary} Instead, clearly summarize the tailored nutritional targets (total calories, protein, carb, fat grams, hydration target, and allergy exclusions) and explain how this customized plan supports the patient's requested goals (${mealPlanCard?.healthFocus || "wellness"}). Then invite the patient to explore the detailed meals and recipes inside the interactive card below.`
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
- Accurately state how many verified dietitians were found based on Findings. If 0 specialists were found, state clearly that no verified dietitians specialize in the requested topic in our registry.
- Do NOT fabricate or hallucinate doctor names or specialties. Only reference the exact verified names and their actual listed specialties provided in Findings. NEVER invent or claim that a doctor specializes in a topic not explicitly listed in their profile. If asked why a doctor was recommended, accurately state their real listed specialties from Findings.${mealPlanGuidance}${scheduleGuidance}
- Strict ZERO emojis.`;

      const synthModel = genAI.getGenerativeModel(
        {
          model: GEMINI_MODEL,
          systemInstruction: BASE_SYSTEM_PROMPT,
          generationConfig: { maxOutputTokens: 800, temperature: 0.2 },
        },
        { timeout: 16000 }
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
