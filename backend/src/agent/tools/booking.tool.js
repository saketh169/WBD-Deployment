const mongoose = require("mongoose");
const Booking = require("../../models/bookingModel");
const { BlockedSlot } = require("../../models/bookingModel");
const { Dietitian, UserAuth } = require("../../models/userModel");
const { resolvePatientProfile } = require("../services/userResolver");
const {
  getTemporalContext,
  parseRelativeDate,
  to24Hour,
} = require("../utils/dateUtils");

function escapeRegex(str) {
  return (str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const bookDietitianAppointmentDeclaration = {
  name: "book_dietitian_appointment",
  description:
    "Book a consultation slot with a dietitian for a specific date and time.",
  parameters: {
    type: "OBJECT",
    properties: {
      dietitianName: { type: "STRING", description: "Name of the dietitian" },
      date: {
        type: "STRING",
        description:
          "Date in YYYY-MM-DD format, or relative expression like tomorrow, today, october 10",
      },
      time: {
        type: "STRING",
        description:
          "Time slot in 24-hour HH:MM or 12-hour AM/PM format (e.g. 10:30, 10:30 AM)",
      },
      consultationType: {
        type: "STRING",
        enum: ["Online", "In-person"],
        description: "Consultation mode (Online/In-person)",
      },
    },
    required: ["dietitianName", "date", "time"],
  },
};

const ALL_DEFAULT_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

async function executeBookDietitianAppointment(
  { dietitianName, date, time, consultationType = "Online" } = {},
  context = {}
) {
  try {
    if (!dietitianName || !date || !time) {
      return {
        success: false,
        message:
          "Dietitian name, date, and time are required to book an appointment.",
      };
    }

    // 1. Normalize date and time
    const cleanDate = parseRelativeDate(date);
    if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return {
        success: false,
        message: "Date must be in valid YYYY-MM-DD format.",
      };
    }

    const cleanTime = to24Hour(time);
    if (!cleanTime || !/^\d{2}:\d{2}$/.test(cleanTime)) {
      return {
        success: false,
        message: `Could not understand time "${time}". Please select a slot between 09:00 AM and 08:00 PM.`,
      };
    }

    const { todayStr, currentHour, currentMinute } = getTemporalContext();

    if (cleanDate < todayStr) {
      return {
        success: false,
        message: `Cannot book an appointment for past date ${cleanDate}. Please select an upcoming date.`,
      };
    }

    if (!ALL_DEFAULT_SLOTS.includes(cleanTime)) {
      return {
        success: false,
        message: `Requested time ${cleanTime} is outside platform appointment hours (09:00 AM to 08:00 PM). Please select a slot between 09:00 and 20:00.`,
      };
    }

    if (cleanDate === todayStr) {
      const [slotH, slotM] = cleanTime.split(":").map(Number);
      if (
        slotH < currentHour ||
        (slotH === currentHour && slotM <= currentMinute)
      ) {
        return {
          success: false,
          message: `Slot ${cleanTime} on today (${cleanDate}) has already passed. Please select an upcoming slot.`,
        };
      }
    }

    // 2. Resolve patient user profile
    const targetUserId = context.userId || context.authUserId;
    const {
      user: userRecord,
      userId: patientId,
      authId,
    } = await resolvePatientProfile(targetUserId);

    if (!userRecord || !patientId) {
      return {
        success: false,
        message:
          "A valid patient profile session is required to book an appointment. Please sign in first.",
      };
    }

    // 3. Find dietitian
    const cleanDocName = dietitianName.replace(/^Dr\.?\s*/i, "").trim();
    let doc = await Dietitian.findOne({
      name: new RegExp(escapeRegex(cleanDocName), "i"),
      isDeleted: { $ne: true },
    })
      .select(
        "name email phone specialties specialization onlineFee fees availability"
      )
      .lean();

    if (!doc) {
      const firstToken = cleanDocName.split(/\s+/)[0];
      if (firstToken && firstToken.length > 2) {
        doc = await Dietitian.findOne({
          name: new RegExp(escapeRegex(firstToken), "i"),
          isDeleted: { $ne: true },
        })
          .select(
            "name email phone specialties specialization onlineFee fees availability"
          )
          .lean();
      }
    }

    if (!doc) {
      return {
        success: false,
        message: `Dietitian "${dietitianName}" was not found in our specialist registry.`,
      };
    }

    const docDisplayName = doc.name.startsWith("Dr.")
      ? doc.name
      : `Dr. ${doc.name}`;
    const [year, month, day] = cleanDate.split("-").map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // 4. Check blocked slot
    const isBlocked = await BlockedSlot.findOne({
      dietitianId: doc._id,
      date: cleanDate,
      time: cleanTime,
    });

    if (isBlocked) {
      return {
        success: false,
        message: `This slot (${cleanTime} on ${cleanDate}) is currently blocked by ${docDisplayName}. Please choose another slot.`,
      };
    }

    // 5. Check if dietitian is already booked
    const docBooked = await Booking.findOne({
      dietitianId: doc._id,
      date: { $gte: dayStart, $lt: dayEnd },
      time: cleanTime,
      status: { $in: ["confirmed", "completed", "pending"] },
    });

    if (docBooked) {
      const isSameUser =
        docBooked.userId &&
        (String(docBooked.userId) === String(patientId) ||
          (authId && String(docBooked.userId) === String(authId)));
      if (isSameUser) {
        return {
          success: false,
          message: `You already have this appointment booked with ${docDisplayName} at ${cleanTime} on ${cleanDate}.`,
        };
      }
      return {
        success: false,
        message: `This slot (${cleanTime} on ${cleanDate}) with ${docDisplayName} is already booked by another patient. Please select an alternate slot.`,
      };
    }

    // 6. Check if user already has an appointment with another dietitian at this exact time
    const userConflictIds = [patientId];
    if (authId) userConflictIds.push(authId);

    const userConflict = await Booking.findOne({
      userId: { $in: userConflictIds },
      date: { $gte: dayStart, $lt: dayEnd },
      time: cleanTime,
      status: { $in: ["confirmed", "completed", "pending"] },
    });

    if (userConflict) {
      return {
        success: false,
        message: `You already have an appointment scheduled with Dr. ${userConflict.dietitianName} at ${cleanTime} on ${cleanDate}. Please select an alternate time.`,
      };
    }

    const fee = doc.onlineFee || doc.fees;
    if (!fee) {
      return {
        success: false,
        message: `Consultation fee for ${docDisplayName} is not configured.`,
      };
    }

    let docEmail = doc.email;
    if (!docEmail) {
      const auth = await UserAuth.findOne({ roleId: doc._id }).lean();
      docEmail = auth?.email || "";
    }

    // Prepare direct payment checkout details
    return {
      success: true,
      openPayment: true,
      message: `Proceeding to checkout for your consultation with ${docDisplayName} on ${cleanDate} at ${cleanTime} (\u20B9${fee}). Please complete payment to confirm your booking.`,
      paymentDetails: {
        dietitianId: doc._id.toString(),
        dietitianName: doc.name,
        dietitianEmail: docEmail,
        dietitianSpecialization: Array.isArray(doc.specialties)
          ? doc.specialties.join(", ")
          : doc.specialization?.[0] || "",
        date: cleanDate,
        time: cleanTime,
        amount: fee,
        fee,
        consultationType: consultationType || "Online",
        type: consultationType || "Online",
        userId: patientId.toString(),
        userName: userRecord.name || "Patient",
        userEmail: userRecord.email || "",
        userPhone: userRecord.phone || "",
        userAddress: userRecord.address || "",
      },
    };
  } catch (err) {
    console.error("[bookAppointment] Error:", err);
    return {
      success: false,
      message: "Failed to process consultation booking.",
    };
  }
}

module.exports = {
  bookDietitianAppointmentDeclaration,
  executeBookDietitianAppointment,
};
