const {
  getTemporalContext,
  parseRelativeDate,
  to24Hour,
} = require("../utils/dateUtils");

/**
 * Query Attention & Intent Analysis Service
 * Understands user intent before routing to tools, supporting both single-intent and compound multi-tool queries.
 */
function analyzeQueryAttention(query, history = []) {
  const q = (query || "").trim();
  const qLower = q.toLowerCase();
  const temporal = getTemporalContext();

  const result = {
    primaryIntent: "GENERAL_HEALTH",
    scopedTools: [],
    extractedParams: {},
    temporal,
  };

  if (!q) return result;

  // 1. APPOINTMENT BOOKING INTENT
  const isBookingQuery =
    /\b(book|reserve|booking)\b/i.test(qLower) &&
    /\b(at|on|for|with|slot|time|am|pm|\d{1,2}:\d{2})\b/i.test(qLower);

  let bookingParams = {};
  if (isBookingQuery) {
    const forMatch = q.match(
      /(?:for|with|dr\.?)\s+(?:dr\.?\s*)?([a-zA-Z\s]+?)(?:\s+(?:at|on|\d{1,2}|tomorrow|today)|$)/i
    );
    let extractedDoc = forMatch ? forMatch[1].trim() : "";
    const timeMatch = q.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    const extractedTime = timeMatch ? to24Hour(timeMatch[1]) : "";
    let extractedDate = null;
    const dateMatch = q.match(
      /\b(tomorrow|today|\d{4}-\d{2}-\d{2}|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}|\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\b/i
    );
    if (dateMatch) {
      extractedDate = parseRelativeDate(dateMatch[1]);
    }
    bookingParams = {
      dietitianName: extractedDoc,
      date: extractedDate,
      time: extractedTime,
    };
  }

  // 2. PATIENT'S OWN SCHEDULE / UPCOMING APPOINTMENTS INTENT
  const isPatientScheduleQuery =
    /\b(my\s+.*schedule|my\s+appointments?|my\s+bookings?|my\s+consultations?|user\s+schedule)\b/i.test(
      qLower
    ) ||
    /\b(get|show|view|check|find|see)\s+(?:all\s+)?my\s+.*schedule\b/i.test(
      qLower
    );

  // 3. DIETITIAN SCHEDULE / AVAILABILITY INTENT
  const isScheduleQuery =
    (/\b(available|availability|open\s+slots?|free\s+slots?|timing)\b/i.test(
      qLower
    ) ||
      (/\bschedule\b/i.test(qLower) &&
        !isPatientScheduleQuery &&
        !/\b(book\s+at|book\s+for)\b/i.test(qLower))) &&
    !isBookingQuery;

  let scheduleParams = {};
  if (isScheduleQuery) {
    const forMatch = q.match(
      /(?:for|with|dr\.?)\s+(?:dr\.?\s*)?([a-zA-Z\s]+?)(?:\s+(?:on|at|tomorrow|today)|$)/i
    );
    const extractedDoc = forMatch ? forMatch[1].trim() : "";
    let extractedDate = null;
    const dateMatch = q.match(
      /\b(tomorrow|today|\d{4}-\d{2}-\d{2}|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2})\b/i
    );
    if (dateMatch) {
      extractedDate = parseRelativeDate(dateMatch[1]);
    }
    scheduleParams = {
      dietitianName: extractedDoc,
      date: extractedDate,
    };
  }

  // 4. MEAL PLAN GENERATION INTENT
  const isMealPlanQuery =
    /\b(meal\s+plan|diet\s+plan|diet\s+chart|\b\d+\s+days?\s+plan|week\s+plan|generate\s+meal\s+plan)\b/i.test(
      qLower
    );

  // 5. COMPARISON QUERY (should not trigger new specialist search)
  const isComparisonQuery =
    /\b(who\s+is\s+best|compare\b|which\s+one|who\s+should\s+i|between\s+them|among\s+them|who\s+is\s+better)\b/i.test(
      qLower
    );

  // 6. SPECIALIST SEARCH INTENT
  const hasSpecialistKeywords =
    /\b(dietitians?|dieticians?|dieitians?|dietitions?|nutritionists?|specialists?|doctors?|dr\.?|physicians?|consultants?|practitioners?|experts?)\b/i.test(
      qLower
    ) ||
    /\b(who\s+(?:can\s+help|specializes?|handles?|treats?|deals?)|consult(?:ant)?|recommend\s+someone|need\s+someone|find\s+someone)\b/i.test(
      qLower
    );

  // Avoid pure availability/booking checks falsely triggering specialist search when only inquiring about one named doctor
  const hasPureNamedDocWithoutSearch =
    (isBookingQuery || (isScheduleQuery && scheduleParams.dietitianName)) &&
    !/\b(find|search|recommend|get(?:\s+me)?|show(?:\s+me)?|look(?:\s+for)?|list|suggest|who\s+handle|speciali\w*)\b/i.test(
      qLower
    );

  const isSpecialistQuery =
    hasSpecialistKeywords &&
    !isComparisonQuery &&
    !hasPureNamedDocWithoutSearch;

  let specialistParams = {};
  if (isSpecialistQuery) {
    let gender = undefined;
    if (/\bmale\b/i.test(qLower) && !/\bfemale\b/i.test(qLower))
      gender = "male";
    else if (/\bfemale\b/i.test(qLower)) gender = "female";

    let maxFee = undefined;
    const feeMatch = qLower.match(
      /(?:under|below|less\s+than|within|maximum|max)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i
    );
    if (feeMatch) maxFee = parseInt(feeMatch[1], 10);

    let specialtyOrCondition = undefined;
    const cleanSearchQuery = q
      .replace(
        /\b(?:i\s+need|i\s+want|find|get(?:\s+me)?|show(?:\s+me)?|recommend|looking\s+for|search|give(?:\s+me)?|can\s+you|please|list|suggest|tell\s+me\s+about)\b/gi,
        " "
      )
      .replace(/\b(?:verified|practitioners?|dr\.?)\b/gi, " ")
      .replace(
        /\b(dietitians?|dieticians?|dieitians?|dietitions?|nutritionists?|specialists?|doctors?|physicians?|consultants?|practitioners?|experts?)\b/gi,
        " "
      )
      .replace(
        /\b(?:all|every|from|both|either|any|who\s+handle|who\s+treats?|who\s+deals?\s+with|who\s+specialize[s]?\s*in|specializing\s+in|specialized\s+in|related\s+to|related|regarding|for|in|about)\b/gi,
        " "
      )
      .replace(
        /\b(?:under|below|less\s+than|within|budget)\s*(?:rs\.?|inr|₹)?\s*\d+\s*(?:rs\.?|inr|₹|rupees?)?\b/gi,
        " "
      )
      .replace(/\b(?:male|female)\b/gi, " ")
      .replace(
        /\b\d+\s*(?:verified)?\s*(?:dietitians?|doctors?|specialists?)?\b/gi,
        " "
      )
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanSearchQuery && cleanSearchQuery.length >= 2) {
      specialtyOrCondition = cleanSearchQuery;
    }

    let limit = undefined;
    const limitMatch = q.match(
      /\b(\d+)\s*(?:verified\s*)?(?:dietitians?|specialists?|doctors?)\b/i
    );
    if (limitMatch) limit = parseInt(limitMatch[1], 10);

    specialistParams = {
      gender,
      maxFee,
      specialtyOrCondition,
      limit,
    };
  }

  // 7. NUTRITION / FOOD LOOKUP INTENT
  const isNutritionQuery =
    /\b(calories?|protein|carbs?|macro|fat|nutrient|nutrition|fiber|sugar|kcal)\b/i.test(
      qLower
    );

  // --- Aggregate Matching Tools ---
  const matchedTools = new Set();
  const matchedIntents = [];

  if (isBookingQuery) {
    matchedIntents.push("APPOINTMENT_BOOKING");
    matchedTools.add("book_dietitian_appointment");
  }
  if (isPatientScheduleQuery) {
    matchedIntents.push("PATIENT_SCHEDULE");
    matchedTools.add("get_user_schedule");
  }
  if (isScheduleQuery) {
    if (scheduleParams.dietitianName) {
      matchedIntents.push("SCHEDULE_AVAILABILITY");
      matchedTools.add("check_dietitian_availability");
    } else {
      matchedIntents.push("PATIENT_SCHEDULE");
      matchedTools.add("get_user_schedule");
    }
  }
  if (isMealPlanQuery) {
    matchedIntents.push("MEAL_PLAN");
    matchedTools.add("generate_meal_plan");
  }
  if (isSpecialistQuery) {
    matchedIntents.push("SPECIALIST_SEARCH");
    matchedTools.add("search_dietitians");
  }
  if (isNutritionQuery) {
    matchedIntents.push("NUTRITION_LOOKUP");
    matchedTools.add("lookup_nutrition");
  }

  // --- Resolve Output Intent ---
  if (matchedTools.size === 0) {
    result.primaryIntent = "GENERAL_HEALTH";
    result.scopedTools = [];
    result.extractedParams = {};
    return result;
  }

  if (matchedTools.size === 1) {
    result.primaryIntent = matchedIntents[0];
    result.scopedTools = Array.from(matchedTools);
    if (result.primaryIntent === "APPOINTMENT_BOOKING") {
      result.extractedParams = bookingParams;
    } else if (result.primaryIntent === "SCHEDULE_AVAILABILITY") {
      result.extractedParams = scheduleParams;
    } else if (result.primaryIntent === "SPECIALIST_SEARCH") {
      result.extractedParams = specialistParams;
    }
    return result;
  }

  // Compound multi-tool query (e.g. specialist search + availability check + nutrition lookup)
  result.primaryIntent = "COMPOUND";
  result.isCompound = true;
  result.intents = matchedIntents;
  result.scopedTools = Array.from(matchedTools);
  result.extractedParams = {
    ...bookingParams,
    ...scheduleParams,
    ...specialistParams,
  };
  return result;
}

module.exports = {
  analyzeQueryAttention,
};
