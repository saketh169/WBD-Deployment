import React, { useState } from "react";
import {
  Sparkles,
  Flame,
  Droplet,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ChefHat,
  Copy,
  Check,
  Stethoscope,
} from "lucide-react";

const MealImageAvatar = ({ name, imageUrl }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials =
    (name || "Meal")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 2)
      .toUpperCase() || "ML";

  if (imageUrl && !imgFailed) {
    return (
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-2xs">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg shrink-0 bg-emerald-700 text-white font-bold text-sm tracking-wider flex items-center justify-center border border-emerald-800 shadow-2xs select-none">
      {initials}
    </div>
  );
};

export const MealPlanCard = ({ plan }) => {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [expandedMealIdx, setExpandedMealIdx] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) {
    return null;
  }

  const days = plan.days;
  const currentDay = days[activeDayIdx] || days[0];
  const meals = currentDay?.meals || [];

  const calculatedCal = meals.reduce(
    (sum, m) => sum + (Number(m.calories) || 0),
    0,
  );
  const calculatedP = meals.reduce(
    (sum, m) => sum + (Number(m.proteinGrams) || 0),
    0,
  );
  const calculatedC = meals.reduce(
    (sum, m) => sum + (Number(m.carbsGrams) || 0),
    0,
  );
  const calculatedF = meals.reduce(
    (sum, m) => sum + (Number(m.fatsGrams) || 0),
    0,
  );

  const totalCalories =
    currentDay?.dayCalories || plan.dailyCalories || calculatedCal || 0;
  const protein =
    currentDay?.proteinGrams ||
    plan.macroTargets?.proteinGrams ||
    calculatedP ||
    0;
  const carbs =
    currentDay?.carbsGrams || plan.macroTargets?.carbsGrams || calculatedC || 0;
  const fats =
    currentDay?.fatsGrams || plan.macroTargets?.fatsGrams || calculatedF || 0;

  const totalMacroGrams = protein * 4 + carbs * 4 + fats * 9 || 1;
  const proteinPct = Math.round(((protein * 4) / totalMacroGrams) * 100);
  const carbsPct = Math.round(((carbs * 4) / totalMacroGrams) * 100);
  const fatsPct = Math.round(((fats * 9) / totalMacroGrams) * 100);

  const handleCopyDay = () => {
    const summary = [
      `${plan.planName} - ${currentDay.dayLabel || `Day ${activeDayIdx + 1}`}`,
      `Calories: ${totalCalories} kcal | P: ${protein}g | C: ${carbs}g | F: ${fats}g`,
      "",
      ...meals.map((m) => `- ${m.mealType}: ${m.name} (${m.calories} kcal)`),
    ].join("\n");

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-400/80 shadow-md overflow-hidden max-w-2xl my-2 text-slate-800 transition-all font-sans">
      {/* HEADER: AI Precision Badge & Dietitian Grounding */}
      <div className="bg-linear-to-r from-emerald-600 via-teal-700 to-slate-800 text-white p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 backdrop-blur-xs rounded-lg text-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/40">
                  AI Precision Engine
                </span>
                <span className="text-[11px] text-emerald-200 font-medium">
                  {days.length} {days.length === 1 ? "Day" : "Days"} Tailored
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white leading-tight mt-0.5">
                {plan.planName}
              </h3>
            </div>
          </div>

          <button
            onClick={handleCopyDay}
            className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg border border-white/20 transition-colors cursor-pointer shrink-0"
            title="Copy current day meal summary"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied" : "Copy Day"}
            </span>
          </button>
        </div>

        {/* Clinical Grounding Info */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-100/90 pt-1 border-t border-white/15">
          {plan.supervisingDietitian && (
            <span className="flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-emerald-300" />
              <span>
                Grounded in assessment by:{" "}
                <strong className="text-white">
                  {plan.supervisingDietitian}
                </strong>
              </span>
            </span>
          )}
          {plan.healthFocus && (
            <span className="text-[11px] text-emerald-200/90 bg-white/10 px-2 py-0.5 rounded-md">
              Focus: {plan.healthFocus}
            </span>
          )}
        </div>
      </div>

      {/* CLINICAL CALLOUTS: Allergens Excluded & Target Hydration */}
      {(plan.allergiesExcluded?.length > 0 || plan.hydrationTargetLiters) && (
        <div className="bg-amber-50/70 border-b border-amber-200/70 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {plan.allergiesExcluded?.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-900 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Strictly Excluded:{" "}
                <strong>{plan.allergiesExcluded.join(", ")}</strong>
              </span>
            </div>
          )}
          {plan.hydrationTargetLiters && (
            <div className="flex items-center gap-1 text-teal-800 font-medium ml-auto">
              <Droplet className="w-3.5 h-3.5 text-teal-600" />
              <span>
                Hydration Target:{" "}
                <strong>{plan.hydrationTargetLiters} L/day</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* INTERACTIVE DAY TABS (Generic duration: 3, 7, 10, 14 days) */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5">
          {days.map((dayItem, idx) => {
            const label = dayItem.dayLabel || dayItem.day || `Day ${idx + 1}`;
            const isActive = idx === activeDayIdx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveDayIdx(idx);
                  setExpandedMealIdx(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CURRENT DAY NUTRITIONAL DISTRIBUTION BAR */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              {currentDay.dayLabel || `Day ${activeDayIdx + 1}`} Targets
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
              <Flame className="w-3 h-3 text-orange-600" />
              {totalCalories} kcal
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            P: {protein}g • C: {carbs}g • F: {fats}g
          </span>
        </div>

        {/* Macro Progress Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 gap-0.5">
          <div
            style={{ width: `${proteinPct}%` }}
            className="bg-blue-500"
            title={`Protein: ${protein}g (${proteinPct}%)`}
          />
          <div
            style={{ width: `${carbsPct}%` }}
            className="bg-amber-500"
            title={`Carbs: ${carbs}g (${carbsPct}%)`}
          />
          <div
            style={{ width: `${fatsPct}%` }}
            className="bg-rose-500"
            title={`Fats: ${fats}g (${fatsPct}%)`}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{" "}
            Protein ({proteinPct}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{" "}
            Carbs ({carbsPct}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{" "}
            Healthy Fats ({fatsPct}%)
          </span>
        </div>
      </div>

      {/* MEALS LIST WITH STEP-BY-STEP RECIPE & PREPARATION ACCORDION */}
      <div className="p-4 space-y-3">
        {meals.map((meal, mIdx) => {
          const isExpanded = expandedMealIdx === mIdx;
          return (
            <div
              key={mIdx}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? "border-emerald-300 bg-emerald-50/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {/* Meal Summary Header */}
              <div
                onClick={() => setExpandedMealIdx(isExpanded ? null : mIdx)}
                className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <MealImageAvatar name={meal.name} imageUrl={meal.imageUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {meal.mealType}
                      </span>
                      {meal.dietType && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          • {meal.dietType}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {meal.name}
                    </h4>
                    {/* Portion summary */}
                    {meal.details && (
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                        {meal.details}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                    {meal.calories} kcal
                  </span>
                  <button className="text-slate-400 hover:text-slate-600 p-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Recipe, Ingredients & Step-by-Step Instructions */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-emerald-100 text-xs space-y-3">
                  {/* AI Generated Food Image Banner */}
                  {meal.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-44 w-full bg-slate-100 shadow-xs">
                      <img
                        src={meal.imageUrl}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.parentElement.style.display = "none";
                        }}
                      />
                      <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-white/20">
                        <Sparkles className="w-3 h-3 text-emerald-300" />
                        Culinary Plating
                      </div>
                    </div>
                  )}

                  {/* Macro breakdown pills */}
                  {(meal.proteinGrams || meal.carbsGrams || meal.fatsGrams) && (
                    <div className="flex items-center gap-3 py-1.5 px-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px] font-semibold">
                        Macros:
                      </span>
                      <span className="text-blue-700 font-medium">
                        Protein: {meal.proteinGrams || 0}g
                      </span>
                      <span className="text-amber-700 font-medium">
                        Carbs: {meal.carbsGrams || 0}g
                      </span>
                      <span className="text-rose-700 font-medium">
                        Fats: {meal.fatsGrams || 0}g
                      </span>
                    </div>
                  )}

                  {/* Ingredients */}
                  {Array.isArray(meal.ingredients) &&
                    meal.ingredients.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                          <ChefHat className="w-3.5 h-3.5 text-emerald-600" />
                          Key Ingredients & Portions:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                          {meal.ingredients.map((ing, iIdx) => (
                            <li key={iIdx}>{ing}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Detailed Step-by-Step Preparation Instructions */}
                  {Array.isArray(meal.prepSteps) &&
                    meal.prepSteps.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          Detailed Preparation Steps:
                        </span>
                        <ol className="space-y-1 text-slate-700 pl-1">
                          {meal.prepSteps.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-start gap-2">
                              <span className="font-bold text-teal-800 text-[11px] shrink-0 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed">
                                {step.replace(/^Step\s*\d+:?\s*/i, "")}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                  {/* Clinical Rationale */}
                  {meal.clinicalRationale && (
                    <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200 text-emerald-950">
                      <span className="font-bold text-[10px] uppercase tracking-wider block mb-0.5 text-emerald-800">
                        Clinical Rationale for Biomarkers
                      </span>
                      <p className="leading-relaxed text-[11px]">
                        {meal.clinicalRationale}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER: Clinical Guidance Notes */}
      {plan.clinicalNotes && (
        <div className="bg-emerald-50/70 border-t border-emerald-200/80 p-3 text-xs text-emerald-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-emerald-900 font-semibold">
              Clinical Guidance:{" "}
            </strong>
            <span className="text-emerald-950">{plan.clinicalNotes}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default MealPlanCard;
