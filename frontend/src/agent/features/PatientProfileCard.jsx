import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export const PatientProfileCard = ({ profile }) => {
  if (!profile) return null;

  return (
    <div className="bg-white rounded-xl border-2 border-emerald-300 p-4 shadow-xs max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
              {profile.patientName}
            </h4>
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span>
                {profile.gender
                  ? profile.gender.charAt(0).toUpperCase() +
                    profile.gender.slice(1)
                  : "Patient"}
              </span>
              {profile.age && <span>&bull; {profile.age} yrs</span>}
              {profile.supervisingDietitian &&
                profile.supervisingDietitian !== "None assigned" && (
                  <span className="text-emerald-700 font-semibold">
                    &bull; {profile.supervisingDietitian}
                  </span>
                )}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Clinical Context
        </span>
      </div>

      {/* Clinical Diagnosis & Dietitian Protocols */}
      <div className="space-y-2 text-xs mb-3">
        {profile.clinicalDiagnosis && (
          <div className="bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-200">
            <span className="text-slate-500 text-[10px] font-bold tracking-wider block mb-0.5">
              CLINICAL DIAGNOSIS
            </span>
            <span className="font-semibold text-slate-800">
              {profile.clinicalDiagnosis}
            </span>
          </div>
        )}

        {profile.supervisingDietitians &&
        profile.supervisingDietitians.filter((d) => d.dietitianName).length >
          1 ? (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Consulting Dietitians (
              {
                profile.supervisingDietitians.filter((d) => d.dietitianName)
                  .length
              }
              )
            </span>
            {profile.supervisingDietitians
              .filter((d) => d.dietitianName)
              .map((plan, pIdx) => (
                <div
                  key={pIdx}
                  className="bg-slate-50 rounded-lg p-2 border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-emerald-800">
                      {plan.dietitianName}
                    </span>
                    {plan.reportDate && (
                      <span className="text-[10px] text-slate-400">
                        {plan.reportDate}
                      </span>
                    )}
                  </div>
                  {plan.dietaryProtocol && (
                    <div className="text-[11px] text-slate-700">
                      <span className="text-slate-500 font-medium">
                        Protocol:{" "}
                      </span>
                      {plan.dietaryProtocol}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          profile.dietitianRecommendations &&
          profile.dietitianRecommendations !== "None assigned yet" && (
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
              <span className="text-slate-500 text-[10px] font-bold tracking-wider block mb-0.5">
                DIETARY PROTOCOL
              </span>
              <span className="text-slate-700 leading-relaxed">
                {profile.dietitianRecommendations}
              </span>
            </div>
          )
        )}
      </div>

      {/* Fitness & BMI Metrics if available */}
      {profile.fitnessMetrics && (
        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200">
            <span className="text-slate-500 text-[9px] font-bold block">
              WEIGHT
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {profile.fitnessMetrics.currentWeight} kg
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200">
            <span className="text-slate-500 text-[9px] font-bold block">
              HEIGHT
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {profile.fitnessMetrics.heightCm} cm
            </span>
          </div>
          <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
            <span className="text-emerald-700 text-[9px] font-bold block">
              BMI
            </span>
            <span className="font-bold text-emerald-900 text-xs">
              {profile.fitnessMetrics.bmi || "N/A"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfileCard;
