const { getUserHealthReportsApi } = require("../apis/healthReports.api");

const getUserHealthReportsDeclaration = {
  name: "get_user_health_reports",
  description:
    "Retrieve the authenticated patient's clinical health reports, lab test records, dietitian assessments, and medical findings from MongoDB. Supports retrieving the most recent reports or filtering by date and report type.",
  parameters: {
    type: "OBJECT",
    properties: {
      reportType: {
        type: "STRING",
        enum: ["all", "health", "lab"],
        description: "Type of report to retrieve: 'health' for dietitian assessments, 'lab' for laboratory diagnostic panels, or 'all' for both.",
      },
      date: {
        type: "STRING",
        description: "Optional date filter (YYYY-MM-DD or year/month) to inspect reports from a specific timeframe.",
      },
      limit: {
        type: "NUMBER",
        description: "Maximum number of recent reports to retrieve (e.g. 1 for latest/most recent, 3, 5). Defaults to 5.",
      },
    },
    required: [],
  },
};

async function executeGetUserHealthReports(args = {}, context = {}) {
  try {
    const apiResult = await getUserHealthReportsApi({
      ...args,
      userId: context.userId,
      authUserId: context.authUserId,
      patientId: context.patientId,
    });

    if (!apiResult.success) {
      return {
        success: false,
        cards: [],
        message: apiResult.message,
      };
    }

    const cards = [];
    if (apiResult.data?.profileData) {
      cards.push({
        type: "patient_profile_card",
        data: apiResult.data.profileData,
      });
    }

    return {
      success: true,
      data: apiResult.data,
      cards,
      message: apiResult.message,
    };
  } catch (err) {
    console.error("[executeGetUserHealthReports Error]:", err);
    return {
      success: false,
      cards: [],
      message: "Failed to retrieve patient health reports.",
    };
  }
}

module.exports = {
  getUserHealthReportsDeclaration,
  executeGetUserHealthReports,
};
