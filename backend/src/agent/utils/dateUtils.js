/**
 * Temporal and Date Normalization Utilities for NutriAgent
 * Aligned to Indian Standard Time (IST UTC+05:30)
 */

function getISTDate() {
  const utcNow = Date.now();
  // 5 hours 30 minutes in milliseconds = 19,800,000 ms
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(utcNow + istOffsetMs);
}

function formatDateISO(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTemporalContext() {
  const istNow = getISTDate();
  const todayStr = formatDateISO(istNow);

  const tomorrow = new Date(istNow);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = formatDateISO(tomorrow);

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayOfWeek = daysOfWeek[istNow.getUTCDay()];
  const tomorrowDayOfWeek = daysOfWeek[tomorrow.getUTCDay()];

  const h = istNow.getUTCHours();
  const m = istNow.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const currentTimeStr = `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
  const current24Str = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return {
    todayStr,
    tomorrowStr,
    dayOfWeek,
    tomorrowDayOfWeek,
    currentTimeStr,
    current24Str,
    currentHour: h,
    currentMinute: m,
    operatingHoursClosedToday: h >= 20,
  };
}

const MONTH_MAP = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/**
 * Normalizes user date input into standard YYYY-MM-DD
 * Handles "today", "tomorrow", "october 10", "10th oct", "2026-10-10", "10/10/2026"
 */
function parseRelativeDate(input) {
  if (!input || typeof input !== "string") return null;
  const clean = input.trim().toLowerCase();
  const { todayStr, tomorrowStr } = getTemporalContext();

  if (clean === "today") return todayStr;
  if (clean === "tomorrow") return tomorrowStr;

  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Month + Day: "october 10", "oct 10", "october 10th", "10 october", "10th oct"
  const monthDayRegex =
    /(?:([a-z]{3,9})\s*(\d{1,2})(?:st|nd|rd|th)?)|(?:(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?([a-z]{3,9}))/i;
  const mdMatch = clean.match(monthDayRegex);
  if (mdMatch) {
    const monthWord = (mdMatch[1] || mdMatch[4] || "").toLowerCase();
    const dayNum = parseInt(mdMatch[2] || mdMatch[3], 10);
    const monthIdx = MONTH_MAP[monthWord];

    if (
      monthIdx !== undefined &&
      !isNaN(dayNum) &&
      dayNum >= 1 &&
      dayNum <= 31
    ) {
      const istNow = getISTDate();
      let year = istNow.getUTCFullYear();
      const targetDate = new Date(Date.UTC(year, monthIdx, dayNum));
      return formatDateISO(targetDate);
    }
  }

  return null;
}

/**
 * Converts user time string to 24-hour HH:MM format
 */
function to24Hour(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const clean = timeStr.trim().toLowerCase();

  const m = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2];
    const meridiem = m[3];
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }

  const hOnlyMatch = clean.match(/^(\d{1,2})\s*(am|pm)$/);
  if (hOnlyMatch) {
    let h = parseInt(hOnlyMatch[1], 10);
    const meridiem = hOnlyMatch[2];
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:00`;
  }

  return clean.slice(0, 5);
}

module.exports = {
  getTemporalContext,
  parseRelativeDate,
  to24Hour,
};
