const { findDietitiansApi } = require("../apis/specialist.api");

const searchDietitiansDeclaration = {
  name: "search_dietitians",
  description:
    "Find verified dietitians by specialty, health condition, gender, fee, or name.",
  parameters: {
    type: "OBJECT",
    properties: {
      specialtyOrCondition: {
        type: "STRING",
        description:
          "Health condition, medical goal, or clinical specialty to match (e.g. skin, hair, cardiac, diabetes, digestion, weight management).",
      },
      gender: {
        type: "STRING",
        enum: ["male", "female", "any"],
        description: "Gender filter for the dietitian",
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
        description: "Number of verified dietitians to return. Defaults to 6.",
      },
    },
  },
};

async function executeSearchDietitians(args = {}, context = {}) {
  try {
    const { specialtyOrCondition, gender, maxFee, name, limit } = args;

    const apiResult = await findDietitiansApi({
      specialtyOrCondition,
      gender,
      maxFee,
      name,
      limit: typeof limit === "number" && limit > 0 ? limit : 25,
    });

    if (!apiResult.success || apiResult.count === 0) {
      return {
        success: false,
        count: 0,
        data: [],
        dietitians: [],
        cards: [],
        message:
          specialtyOrCondition
            ? `No verified dietitians found specializing in "${specialtyOrCondition}".`
            : "No verified dietitians found matching the specified criteria.",
      };
    }

    const cards = [
      {
        type: "dietitian_cards",
        data: apiResult.dietitians,
      },
    ];

    return {
      success: true,
      count: apiResult.count,
      data: apiResult.dietitians,
      dietitians: apiResult.dietitians,
      cards,
      message: `Found ${apiResult.count} verified dietitian(s) matching your request.`,
    };
  } catch (error) {
    console.error("[executeSearchDietitians Error]:", error);
    return {
      success: false,
      count: 0,
      data: [],
      dietitians: [],
      cards: [],
      message: "Failed to search verified dietitians.",
    };
  }
}

module.exports = {
  searchDietitiansDeclaration,
  executeSearchDietitians,
};
