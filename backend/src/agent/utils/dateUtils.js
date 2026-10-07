const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function getISTDate(dateObj = new Date()) {
  const utcTime = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
  return new Date(utcTime + IST_OFFSET_MS);
}

function formatDateISO(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTemporalContext() {
  const istNow = getISTDate();

  const currentHour = istNow.getUTCHours();
  const currentMinute = istNow.getUTCMinutes();
  const currentMinutesTotal = currentHour * 60 + currentMinute;

  const todayStr = formatDateISO(istNow);

  const tomorrowDate = new Date(istNow);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrowStr = formatDateISO(tomorrowDate);

  const daysOfWeek = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];
  const dayOfWeek = daysOfWeek[istNow.getUTCDay()];
  const tomorrowDayOfWeek = daysOfWeek[tomorrowDate.getUTCDay()];

  const h12 = currentHour % 12 || 12;
  const ampm = currentHour >= 12 ? "PM" : "AM";
  const currentTimeStr = `${String(h12).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")} ${ampm}`;

  const operatingHoursClosedToday = currentMinutesTotal >= 20 * 60;

  return {
    todayStr,
    tomorrowStr,
    dayOfWeek,
    tomorrowDayOfWeek,
    currentTimeStr,
    currentHour,
    currentMinute,
    operatingHoursClosedToday,
  };
}

/**
 * Parses user input for dates without using regular expressions.
 * ZERO REGEX: Pure string splitting and dictionary lookups.
 */
function parseRelativeDate(input) {
  if (!input || typeof input !== "string") return null;
  const clean = input.trim().toLowerCase();
  const { todayStr, tomorrowStr } = getTemporalContext();

  if (clean === "today") return todayStr;
  if (clean === "tomorrow") return tomorrowStr;

  // Check YYYY-MM-DD
  const parts = clean.split("-");
  if (
    parts.length === 3 &&
    parts[0].length === 4 &&
    parts[1].length === 2 &&
    parts[2].length === 2 &&
    !isNaN(Number(parts[0])) &&
    !isNaN(Number(parts[1])) &&
    !isNaN(Number(parts[2]))
  ) {
    return clean;
  }

  // Tokenize by space for "October 10", "10 October", etc.
  const words = clean
    .split(" ")
    .map((w) =>
      w
        .replace("st", "")
        .replace("nd", "")
        .replace("rd", "")
        .replace("th", "")
        .replace(",", "")
        .trim()
    )
    .filter(Boolean);

  const monthWord = words.find((w) => MONTH_MAP[w] !== undefined);
  const dayWord = words.find((w) => {
    const n = parseInt(w, 10);
    return !isNaN(n) && n >= 1 && n <= 31;
  });

  if (monthWord && dayWord) {
    const monthIdx = MONTH_MAP[monthWord];
    const dayNum = parseInt(dayWord, 10);
    const istNow = getISTDate();
    const year = istNow.getUTCFullYear();
    const targetDate = new Date(Date.UTC(year, monthIdx, dayNum));
    return formatDateISO(targetDate);
  }

  return null;
}

/**
 * Converts user time string to 24-hour HH:MM format
 * ZERO REGEX: Pure string index and numeric parsing.
 */
function to24Hour(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const clean = timeStr.trim().toLowerCase();

  const isPm = clean.includes("pm");
  const isAm = clean.includes("am");

  const sanitized = clean.replace("am", "").replace("pm", "").trim();
  const colonIdx = sanitized.indexOf(":");

  if (colonIdx !== -1) {
    let h = parseInt(sanitized.substring(0, colonIdx).trim(), 10);
    const minPart = sanitized.substring(colonIdx + 1).trim();
    const min = parseInt(minPart.substring(0, 2), 10);

    if (isNaN(h) || isNaN(min)) return clean.slice(0, 5);

    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;

    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  const hOnly = parseInt(sanitized, 10);
  if (!isNaN(hOnly) && (isPm || isAm)) {
    let h = hOnly;
    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:00`;
  }

  return clean.slice(0, 5);
}

module.exports = {
  getTemporalContext,
  parseRelativeDate,
  to24Hour,
  getISTDate,
  formatDateISO,
};
