import React, { useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

const to24 = (t) => {
  const m = String(t || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return (t || "").slice(0, 5);
  let h = +m[1];
  if (/PM/i.test(m[3]) && h < 12) h += 12;
  if (/AM/i.test(m[3]) && h === 12) h = 0;
  return `${h < 10 ? "0" : ""}${h}:${m[2]}`;
};

const formatSlotTime = (t) => {
  if (!t) return "";
  const [h, m] = to24(t).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export const SlotBookingCard = ({ data, onBookSlot }) => {
  const dietitian = data?.dietitian || data?.doctor;
  const dailySchedules = data?.dailySchedules || [];
  if (!data || !dietitian) return null;

  const initialDate = data.selectedDate || dailySchedules[0]?.date || "";
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const activeDay =
    dailySchedules.find((s) => s.date === selectedDate) ||
    dailySchedules[0] ||
    {};
  const allSlots = activeDay.allSlots || [];
  const freeSlots = activeDay.freeSlots || [];
  const userBookedSlots = activeDay.userBookedSlots || [];
  const bookedByOthers = activeDay.bookedByOthers || [];
  const bookedSlots = activeDay.bookedSlots || [];
  const blockedSlots = activeDay.blockedSlots || [];
  const pastSlots = activeDay.pastSlots || [];
  const userConflictSlots = activeDay.userConflictSlots || [];

  const pastSet = new Set((pastSlots || []).map(to24));
  // Filter out past slots completely, matching the dietitian page logic
  const displaySlots = allSlots.filter((s) => !pastSet.has(to24(s)));

  const sections = [
    {
      title: "Morning (09:00 - 11:30)",
      slots: displaySlots.filter((s) => Number(s.split(":")[0]) < 12),
    },
    {
      title: "Afternoon (12:00 - 16:30)",
      slots: displaySlots.filter((s) => {
        const h = Number(s.split(":")[0]);
        return h >= 12 && h < 17;
      }),
    },
    {
      title: "Evening (17:00 - 20:00)",
      slots: displaySlots.filter((s) => Number(s.split(":")[0]) >= 17),
    },
  ];

  const handleSelectSlot = (slot) => {
    const normSlot = to24(slot);
    const isBooked =
      bookedSlots.some((b) => to24(b) === normSlot) ||
      userConflictSlots.some((c) => to24(c.time || c) === normSlot);
    if (
      isBooked ||
      blockedSlots.some((b) => to24(b) === normSlot) ||
      pastSlots.some((p) => to24(p) === normSlot)
    )
      return;
    setSelectedSlot(slot);
  };

  const renderSlotBtn = (slot) => {
    const normSlot = to24(slot);
    const isSelected = selectedSlot === slot;
    const conflict = userConflictSlots.find(
      (c) => to24(c.time || c) === normSlot,
    );
    const isUserBooked = userBookedSlots.some((b) => to24(b) === normSlot);
    const isOtherBooked =
      bookedByOthers.some((b) => to24(b) === normSlot) ||
      (bookedSlots.some((b) => to24(b) === normSlot) && !isUserBooked);
    const isBlocked = blockedSlots.some((b) => to24(b) === normSlot);
    const isAvailable =
      freeSlots.some((f) => to24(f) === normSlot) &&
      !isUserBooked &&
      !isOtherBooked &&
      !conflict &&
      !isBlocked;

    let cls =
      "py-2 px-1.5 rounded-lg text-xs font-semibold text-center border transition-all flex flex-col items-center justify-center ";
    let badge = "Open";
    let badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-emerald-700";
    let title = `${formatSlotTime(slot)} - Available`;

    if (isUserBooked) {
      cls +=
        "bg-rose-100 text-rose-800 border-rose-300 cursor-not-allowed opacity-90";
      badge = "Booked";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-rose-700";
      title = `${formatSlotTime(slot)} - Booked by you`;
    } else if (conflict) {
      cls +=
        "bg-yellow-100 text-yellow-900 border-yellow-300 cursor-not-allowed opacity-90";
      badge = "Conflict";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-yellow-800";
      title = `Booked with ${conflict.dietitianName || "another doctor"}`;
    } else if (isOtherBooked || !isAvailable) {
      cls +=
        "bg-orange-100 text-orange-800 border-orange-300 cursor-not-allowed opacity-90";
      badge = "Busy";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-orange-700";
      title = `${formatSlotTime(slot)} - Booked by another patient`;
    } else if (isBlocked) {
      cls +=
        "bg-amber-100 text-amber-900 border-amber-300 cursor-not-allowed opacity-90";
      badge = "Blocked";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-amber-800";
      title = `${formatSlotTime(slot)} - Blocked by doctor`;
    } else if (isSelected) {
      cls +=
        "bg-emerald-600 text-white border-emerald-600 shadow-sm cursor-pointer scale-[1.02]";
      badge = "Selected";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-white";
    } else {
      cls +=
        "bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:bg-emerald-100 cursor-pointer";
    }

    return (
      <button
        key={slot}
        type="button"
        disabled={!isAvailable}
        onClick={() => handleSelectSlot(slot)}
        className={cls}
        title={title}
      >
        <span className="leading-none text-xs">{formatSlotTime(slot)}</span>
        <span className={badgeCls}>{badge}</span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl border-2 border-emerald-300 p-4 shadow-xs max-w-lg space-y-3 font-sans">
      {/* Dietitian Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center justify-center text-sm">
            {dietitian.name.replace(/^Dr\.?\s*/i, "").charAt(0) || "D"}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
              {dietitian.name}
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {dietitian.experience && <span>{dietitian.experience} exp</span>}
              {dietitian.experience && dietitian.fee && " \u2022 "}
              {dietitian.fee && (
                <span className="text-emerald-700 font-semibold">
                  {"\u20B9"}
                  {dietitian.fee}
                </span>
              )}
              {dietitian.workingHours && (
                <span>
                  {dietitian.experience || dietitian.fee ? " \u2022 " : ""}
                  {dietitian.workingHours}
                </span>
              )}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Live Schedule
        </span>
      </div>

      {/* Date Picker Ribbon */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {dailySchedules.map((day) => {
          const isSelected = day.date === selectedDate;
          const openCount = day.freeSlotsCount ?? day.freeSlots?.length ?? 0;
          const isOff = day.isWorkingDay === false;
          const isEnded =
            !isOff && (day.pastSlots?.length || 0) > 0 && openCount === 0;

          let badgeText = "Full";
          let badgeColor = "text-rose-500";
          if (openCount > 0) {
            badgeText = `${openCount} open`;
            badgeColor = "text-emerald-600";
          } else if (isOff) {
            badgeText = "Off";
            badgeColor = "text-slate-400";
          } else if (isEnded) {
            badgeText = "Ended";
            badgeColor = "text-slate-400";
          }

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                setSelectedDate(day.date);
                setSelectedSlot(null);
              }}
              className={`flex flex-col items-center justify-center min-w-[70px] py-1.5 px-2 rounded-xl text-xs border shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase ${isSelected ? "text-emerald-100" : "text-slate-400"}`}
              >
                {day.day}
              </span>
              <span className="font-bold text-xs mt-0.5">{day.monthDay}</span>
              <span
                className={`text-[9px] font-semibold mt-0.5 ${isSelected ? "text-emerald-100" : badgeColor}`}
              >
                {badgeText}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-2 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 border border-slate-200">
        <span className="flex items-center gap-1 text-emerald-800 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Open (
          {freeSlots.length})
        </span>
        <span className="flex items-center gap-1 text-rose-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Booked (
          {userBookedSlots.length + userConflictSlots.length})
        </span>
        <span className="flex items-center gap-1 text-orange-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Busy (
          {bookedByOthers.length})
        </span>
        <span className="flex items-center gap-1 text-amber-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Blocked (
          {blockedSlots.length})
        </span>
      </div>

      {/* Slots Section */}
      <div className="space-y-2.5">
        {displaySlots.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {activeDay.isWorkingDay === false
                ? `${dietitian.name} does not consult on ${activeDay.day}s. Please select an open date above.`
                : activeDay.pastSlots?.length > 0
                  ? "Consultation hours for today have ended. Please choose tomorrow or an upcoming date above to book."
                  : "No available slots on this day. Please select another date above."}
            </span>
          </div>
        )}

        {sections.map(
          (sec) =>
            sec.slots.length > 0 && (
              <div key={sec.title}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {sec.title}
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {sec.slots.map(renderSlotBtn)}
                </div>
              </div>
            ),
        )}
      </div>

      {/* Action Button */}
      <button
        type="button"
        disabled={!selectedSlot}
        onClick={() =>
          onBookSlot &&
          selectedSlot &&
          onBookSlot({
            dietitian,
            doctor: dietitian,
            date: selectedDate,
            slot: selectedSlot,
            formattedTime: formatSlotTime(selectedSlot),
          })
        }
        className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
          selectedSlot
            ? "bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
            : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>
          {selectedSlot
            ? `Proceed to Payment: ${formatSlotTime(selectedSlot)} (${activeDay.day}, ${activeDay.monthDay})`
            : "Select a Slot to Continue"}
        </span>
      </button>
    </div>
  );
};

export default SlotBookingCard;
