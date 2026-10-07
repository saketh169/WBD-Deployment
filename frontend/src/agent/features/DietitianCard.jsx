import React from "react";
import { CheckCircle2, Clock, MapPin, Star, Calendar } from "lucide-react";

export const DietitianCard = ({ doc, onBook }) => {
  const name = doc.name || "Dietitian";
  const rating = doc.rating ? Number(doc.rating).toFixed(1) : null;
  const experience = doc.experience || null;
  const specializations = doc.specialties || doc.specialization || [];
  const fee = doc.fee || doc.onlineFee || null;
  const gender = doc.gender;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between group">
      <div>
        {/* Dietitian Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center justify-center text-base shrink-0">
              {name.replace("Dr.", "").trim().charAt(0) || "D"}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug flex items-center gap-1.5">
                {name}
                <CheckCircle2
                  className="w-4 h-4 text-emerald-600 shrink-0"
                  title="Verified Specialist"
                />
              </h4>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                {experience && (
                  <>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{experience} exp</span>
                  </>
                )}
                {doc.location && (
                  <>
                    {experience && <span>•</span>}
                    <span className="flex items-center gap-0.5 truncate max-w-[130px]">
                      <MapPin className="w-3 h-3 text-slate-400" />{" "}
                      {doc.location}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {rating && (
            <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md text-xs font-semibold border border-amber-200/80 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
            </div>
          )}
        </div>

        {/* Specialization Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {gender && (
            <span className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200/80 capitalize">
              {gender}
            </span>
          )}
          {specializations.slice(0, 3).map((spec, i) => (
            <span
              key={i}
              className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded border border-slate-200/60"
            >
              {spec}
            </span>
          ))}
          {specializations.length > 3 && (
            <span className="text-xs text-slate-400 font-medium px-1 py-0.5">
              +{specializations.length - 3}
            </span>
          )}
        </div>

        {/* Fee Strip */}
        {fee && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3.5 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Consultation Fee</span>
            <span className="font-bold text-slate-900 text-sm text-emerald-700">
              {"\u20B9"}
              {fee}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onBook(name)}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg py-2.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <Calendar className="w-4 h-4" />
        <span>Book Consultation</span>
      </button>
    </div>
  );
};

export default DietitianCard;
