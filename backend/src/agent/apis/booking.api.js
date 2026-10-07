const mongoose = require("mongoose");
const Booking = require("../../models/bookingModel");
const { BlockedSlot } = require("../../models/bookingModel");
const { Dietitian } = require("../../models/userModel");
const { resolvePatientProfile } = require("../services/userResolver");
const {
  getTemporalContext,
  parseRelativeDate,
  to24Hour,
} = require("../utils/dateUtils");
const { defaultApiClient } = require("./apiClient");

const ALL_DEFAULT_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00",
];

/**
 * Dedicated Appointment Booking API
 * Validates slot availability, prevents conflicts, and registers booking records.
 * ZERO REGEX: Pure string splitting and date math.
 * Customizable: Supports both HTTP API endpoint requests and in-process database calls.
 */
async function bookDietitianAppointmentApi({
  dietitianName,
  date,
  time,
  consultationType = "Online",
  userId = null,
  authUserId = null,
  useHttpApi = false,
} = {}) {
  try {
    if (!dietitianName || !date || !time) {
      return {
        success: false,
        message: "Dietitian name, date, and time are required to book an appointment.",
      };
    }

    const cleanDate = parseRelativeDate(date);
    const dParts = (cleanDate || "").split("-");
    const isValidDate =
      dParts.length === 3 &&
      dParts[0].length === 4 &&
      dParts[1].length === 2 &&
      dParts[2].length === 2 &&
      !isNaN(new Date(cleanDate).getTime());

    if (!cleanDate || !isValidDate) {
      return {
        success: false,
        message: "Date must be in valid YYYY-MM-DD format.",
      };
    }

    const cleanTime = to24Hour(time);
    const tParts = (cleanTime || "").split(":");
    const isValidTime =
      tParts.length === 2 &&
      tParts[0].length === 2 &&
      tParts[1].length === 2 &&
      !isNaN(Number(tParts[0])) &&
      !isNaN(Number(tParts[1]));

    if (!cleanTime || !isValidTime) {
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
      const slotH = Number(tParts[0]);
      const slotM = Number(tParts[1]);
      if (slotH < currentHour || (slotH === currentHour && slotM <= currentMinute)) {
        return {
          success: false,
          message: `Slot ${cleanTime} on today (${cleanDate}) has already passed. Please select an upcoming slot.`,
        };
      }
    }

    // Direct in-process execution without regex:
    const cleanDocName = dietitianName.toLowerCase().replace("dr.", "").replace("dr", "").trim();
    const allDietitians = await Dietitian.find({
      "verificationStatus.finalReport": "Verified",
      isDeleted: { $ne: true },
    })
      .select("name email phone specialties specialization onlineFee fees availability")
      .lean();

    const doc = allDietitians.find((d) => {
      const n = (d.name || "").toLowerCase().replace("dr.", "").replace("dr", "").trim();
      return n === cleanDocName || n.includes(cleanDocName) || cleanDocName.includes(n);
    });

    if (!doc) {
      return {
        success: false,
        message: `No verified dietitian found matching "${dietitianName}". Please select a verified doctor from our specialist registry.`,
      };
    }

    // Resolve patient user record
    const targetUserId = userId || authUserId;
    const {
      user: userRecord,
      userId: patientId,
      authId,
    } = await resolvePatientProfile(targetUserId);

    if (!userRecord || !patientId) {
      return {
        success: false,
        message: "A valid patient session is required to book an appointment. Please sign in first.",
      };
    }

    // If configured to use remote/HTTP API endpoint:
    if (useHttpApi) {
      const apiRes = await defaultApiClient.post("/api/bookings", {
        dietitianName,
        date: cleanDate,
        time: cleanTime,
        consultationType,
        userId: patientId,
      });
      if (apiRes.success && apiRes.data) {
        return {
          success: true,
          ...apiRes.data,
        };
      }
    }

    const docDisplayName = doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`;
    const [year, month, day] = cleanDate.split("-").map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Check blocked slot
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

    // Check if dietitian is already booked
    const docBooked = await Booking.findOne({
      dietitianId: doc._id,
      date: { $gte: dayStart, $lt: dayEnd },
      time: cleanTime,
      status: { $in: ["confirmed", "completed", "pending"] },
    });
    if (docBooked) {
      return {
        success: false,
        message: `Slot ${cleanTime} on ${cleanDate} is already booked for ${docDisplayName}. Please choose another slot.`,
      };
    }

    // Check patient conflict
    const userConflict = await Booking.findOne({
      userId: patientId,
      date: { $gte: dayStart, $lt: dayEnd },
      time: cleanTime,
      status: { $in: ["confirmed", "completed", "pending"] },
    });
    if (userConflict) {
      return {
        success: false,
        message: `You already have an appointment booked with ${userConflict.dietitianName || "another specialist"} at ${cleanTime} on ${cleanDate}.`,
      };
    }

    const fee = Number(doc.onlineFee || doc.fees || 450);
    const bookingId = new mongoose.Types.ObjectId();

    const newBooking = new Booking({
      _id: bookingId,
      userId: patientId,
      username: userRecord.name || "Patient",
      email: userRecord.email || "patient@test.com",
      userPhone: userRecord.phone || "",
      dietitianId: doc._id,
      dietitianName: docDisplayName,
      dietitianEmail: doc.email || "dietitian@test.com",
      dietitianPhone: doc.phone || "",
      date: dayStart,
      time: cleanTime,
      consultationType: consultationType || "Online",
      amount: fee,
      paymentMethod: "upi",
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      paymentStatus: "pending",
      status: "confirmed",
    });
    await newBooking.save();

    const bookingIdStr = bookingId.toString();

    let razorpayOrderId = null;
    let paymentKeyId = process.env.RAZORPAY_KEY_ID || "";
    try {
      const { createRazorpayOrder } = require("../services/userResolver");
      if (typeof createRazorpayOrder === "function") {
        const order = await createRazorpayOrder(fee, bookingIdStr);
        razorpayOrderId = order?.id || null;
      }
    } catch {
      razorpayOrderId = `order_${Date.now()}`;
    }

    const paymentDetails = {
      orderId: razorpayOrderId || `order_${bookingIdStr}`,
      bookingId: bookingIdStr,
      amount: fee,
      currency: "INR",
      keyId: paymentKeyId,
      dietitianName: docDisplayName,
      clientName: userRecord.name || "Patient",
      clientEmail: userRecord.email || "",
      date: cleanDate,
      time: cleanTime,
      consultationType,
    };

    return {
      success: true,
      bookingId: bookingIdStr,
      dietitianName: docDisplayName,
      date: cleanDate,
      time: cleanTime,
      consultationType,
      fee,
      paymentStatus: "Pending",
      openPayment: true,
      paymentDetails,
      message: `Reserved consultation slot with ${docDisplayName} on ${cleanDate} at ${cleanTime}. Complete payment to secure your appointment.`,
    };
  } catch (error) {
    console.error("[bookDietitianAppointmentApi Error]:", error);
    return {
      success: false,
      message: `Failed to book appointment: ${error.message}`,
    };
  }
}

module.exports = {
  bookDietitianAppointmentApi,
};
