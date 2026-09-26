import React from 'react';

const todayStr = () => new Date().toISOString().split('T')[0];
const maxDateStr = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; };

export const DietitianScheduleSlotDrawer = ({
    isDrawerOpen,
    setIsDrawerOpen,
    openDrawerForDate,
    drawerDate,
    setDrawerDate,
    fetchDietitianSlots,
    showBlockingMenu,
    setShowBlockingMenu,
    drawerLoading,
    setSelectedDatesToBlock,
    setLeaveReason,
    setShowMultiDateModal,
    setShowUnblockModal,
    availableSlots,
    bookedSlots,
    userConflictingTimes,
    blockedSlots,
    bookingDetails,
    setSelectedSlot,
    setModalType,
    setShowModal,
    showModal,
    closeSlotModal,
    selectedSlot,
    modalType,
    rescheduleDate,
    setRescheduleDate,
    fetchRescheduleSlots,
    rescheduleSlots,
    newTime,
    setNewTime,
    handleBlockSlot,
    handleRescheduleBooking,
    handleUnblockSlot,
    activeDayInfo,
}) => {
    const renderDrawerSlot = (time) => {
        const isBooked = bookedSlots.includes(time);
        const isConflict = userConflictingTimes.includes(time);
        const isBlocked = blockedSlots.includes(time);
        const cls = `w-full px-4 py-2 rounded-lg transition font-medium text-center relative border-2 ${
            isBooked ? 'bg-red-100 text-red-700 border-red-300' :
            isConflict ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed opacity-80 border-yellow-300' :
            isBlocked ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer border-orange-300' :
            'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer border-gray-300'
        }`;
        const label = isBooked ? 'Booked' : isConflict ? 'Unavailable' : isBlocked ? 'Blocked' : 'Free';

        return (
            <div key={time}>
                <button
                    className={cls}
                    disabled={isConflict}
                    onClick={() => {
                        if (!isBooked && !isConflict && !isBlocked) {
                            setSelectedSlot(time);
                            setModalType('block');
                            setShowModal(true);
                        } else if (isBooked) {
                            setSelectedSlot(time);
                            setModalType('reschedule');
                            setRescheduleDate(drawerDate);
                            fetchRescheduleSlots(drawerDate, bookingDetails.find(d => d.time === time)?.userId);
                            setShowModal(true);
                        } else if (isBlocked) {
                            setSelectedSlot(time);
                            setModalType('unblock');
                            setShowModal(true);
                        }
                    }}
                >
                    <span className="font-semibold text-sm">{time}</span>
                    <span className="block text-[9px] mt-1 font-bold uppercase">{label}</span>
                </button>
            </div>
        );
    };

    const renderSlotGroup = (slots, label) => slots.length > 0 ? (
        <div className="mb-4">
            <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">{label}</p>
            <div className="grid grid-cols-3 gap-2">{slots.map(renderDrawerSlot)}</div>
        </div>
    ) : null;

    return (
        <>
            <div>
                <button
                    onClick={() => {
                        if (!isDrawerOpen) {
                            openDrawerForDate(drawerDate || activeDayInfo?.fullDateKey);
                        } else {
                            setIsDrawerOpen(false);
                        }
                    }}
                    aria-label="Open slot manager"
                    className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border border-emerald-200 rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-50 transition-all duration-300 hover:scale-110"
                    title="Manage Slots"
                >
                    <i className={`fas ${isDrawerOpen ? 'fa-chevron-right' : 'fa-chevron-left'} text-lg`} />
                </button>
                <aside className={`fixed top-16 right-0 w-[30vw] max-h-[calc(100vh-4rem)] bg-white shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <i className="fas fa-arrow-left text-gray-600" />
                            </button>
                            <h3 className="text-xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Slot Management</h3>
                            <div className="w-10" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Select Date</label>
                            <input
                                type="date"
                                value={drawerDate}
                                onChange={e => { setDrawerDate(e.target.value); fetchDietitianSlots(e.target.value); }}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                        </div>
                        <div className="mb-4 relative blocking-options-container">
                            <button
                                onClick={() => setShowBlockingMenu(p => !p)}
                                disabled={drawerLoading}
                                className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold text-sm disabled:opacity-50 flex items-center justify-between gap-2 shadow-md"
                            >
                                <span className="flex items-center gap-2"><i className="fas fa-calendar-times" />Blocking Options</span>
                                <i className={`fas fa-chevron-${showBlockingMenu ? 'up' : 'down'} text-sm`} />
                            </button>
                            {showBlockingMenu && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-emerald-200 overflow-hidden z-20">
                                    <button
                                        onClick={() => { setShowBlockingMenu(false); setSelectedDatesToBlock([]); setLeaveReason(''); setShowMultiDateModal(true); }}
                                        disabled={drawerLoading}
                                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3 border-b border-gray-100 disabled:opacity-50"
                                    >
                                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><i className="fas fa-ban text-emerald-600" /></div>
                                        <div className="flex-1"><div className="font-semibold text-gray-800 text-sm">Block Days</div><div className="text-xs text-gray-500">Select one or multiple days to block</div></div>
                                    </button>
                                    <button
                                        onClick={() => { setShowBlockingMenu(false); setSelectedDatesToBlock([]); setShowUnblockModal(true); }}
                                        disabled={drawerLoading}
                                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3 disabled:opacity-50"
                                    >
                                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><i className="fas fa-check-circle text-emerald-600" /></div>
                                        <div className="flex-1"><div className="font-semibold text-gray-800 text-sm">Unblock Days</div><div className="text-xs text-gray-500">Remove blocks from selected days</div></div>
                                    </button>
                                </div>
                            )}
                            <p className="text-[10px] text-gray-500 mt-2 italic flex items-center gap-1"><i className="fas fa-info-circle" />Admin will be emailed your reason when blocking days.</p>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-semibold mb-2 text-gray-700">Legend:</p>
                            <div className="flex gap-4 text-xs">
                                <span className="flex items-center"><span className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2" />Free</span>
                                <span className="flex items-center"><span className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2" />Booked</span>
                                <span className="flex items-center"><span className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded mr-2" />Busy</span>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-semibold mb-3 text-gray-700">Available Time Slots{drawerLoading && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}</label>
                            {renderSlotGroup(availableSlots.morning, 'Morning')}
                            {renderSlotGroup(availableSlots.afternoon, 'Afternoon')}
                            {renderSlotGroup(availableSlots.evening, 'Evening')}
                            {!availableSlots.morning.length && !availableSlots.afternoon.length && !availableSlots.evening.length && <p className="text-gray-600 text-sm">No slots available</p>}
                        </div>
                        <div className="flex justify-end pt-4 border-t border-gray-200">
                            <button onClick={() => setIsDrawerOpen(false)} className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold">Close</button>
                        </div>
                    </div>
                </aside>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={closeSlotModal}>
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h4 className="text-lg font-bold mb-4 text-gray-800">Slot Action</h4>
                        <p className="text-sm text-gray-600 mb-2">Selected slot: <span className="font-semibold">{selectedSlot}</span></p>
                        {modalType === 'reschedule' && bookingDetails.find(d => d.time === selectedSlot) && (
                            <p className="text-sm text-gray-600 mb-4">Booked by: <span className="font-semibold text-emerald-600">{bookingDetails.find(d => d.time === selectedSlot).userName}</span></p>
                        )}
                        {modalType === 'reschedule' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">New Date</label>
                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={e => {
                                        setRescheduleDate(e.target.value);
                                        fetchRescheduleSlots(e.target.value, bookingDetails.find(d => d.time === selectedSlot)?.userId);
                                    }}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
                                />
                                {rescheduleDate && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
                                        {['morning', 'afternoon', 'evening'].map(period => rescheduleSlots[period].length > 0 && (
                                            <div key={period} className="mb-2">
                                                <p className="text-xs text-gray-600 mb-1 font-semibold capitalize">{period}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {rescheduleSlots[period].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setNewTime(s)}
                                                            className={`px-2 py-1 text-xs rounded ${newTime === s ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {!rescheduleSlots.morning.length && !rescheduleSlots.afternoon.length && !rescheduleSlots.evening.length && (
                                            <p className="text-xs text-gray-500">No available slots on this date</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex gap-3">
                            {modalType === 'block' && (
                                <button onClick={() => { handleBlockSlot(selectedSlot); setShowModal(false); }} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold">Block Slot</button>
                            )}
                            {modalType === 'reschedule' && (
                                <button
                                    onClick={() => {
                                        if (!rescheduleDate || !newTime) {
                                            alert('Please select a date and time.');
                                            return;
                                        }
                                        handleRescheduleBooking(selectedSlot, rescheduleDate, newTime);
                                        closeSlotModal();
                                    }}
                                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold"
                                >
                                    Reschedule
                                </button>
                            )}
                            {modalType === 'unblock' && (
                                <button onClick={() => { handleUnblockSlot(selectedSlot); setShowModal(false); }} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">Unblock Slot</button>
                            )}
                            <button onClick={closeSlotModal} className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export const BlockDaysModal = ({
  selectedDatesToBlock, leaveReason, isBlockingMultipleDays,
  dateRangeFrom, dateRangeTo, blockedDays, bookingsByDay,
  onClose, onBlock, onToggleDate, onLeaveReasonChange,
  onDateRangeFromChange, onDateRangeToChange, onApplyRange,
  getCalendarDates,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => !isBlockingMultipleDays && onClose()}>
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2"><i className="fas fa-calendar-alt text-emerald-600" />Select Days to Block</h4>
        <button onClick={onClose} disabled={isBlockingMultipleDays} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"><i className="fas fa-times text-gray-600" /></button>
      </div>
      <p className="text-sm text-gray-600 mb-4">Click on dates to select or deselect them. You can select multiple days at once.</p>

      <div className="mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
        <p className="text-sm font-semibold text-teal-800 mb-3 flex items-center gap-2"><i className="fas fa-calendar-alt" />Select Date Range</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">From Date</label>
            <input type="date" value={dateRangeFrom} onChange={e => onDateRangeFromChange(e.target.value)} min={todayStr()} max={maxDateStr()} disabled={isBlockingMultipleDays} className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm disabled:opacity-50" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">To Date</label>
            <input type="date" value={dateRangeTo} onChange={e => onDateRangeToChange(e.target.value)} min={dateRangeFrom || todayStr()} max={maxDateStr()} disabled={isBlockingMultipleDays} className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm disabled:opacity-50" />
          </div>
          <div className="flex items-end">
            <button onClick={onApplyRange} disabled={!dateRangeFrom || !dateRangeTo || isBlockingMultipleDays} className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"><i className="fas fa-check mr-2" />Apply Range</button>
          </div>
        </div>
        <p className="text-[10px] text-teal-600 mt-2 italic"><i className="fas fa-lightbulb mr-1" />Select a date range to quickly block multiple consecutive days</p>
      </div>

      {selectedDatesToBlock.length > 0 && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-800 mb-2">Selected: {selectedDatesToBlock.length} day(s)</p>
          <div className="flex flex-wrap gap-2">
            {selectedDatesToBlock.map(date => (
              <span key={date} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium flex items-center gap-1">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                <button onClick={() => onToggleDate(date)} className="ml-1 hover:text-emerald-900"><i className="fas fa-times text-[10px]" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-600 py-2">{d}</div>)}
        {getCalendarDates().map(({ dateString, displayDate, dayOfWeek }, index) => {
          const emptyCell = index === 0 && dayOfWeek > 0;
          const isSelected = selectedDatesToBlock.includes(dateString);
          const alreadyBlocked = blockedDays.includes(dateString);
          const hasBookings = bookingsByDay[dateString]?.length > 0;
          const bookingCount = bookingsByDay[dateString]?.length || 0;
          const disabled = isBlockingMultipleDays || alreadyBlocked;
          return (
            <React.Fragment key={dateString}>
              {emptyCell && Array(dayOfWeek).fill(null).map((_, i) => <div key={`e-${i}`} className="p-2" />)}
              <button onClick={() => !alreadyBlocked && onToggleDate(dateString)} disabled={disabled}
                className={`p-2 rounded-lg text-sm font-medium transition-all relative flex flex-col items-center justify-center ${alreadyBlocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60 border-2 border-gray-400' : hasBookings ? 'bg-white text-orange-600 border-2 border-orange-500 cursor-not-allowed opacity-60' : isSelected ? 'bg-emerald-500 text-white shadow-md hover:scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105 cursor-pointer'}`}
                title={alreadyBlocked ? 'Already blocked' : hasBookings ? `${bookingCount} booking(s) - ${displayDate}` : displayDate}>
                <div className="text-xs font-semibold">{new Date(dateString).getDate()}</div>
                {hasBookings && !alreadyBlocked && <div className="text-[7px] font-bold text-orange-600"><i className="fas fa-users text-[6px]" />{bookingCount}</div>}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs font-semibold text-blue-800 mb-2">Legend:</p>
        <div className="flex justify-evenly text-xs">
          <span className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 border border-gray-300 rounded" />Available</span>
          <span className="flex items-center gap-2"><span className="w-5 h-5 bg-white border-2 border-orange-500 rounded text-orange-600 flex items-center justify-center text-[8px]"><i className="fas fa-users" /></span>Has Bookings</span>
          <span className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 border-2 border-gray-400 rounded opacity-60" />Already Blocked</span>
        </div>
        <p className="text-[10px] text-blue-600 mt-2 italic"><i className="fas fa-info-circle mr-1" />Dates with bookings can still be blocked; clients will be notified.</p>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs font-semibold text-gray-700 mb-2">Quick Select:</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { const weekdays = getCalendarDates().filter(d => d.dayOfWeek !== 0 && d.dayOfWeek !== 6).map(d => d.dateString).slice(0, 10); onToggleDate(weekdays, true); }} disabled={isBlockingMultipleDays} className="px-3 py-1 bg-teal-500 text-white rounded text-xs hover:bg-teal-600 transition disabled:opacity-50">Next 10 Weekdays</button>
          <button onClick={() => { const dates = getCalendarDates().slice(0, 7).map(d => d.dateString); onToggleDate(dates, true); }} disabled={isBlockingMultipleDays} className="px-3 py-1 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600 transition disabled:opacity-50">Next 7 Days</button>
          <button onClick={() => onToggleDate([], 'clear')} disabled={isBlockingMultipleDays} className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition disabled:opacity-50">Clear All</button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Leave <span className="text-red-500">*</span></label>
        <textarea value={leaveReason} onChange={e => onLeaveReasonChange(e.target.value)} disabled={isBlockingMultipleDays} rows={3} placeholder="e.g. Personal health issue, family emergency, attending a conference..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none disabled:opacity-50" />
        <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><i className="fas fa-envelope text-red-400" />This reason will be emailed to the admin.</p>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button onClick={onBlock} disabled={selectedDatesToBlock.length === 0 || !leaveReason.trim() || isBlockingMultipleDays} className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
          {isBlockingMultipleDays ? <><i className="fas fa-spinner fa-spin" />Blocking...</> : <><i className="fas fa-ban" />Block {selectedDatesToBlock.length > 0 ? `${selectedDatesToBlock.length} Day(s)` : 'Days'}</>}
        </button>
        <button onClick={onClose} disabled={isBlockingMultipleDays} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50">Cancel</button>
      </div>
    </div>
  </div>
);

export const UnblockDaysModal = ({
  selectedDatesToBlock, isBlockingMultipleDays, blockedDays,
  onClose, onUnblock, onToggleDate, getCalendarDates,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => !isBlockingMultipleDays && onClose()}>
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2"><i className="fas fa-calendar-check text-emerald-600" />Select Days to Unblock</h4>
        <button onClick={onClose} disabled={isBlockingMultipleDays} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"><i className="fas fa-times text-gray-600" /></button>
      </div>
      <p className="text-sm text-gray-600 mb-4">Click on dates to select or deselect them for unblocking.</p>

      {selectedDatesToBlock.length > 0 && (
        <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-800 mb-2">Selected: {selectedDatesToBlock.length} day(s)</p>
          <div className="flex flex-wrap gap-2">
            {selectedDatesToBlock.map(date => (
              <span key={date} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium flex items-center gap-1">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                <button onClick={() => onToggleDate(date)} className="ml-1 hover:text-emerald-900"><i className="fas fa-times text-[10px]" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-600 py-2">{d}</div>)}
        {getCalendarDates().map(({ dateString, displayDate, dayOfWeek }, index) => {
          const emptyCell = index === 0 && dayOfWeek > 0;
          const isSelected = selectedDatesToBlock.includes(dateString);
          const isFullyBlocked = blockedDays.includes(dateString);
          const disabled = isBlockingMultipleDays || !isFullyBlocked;
          return (
            <React.Fragment key={dateString}>
              {emptyCell && Array(dayOfWeek).fill(null).map((_, i) => <div key={`e-${i}`} className="p-2" />)}
              <button onClick={() => isFullyBlocked && onToggleDate(dateString)} disabled={disabled} title={isFullyBlocked ? displayDate : 'Not blocked'}
                className={`p-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center ${isSelected ? 'bg-emerald-500 text-white shadow-md hover:scale-105' : isFullyBlocked ? 'bg-white text-gray-700 border-2 border-gray-400 hover:scale-105 cursor-pointer' : 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60 border border-gray-300'}`}>
                <div className="text-xs font-semibold">{new Date(dateString).getDate()}</div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs font-semibold text-blue-800 mb-2">Legend:</p>
        <div className="flex justify-evenly text-xs">
          <span className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 border border-gray-300 rounded opacity-60" />Not Blocked</span>
          <span className="flex items-center gap-2"><span className="w-5 h-5 bg-white border-2 border-gray-400 rounded" />Blocked</span>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button onClick={onUnblock} disabled={selectedDatesToBlock.length === 0 || isBlockingMultipleDays} className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
          {isBlockingMultipleDays ? <><i className="fas fa-spinner fa-spin" />Unblocking...</> : <><i className="fas fa-check-circle" />Unblock {selectedDatesToBlock.length > 0 ? `${selectedDatesToBlock.length} Day(s)` : 'Days'}</>}
        </button>
        <button onClick={onClose} disabled={isBlockingMultipleDays} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50">Cancel</button>
      </div>
    </div>
  </div>
);
