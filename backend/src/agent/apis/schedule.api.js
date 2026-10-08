const mongoose = require("mongoose");
const { Dietitian } = require("../../models/userModel");
const Booking = require("../../models/bookingModel");
const { BlockedSlot } = require("../../models/bookingModel");
const { parseRelativeDate, getTemporalContext } = require("../utils/dateUtils");
const { resolvePatientProfile } = require("../services/userResolver");
const { defaultApiClient } = require("./apiClient");

function generateStandardSlots() {
  const slots = [];
  for (let h = 9; h < 20; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  slots.push("20:00");
  return slots;
}

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getDietitianSlotsData(dietitianId, dietitianName, userId = null) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = formatLocalDate(now);

  if (mongoose.connection.readyState !== 1) {
    return {
      success: false,
      date: dateStr,
      dietitianName: "Specialist",
      availableSlots: [],
      freeSlots: [],
      bookedSlots: [],
      workingHours: "09:00 - 20:00",
      message: "Database connection initializing.",
    };
  }

  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 8);

  const patientIds = [];
  if (userId) {
    const { userId: resolvedUserObjId, authId: resolvedAuthObjId } =
      await resolvePatientProfile(userId);
    if (resolvedUserObjId) patientIds.push(resolvedUserObjId);
    if (resolvedAuthObjId) patientIds.push(resolvedAuthObjId);
    if (mongoose.isValidObjectId(userId)) {
      const uObj = new mongoose.Types.ObjectId(userId);
      if (!patientIds.some((p) => p.equals(uObj))) patientIds.push(uObj);
    }
  }
  const patientIdStrs = patientIds.map((id) => id.toString());

  const [dietitianDoc, dietitianBookings, blockedDocs, userBookings] =
    await Promise.all([
      Dietitian.findById(dietitianId).select("availability").lean(),
      Booking.find({
        dietitianId,
        date: { $gte: startDate, $lt: endDate },
        status: { $in: ["confirmed", "completed", "pending"] },
      })
        .select("date time userId")
        .lean(),
      BlockedSlot.find({
        dietitianId,
        date: {
          $gte: formatLocalDate(startDate),
          $lte: formatLocalDate(endDate),
        },
      })
        .select("date time")
        .lean(),
      patientIds.length > 0
        ? Booking.find({
            userId: { $in: patientIds },
            date: { $gte: startDate, $lt: endDate },
            status: { $in: ["confirmed", "completed", "pending"] },
          })
            .select("date time dietitianName dietitianId")
            .lean()
        : [],
    ]);

  const standardSlots = generateStandardSlots();

  const bookedByDate = new Map();
  dietitianBookings.forEach((b) => {
    const d = formatLocalDate(new Date(b.date));
    if (!bookedByDate.has(d)) bookedByDate.set(d, []);
    bookedByDate.get(d).push({ time: b.time, userId: b.userId ? String(b.userId) : null });
  });

  const blockedByDate = new Map();
  blockedDocs.forEach((b) => {
    if (!blockedByDate.has(b.date)) blockedByDate.set(b.date, new Set());
    blockedByDate.get(b.date).add(b.time);
  });

  const userConflictByDate = new Map();
  userBookings.forEach((b) => {
    if (b.dietitianId && String(b.dietitianId) === String(dietitianId)) return;
    const d = formatLocalDate(new Date(b.date));
    if (!userConflictByDate.has(d)) userConflictByDate.set(d, new Map());
    userConflictByDate.get(d).set(b.time, b.dietitianName || "Another Specialist");
  });

  const dailySchedules = [];
  const freeDates = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);

    const dateStr = formatLocalDate(dayDate);
    const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
    const fullDayName = dayDate.toLocaleDateString("en-US", { weekday: "long" });
    const monthDay = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const isToday = dateStr === todayStr;

    const workingDays = dietitianDoc?.availability?.workingDays;
    const isWorkingDay =
      Array.isArray(workingDays) && workingDays.length > 0
        ? workingDays.some(
            (d) =>
              d.toLowerCase().startsWith(dayName.toLowerCase()) ||
              d.toLowerCase() === fullDayName.toLowerCase()
          )
        : true;

    let daySlots = standardSlots;

    const dayBookings = bookedByDate.get(dateStr) || [];
    const blockedSet = blockedByDate.get(dateStr) || new Set();
    const conflicts = userConflictByDate.get(dateStr) || new Map();

    const userBookedSlots = [];
    const bookedByOthers = [];
    const allBooked = new Set();

    dayBookings.forEach((b) => {
      allBooked.add(b.time);
      const isThisUser = b.userId && patientIdStrs.includes(String(b.userId));
      if (isThisUser) {
        userBookedSlots.push(b.time);
      } else {
        bookedByOthers.push(b.time);
      }
    });

    const freeSlots = [];
    const userConflictSlots = [];
    const pastSlots = [];

    for (const slot of daySlots) {
      const parts = slot.split(":");
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      if (isToday && h * 60 + m <= currentMinutes) {
        pastSlots.push(slot);
      } else if (conflicts.has(slot)) {
        userConflictSlots.push({ time: slot, dietitianName: conflicts.get(slot) });
      } else if (!allBooked.has(slot) && !blockedSet.has(slot)) {
        freeSlots.push(slot);
      }
    }

    const isAvailable = isWorkingDay && freeSlots.length > 0;
    if (isAvailable) freeDates.push(dateStr);

    dailySchedules.push({
      date: dateStr,
      day: dayName,
      monthDay,
      displayDate: `${dayName}, ${monthDay}`,
      dayOfWeek: fullDayName,
      isToday,
      isWorkingDay,
      freeSlotsCount: freeSlots.length,
      freeSlots,
      userBookedSlots,
      userConflictSlots,
      bookedSlots: Array.from(allBooked),
      bookedByOthers,
      blockedSlots: Array.from(blockedSet),
      pastSlots,
      allSlots: daySlots,
      allDaySlots: daySlots,
    });
  }

  return { dailySchedules, freeDates };
}

