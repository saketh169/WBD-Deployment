/**
 * Presentation Normalization & Result Formatter
 * Separates UI card normalization and tool result text serialization
 * from the core LangGraph orchestration nodes.
 */

/**
 * Deduplicates and merges new UI cards into existing cards.
 */
function deduplicateCards(existingCards = [], newCards = []) {
  let cards = [...existingCards];

  for (const card of newCards) {
    if (!card || !card.type) continue;

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

  return cards;
}

/**
 * Formats structured tool execution outputs into concise text findings
 * for the Gemini plain language synthesis prompt.
 */
function formatToolSummary(toolResults = []) {
  if (!Array.isArray(toolResults) || toolResults.length === 0) {
    return "";
  }

  return toolResults
    .map((tr) => {
      let line = `${tr.tool}: ${tr.message || "completed"}`;
      const list = tr.data || tr.dietitians;

      if (tr.tool === "search_dietitians" && Array.isArray(list)) {
        line +=
          `\nMatched verified specialists (${list.length}):\n` +
          list
            .map(
              (d) =>
                `- ${d.name} | Fee: ₹${d.fee} | Rating: ${d.rating} | Experience: ${d.experience} | Specialties: ${Array.isArray(d.specialties) ? d.specialties.join(", ") : d.specialties} | Location: ${d.location}`
            )
            .join("\n");
      }

      if (tr.tool === "lookup_nutrition" && tr.data) {
        line += `\nNutrition Details: ${tr.data.foodName} (${tr.data.servingSize?.amount}${tr.data.servingSize?.unit}): ${tr.data.calories} kcal, Protein: ${tr.data.protein}g, Carbs: ${tr.data.carbs}g, Fat: ${tr.data.fat}g, Fiber: ${tr.data.fiber}g`;
      }

      if (tr.tool === "get_user_health_reports" && tr.data) {
        const hr = tr.data.healthReports || [];
        const lr = tr.data.labReports || [];
        line += `\nClinical Records for ${tr.data.patientName || "Patient"}:`;
        if (hr.length) {
          line +=
            `\nHealth Reports (${hr.length}):\n` +
            hr
              .map(
                (h) =>
                  `- "${h.title}" by ${h.dietitianName} (${h.date || "Recent"})\n  Diagnosis: ${h.diagnosis || "N/A"}\n  Findings: ${h.findings || "N/A"}\n  Guidance: ${h.dietaryRecommendations || "N/A"}\n  Lifestyle: ${h.lifestyleRecommendations || "N/A"}\n  Supplements: ${h.supplements || "N/A"}`
              )
              .join("\n");
        }
        if (lr.length) {
          line +=
            `\nLab Reports (${lr.length}):\n` +
            lr
              .map(
                (l) =>
                  `- Date: ${l.date || "Recent"} | Panels: ${(l.submittedCategories || []).join(", ")}`
              )
              .join("\n");
        }
      }

      if (tr.tool === "check_dietitian_availability" && tr.data) {
        line += `\nDoctor: ${tr.data.dietitian?.name} | Fee: ₹${tr.data.dietitian?.fee} | Available Slots: ${tr.data.availableSlots?.join(", ") || "None today"}`;
      }

      if (
        tr.tool === "get_user_schedule" &&
        (tr.data?.consultations || tr.data?.bookings || Array.isArray(tr.data))
      ) {
        const bookings =
          tr.data?.consultations ||
          tr.data?.bookings ||
          (Array.isArray(tr.data) ? tr.data : []);
        line +=
          `\nUpcoming Appointments (${bookings.length}):\n` +
          bookings
            .map(
              (b) =>
                `- ${b.dietitianName} on ${b.date} at ${b.time} (${b.consultationType})`
            )
            .join("\n");
      }

      return line;
    })
    .join("\n\n");
}

/**
 * Normalizes markdown bold formatting produced by Gemini.
 */
function boldKeyPoints(text) {
  if (!text || typeof text !== "string") return text || "";
  let res = text;
  while (res.includes("****")) {
    res = res.split("****").join("**");
  }
  return res;
}

module.exports = {
  deduplicateCards,
  formatToolSummary,
  boldKeyPoints,
};
