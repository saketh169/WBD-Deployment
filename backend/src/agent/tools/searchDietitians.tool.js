const mongoose = require("mongoose");
const { genAI } = require("../config");
const { Dietitian } = require("../../models/userModel");
const {
  getDietitianEmbeddings,
  cosineSimilarity,
  getQueryEmbedding,
} = require("../services/specialistService");

const searchDietitiansDeclaration = {
  name: "search_dietitians",
  description:
    "Search and find verified dietitians by specialty, health condition, gender, fee, or name.",
  parameters: {
    type: "OBJECT",
    properties: {
      specialtyOrCondition: {
        type: "STRING",
        description:
          "Health condition, goal, or clinical specialty (e.g. Women's Health, PCOS, Weight Loss, Diabetes, Gut Health)",
      },
      gender: {
        type: "STRING",
        enum: ["male", "female", "any"],
        description: "Gender filter",
      },
      maxFee: {
        type: "NUMBER",
        description: "Maximum consultation fee in INR",
      },
      name: {
        type: "STRING",
        description: "Name or partial name of a specific dietitian",
      },
      limit: {
        type: "NUMBER",
        description:
          "Number of verified dietitians to return (e.g. 4). Defaults to 6.",
      },
    },
  },
};

const GENERIC_SPECIALTY_WORDS = new Set([
  "health",
  "management",
  "care",
  "diet",
  "nutrition",
  "support",
  "disorders",
  "specialist",
  "doctor",
  "all",
  "related",
  "blood",
]);

