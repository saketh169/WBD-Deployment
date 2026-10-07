import React from "react";
import { Utensils, Database } from "lucide-react";

export const NutritionCard = ({ data }) => {
  if (!data) return null;
  const calories = data.nutrients?.calories ?? data.calories ?? 0;
  const protein = data.nutrients?.protein ?? data.protein ?? 0;
  const carbs = data.nutrients?.carbs ?? data.carbs ?? 0;
  const fat = data.nutrients?.fat ?? data.fat ?? 0;
  const total = protein + carbs + fat || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base capitalize">
              {data.foodName || "Food Item"}
            </h4>
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Database className="w-3 h-3 text-slate-400" />
              USDA Verified (100g standard portion)
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {calories}
            </span>
            <span className="text-xs font-semibold text-slate-500">kcal</span>
          </div>
        </div>
      </div>

      {/* Visual Macro Ratio Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden mb-3">
        <div
          style={{ width: `${Math.round((protein / total) * 100)}%` }}
          className="bg-emerald-600"
          title={`Protein: ${protein}g`}
        />
        <div
          style={{ width: `${Math.round((carbs / total) * 100)}%` }}
          className="bg-blue-500"
          title={`Carbs: ${carbs}g`}
        />
        <div
          style={{ width: `${Math.round((fat / total) * 100)}%` }}
          className="bg-amber-500"
          title={`Fat: ${fat}g`}
        />
      </div>

      {/* Macro Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80">
          <span className="text-slate-500 text-[10px] font-bold tracking-wider block">
            PROTEIN
          </span>
          <span className="font-bold text-slate-900 text-sm">{protein}g</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80">
          <span className="text-slate-500 text-[10px] font-bold tracking-wider block">
            CARBS
          </span>
          <span className="font-bold text-slate-900 text-sm">{carbs}g</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80">
          <span className="text-slate-500 text-[10px] font-bold tracking-wider block">
            FAT
          </span>
          <span className="font-bold text-slate-900 text-sm">{fat}g</span>
        </div>
      </div>
    </div>
  );
};

export default NutritionCard;
