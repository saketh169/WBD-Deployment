import React from 'react';

export const ALL_DEFAULT_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00"
];

export const getCategorizedSlots = (selectedDate) => {
  const now = new Date();
  const isToday = new Date(selectedDate).toDateString() === now.toDateString();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const allSlots = ALL_DEFAULT_SLOTS.filter((slot) => {
    if (!isToday) return true;
    const [hour, minute] = slot.split(':').map(Number);
    return hour * 60 + minute > currentTime;
  });

  return {
    morning: allSlots.filter((s) => Number(s.split(':')[0]) < 12),
    afternoon: allSlots.filter((s) => {
      const h = Number(s.split(':')[0]);
      return h >= 12 && h < 17;
    }),
    evening: allSlots.filter((s) => Number(s.split(':')[0]) >= 17)
  };
};

export const BookingLegend = () => (
  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
    <p className="text-xs font-semibold mb-2 text-gray-700">Legend:</p>
    <div className="grid grid-cols-3 gap-1 text-xs">
      <span className="flex items-center">
        <span className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2" />
        Available
      </span>
      <span className="flex items-center">
        <span className="w-4 h-4 bg-emerald-600 rounded mr-2" />
        Selected
      </span>
      <span className="flex items-center">
        <span className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2" />
        Booked
      </span>
      <span className="flex items-center">
        <span className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded mr-2" />
        Busy
      </span>
      <span className="flex items-center">
        <span className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded mr-2" />
        Unavailable
      </span>
    </div>
  </div>
);

export const TimeSlotButton = ({
  time,
  isBookedByCurrentUser,
  isBookedByOthers,
  userConflict,
  isRealTimeHeld,
  isSelected,
  onSelect
}) => {
  let buttonClass = 'px-4 py-2 rounded-lg transition font-medium text-center relative border-2 cursor-pointer ';
  let isDisabled = false;
  let label = null;

  if (isBookedByCurrentUser) {
    buttonClass += 'bg-red-100 text-red-700 cursor-not-allowed opacity-80 border-red-300';
    isDisabled = true;
    label = <span className="block text-[10px] mt-1 font-bold uppercase">Booked</span>;
  } else if (userConflict) {
    buttonClass += 'bg-yellow-100 text-yellow-700 cursor-not-allowed opacity-80 border-yellow-300';
    isDisabled = true;
    label = <span className="block text-[9px] mt-1 font-bold uppercase">{`Booked ${userConflict.dietitianName}`}</span>;
  } else if (isSelected) {
    buttonClass += 'bg-emerald-600 text-white shadow-md border-emerald-600';
  } else if (isBookedByOthers || isRealTimeHeld) {
    buttonClass += 'bg-orange-100 text-orange-700 cursor-not-allowed opacity-80 border-orange-300';
    isDisabled = true;
    label = <span className="block text-[9px] mt-1 font-bold uppercase">{isRealTimeHeld ? 'Held' : 'Busy'}</span>;
  } else {
    buttonClass += 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-transparent';
  }

  const isCrossed = isBookedByCurrentUser || isBookedByOthers || userConflict || (isRealTimeHeld && !isSelected);

  return (
    <button
      type="button"
      onClick={() => onSelect(time)}
      disabled={isDisabled}
      className={buttonClass}
      title={
        isBookedByCurrentUser
          ? 'This slot is booked by you with this dietitian'
          : isBookedByOthers
          ? 'This slot is booked by another user'
          : userConflict
          ? `You have an appointment with ${userConflict.dietitianName} at this time`
          : 'Click to select this slot'
      }
    >
      {time}
      {isCrossed && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`block w-full h-0.5 ${
              isBookedByCurrentUser
                ? 'bg-red-700'
                : isBookedByOthers || isRealTimeHeld
                ? 'bg-orange-700'
                : 'bg-yellow-700'
            }`}
          />
        </span>
      )}
      {label}
    </button>
  );
};

export const TimeSlotSections = ({
  availableSlots,
  currentUserBookedTimesWithDietitian,
  bookedSlots,
  getUserConflictAt,
  realTimeHeldSlots,
  selectedTime,
  onSelectTime,
  isLoading
}) => {
  const renderSlot = (time) => (
    <TimeSlotButton
      key={time}
      time={time}
      isBookedByCurrentUser={currentUserBookedTimesWithDietitian.includes(time)}
      isBookedByOthers={bookedSlots.includes(time)}
      userConflict={getUserConflictAt(time)}
      isRealTimeHeld={realTimeHeldSlots.includes(time) && time !== selectedTime}
      isSelected={selectedTime === time}
      onSelect={onSelectTime}
    />
  );

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold mb-3 text-gray-700">
        Available Time Slots
        {isLoading && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
      </label>

      {availableSlots.morning.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Morning</p>
          <div className="grid grid-cols-3 gap-2">{availableSlots.morning.map(renderSlot)}</div>
        </div>
      )}

      {availableSlots.afternoon.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Afternoon</p>
          <div className="grid grid-cols-3 gap-2">{availableSlots.afternoon.map(renderSlot)}</div>
        </div>
      )}

      {availableSlots.evening.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Evening</p>
          <div className="grid grid-cols-3 gap-2">{availableSlots.evening.map(renderSlot)}</div>
        </div>
      )}

      {availableSlots.morning.length === 0 &&
        availableSlots.afternoon.length === 0 &&
        availableSlots.evening.length === 0 && (
          <p className="text-gray-600 text-sm">No slots available</p>
        )}
    </div>
  );
};