function computeSpecialtyMatch(query, specs, about) {
  if (!query) return 0;
  const qNorm = query.toLowerCase().replace(/['’]/g, "").trim();
  const allSpecs = Array.isArray(specs) ? specs : [];

  let score = 0;

  // 1. Exact or full phrase containment across specialties
  for (const spec of allSpecs) {
    const sNorm = spec.toLowerCase().replace(/['’]/g, "").trim();
    if (sNorm === qNorm || sNorm.includes(qNorm) || qNorm.includes(sNorm)) {
      score += 10.0;
    }
  }

  // 2. Token-level matching & universal stemming without hardcoding condition names
  const qTokens = qNorm
    .split(/[\s,/-]+/)
    .filter((t) => t.length > 2 && !GENERIC_SPECIALTY_WORDS.has(t));
  for (const spec of allSpecs) {
    const sNorm = spec.toLowerCase().replace(/['’]/g, "").trim();
    const sWords = sNorm.split(/[\s,/-]+/);
    for (const token of qTokens) {
      if (sNorm.includes(token)) {
        score += 5.0;
      } else {
        // Universal stemming (first 4 characters match, e.g. wome/women, diabet/diabetic, hypertens/hypertension)
        const prefix = token.slice(0, 4);
        if (
          prefix.length >= 4 &&
          sWords.some(
            (w) =>
              w.startsWith(prefix) ||
              (w.length >= 4 && prefix.startsWith(w.slice(0, 4)))
          )
        ) {
          score += 4.0;
        }
      }
    }
  }

  // 3. Dynamic search across biography / about text
  if (about) {
    const aNorm = about.toLowerCase().replace(/['’]/g, "");
    if (aNorm.includes(qNorm)) score += 2.0;
    for (const token of qTokens) {
      if (aNorm.includes(token)) score += 1.0;
    }
  }

  return score;
}

async function executeSearchDietitians(
  { specialtyOrCondition, gender, maxFee, name, limit } = {},
  context = {}
) {
  try {
    const allSpecialists = await getDietitianEmbeddings(genAI);

    if (!allSpecialists || allSpecialists.length === 0) {
      return {
        success: false,
        count: 0,
        dietitians: [],
        message: "No verified dietitians found in the clinical registry.",
      };
    }

    let candidates = [...allSpecialists];

    // 1. Gender filter
    if (gender && gender.toLowerCase() !== "any") {
      const g = gender.toLowerCase();
      candidates = candidates.filter(
        (d) => (d.gender || "").toLowerCase() === g
      );
    }

    // 2. Budget filter
    if (typeof maxFee === "number" && maxFee > 0) {
      candidates = candidates.filter((d) => {
        const fee = Number(d.fee || 0);
        return fee > 0 && fee <= maxFee;
      });
    }

    // 3. Name filter (if searching for a specific practitioner)
    if (name && name.trim()) {
      const cleanName = name
        .replace(/^Dr\.?\s*/i, "")
        .trim()
        .toLowerCase();
      candidates = candidates.filter((d) =>
        d.name.toLowerCase().includes(cleanName)
      );
    }

    if (candidates.length === 0) {
      return {
        success: false,
        count: 0,
        dietitians: [],
        message:
          "No verified dietitians found matching the specified criteria.",
      };
    }

    // Determine effective clinical search target dynamically
    let searchTarget = (specialtyOrCondition || "").trim();
    if (!searchTarget && context.userQuery) {
      const extracted = context.userQuery
        .replace(
          /\b(?:i\s+need|i\s+want|find|get(?:\s+me)?|show(?:\s+me)?|recommend|looking\s+for|search|give(?:\s+me)?|can\s+you|please|list|suggest|tell\s+me\s+about)\b/gi,
          " "
        )
        .replace(
          /\b(?:verified|dietitians?|nutritionists?|specialists?|doctors?|practitioners?|dr\.?)\b/gi,
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
      if (extracted && extracted.length >= 2) {
        searchTarget = extracted;
      }
    }

    // Determine target limit
    const qText = `${context.userQuery || ""} ${searchTarget}`.toLowerCase();
    const isAllQuery = /\b(all|every|complete|full\s*list|list\s*all)\b/i.test(
      qText
    );

    let targetLimit;
    if (
      isAllQuery ||
      (gender && gender.toLowerCase() !== "any" && !searchTarget)
    ) {
      targetLimit = candidates.length;
    } else if (typeof limit === "number" && limit > 0) {
      targetLimit = limit;
    } else if (context.userQuery) {
      const match = context.userQuery.match(
        /\b(\d+)\s*(?:verified\s*)?(?:dietitians?|doctors?|specialists?)\b/i
      );
      if (match && Number(match[1]) > 0) {
        targetLimit = Number(match[1]);
      } else {
        targetLimit = searchTarget ? 8 : candidates.length;
      }
    } else {
      targetLimit = searchTarget ? 8 : candidates.length;
    }

    // 4. Hybrid Structured + Semantic Search
    let selectedDocs = [];
    if (searchTarget) {
      let queryVector = null;
      try {
        queryVector = await getQueryEmbedding(searchTarget, genAI);
      } catch (embedErr) {
        console.warn(
          "[searchDietitians] Embedding computation warning:",
          embedErr.message
        );
      }

      const scored = candidates.map((doc) => {
        const specScore = computeSpecialtyMatch(
          searchTarget,
          doc.specialties,
          doc.about
        );
        const semScore =
          queryVector && doc.vector
            ? cosineSimilarity(queryVector, doc.vector)
            : 0;
        const ratingScore = Number(doc.rating || 4.5) * 0.1;
        const totalScore = specScore * 3.0 + semScore * 2.0 + ratingScore;
        return {
          ...doc,
          specScore,
          semScore,
          totalScore,
        };
      });

      const directMatches = scored.filter((d) => d.specScore > 0);
      let matched = [];
      if (directMatches.length > 0) {
        matched = directMatches;
      } else {
        matched = scored.filter((d) => d.semScore >= 0.51);
      }

      if (matched.length === 0) {
        return {
          success: false,
          count: 0,
          dietitians: [],
          message: `No verified dietitians found specializing in "${searchTarget}".`,
        };
      }

      matched.sort((a, b) => b.totalScore - a.totalScore);
      selectedDocs = matched.slice(0, targetLimit);
    } else {
      candidates.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      selectedDocs = candidates.slice(0, targetLimit);
    }

    // Fetch live fees, active status, and ratings from MongoDB to prevent stale data
    const docIds = selectedDocs.map((d) => d.id);
    const liveMap = new Map();
    if (docIds.length > 0) {
      try {
        const liveDocs = await Dietitian.find({ _id: { $in: docIds } })
          .select(
            "fees onlineFee rating location phone email isDeleted verificationStatus"
          )
          .lean();
        liveDocs.forEach((ld) => liveMap.set(ld._id.toString(), ld));
      } catch (dbErr) {
        console.warn(
          "[searchDietitians] Live fee refresh warning:",
          dbErr.message
        );
      }
    }

    const dietitians = selectedDocs
      .filter((d) => {
        const live = liveMap.get(d.id);
        if (
          live &&
          (live.isDeleted ||
            live.verificationStatus?.finalReport !== "Verified")
        )
          return false;
        return true;
      })
      .map((d) => {
        const live = liveMap.get(d.id);
        const fee = live?.onlineFee || live?.fees || d.fee || null;
        return {
          id: d.id,
          _id: d.id,
          name: d.name,
          email: live?.email || d.email || "",
          phone: live?.phone || d.phone || "",
          gender: d.gender,
          specialties:
            Array.isArray(d.specialties) && d.specialties.length
              ? d.specialties
              : [],
          experience: d.experience || null,
          fee,
          onlineFee: fee,
          rating: live?.rating
            ? Number(live.rating)
            : d.rating
              ? Number(d.rating)
              : 4.8,
          location: live?.location || d.location || "India",
          about: d.about || "",
        };
      });

    return {
      success: true,
      count: dietitians.length,
      dietitians,
      message: `Found ${dietitians.length} verified dietitian(s) specializing in ${searchTarget || "your health goals"}.`,
    };
  } catch (err) {
    console.error("[searchDietitians] Error:", err);
    return {
      success: false,
      count: 0,
      dietitians: [],
      message: "Failed to retrieve specialists at this time.",
    };
  }
}

module.exports = {
  searchDietitiansDeclaration,
  executeSearchDietitians,
};
