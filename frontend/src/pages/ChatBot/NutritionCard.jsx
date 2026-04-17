import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

function NutritionCard({ data }) {
  return (
    <div className="bg-linear-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <h4 className="font-bold text-emerald-800 text-base mb-2 flex items-center gap-2">
        <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
        {data.foodName}
      </h4>
      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
        <div className="flex items-center">
          <span className="font-semibold text-emerald-600 mr-1">Calories:</span>
          <span className="font-bold">{data.nutrients.calories}</span>
          <span className="ml-1 text-xs text-gray-600">kcal</span>
        </div>
        <div className="flex items-center">
          <span className="font-semibold text-emerald-600 mr-1">Protein:</span>
          <span className="font-bold">{data.nutrients.protein}</span>
          <span className="ml-1 text-xs text-gray-600">g</span>
        </div>
        <div className="flex items-center">
          <span className="font-semibold text-emerald-600 mr-1">Carbs:</span>
          <span className="font-bold">{data.nutrients.carbs}</span>
          <span className="ml-1 text-xs text-gray-600">g</span>
        </div>
      </div>
    </div>
  );
}

export default NutritionCard;