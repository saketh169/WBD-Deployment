import React, { useState, useMemo, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../../contexts/AuthContext';
import { getDietitianBookings, getDietitianBookedSlots, getMeetingLink, getBookingIcs, rescheduleBooking } from '../../services/booking/bookingService';
import { blockSlot, unblockSlot, blockDay, unblockDay, notifyLeave } from '../../services/dietitian/dietitianService';
import { io } from 'socket.io-client';
import { DietitianScheduleSlotDrawer, BlockDaysModal, UnblockDaysModal } from './DietitianScheduleModals';

const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
};

const PRIMARY_GREEN = '#10B981';
const DARK_GREEN = '#059669';
const ACCENT_GREEN = '#34D399';
const WARNING_COLOR = '#86EFAC';
const CARD_FOLLOWUP_COLOR = '#EF4444';

const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'];

const generateWeekDates = () => {
    const today = new Date();
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const weekDates = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayKey = days[date.getDay()];
        const fullDateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        weekDates[dayKey] = {
            name: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
            fullDate: date.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }),
            shortDate: date.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
            dateObj: date, fullDateKey,
        };
    }
    return weekDates;
};

const convertTimeTo24Hour = (time) => {
    if (!time) return 0;
    const [timePart, modifier] = time.split(' ');
    if (!timePart || !modifier) return 0;
    let [hours, minutes] = timePart.split(':').map(Number);
    if (hours === 12 && modifier.toUpperCase() === 'AM') hours = 0;
    else if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    return hours * 100 + minutes;
};

const categorizeSlotsForDate = (slotsArr, date) => {
    const now = new Date();
    const isToday = new Date(date).toDateString() === now.toDateString();
    const filtered = slotsArr.filter(slot => {
        if (!isToday) return true;
        const [h, m] = slot.split(':').map(Number);
        return (h * 60 + m) > (now.getHours() * 60 + now.getMinutes());
    });
    return {
        morning: filtered.filter(s => Number(s.split(':')[0]) < 12),
        afternoon: filtered.filter(s => { const h = Number(s.split(':')[0]); return h >= 12 && h < 17; }),
        evening: filtered.filter(s => Number(s.split(':')[0]) >= 17),
    };
};

const getDayIcon = (dayKey) => {
    const icons = { sunday:'fa-bed', monday:'fa-sun', tuesday:'fa-cloud', wednesday:'fa-umbrella', thursday:'fa-cloud-sun', friday:'fa-moon', saturday:'fa-star' };
    return icons[dayKey.toLowerCase()] || 'fa-calendar';
};

const getCardBorder = (type) => {
    const t = type?.toLowerCase();
    if (t === 'workshop') return `border-l-[4px] border-[${WARNING_COLOR}]`;
    if (t === 'consultation') return `border-l-[4px] border-[${PRIMARY_GREEN}]`;
    if (t === 'group') return `border-l-[4px] border-[${ACCENT_GREEN}]`;
    if (t === 'followup') return `border-l-[4px] border-[${CARD_FOLLOWUP_COLOR}]`;
    return 'border-l-[4px] border-gray-300';
};

const getCalendarDates = () => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return {
            dateString: date.toISOString().split('T')[0],
            displayDate: date.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }),
            dayOfWeek: date.getDay(),
            isToday: i === 0,
        };
    });
};

