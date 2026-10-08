import React, { useState, useEffect, useCallback } from "react";
import { Clock, CheckCircle2, ShieldCheck, Calendar } from "lucide-react";
import { useAuthContext } from "../../hooks/useAuthContext";
import axiosInstance from "../../utils/axiosInstance";

const to24 = (t) => {
  const m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
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

const DEFAULT_ALL_DAY_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00"
];

const isToday = (d) => {
  if (!d) return false;
  const now = new Date();
  return new Date(d).toDateString() === now.toDateString() || String(d).startsWith(now.toISOString().slice(0, 10));
};

const getNowMinutes = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

export const SlotBookingCard = ({ data, onBookSlot }) => {
  const dietitian = data?.dietitian || data?.doctor;
  const dailySchedules = data?.dailySchedules || [];
  if (!data || !dietitian) return null;

  const { user } = useAuthContext();
  const dietitianId = dietitian?.id || dietitian?._id;
  const effectiveUserId =
    user?.id ||
    user?._id ||
    user?.roleId ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("authUser_user") || "{}");
        return u.id || u._id || u.roleId || "";
      } catch {
        return "";
      }
    })();

  const [selectedDate, setSelectedDate] = useState(data.selectedDate || dailySchedules[0]?.date || "");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [liveSlotData, setLiveSlotData] = useState(null);

  const fetchLiveSlots = useCallback(async () => {
    if (!dietitianId || !selectedDate) return;
    try {
      const res = await axiosInstance.get(
        `/api/bookings/dietitian/${dietitianId}/booked-slots?date=${selectedDate}&userId=${effectiveUserId}`
      );
      const dataPayload = res.data?.data || res.data;
      if (dataPayload) setLiveSlotData(dataPayload);
    } catch {}
  }, [dietitianId, selectedDate, effectiveUserId]);

  useEffect(() => { setLiveSlotData(null); }, [selectedDate]);
  useEffect(() => { fetchLiveSlots(); }, [fetchLiveSlots]);

  useEffect(() => {
    const onLiveUpdate = () => fetchLiveSlots();
    window.addEventListener("nutri_booking_update", onLiveUpdate);
    return () => window.removeEventListener("nutri_booking_update", onLiveUpdate);
  }, [fetchLiveSlots]);

  const activeDay = dailySchedules.find((s) => s.date === selectedDate) || dailySchedules[0] || {};
  const userBookedSlots = liveSlotData?.userBookings || activeDay.userBookedSlots || [];
  const bookedSlots = liveSlotData?.bookedSlots || activeDay.bookedSlots || [];
  const blockedSlots = liveSlotData?.blockedSlots || activeDay.blockedSlots || [];
  const userConflictSlots = liveSlotData?.userConflictingTimes || activeDay.userConflictSlots || [];
  const bookedByOthers = bookedSlots.filter((b) => !userBookedSlots.some((u) => to24(u) === to24(b)));

  const nowMin = getNowMinutes();
  const dayIsToday = isToday(selectedDate) || Boolean(activeDay.isToday);
  const allSlots = (activeDay.allSlots || activeDay.allDaySlots || DEFAULT_ALL_DAY_SLOTS).map(to24);

  const pastSet = new Set([
    ...(activeDay.pastSlots || []).map(to24),
    ...(dayIsToday ? allSlots.filter((s) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m <= nowMin;
    }) : []),
  ]);

  const displaySlots = allSlots.filter((s) => !pastSet.has(s));
  const isPast = (s) => pastSet.has(to24(s));
  const activeBooked = userBookedSlots.map(to24).filter((s) => !isPast(s));
  const activeBusyCount = new Set([
    ...bookedByOthers.map(to24),
    ...userConflictSlots.map((c) => to24(c.time || c)),
    ...blockedSlots.map(to24),
  ].filter((s) => !isPast(s))).size;

  const freeSlots = displaySlots.filter(
    (s) =>
      !bookedSlots.some((b) => to24(b) === s) &&
      !blockedSlots.some((b) => to24(b) === s) &&
      !userConflictSlots.some((c) => to24(c.time || c) === s)
  );

  const sections = [
    { title: "Morning (09:00 - 11:30)", slots: displaySlots.filter((s) => Number(s.split(":")[0]) < 12) },
    { title: "Afternoon (12:00 - 16:30)", slots: displaySlots.filter((s) => { const h = Number(s.split(":")[0]); return h >= 12 && h < 17; }) },
    { title: "Evening (17:00 - 20:00)", slots: displaySlots.filter((s) => Number(s.split(":")[0]) >= 17) },
  ];

  const getDayOpenCount = (day) => {
    if (day.date === selectedDate) return freeSlots.length;
    if (day.isWorkingDay === false) return 0;
    const slots = (day.allSlots || day.allDaySlots || DEFAULT_ALL_DAY_SLOTS).map(to24);
    const taken = new Set([
      ...(day.bookedSlots || []).map(to24),
      ...(day.userConflictSlots || []).map((c) => to24(c.time || c)),
      ...(day.blockedSlots || []).map(to24),
      ...(isToday(day.date) ? slots.filter((s) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m <= nowMin;
      }) : []),
    ]);
    return slots.filter((s) => !taken.has(s)).length;
  };

  const renderSlotBtn = (slot) => {
    const norm = to24(slot);
    const isSelected = selectedSlot === slot;
    const isUserBooked = userBookedSlots.some((b) => to24(b) === norm);
    const conflict = userConflictSlots.find((c) => to24(c.time || c) === norm);
    const isBusy =
      conflict ||
      bookedSlots.some((b) => to24(b) === norm && !isUserBooked) ||
      blockedSlots.some((b) => to24(b) === norm);
    const isAvailable = freeSlots.includes(norm);

    let cls = "py-2 px-1.5 rounded-lg text-xs font-semibold text-center border transition-all flex flex-col items-center justify-center ";
    let badge = "Open", badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-emerald-700", title = `${formatSlotTime(slot)} - Available`;

    if (isUserBooked) {
      cls += "bg-rose-100 text-rose-800 border-rose-300 cursor-not-allowed opacity-90";
      badge = "Booked";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-rose-700";
      title = `${formatSlotTime(slot)} - Booked by you`;
    } else if (isBusy || !isAvailable) {
      cls += "bg-orange-100 text-orange-800 border-orange-300 cursor-not-allowed opacity-90";
      badge = "Busy";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-orange-700";
      title = conflict ? `Busy - Booked with ${conflict.dietitianName || "another specialist"}` : `${formatSlotTime(slot)} - Unavailable`;
    } else if (isSelected) {
      cls += "bg-emerald-600 text-white border-emerald-600 shadow-sm cursor-pointer scale-[1.02]";
      badge = "Selected";
      badgeCls = "text-[9px] font-bold uppercase mt-0.5 text-white";
    } else {
      cls += "bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:bg-emerald-100 cursor-pointer";
    }

    return (
      <button
        key={slot}
        type="button"
        disabled={!isAvailable}
        onClick={() => setSelectedSlot(slot)}
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
      {/* Header */}
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
              {dietitian.fee && <span className="text-emerald-700 font-semibold">{"\u20B9"}{dietitian.fee}</span>}
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
          const openCount = getDayOpenCount(day);
          const isOff = day.isWorkingDay === false;
          const isEnded = !isOff && isToday(day.date) && openCount === 0;

          let badgeText = "Full", badgeColor = "text-rose-500";
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
              onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }}
              className={`flex flex-col items-center justify-center min-w-[70px] py-1.5 px-2 rounded-xl text-xs border shrink-0 transition-all cursor-pointer ${
                isSelected ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                {day.day || day.dayOfWeek || ""}
              </span>
              <span className="font-bold text-xs mt-0.5">{day.monthDay || day.displayDate || day.date}</span>
              <span className={`text-[9px] font-semibold mt-0.5 ${isSelected ? "text-emerald-100" : badgeColor}`}>{badgeText}</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 border border-slate-200">
        <span className="flex items-center gap-1 text-emerald-800 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Open ({freeSlots.length})
        </span>
        <span className="flex items-center gap-1 text-rose-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Booked ({activeBooked.length})
        </span>
        <span className="flex items-center gap-1 text-orange-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Busy ({activeBusyCount})
        </span>
      </div>

      {/* Slots Section */}
      <div className="space-y-2.5">
        {displaySlots.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {activeDay.isWorkingDay === false
                ? `${dietitian.name} does not consult on ${activeDay.day || activeDay.dayOfWeek || "this day"}s. Please select an open date above.`
                : activeDay.pastSlots?.length > 0 || isToday(selectedDate)
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
            ? `Proceed to Payment: ${formatSlotTime(selectedSlot)} (${activeDay.day || activeDay.dayOfWeek || ""}, ${activeDay.monthDay || activeDay.displayDate || activeDay.date})`
            : "Select a Slot to Continue"}
        </span>
      </button>
    </div>
  );
};

export default SlotBookingCard;
