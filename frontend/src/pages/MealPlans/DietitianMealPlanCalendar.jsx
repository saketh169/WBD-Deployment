import React, { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Utensils, Home, Flame, Calendar } from 'lucide-react';

export const dateToKey = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const DIET_COLORS = {
    'High-Protein': { bg: 'bg-blue-50', border: 'border-green-100', text: 'text-blue-700', accent: 'bg-blue-500' },
    'Mediterranean': { bg: 'bg-orange-50', border: 'border-green-100', text: 'text-orange-700', accent: 'bg-orange-500' },
    'Keto': { bg: 'bg-purple-50', border: 'border-green-100', text: 'text-purple-700', accent: 'bg-purple-500' },
    'Vegan': { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', accent: 'bg-green-500' },
    'Vegetarian': { bg: 'bg-lime-50', border: 'border-green-100', text: 'text-lime-700', accent: 'bg-lime-500' },
    'Low-Carb': { bg: 'bg-cyan-50', border: 'border-green-100', text: 'text-cyan-700', accent: 'bg-cyan-500' },
    'Anything': { bg: 'bg-gray-50', border: 'border-green-100', text: 'text-gray-700', accent: 'bg-gray-500' },
};
const DEFAULT_COLOR = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', accent: 'bg-slate-500' };

export const DayCell = ({ day, date, plan, isCurrentMonth, isToday, isSelected, onSelectDay, onViewPlan, isDeleteMode }) => {
    const dateKey = dateToKey(date);
    const today = new Date();
    const isPastDate = date < today && !dateToKey(date).startsWith(dateToKey(today));
    const colors = plan ? (DIET_COLORS[plan.dietType] || DEFAULT_COLOR) : DEFAULT_COLOR;

    const handleClick = () => {
        if (plan && onViewPlan && !isDeleteMode) onViewPlan(plan, dateKey);
        else if (isCurrentMonth && !isPastDate && onSelectDay) onSelectDay(date);
    };

    return (
        <div
            className={`h-28 rounded-lg p-2 overflow-hidden transition-all duration-200 relative cursor-pointer shadow-sm border
                ${isCurrentMonth ? `${colors.bg} ${colors.border} hover:shadow-md` : 'bg-gray-50 border-green-100 text-gray-400 pointer-events-none'}
                ${isToday ? 'ring-2 ring-green-400 shadow-lg bg-green-50 border-green-200' : ''}
                ${isSelected ? 'ring-2 ring-blue-400 shadow-lg bg-blue-50 border-blue-200' : ''}
                ${isPastDate ? 'opacity-50' : ''}`}
            onClick={handleClick}
        >
            <div className={`font-semibold text-sm text-center mb-1 ${isToday ? 'text-green-800' : isPastDate ? 'text-green-600' : 'text-green-700'}`}>{day}</div>
            {plan ? (
                <div className="flex flex-col h-full">
                    <div className="text-center flex-1">
                        <p className={`text-xs font-semibold ${colors.text} truncate mb-1 flex items-center justify-center gap-1`}>
                            <Utensils className="text-xs" /> {plan.planName}
                        </p>
                        <p className={`text-xs ${colors.text} font-medium`}>{plan.calories} kcal</p>
                        <p className={`text-xs ${colors.text} opacity-75`}>{plan.dietType}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onViewPlan(plan, dateKey); }} title={`View plan for ${dateKey}`}
                        className={`mt-1 self-center ${colors.accent} text-white px-2 py-1 rounded-md hover:opacity-90 transition text-xs font-medium shadow-sm`}>
                        View
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className={`text-center ${isPastDate ? 'text-green-500' : 'text-green-600'}`}>
                        <div className="text-xs font-medium">{isPastDate ? 'Past' : 'Available'}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const PlanDetailModal = ({ plan, onClose, date }) => {
    if (!plan) return null;
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/20 backdrop-blur-sm">
            <div className="bg-linear-to-br from-white to-green-50 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-green-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{plan.planName}</h2>
                            <p className="text-slate-600">{date}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-green-100 rounded-full transition">
                            <ChevronLeft className="text-green-600" />
                        </button>
                    </div>
                    {plan.imageUrl && (
                        <div className="mb-6">
                            <div className="relative overflow-hidden rounded-2xl bg-slate-100 max-w-md mx-auto">
                                <img src={plan.imageUrl} alt={plan.planName} className="w-full h-48 object-contain object-center rounded-lg"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                                <div className="hidden w-full h-48 items-center justify-center text-slate-400 text-sm">
                                    <Utensils className="mr-2 text-xl" /> Image unavailable
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h3 className="font-semibold text-slate-800 mb-2">Plan Details</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Diet Type:</span> {plan.dietType}</p>
                                <p><span className="font-medium">Total Calories:</span> {plan.calories} kcal</p>
                                <p><span className="font-medium">Meals:</span> {plan.meals?.length || 0}</p>
                                {plan.createdAt && <p><span className="font-medium">Created:</span> {new Date(plan.createdAt).toLocaleDateString()}</p>}
                            </div>
                        </div>
                        {plan.notes && (
                            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                <h3 className="font-semibold text-green-800 mb-2">Notes</h3>
                                <p className="text-green-700">{plan.notes}</p>
                            </div>
                        )}
                    </div>
                    {plan.meals?.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center">
                                <Utensils className="mr-2 text-green-600" /> Daily Meals
                            </h3>
                            {plan.meals.map((meal, i) => (
                                <div key={i} className="bg-linear-to-br from-slate-50 to-green-50 rounded-xl p-4 border border-green-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-slate-800">{meal.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-green-700 font-medium">{meal.calories} kcal</span>
                                            <Flame className="text-orange-500" />
                                        </div>
                                    </div>
                                    <p className="text-slate-700">{meal.details}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end mt-6">
                        <button onClick={onClose} className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-medium">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CalendarView = ({ currentDate = new Date(), plans = [], selectedClient, changeMonth, setCurrentDate, selectedDays = [], onDaySelect, filterStartDate, filterEndDate, assignmentMode, onViewPlan, isDeleteMode }) => {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const daysOfMonth = useMemo(() => {
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const days = Array(startOffset).fill(null);
        for (let d = 1; d <= daysInMonth; d++) days.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) });
        return days;
    }, [currentDate]);

    const getAssignedPlan = useCallback((date) => {
        if (!selectedClient) return null;
        const key = dateToKey(date);
        return plans.find(p => p.assignedDates?.includes(key)) || null;
    }, [selectedClient, plans]);

    const isDaySelected = useCallback((date) => {
        return assignmentMode === 'multiple' && selectedDays.some(s => dateToKey(s) === dateToKey(date));
    }, [selectedDays, assignmentMode]);

    const filteredDays = useMemo(() => {
        if (!filterStartDate && !filterEndDate) return daysOfMonth;
        return daysOfMonth.filter(day => {
            if (day === null) return true;
            const key = dateToKey(day.date);
            return (!filterStartDate || key >= filterStartDate) && (!filterEndDate || key <= filterEndDate);
        });
    }, [daysOfMonth, filterStartDate, filterEndDate]);

    return (
        <div className="bg-linear-to-br from-green-50 to-emerald-50 p-6 rounded-2xl shadow-xl border-4 border-green-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-bold text-green-800 flex items-center">
                    <Calendar className="mr-3 text-green-600" /> {monthName}
                </h3>
                <div className="flex space-x-3">
                    <button onClick={() => changeMonth(-1)} className="p-3 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition shadow-md cursor-pointer"><ChevronLeft /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-md cursor-pointer">
                        <Home className="inline mr-1" /> Today
                    </button>
                    <button onClick={() => changeMonth(1)} className="p-3 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition shadow-md cursor-pointer"><ChevronRight /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center font-semibold text-sm mb-4 text-green-700">
                {weekdays.map(d => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {filteredDays.map((day, i) => day === null ? <div key={i} className="h-28 rounded-lg" /> : (
                    <DayCell key={i} day={day.day} date={day.date} plan={getAssignedPlan(day.date)}
                        isCurrentMonth={day.isCurrentMonth} isToday={dateToKey(day.date) === dateToKey(new Date())}
                        isSelected={isDaySelected(day.date)} onSelectDay={onDaySelect} onViewPlan={onViewPlan} isDeleteMode={isDeleteMode} />
                ))}
            </div>
        </div>
    );
};
