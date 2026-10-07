const mongoose = require("mongoose");
const { Dietitian } = require("../../models/userModel");
const { getDietitianSlots } = require("../services/specialistService");
const { parseRelativeDate, getTemporalContext } = require("../utils/dateUtils");

const checkAvailabilityDeclaration = {
  name: "check_dietitian_availability",
  description:
    "View the schedule and available consultation slots for a dietitian.",
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
          "Optional date to inspect (e.g. tomorrow, today, October 10, or YYYY-MM-DD)",
      },
    },
    required: ["dietitianName"],
  },
};

function escapeRegex(str) {
  return (str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function executeCheckDietitianAvailability(
  { dietitianName, date } = {},
  context = {}
) {
  try {
    if (!dietitianName || !dietitianName.trim()) {
      return {
        success: false,
        message: "Dietitian name is required to check schedule.",
      };
    }

    const cleanName = dietitianName.replace(/^Dr\.?\s*/i, "").trim();
    const safeEscaped = escapeRegex(cleanName);

    let doc = await Dietitian.findOne({
      name: new RegExp(safeEscaped, "i"),
      isDeleted: { $ne: true },
    })
      .select(
        "name email phone experience onlineFee fees rating specialties specialization availability"
      )
      .lean();

    if (!doc) {
      const firstToken = cleanName.split(/\s+/)[0];
      if (firstToken && firstToken.length > 2) {
        doc = await Dietitian.findOne({
          name: new RegExp(escapeRegex(firstToken), "i"),
          isDeleted: { $ne: true },
        })
          .select(
            "name email phone experience onlineFee fees rating specialties specialization availability"
          )
          .lean();
      }
    }

    if (!doc) {
      return {
        success: false,
        message: `Specialist "${dietitianName}" not found in our directory.`,
      };
    }

    const scheduleData = await getDietitianSlots(
      doc._id,
      doc.name,
      context.userId
    );
    const normalizedDate = date ? parseRelativeDate(date) : null;

    const chosenDate =
      normalizedDate &&
      scheduleData.dailySchedules.some((s) => s.date === normalizedDate)
        ? normalizedDate
        : scheduleData.dailySchedules[0]?.date;

    const chosenSchedule =
      scheduleData.dailySchedules.find((s) => s.date === chosenDate) ||
      scheduleData.dailySchedules[0];

    const card = {
      type: "slot_booking_card",
      data: {
        dietitian: {
          id: doc._id.toString(),
          name: doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`,
          email: doc.email || "",
          experience: doc.experience ? `${doc.experience} yrs` : null,
          fee: doc.onlineFee || doc.fees,
          rating: doc.rating ? Number(doc.rating) : null,
          specialties: doc.specialties || doc.specialization || [],
          workingHours:
            doc.availability?.workingHours?.start &&
            doc.availability?.workingHours?.end
              ? `${doc.availability.workingHours.start} - ${doc.availability.workingHours.end}`
              : null,
        },
        selectedDate: chosenDate,
        freeDatesThisWeek: scheduleData.freeDates,
        dailySchedules: scheduleData.dailySchedules,
        availableSlots: chosenSchedule?.freeSlots || [],
      },
    };

    const freeCount = chosenSchedule?.freeSlots?.length || 0;
    const docDisplayName = doc.name.startsWith("Dr.")
      ? doc.name
      : `Dr. ${doc.name}`;
    const { todayStr } = getTemporalContext();
    const isToday = chosenDate === todayStr;
    const todayConcluded =
      isToday && chosenSchedule?.pastSlots?.length > 0 && freeCount === 0;

    let scheduleSummary = "";
    if (freeCount > 0) {
      scheduleSummary = `${docDisplayName} has ${freeCount} open slot(s) available on ${chosenDate}.`;
    } else if (todayConcluded) {
      scheduleSummary = `Consultation hours for ${docDisplayName} have concluded for today (${chosenDate}). Please explore upcoming slots starting tomorrow.`;
    } else {
      scheduleSummary = `No open slots currently available with ${docDisplayName} on ${chosenDate}. Please review other available dates in the schedule card.`;
    }

    return {
      success: true,
      dietitian: doc,
      selectedDate: chosenDate,
      freeSlotsCount: freeCount,
      dailySchedules: scheduleData.dailySchedules,
      freeDates: scheduleData.freeDates,
      card,
      message: scheduleSummary,
    };
  } catch (err) {
    console.error("[checkAvailability] Error:", err);
    return {
      success: false,
      message: "Failed to retrieve dietitian schedule.",
    };
  }
}

const getUserScheduleDeclaration = {
  name: "get_user_schedule",
  description:
    "View the logged-in user or patient consultations and appointments schedule.",
  parameters: {
    type: "OBJECT",
    properties: {
      date: {
        type: "STRING",
        description:
          "Optional date to filter (e.g. today, tomorrow, or YYYY-MM-DD)",
      },
    },
  },
};

async function executeGetUserSchedule({ date } = {}, context = {}) {
  try {
    const Booking = require("../../models/bookingModel");
    const { resolvePatientProfile } = require("../services/userResolver");

    if (!context.userId) {
      return {
        success: false,
        message: "Please sign in to view your consultations schedule.",
      };
    }

    const { user, userId, authId } = await resolvePatientProfile(
      context.userId
    );
    const candidateIds = [context.userId, userId, authId].filter(
      (id) => id && mongoose.isValidObjectId(id)
    );

    const { getTemporalContext } = require("../utils/dateUtils");
    const { todayStr } = getTemporalContext();
    // Start of today in UTC: YYYY-MM-DDT00:00:00.000Z
    const startDate = new Date(`${todayStr}T00:00:00.000Z`);

    const userEmail = (user?.email || context.email || "").toLowerCase().trim();

    const queryFilters = [{ userId: { $in: candidateIds } }];
    if (userEmail) {
      queryFilters.push({ email: userEmail });
    }

    const bookings = await Booking.find({
      $or: queryFilters,
      date: { $gte: startDate },
      status: { $in: ["confirmed", "completed", "pending"] },
    })
      .sort({ date: 1, time: 1 })
      .lean();

    const formattedBookings = bookings.map((b) => {
      const d = new Date(b.date);
      const dateStr = d.toISOString().split("T")[0];
      return {
        bookingId: b._id.toString(),
        dietitianName: b.dietitianName || "Dietitian",
        specialization: b.dietitianSpecialization || "General Consultation",
        date: dateStr,
        time: b.time,
        consultationType: b.consultationType || "Online",
        amount: b.amount,
        status: b.status,
        meetingUrl: b.meetingUrl || null,
      };
    });

    const card = {
      type: "user_schedule_card",
      data: {
        patientName: user?.name || "Patient",
        bookings: formattedBookings,
        count: formattedBookings.length,
      },
    };

    let summary = "";
    if (formattedBookings.length === 0) {
      summary =
        "You have no upcoming consultations scheduled on your calendar.";
    } else {
      const items = formattedBookings
        .map(
          (b) =>
            `${b.dietitianName} on ${b.date} at ${b.time} (${b.consultationType})`
        )
        .join("; ");
      summary = `You have ${formattedBookings.length} upcoming consultation(s): ${items}.`;
    }

    return {
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings,
      card,
      message: summary,
    };
  } catch (err) {
    console.error("[getUserSchedule] Error:", err);
    return { success: false, message: "Failed to retrieve your schedule." };
  }
}

module.exports = {
  checkAvailabilityDeclaration,
  executeCheckDietitianAvailability,
  getUserScheduleDeclaration,
  executeGetUserSchedule,
};
