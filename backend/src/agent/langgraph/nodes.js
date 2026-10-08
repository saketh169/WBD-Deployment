const { GEMINI_MODEL, genAI } = require("../config");
const { loadAgentPatientContext } = require("../services/agentContextLoader");
const { getTemporalContext } = require("../utils/dateUtils");
const { buildSystemPrompt, CLINICAL_SCOPE_RULES } = require("../guardrails");
const {
  deduplicateCards,
  formatToolSummary,
  boldKeyPoints,
} = require("../services/presentationFormatter");
const {
  GEMINI_TOOL_DECLARATIONS,
  executeLangGraphTool,
} = require("./tools");

const CANDIDATE_MODELS = [
  GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
].filter((m, i, arr) => m && arr.indexOf(m) === i);
const OVERALL_TIMEOUT_MS = 45000;
const MAX_RETRIES_PER_MODEL = 2;

/**
 * 1. Context Ingestion Node: Loads authenticated patient context into LangGraph state.
 * No vector embeddings, pure patient clinical profile loading.
 */
async function contextIngestionNode(state) {
  const userId = state.userId || state.authUserId;
  const contextData = await loadAgentPatientContext(userId, state.userQuery);

  return {
    patientProfile: contextData.patientProfile,
    clinicalContextText: contextData.contextText,
    cards: [...(state.cards || []), ...(contextData.cards || [])],
    toolsExecuted: Array.from(
      new Set([...(state.toolsExecuted || []), ...(contextData.toolsExecuted || [])])
    ),
    executionStatus: "context_loaded",
  };
}

/**
 * 2. Reasoning & Tool Selection Node:
 * Uses Google Gemini to understand natural language variations, determine clinical operations,
 * and emit structured tool calls without regex or keyword branching.
 */
async function reasoningNode(state) {
  const userPrompt = state.userQuery?.trim() || "";
  const temporal = getTemporalContext();
  const systemInstruction = buildSystemPrompt(temporal, state.clinicalContextText);

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
    const commaIdx = state.file.base64.indexOf(",");
    const cleanBase64 =
      commaIdx !== -1
        ? state.file.base64.substring(commaIdx + 1)
        : state.file.base64;
    messageParts.push({
      inlineData: {
        mimeType: state.file.type,
        data: cleanBase64,
      },
    });
  }
  messageParts.push({ text: userPrompt });

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
          systemInstruction,
          tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
        };

        const model = genAI.getGenerativeModel(modelOptions);
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
          `[reasoningNode] ${modelName} attempt ${attempts} warning:`,
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
    executionStatus: toolCalls.length > 0 ? "tool_pending" : "synthesized",
  };
}

/**
 * 3. Tool Execution Node:
 * Sequentially or concurrently executes all tool calls emitted by Gemini,
 * aggregating tool results, UI cards, and payment checkout details.
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
      cards = deduplicateCards(cards, tr.cards);
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
    executionStatus: "tools_completed",
  };
}

/**
 * 4. Clinical Synthesis Node:
 * Synthesizes tool outputs and patient inquiry into a clear, everyday clinical answer.
 * Strictly enforces zero emojis, no doctor hallucinations, and no repetitive text recipes when cards exist.
 */
async function synthesisNode(state) {
  const userPrompt = state.userQuery || "";
  const toolResults = state.toolResults || [];
  const cards = state.cards || [];
  const temporal = getTemporalContext();
  let replyText = "";

  if (toolResults.length > 0) {
    try {
      const toolSummary = formatToolSummary(toolResults);

      const synthPrompt = `Patient Query: "${userPrompt}"
Date Context: Today is ${temporal.todayStr} (${temporal.dayOfWeek}), ${temporal.currentTimeStr} IST.
Findings:
${toolSummary}
${state.clinicalContextText ? `Patient Clinical Context:\n${state.clinicalContextText}\n` : ""}

Synthesize a clear, empathetic, and helpful clinical response for the patient:
- Directly answer the patient's specific inquiry using the exact verified data in Findings.
- Stay strictly focused on what the patient asked for. Do NOT introduce unrelated topics (such as consultation hours, clinic schedules, or doctor booking) unless the patient asked about scheduling or appointments.
- For food nutrition or calorie inquiries, provide ONLY the direct nutritional breakdown of the requested food item clearly and concisely. Do NOT lecture the patient or bring up their personal lab biomarkers (such as HbA1c, LDL, or cholesterol), medical diagnoses, or historical health reports unless the patient explicitly asked about their health condition or report.
- When interactive cards exist (such as meal plans, booking calendars, or schedules), provide a concise summary with key targets and invite the patient to explore the card below rather than repeating whole recipe menus or raw slot lists.
- When asked about pricing or fees, compare or state the exact verified fees from Findings. Never claim that pricing details are untracked when fees are provided in Findings.
- Accurately state how many verified dietitians were found based on Findings. If 0 specialists were found, state clearly that no verified dietitians specialize in the requested topic in our registry.
- Do NOT fabricate or hallucinate doctor names or specialties. Use only verified facts from Findings.
- Format all key points, specialist names, fees, calorie targets, macros, and metrics in markdown bold (**...**) so they stand out clearly for the patient.
- Strict ZERO emojis in all output text.`;

      for (const mName of CANDIDATE_MODELS) {
        try {
          const synthModel = genAI.getGenerativeModel({
            model: mName,
            generationConfig: { maxOutputTokens: 2500, temperature: 0.2 },
          });

          const synthRes = await synthModel.generateContent(synthPrompt);
          const text = synthRes.response.text();
          if (text && text.trim()) {
            replyText = text.trim();
            break;
          }
        } catch (mErr) {
          console.warn(`[synthesisNode] ${mName} attempt warning:`, mErr.status || mErr.message);
        }
      }
    } catch (err) {
      console.warn("[synthesisNode] Synthesis fallback warning:", err.message);
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

  // Strict Zero Emojis enforcement using Unicode code points without regex
  replyText = Array.from(replyText)
    .filter((char) => {
      const cp = char.codePointAt(0);
      return (
        !(cp >= 0x1f300 && cp <= 0x1faff) &&
        !(cp >= 0x2600 && cp <= 0x27bf) &&
        !(cp >= 0xfe00 && cp <= 0xfe0f)
      );
    })
    .join("")
    .trim();

  // Bold key points in message rather than plain
  replyText = boldKeyPoints(replyText);

  return {
    finalReply: replyText,
    cards,
    executionStatus: "completed",
  };
}

module.exports = {
  contextIngestionNode,
  reasoningNode,
  toolNode,
  synthesisNode,
  boldKeyPoints,
};