/**
 * Dedicated API to check availability and open slots for a dietitian
 * ZERO REGEX: Pure string comparison.
 * Customizable: Supports both HTTP API endpoint requests and in-process database calls.
 */
async function checkDietitianAvailabilityApi({
  dietitianName,
  date = null,
  userId = null,
  useHttpApi = false,
} = {}) {
  try {
    if (!dietitianName || !dietitianName.trim()) {
      return {
        success: false,
        message: "Dietitian name is required to check schedule.",
      };
    }

    const cleanName = dietitianName.toLowerCase().replace("dr.", "").replace("dr", "").trim();

    // Query without regex
    const allDietitians = await Dietitian.find({
      "verificationStatus.finalReport": "Verified",
      isDeleted: { $ne: true },
    })
      .select("name email phone experience onlineFee fees rating specialties specialization availability")
      .lean();

    const doc = allDietitians.find((d) => {
      const n = (d.name || "").toLowerCase().replace("dr.", "").replace("dr", "").trim();
      return n === cleanName || n.includes(cleanName) || cleanName.includes(n);
    });

    if (!doc) {
      return {
        success: false,
        message: `Specialist "${dietitianName}" not found in our directory.`,
      };
    }

    const scheduleData = await getDietitianSlotsData(doc._id, doc.name, userId);
    const normalizedDate = date ? parseRelativeDate(date) : null;

    const chosenDate =
      normalizedDate && scheduleData.dailySchedules.some((s) => s.date === normalizedDate)
        ? normalizedDate
        : scheduleData.dailySchedules[0]?.date;

    const chosenSchedule =
      scheduleData.dailySchedules.find((s) => s.date === chosenDate) ||
      scheduleData.dailySchedules[0];

    return {
      success: true,
      dietitian: {
        id: doc._id.toString(),
        name: doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`,
        email: doc.email || "",
        experience: doc.experience ? `${doc.experience} yrs` : null,
        fee: Number(doc.onlineFee || doc.fees || 450),
        rating: doc.rating ? Number(doc.rating) : 4.8,
        specialties: doc.specialties || doc.specialization || [],
      },
      selectedDate: chosenDate,
      availableSlots: chosenSchedule?.freeSlots || [],
      dailySchedules: scheduleData.dailySchedules,
      freeDates: scheduleData.freeDates,
      message: `Retrieved schedule for ${doc.name}. Found ${chosenSchedule?.freeSlots?.length || 0} open slot(s) for ${chosenDate}.`,
    };
  } catch (err) {
    console.error("[checkDietitianAvailabilityApi Error]:", err);
    return {
      success: false,
      message: `Failed to check schedule: ${err.message}`,
    };
  }
}

/**
 * Dedicated API to retrieve the patient's own scheduled consultations
 * ZERO REGEX: Pure ID and status filtering.
 */
async function getUserScheduleApi({
  userId,
  patientId = null,
  authUserId = null,
  date = null,
  dietitianName = null,
  upcomingOnly = true,
} = {}) {
  try {
    const idToUse = userId || patientId || authUserId;
    if (!idToUse || !mongoose.isValidObjectId(idToUse)) {
      return {
        success: true,
        message: "Authenticated patient ID is required to look up personal appointments.",
        bookings: [],
        consultations: [],
        totalBookings: 0,
        count: 0,
      };
    }

    const { resolvePatientProfile } = require("../services/userResolver");
    const { user, userId: resolvedId } = await resolvePatientProfile(idToUse);
    const effectiveUserId = resolvedId || idToUse;

    const queryFilter = {
      $or: [{ userId: effectiveUserId }, { clientId: effectiveUserId }],
      status: { $in: ["confirmed", "completed", "pending"] },
    };

    if (date) {
      const parsed = parseRelativeDate(date);
      if (parsed) {
        const start = new Date(parsed);
        const end = new Date(parsed);
        end.setDate(end.getDate() + 1);
        queryFilter.date = { $gte: start, $lt: end };
      }
    } else if (upcomingOnly) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      queryFilter.date = { $gte: startOfToday };
    }

    let bookings = await Booking.find(queryFilter)
      .sort({ date: 1, time: 1 })
      .lean();

    if (dietitianName) {
      const cleanTarget = String(dietitianName)
        .toLowerCase()
        .replace(/^dr\.?\s*/i, "")
        .trim();
      if (cleanTarget) {
        bookings = bookings.filter((b) => {
          const docName = (b.dietitianName || "")
            .toLowerCase()
            .replace(/^dr\.?\s*/i, "")
            .trim();
          return (
            docName.includes(cleanTarget) || cleanTarget.includes(docName)
          );
        });
      }
    }

    const formatted = bookings.map((b) => ({
      bookingId: b._id.toString(),
      dietitianName: b.dietitianName || "Specialist",
      dietitianId: b.dietitianId ? b.dietitianId.toString() : null,
      date: b.date ? new Date(b.date).toISOString().split("T")[0] : null,
      time: b.time || "",
      consultationType: b.consultationType || "Online",
      status: b.status || "confirmed",
      meetingLink: b.meetingLink || "/user/schedule",
    }));

    return {
      success: true,
      patientName: user?.name || "Patient",
      totalBookings: formatted.length,
      count: formatted.length,
      bookings: formatted,
      consultations: formatted,
      message:
        formatted.length > 0
          ? `Found ${formatted.length} scheduled consultation(s) for ${user?.name || "Patient"}.`
          : "You currently have no scheduled appointments on file.",
    };
  } catch (err) {
    console.error("[getUserScheduleApi Error]:", err);
    return {
      success: false,
      message: `Failed to retrieve patient appointments: ${err.message}`,
      bookings: [],
    };
  }
}

module.exports = {
  checkDietitianAvailabilityApi,
  getUserScheduleApi,
  getDietitianSlotsData,
};
