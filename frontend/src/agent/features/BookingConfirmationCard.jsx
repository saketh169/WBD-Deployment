import React from "react";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  ArrowRight,
  ShieldCheck,
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

export const BookingConfirmationCard = ({ data }) => {
  const navigate = useNavigate();
  if (!data) return null;

  const {
    dietitianName = "Dietitian",
    date = "",
    time = "",
    consultationType = "Online",
    fee = null,
    bookingId = "",
    status = "confirmed",
  } = data;

  const formattedTime = formatSlotTime(time);

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-500 rounded-xl p-4 shadow-sm max-w-lg space-y-3">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              Appointment Confirmed
            </h4>
            <p className="text-[11px] text-emerald-800 font-medium">
              Verified Consultation Booking
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
          <ShieldCheck className="w-3 h-3" />
          {status.toUpperCase()}
        </span>
      </div>

      {/* Appointment Summary Box */}
      <div className="bg-white rounded-lg p-3 border border-emerald-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Dietitian
          </span>
          <span className="text-sm font-bold text-slate-900">
            {dietitianName}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{formattedTime || time}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{consultationType}</span>
          </div>
          <div className="flex items-center justify-end text-emerald-700 font-bold">
            {fee ? `\u20B9${fee} (Confirmed)` : "Confirmed"}
          </div>
        </div>

        {bookingId && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Reference ID</span>
            <span className="font-mono font-medium text-slate-700">
              {bookingId.substring(0, 16)}
            </span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-emerald-800">
          Slot is reserved. You can view or manage this in your consultations
          calendar.
        </p>
        <button
          type="button"
          onClick={() => navigate("/user/schedule")}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          View Bookings
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmationCard;