const DietitianSchedule = () => {
    const { user, token } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meetingLinks, setMeetingLinks] = useState({});
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerDate, setDrawerDate] = useState(new Date().toISOString().split('T')[0]);
    const [availableSlots, setAvailableSlots] = useState({ morning:[], afternoon:[], evening:[] });
    const [bookedSlots, setBookedSlots] = useState([]);
    const [userConflictingTimes, setUserConflictingTimes] = useState([]);
    const [bookingDetails, setBookingDetails] = useState([]);
    const [blockedSlots, setBlockedSlots] = useState([]);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [modalType, setModalType] = useState('');
    const [newTime, setNewTime] = useState('');
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleSlots, setRescheduleSlots] = useState({ morning:[], afternoon:[], evening:[] });
    const [selectedDatesToBlock, setSelectedDatesToBlock] = useState([]);
    const [showMultiDateModal, setShowMultiDateModal] = useState(false);
    const [isBlockingMultipleDays, setIsBlockingMultipleDays] = useState(false);
    const [showUnblockModal, setShowUnblockModal] = useState(false);
    const [showBlockingMenu, setShowBlockingMenu] = useState(false);
    const [dateRangeFrom, setDateRangeFrom] = useState('');
    const [dateRangeTo, setDateRangeTo] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const [blockedDays, setBlockedDays] = useState([]);

    const weekDates = useMemo(() => generateWeekDates(), []);
    const sortedDays = useMemo(() => Object.entries(weekDates).sort((a, b) => a[1].dateObj - b[1].dateObj), [weekDates]);
    const initialDay = sortedDays.find(([, d]) => d.dateObj.toDateString() === new Date().toDateString())?.[0] || sortedDays[0]?.[0];
    const [activeDayKey, setActiveDayKey] = useState(initialDay);
    const activeDayInfo = weekDates[activeDayKey];

    const fetchBookings = useCallback(async () => {
        if (!user?.id || !token) { setLoading(false); return; }
        try {
            setLoading(true);
            const res = await getDietitianBookings(user.id);
            if (res && !res.isError && res.success) setBookings(res.data);
        } catch { setBookings([]); } finally { setLoading(false); }
    }, [user?.id, token]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const fetchDietitianSlots = useCallback(async (date) => {
        if (!user?.id) return;
        setDrawerLoading(true);
        try {
            const resp = await getDietitianBookedSlots(user.id, { date, userId: user.id });
            if (resp && !resp.isError && resp.success) {
                setBookedSlots(resp.bookedSlots || []);
                setUserConflictingTimes(resp.userConflictingTimes || []);
                setBookingDetails(resp.bookingDetails || []);
                setBlockedSlots(resp.blockedSlots || []);
                setAvailableSlots(categorizeSlotsForDate(ALL_SLOTS, date));
            } else {
                setBookedSlots([]); setAvailableSlots({ morning:[], afternoon:[], evening:[] });
            }
        } catch { setBookedSlots([]); setAvailableSlots({ morning:[], afternoon:[], evening:[] }); }
        finally { setDrawerLoading(false); }
    }, [user?.id]);

    const fetchRescheduleSlots = useCallback(async (date, bookingUserId = null) => {
        if (!user?.id || !date) return;
        try {
            const resp = await getDietitianBookedSlots(user.id, { date, userId: bookingUserId || user.id });
            if (resp && !resp.isError && resp.success) {
                const bs = resp.bookedSlots || [], bl = resp.blockedSlots || [], uc = resp.userConflictingTimes || [];
                const avail = categorizeSlotsForDate(ALL_SLOTS, date);
                setRescheduleSlots({
                    morning: avail.morning.filter(s => !bs.includes(s) && !bl.includes(s) && !uc.includes(s)),
                    afternoon: avail.afternoon.filter(s => !bs.includes(s) && !bl.includes(s) && !uc.includes(s)),
                    evening: avail.evening.filter(s => !bs.includes(s) && !bl.includes(s) && !uc.includes(s)),
                });
            }
        } catch { setRescheduleSlots({ morning:[], afternoon:[], evening:[] }); }
    }, [user?.id]);

    const fetchBlockedDays = useCallback(async () => {
        if (!user?.id || !activeDayInfo?.fullDateKey) return;
        try {
            const resp = await getDietitianBookedSlots(user.id, { date: activeDayInfo.fullDateKey, userId: user.id });
            if (resp && !resp.isError && resp.success && (resp.blockedSlots || []).length >= ALL_SLOTS.length) {
                setBlockedDays(prev => Array.from(new Set([...prev, activeDayInfo.fullDateKey])));
            }
        } catch { /* non-fatal */ }
    }, [user?.id, activeDayInfo?.fullDateKey]);

    useEffect(() => {
        if (!user?.id || !token) return;
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true });
        socket.on('connect', () => { socket.emit('register_dietitian', user.id); });
        const refreshData = () => {
            fetchBookings();
            if (isDrawerOpen && drawerDate) fetchDietitianSlots(drawerDate);
            fetchBlockedDays();
        };
        socket.on('new_booking', refreshData);
        socket.on('booking_updated', refreshData);
        return () => socket.disconnect();
    }, [user?.id, token, isDrawerOpen, drawerDate, fetchBookings, fetchDietitianSlots, fetchBlockedDays]);

    const bookingsByDay = useMemo(() => {
        const grouped = {};
        bookings.forEach(b => {
            const dateKey = new Date(b.date).toISOString().split('T')[0];
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({
                time: b.time, consultationType: b.consultationType,
                specialization: b.dietitianSpecialization || 'General Consultation',
                clientName: b.username, clientEmail: b.email,
                status: b.status, bookingId: b._id, amount: b.amount, meetingUrl: b.meetingUrl,
            });
        });
        return grouped;
    }, [bookings]);

    const sortedAppointments = useMemo(() => {
        const dayAppts = bookingsByDay[activeDayInfo?.fullDateKey] || [];
        return dayAppts.sort((a, b) => convertTimeTo24Hour(a.time) - convertTimeTo24Hour(b.time));
    }, [activeDayInfo, bookingsByDay]);

    useEffect(() => { if (activeDayInfo?.fullDateKey) setDrawerDate(activeDayInfo.fullDateKey); }, [activeDayInfo]);
    useEffect(() => { fetchBlockedDays(); }, [fetchBlockedDays]);
    useEffect(() => {
        const handler = (e) => { if (showBlockingMenu && !e.target.closest('.blocking-options-container')) setShowBlockingMenu(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showBlockingMenu]);

    const handleGenerateMeetingLink = async (bookingId, consultationType) => {
        if (consultationType?.toLowerCase() !== 'online') { alert('Meeting links are available only for online consultations.'); return; }
        try {
            const resp = await getMeetingLink(bookingId);
            if (resp && !resp.isError && resp.meetingUrl) {
                setMeetingLinks(prev => ({ ...prev, [bookingId]: resp.meetingUrl }));
                window.open(resp.meetingUrl, '_blank');
            } else alert(resp?.message || 'Unable to create meeting link');
        } catch (err) { alert(err.response?.data?.message || 'Unable to create meeting link'); }
    };

    const handleDownloadICS = async (bookingId) => {
        try {
            const data = await getBookingIcs(bookingId);
            if (data?.isError) { alert(data.message || 'Unable to download calendar invite'); return; }
            const url = window.URL.createObjectURL(new Blob([data], { type: 'text/calendar' }));
            const link = document.createElement('a');
            link.href = url; link.download = `booking-${bookingId}.ics`;
            document.body.appendChild(link); link.click(); link.remove();
            window.URL.revokeObjectURL(url);
        } catch { alert('Unable to download calendar invite'); }
    };

    const openDrawerForDate = (date) => { setDrawerDate(date); setIsDrawerOpen(true); fetchDietitianSlots(date); };

    const handleBlockSlot = async (time) => {
        if (!drawerDate || !user?.id) return;
        setBlockedSlots(prev => [...prev, time]);
        try {
            const res = await blockSlot(user.id, { date: drawerDate, time });
            if (res?.isError) { setBlockedSlots(prev => prev.filter(t => t !== time)); alert(res.message || 'Failed to block slot'); }
            else alert(`Slot ${time} blocked successfully.`);
        } catch { setBlockedSlots(prev => prev.filter(t => t !== time)); alert('Failed to block slot.'); }
    };

    const handleUnblockSlot = async (time) => {
        if (!drawerDate || !user?.id) return;
        setBlockedSlots(prev => prev.filter(t => t !== time));
        try {
            const res = await unblockSlot(user.id, { date: drawerDate, time });
            if (res?.isError) { setBlockedSlots(prev => [...prev, time]); alert('Failed to unblock slot. ' + (res.message || '')); }
            else alert(`Slot ${time} unblocked successfully.`);
        } catch { setBlockedSlots(prev => [...prev, time]); alert('Failed to unblock slot.'); }
    };

    const handleRescheduleBooking = async (oldTime, newDate, nTime) => {
        const detail = bookingDetails.find(d => d.time === oldTime);
        if (!detail) { alert('Booking details not found.'); return; }
        try {
            const res = await rescheduleBooking(detail.bookingId, { date: newDate, time: nTime });
            if (res?.isError) alert('Failed to reschedule. ' + (res.message || ''));
            else { alert(`Rescheduled to ${newDate} ${nTime}.`); fetchDietitianSlots(drawerDate); }
        } catch (err) { alert('Failed to reschedule. ' + (err.response?.data?.message || '')); }
    };

    const handleBlockMultipleDates = async () => {
        if (!selectedDatesToBlock.length || !user?.id) { alert('Select at least one date.'); return; }
        if (!leaveReason.trim()) { alert('Please provide a reason for the leave.'); return; }
        const datesWithBookings = selectedDatesToBlock.filter(d => bookingsByDay[d]?.length > 0);
        if (datesWithBookings.length > 0) {
            const list = datesWithBookings.map(d => `${new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})} (${bookingsByDay[d].length} booking(s))`).join('\n');
            if (!window.confirm(`WARNING: These dates have bookings:\n\n${list}\n\nProceed?`)) return;
        }
        setIsBlockingMultipleDays(true);
        try {
            const results = await Promise.allSettled(selectedDatesToBlock.map(d => blockDay(user.id, { date: d })));
            const ok = results.filter(r => r.status === 'fulfilled' && !r.value?.isError).length;
            try { await notifyLeave(user.id, { dates: selectedDatesToBlock, reason: leaveReason.trim() }); } catch { /* non-fatal */ }
            alert(ok < results.length ? `${ok} day(s) blocked, ${results.length - ok} failed. Admin notified.` : `All ${ok} day(s) blocked! Admin notified.`);
            setSelectedDatesToBlock([]); setLeaveReason(''); setShowMultiDateModal(false);
            fetchDietitianSlots(drawerDate); fetchBlockedDays();
        } catch { alert('Failed to block dates. Please try again.'); }
        finally { setIsBlockingMultipleDays(false); }
    };

    const handleUnblockMultipleDates = async () => {
        if (!selectedDatesToBlock.length || !user?.id) { alert('Select at least one date.'); return; }
        setIsBlockingMultipleDays(true);
        try {
            const results = await Promise.allSettled(selectedDatesToBlock.map(d => unblockDay(user.id, { date: d })));
            const ok = results.filter(r => r.status === 'fulfilled' && !r.value?.isError).length;
            alert(ok < results.length ? `${ok} day(s) unblocked, ${results.length - ok} had no blocks.` : `All ${ok} day(s) unblocked!`);
            setSelectedDatesToBlock([]); setShowUnblockModal(false);
            fetchDietitianSlots(drawerDate); fetchBlockedDays();
        } catch { alert('Failed to unblock dates.'); }
        finally { setIsBlockingMultipleDays(false); }
    };

    const toggleDate = (dateOrDates, mode) => {
        if (mode === 'clear') { setSelectedDatesToBlock([]); return; }
        if (mode === true) { setSelectedDatesToBlock(Array.isArray(dateOrDates) ? dateOrDates : [dateOrDates]); return; }
        setSelectedDatesToBlock(prev => prev.includes(dateOrDates) ? prev.filter(d => d !== dateOrDates) : [...prev, dateOrDates]);
    };

    const handleDateRangeSelect = () => {
        if (!dateRangeFrom || !dateRangeTo) { alert('Select both From and To dates.'); return; }
        const from = new Date(dateRangeFrom), to = new Date(dateRangeTo);
        if (from > to) { alert('From date must be before To date.'); return; }
        const dates = [];
        const cur = new Date(from);
        while (cur <= to) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }
        setSelectedDatesToBlock(dates);
    };

    const closeSlotModal = () => { setShowModal(false); setNewTime(''); setRescheduleDate(''); setRescheduleSlots({ morning:[], afternoon:[], evening:[] }); };

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 to-teal-50">
            {loading && (
                <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="text-center bg-white rounded-2xl shadow-xl p-8 border border-emerald-200">
                        <i className="fas fa-spinner fa-spin text-4xl text-emerald-600 mb-4" />
                        <p className="text-emerald-800 font-medium">Loading your appointments...</p>
                    </div>
                </div>
            )}
            <div className="flex flex-1 w-full p-4">
                <aside className="sidebar sticky w-70 bg-white shadow-xl h-[calc(100vh-120px)] overflow-y-auto p-4 mt-0 border-r-2 border-emerald-200 rounded-tr-2xl rounded-br-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-linear-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center"><i className="fas fa-calendar-days text-white text-lg" /></div>
                        <h3 className="text-lg font-bold text-teal-900">Next 7 Days</h3>
                    </div>
                    <div className="border-t-2 border-emerald-200 mb-4" />
                    {sortedDays.map(([key, dayInfo]) => (
                        <div key={`day-${key}`} onClick={() => setActiveDayKey(key)}
                            className={`day p-3 my-2 cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-3 transform hover:scale-105 ${activeDayKey === key ? 'active shadow-lg' : 'hover:shadow-md'}`}
                            style={{ color: activeDayKey === key ? 'white' : '#0F766E', borderLeft: activeDayKey === key ? `4px solid ${ACCENT_GREEN}` : '2px solid #E5E7EB', background: activeDayKey === key ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'white' }}>
                            <i className={`fas ${getDayIcon(dayInfo.name)} text-lg w-6 text-center shrink-0 ${activeDayKey === key ? 'text-white' : 'text-emerald-600'}`} />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm">{dayInfo.name}</div>
                                <div className="text-xs opacity-80">{dayInfo.shortDate}</div>
                            </div>
                            {blockedDays.includes(dayInfo.fullDateKey) && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${activeDayKey === key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}><i className="fas fa-ban mr-0.5" />Blocked</span>
                            )}
                        </div>
                    ))}
                </aside>
                <main className="flex-1 p-6 bg-transparent">
                    {activeDayInfo && (
                        <div className="day-header flex justify-between items-center mb-6 pb-4 border-b-2 border-emerald-200 bg-white rounded-2xl p-6 shadow-lg">
                            <div>
                                <h2 className="text-4xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{activeDayInfo.name}</h2>
                                <p className="text-base text-gray-600 mt-0 flex items-center gap-2"><i className="fas fa-calendar-alt text-emerald-500" />{activeDayInfo.fullDate}</p>
                            </div>
                            <div className="text-right">
                                <div className="inline-block bg-linear-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">{sortedAppointments.length} {sortedAppointments.length === 1 ? 'Appointment' : 'Appointments'}</div>
                            </div>
                        </div>
                    )}
                    <div className="appointments-container grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {sortedAppointments.length === 0 ? (
                            <div className="no-appointments lg:col-span-3 bg-white rounded-2xl shadow-xl p-8 mt-0 text-center border-2 border-dashed border-emerald-200">
                                <div className="w-20 h-20 bg-linear-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-calendar-check fa-2x text-emerald-600" /></div>
                                <h4 className="text-xl font-bold text-teal-900 mb-2">No Appointments</h4>
                                <p className="text-gray-600 text-sm">Clear schedule for this day!</p>
                            </div>
                        ) : sortedAppointments.map((appt, idx) => (
                            <div key={appt.bookingId || idx} className={`appointment-card bg-white rounded-2xl shadow-lg p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-t-4 transform ${getCardBorder(appt.consultationType)}`}>
                                <div className="appointment-time text-sm text-gray-600 mb-3 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><i className="fas fa-clock text-emerald-600 text-xs" /></div>
                                    <span className="font-bold text-gray-800 text-base">{appt.time || 'N/A'}</span>
                                    <span className={`px-3 py-1 ml-auto text-xs font-bold rounded-full uppercase tracking-tight ${appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : appt.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{appt.status || appt.consultationType}</span>
                                </div>
                                <h3 className="appointment-title text-lg font-bold text-gray-800 mb-2 truncate">{appt.clientName || 'Booked Client'}</h3>
                                <p className="text-sm text-gray-600 mb-2 flex items-center gap-2 min-w-0"><i className="fas fa-notes-medical text-emerald-600 opacity-70 text-sm shrink-0" /><span className="flex-1 min-w-0">{decodeHtmlEntities(appt.specialization)}</span></p>
                                <p className="text-sm text-gray-600 mb-3 flex items-center gap-2"><i className="fas fa-video text-emerald-600 opacity-70 text-sm" />{appt.consultationType}</p>
                                <div className="flex items-center gap-3 pt-3 border-t-2 border-gray-100">
                                    {appt.clientEmail ? (
                                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(appt.clientEmail)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:text-emerald-700 underline transition-colors"><i className="fas fa-envelope mr-1" />Contact</a>
                                    ) : <span className="text-sm text-gray-400">No email</span>}
                                    <button className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" onClick={() => handleDownloadICS(appt.bookingId)}><i className="fas fa-calendar-plus mr-1" />Add to Calendar</button>
                                    {appt.consultationType?.toLowerCase() === 'online' && (
                                        <button className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100" onClick={() => handleGenerateMeetingLink(appt.bookingId, appt.consultationType)}>
                                            <i className="fas fa-video mr-1" />{meetingLinks[appt.bookingId] || appt.meetingUrl ? 'Open Link' : 'Get Link'}
                                        </button>
                                    )}
                                    {appt.amount && <span className="text-sm text-gray-600 flex items-center gap-1 ml-auto shrink-0"><i className="fas fa-rupee-sign text-emerald-600" /><span className="font-bold text-gray-800">₹{appt.amount}</span></span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Slot Drawer & Action Modal */}
                <DietitianScheduleSlotDrawer
                    isDrawerOpen={isDrawerOpen}
                    setIsDrawerOpen={setIsDrawerOpen}
                    openDrawerForDate={openDrawerForDate}
                    drawerDate={drawerDate}
                    setDrawerDate={setDrawerDate}
                    fetchDietitianSlots={fetchDietitianSlots}
                    showBlockingMenu={showBlockingMenu}
                    setShowBlockingMenu={setShowBlockingMenu}
                    drawerLoading={drawerLoading}
                    setSelectedDatesToBlock={setSelectedDatesToBlock}
                    setLeaveReason={setLeaveReason}
                    setShowMultiDateModal={setShowMultiDateModal}
                    setShowUnblockModal={setShowUnblockModal}
                    availableSlots={availableSlots}
                    bookedSlots={bookedSlots}
                    userConflictingTimes={userConflictingTimes}
                    blockedSlots={blockedSlots}
                    bookingDetails={bookingDetails}
                    setSelectedSlot={setSelectedSlot}
                    setModalType={setModalType}
                    setShowModal={setShowModal}
                    showModal={showModal}
                    closeSlotModal={closeSlotModal}
                    selectedSlot={selectedSlot}
                    modalType={modalType}
                    rescheduleDate={rescheduleDate}
                    setRescheduleDate={setRescheduleDate}
                    fetchRescheduleSlots={fetchRescheduleSlots}
                    rescheduleSlots={rescheduleSlots}
                    newTime={newTime}
                    setNewTime={setNewTime}
                    handleBlockSlot={handleBlockSlot}
                    handleRescheduleBooking={handleRescheduleBooking}
                    handleUnblockSlot={handleUnblockSlot}
                    activeDayInfo={activeDayInfo}
                />
            </div>

            {showMultiDateModal && (
                <BlockDaysModal
                    selectedDatesToBlock={selectedDatesToBlock} leaveReason={leaveReason}
                    isBlockingMultipleDays={isBlockingMultipleDays} dateRangeFrom={dateRangeFrom}
                    dateRangeTo={dateRangeTo} blockedDays={blockedDays} bookingsByDay={bookingsByDay}
                    onClose={() => { setShowMultiDateModal(false); setSelectedDatesToBlock([]); setLeaveReason(''); }}
                    onBlock={handleBlockMultipleDates} onToggleDate={toggleDate}
                    onLeaveReasonChange={setLeaveReason} onDateRangeFromChange={setDateRangeFrom}
                    onDateRangeToChange={setDateRangeTo} onApplyRange={handleDateRangeSelect}
                    getCalendarDates={getCalendarDates}
                />
            )}
            {showUnblockModal && (
                <UnblockDaysModal
                    selectedDatesToBlock={selectedDatesToBlock} isBlockingMultipleDays={isBlockingMultipleDays}
                    blockedDays={blockedDays}
                    onClose={() => { setShowUnblockModal(false); setSelectedDatesToBlock([]); }}
                    onUnblock={handleUnblockMultipleDates} onToggleDate={toggleDate}
                    getCalendarDates={getCalendarDates}
                />
            )}
        </div>
    );
};

export default DietitianSchedule;
