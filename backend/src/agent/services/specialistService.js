const mongoose = require("mongoose");
const { Dietitian } = require("../../models/userModel");
const Booking = require("../../models/bookingModel");
const { BlockedSlot } = require("../../models/bookingModel");

const queryEmbeddingsCache = new Map();
let dietitianEmbeddingsCache = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Invalidate in-memory cache of verified dietitian vector embeddings
function invalidateDietitianEmbeddingsCache() {
  dietitianEmbeddingsCache = null;
  lastCacheTimestamp = 0;
}

// Compute cosine similarity between query and candidate vector embeddings
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0,
    nA = 0,
    nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  return nA && nB ? dot / (Math.sqrt(nA) * Math.sqrt(nB)) : 0;
}

// Generate and cache vector embedding for patient query
async function getQueryEmbedding(text, genAI) {
  if (!text || !text.trim()) return null;
  const key = text.toLowerCase().trim();
  if (queryEmbeddingsCache.has(key)) {
    return queryEmbeddingsCache.get(key);
  }
  const embedModel = genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });
  const res = await embedModel.embedContent(key);
  const vector = res.embedding.values;
  queryEmbeddingsCache.set(key, vector);
  return vector;
}

// Fetch verified dietitians and compute/cache vector embeddings
async function getDietitianEmbeddings(genAI) {
  const now = Date.now();
  if (dietitianEmbeddingsCache && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return dietitianEmbeddingsCache;
  }

  const docs = await Dietitian.find({
    "verificationStatus.finalReport": "Verified",
    isDeleted: { $ne: true },
  })
    .select(
      "name email gender specialties specialization experience fees onlineFee rating location about embedding availability"
    )
    .lean();

  const embedModel = genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });
  const embedded = [];

  for (const doc of docs) {
    const specs = doc.specialties?.length
      ? doc.specialties
      : doc.specialization?.length
        ? doc.specialization
        : [];
    let vector = doc.embedding;

    if (!vector?.length) {
      try {
        const expStr = doc.experience ? `${doc.experience} years` : "experienced specialist";
        const locStr = doc.location ? ` Location: ${doc.location}.` : "";
        const text = `Dietitian ${doc.name}. Gender: ${doc.gender || "unspecified"}. Specialties: ${specs.join(", ")}. Experience: ${expStr}.${locStr} About: ${doc.about || ""}`;
        const res = await embedModel.embedContent(text);
        vector = res.embedding.values;
        await Dietitian.updateOne(
          { _id: doc._id },
          { $set: { embedding: vector } }
        );
      } catch (err) {
        console.warn(`Vector embedding warning for ${doc.name}:`, err.message);
      }
    }

    embedded.push({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email || "",
      gender: doc.gender || null,
      specialties: specs,
      experience: doc.experience ? `${doc.experience} yrs` : null,
      fee: doc.onlineFee || doc.fees || null,
      rating: doc.rating || null,
      location: doc.location || null,
      availability: doc.availability || null,
      vector: vector || null,
    });
  }

  dietitianEmbeddingsCache = embedded;
  lastCacheTimestamp = now;
  return dietitianEmbeddingsCache;
}

// Standard default slots aligned exactly with the platform-wide booking system
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

// Generate standard platform slots aligned with the dietitian booking page (09:00 to 20:00)
function generateDietitianSlots() {
  return [...ALL_DEFAULT_SLOTS];
}

const formatLocalDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Inspect 7-day live schedule availability and conflicts for a dietitian
async function getDietitianSlots(dietitianId, dietitianName, userId = null) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = formatLocalDate(now);

  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const [dietitianDoc, dietitianBookings, blockedDocs, userBookings] =
    await Promise.all([
      mongoose.isValidObjectId(dietitianId)
        ? Dietitian.findById(dietitianId).select("availability name").lean()
        : dietitianName
          ? Dietitian.findOne({
              name: new RegExp(
                (dietitianName || "").replace(/^Dr\.?\s*/i, "").trim(),
                "i"
              ),
            })
              .select("availability name")
              .lean()
          : Promise.resolve(null),

      Booking.find({
        $or: [
          ...(mongoose.isValidObjectId(dietitianId) ? [{ dietitianId }] : []),
          {
            dietitianName: new RegExp(
              (dietitianName || "").replace(/^Dr\.?\s*/i, ""),
              "i"
            ),
          },
        ],
        date: { $gte: startDate, $lt: endDate },
        status: { $in: ["confirmed", "completed", "pending"] },
      })
        .select("date time")
        .lean(),

      mongoose.isValidObjectId(dietitianId)
        ? BlockedSlot.find({
            dietitianId,
            date: { $gte: todayStr, $lte: formatLocalDate(endDate) },
          })
            .select("date time")
            .lean()
        : [],

      userId && mongoose.isValidObjectId(userId)
        ? Booking.find({
            userId,
            date: { $gte: startDate, $lt: endDate },
            status: { $in: ["confirmed", "completed", "pending"] },
          })
            .select("date time dietitianName")
            .lean()
        : [],
    ]);

  const standardSlots = generateDietitianSlots();

  const bookedByDate = new Map();
  dietitianBookings.forEach((b) => {
    const d = formatLocalDate(new Date(b.date));
    if (!bookedByDate.has(d)) bookedByDate.set(d, []);
    bookedByDate
      .get(d)
      .push({ time: b.time, userId: b.userId ? String(b.userId) : null });
  });

  const blockedByDate = new Map();
  blockedDocs.forEach((b) => {
    if (!blockedByDate.has(b.date)) blockedByDate.set(b.date, new Set());
    blockedByDate.get(b.date).add(b.time);
  });

  const userConflictByDate = new Map();
  userBookings.forEach((b) => {
    const d = formatLocalDate(new Date(b.date));
    if (!userConflictByDate.has(d)) userConflictByDate.set(d, new Map());
    userConflictByDate
      .get(d)
      .set(b.time, b.dietitianName || "Another Specialist");
  });

  const dailySchedules = [];
  const freeDates = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);

    const dateStr = formatLocalDate(dayDate);
    const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
    const fullDayName = dayDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const monthDay = dayDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
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
    const startHour = dietitianDoc?.availability?.workingHours?.start;
    const endHour = dietitianDoc?.availability?.workingHours?.end;
    if (startHour && endHour) {
      daySlots = standardSlots.filter((s) => s >= startHour && s <= endHour);
    }

    const dayBookings = bookedByDate.get(dateStr) || [];
    const blockedSet = blockedByDate.get(dateStr) || new Set();
    const conflicts = userConflictByDate.get(dateStr) || new Map();

    const userBookedSlots = [];
    const bookedByOthers = [];
    const allBooked = new Set();

    dayBookings.forEach((b) => {
      allBooked.add(b.time);
      if (userId && b.userId && String(b.userId) === String(userId)) {
        userBookedSlots.push(b.time);
      } else {
        bookedByOthers.push(b.time);
      }
    });

    const freeSlots = [];
    const userConflictSlots = [];
    const pastSlots = [];

    for (const slot of daySlots) {
      const [h, m] = slot.split(":").map(Number);
      if (isToday && h * 60 + m <= currentMinutes) {
        pastSlots.push(slot);
      } else if (conflicts.has(slot)) {
        userConflictSlots.push({
          time: slot,
          dietitianName: conflicts.get(slot),
        });
      } else if (!allBooked.has(slot) && !blockedSet.has(slot)) {
        freeSlots.push(slot);
      }
    }

    if (freeSlots.length > 0) {
      freeDates.push({
        date: dateStr,
        day: dayName,
        openSlotsCount: freeSlots.length,
      });
    }

    dailySchedules.push({
      date: dateStr,
      day: dayName,
      monthDay,
      isWorkingDay,
      freeSlotsCount: freeSlots.length,
      allSlots: daySlots,
      freeSlots,
      userBookedSlots,
      bookedByOthers,
      bookedSlots: Array.from(allBooked),
      blockedSlots: Array.from(blockedSet),
      userConflictSlots,
      pastSlots,
    });
  }

  return { dailySchedules, freeDates };
}

module.exports = {
  getDietitianEmbeddings,
  getQueryEmbedding,
  cosineSimilarity,
  invalidateDietitianEmbeddingsCache,
  generateDietitianSlots,
  getDietitianSlots,
};
