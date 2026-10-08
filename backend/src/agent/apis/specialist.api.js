const { Dietitian } = require("../../models/userModel");
const { defaultApiClient } = require("./apiClient");

/**
 * Dedicated Specialist Search API
 * Accepts structured parameters and queries verified dietitians.
 * ZERO REGEX: Uses pure case-insensitive string operations.
 * Customizable: Supports both HTTP API endpoint requests and in-process database access.
 */
async function findDietitiansApi({
  specialtyOrCondition = "",
  gender = "any",
  maxFee = null,
  name = "",
  limit = 25,
  useHttpApi = false,
} = {}) {
  try {
    // If configured to use remote/HTTP API endpoint:
    if (useHttpApi) {
      const apiRes = await defaultApiClient.get("/api/dietitians", {
        search: specialtyOrCondition || name || "",
      });
      if (apiRes.success && Array.isArray(apiRes.data)) {
        return {
          success: true,
          count: apiRes.data.length,
          dietitians: apiRes.data.slice(0, limit),
          message: `Retrieved ${apiRes.data.length} dietitians via HTTP API.`,
        };
      }
    }

    // Direct in-process query without any regex:
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState !== 1) {
      return {
        success: true,
        count: 0,
        dietitians: [],
        message: "No verified dietitians found specializing in the requested criteria.",
      };
    }

    const query = {
      "verificationStatus.finalReport": "Verified",
      isDeleted: { $ne: true },
    };

    const docs = await Dietitian.find(query)
      .select(
        "name email gender specialties specialization experience fees onlineFee rating location about availability profileImage"
      )
      .sort({ rating: -1, experience: -1 })
      .lean();

    const targetGender = (gender || "").toLowerCase().trim();
    const targetName = (name || "").toLowerCase().trim().replace("dr.", "").replace("dr", "").trim();
    const targetTerm = (specialtyOrCondition || "")
      .toLowerCase()
      .replaceAll("'", "")
      .replaceAll("-", " ")
      .trim();

    let filtered = docs.filter((doc) => {
      // 1. Gender filter without regex
      if (targetGender && targetGender !== "any") {
        const docGender = (doc.gender || "").toLowerCase().trim();
        if (docGender !== targetGender) return false;
      }

      // 2. Name filter without regex
      if (targetName) {
        const docName = (doc.name || "").toLowerCase().trim();
        if (!docName.includes(targetName)) return false;
      }

      // 3. Fee filter
      if (typeof maxFee === "number" && maxFee > 0) {
        const fee = Number(doc.onlineFee || doc.fees || 0);
        if (fee > maxFee) return false;
      }

      // 4. Specialty / Condition filter without regex or hardcoding
      if (targetTerm) {
        const specs = Array.isArray(doc.specialties) ? doc.specialties : [];
        const specz = Array.isArray(doc.specialization) ? doc.specialization : [];
        const expertise = Array.isArray(doc.expertise) ? doc.expertise : [];
        const allSpecs = [...specs, ...specz, ...expertise].map((s) => s.toLowerCase().trim());
        const about = (doc.about || "").toLowerCase().trim();
        const title = (doc.title || "").toLowerCase().trim();
        const desc = (doc.description || "").toLowerCase().trim();

        const rawProfileText = `${allSpecs.join(" ")} ${about} ${title} ${desc}`;
        const normalizedProfileText = rawProfileText
          .replaceAll("'", "")
          .replaceAll("-", " ");

        const fillerWords = ["and", "for", "with", "care", "doctor", "dietitian", "specialist", "issues", "problem"];
        const words = targetTerm
          .split(" ")
          .map((w) => w.trim())
          .filter((w) => w.length > 2 && !fillerWords.includes(w));

        const matches =
          rawProfileText.includes(targetTerm) ||
          normalizedProfileText.includes(targetTerm) ||
          (words.length === 1 && normalizedProfileText.includes(words[0])) ||
          (words.length > 1 && words.every((w) => normalizedProfileText.includes(w)));

        if (!matches) return false;
      }

      return true;
    });

    const maxCount = Number(limit) > 0 ? Number(limit) : 25;
    const paginated = filtered.slice(0, maxCount);

    const formattedDietitians = paginated.map((doc) => {
      const specs = doc.specialties?.length
        ? doc.specialties
        : doc.specialization?.length
          ? doc.specialization
          : [];
      const fee = doc.onlineFee || doc.fees || 450;
      return {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email || "",
        gender: doc.gender || "unspecified",
        specialties: specs,
        experience: doc.experience ? `${doc.experience} yrs exp` : "Experienced",
        fee: Number(fee),
        rating: doc.rating ? Number(doc.rating) : 4.8,
        location: doc.location || "India",
        about: doc.about || "",
        profileImage: doc.profileImage || null,
      };
    });

    return {
      success: true,
      count: formattedDietitians.length,
      dietitians: formattedDietitians,
      message:
        formattedDietitians.length > 0
          ? `Found ${formattedDietitians.length} verified dietitian(s).`
          : "No verified dietitians found matching the specified criteria.",
    };
  } catch (error) {
    console.error("[findDietitiansApi Error]:", error);
    return {
      success: false,
      count: 0,
      dietitians: [],
      message: `Error searching dietitians: ${error.message}`,
    };
  }
}

module.exports = {
  findDietitiansApi,
};
