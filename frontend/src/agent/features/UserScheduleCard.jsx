import React from "react";
import {
  Calendar,
  Clock,
  Video,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const formatSlotTime = (timeStr) => {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${mStr} ${ampm}`;
};

export const UserScheduleCard = ({ data }) => {
  const navigate = useNavigate();
  if (!data) return null;

  const { patientName = "Patient", bookings = [], count, totalBookings } = data;
  const displayCount = count ?? totalBookings ?? bookings.length;

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-500 rounded-2xl p-4 shadow-sm max-w-xl space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              My Consultations Schedule
            </h4>
            <p className="text-[11px] text-emerald-800 font-medium">
              {patientName} • {displayCount} upcoming session(s)
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
          <ShieldCheck className="w-3 h-3" />
          Live Schedule
        </span>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl p-4 text-center border border-emerald-100 text-xs text-slate-600 space-y-1">
          <Calendar className="w-6 h-6 text-emerald-500 mx-auto opacity-80" />
          <p className="font-semibold text-slate-800">
            No Upcoming Consultations
          </p>
          <p className="text-slate-500">
            You currently have no scheduled appointments on your calendar.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking, idx) => (
            <div
              key={booking.bookingId || idx}
              className="bg-white rounded-xl p-3 border border-emerald-200/90 shadow-2xs space-y-2 hover:border-emerald-400 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                    {booking.dietitianName}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {booking.specialization}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    booking.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-800"
                      : booking.status === "completed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium">{booking.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    {formatSlotTime(booking.time)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{booking.consultationType}</span>
                </div>
                {booking.amount && (
                  <div className="flex items-center justify-end text-emerald-800 font-semibold text-xs">
                    ₹{booking.amount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-emerald-900 font-medium">
          Manage slots, meetings, or reschedule anytime.
        </p>
        <button
          type="button"
          onClick={() => navigate("/user/schedule")}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          Open Calendar
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default UserScheduleCard;
