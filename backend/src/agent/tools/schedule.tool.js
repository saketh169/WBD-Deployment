const {
  checkDietitianAvailabilityApi,
  getUserScheduleApi,
} = require("../apis/schedule.api");

const checkAvailabilityDeclaration = {
  name: "check_dietitian_availability",
  description:
    "View the schedule and available consultation slots for a specific dietitian.",
  parameters: {
    type: "OBJECT",
    properties: {
      dietitianName: {
        type: "STRING",
        description: "Name of the dietitian or doctor",
      },
      date: {
        type: "STRING",
        description:
          "Optional date to inspect (e.g. tomorrow, today, or YYYY-MM-DD)",
      },
    },
    required: ["dietitianName"],
  },
};

const getUserScheduleDeclaration = {
  name: "get_user_schedule",
  description:
    "Retrieve the patient's own upcoming booked consultations and appointments.",
  parameters: {
    type: "OBJECT",
    properties: {
      date: {
        type: "STRING",
        description:
          "Optional date to filter appointments (e.g. today, tomorrow, or YYYY-MM-DD)",
      },
    },
  },
};

async function executeCheckDietitianAvailability(args = {}, context = {}) {
  try {
    const { dietitianName, date } = args;
    const result = await checkDietitianAvailabilityApi({
      dietitianName,
      date,
      userId: context.userId || context.authUserId,
    });

    if (!result.success) {
      return {
        success: false,
        cards: [],
        message: result.message,
      };
    }

    const card = {
      type: "slot_booking_card",
      data: {
        dietitian: result.dietitian,
        selectedDate: result.selectedDate,
        availableSlots: result.availableSlots,
        dailySchedules: result.dailySchedules,
        freeDates: result.freeDates,
      },
    };

    return {
      success: true,
      data: result,
      cards: [card],
      message: result.message,
    };
  } catch (error) {
    console.error("[executeCheckDietitianAvailability Error]:", error);
    return {
      success: false,
      cards: [],
      message: "Failed to inspect dietitian availability.",
    };
  }
}

async function executeGetUserSchedule(args = {}, context = {}) {
  try {
    const { date } = args;
    const result = await getUserScheduleApi({
      userId: context.userId,
      authUserId: context.authUserId,
      date,
    });

    if (!result.success) {
      return {
        success: false,
        cards: [],
        message: result.message,
      };
    }

    const card = {
      type: "user_schedule_card",
      data: {
        patientName: result.patientName,
        totalBookings: result.totalBookings,
        bookings: result.bookings,
      },
    };

    return {
      success: true,
      data: result,
      cards: [card],
      message: result.message,
    };
  } catch (error) {
    console.error("[executeGetUserSchedule Error]:", error);
    return {
      success: false,
      cards: [],
      message: "Failed to retrieve your scheduled consultations.",
    };
  }
}

module.exports = {
  checkAvailabilityDeclaration,
  executeCheckDietitianAvailability,
  getUserScheduleDeclaration,
  executeGetUserSchedule,
};
