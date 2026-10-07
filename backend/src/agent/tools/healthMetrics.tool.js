const { calculateHealthMetricsApi } = require("../apis/healthMetrics.api");

const calculateHealthMetricsDeclaration = {
  name: "calculate_health_metrics",
  description:
    "Retrieve recorded health metrics from patient lab/health reports or calculate BMI, BMR, and caloric targets if new metrics are provided.",
  parameters: {
    type: "OBJECT",
    properties: {
      weightKg: {
        type: "NUMBER",
        description: "Patient weight in kilograms (e.g. 70). Optional if patient has recorded reports.",
      },
      heightCm: {
        type: "NUMBER",
        description: "Patient height in centimeters (e.g. 175). Optional if patient has recorded reports.",
      },
      age: {
        type: "NUMBER",
        description: "Patient age in years",
      },
      gender: {
        type: "STRING",
        enum: ["male", "female", "other"],
        description: "Patient biological gender",
      },
      activityLevel: {
        type: "STRING",
        enum: ["sedentary", "light", "moderate", "active", "very_active"],
        description: "Activity level",
      },
    },
    required: [],
  },
};

async function executeCalculateHealthMetrics(args = {}, context = {}) {
  try {
    const { weightKg, heightCm, age, gender, activityLevel } = args;

    const result = await calculateHealthMetricsApi({
      userId: context.userId,
      patientId: context.patientId,
      authUserId: context.authUserId,
      weightKg,
      heightCm,
      age,
      gender,
      activityLevel,
    });

    if (!result.success || !result.metrics) {
      return {
        success: false,
        cards: [],
        message: result.message || "Failed to retrieve or calculate health metrics.",
      };
    }

    return {
      success: true,
      data: result.metrics,
      cards: [],
      message: result.message,
    };
  } catch (error) {
    console.error("[executeCalculateHealthMetrics Error]:", error);
    return {
      success: false,
      cards: [],
      message: "Failed to evaluate health metrics.",
    };
  }
}

module.exports = {
  calculateHealthMetricsDeclaration,
  executeCalculateHealthMetrics,
};
