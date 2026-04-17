import React, { useState, useMemo, useEffect, useContext, useCallback } from 'react';
import AuthContext from '../../contexts/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';

// Helper function to decode HTML entities
const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};
const PRIMARY_GREEN = '#10B981';
const DARK_GREEN = '#059669';
const ACCENT_GREEN = '#34D399';
const WARNING_COLOR = '#86EFAC';
const CARD_FOLLOWUP_COLOR = '#EF4444';
const TEAL_DARK = '#0F766E';

const generateWeekDates = () => {
    const today = new Date();
    const weekDates = {};
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayKey = days[date.getDay()].toLowerCase();
        const fullDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        weekDates[dayKey] = {
            name: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
            fullDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dateObj: date,
            fullDateKey: fullDateKey,
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

const DietitianSchedule = () => {
    const { user, token } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meetingLinks, setMeetingLinks] = useState({});
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerDate, setDrawerDate] = useState(new Date().toISOString().split('T')[0]);
    const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [], evening: [] });
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
    const [rescheduleSlots, setRescheduleSlots] = useState({ morning: [], afternoon: [], evening: [] });
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
    const initialDay = sortedDays.find(([, dayInfo]) => dayInfo.dateObj.toDateString() === new Date().toDateString())?.[0] || sortedDays[0]?.[0];
    const [activeDayKey, setActiveDayKey] = useState(initialDay);

    useEffect(() => {
        // User context is used implicitly for authentication
        if (user) {
            // User is loaded
        }
    }, [user]);

    useEffect(() => {
        const fetchBookings = async () => {
            if (!user?.id || !token) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await axios.get(`/api/bookings/dietitian/${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data.success) setBookings(response.data.data);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                setBookings([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [user?.id, token]);

    const fetchDietitianSlots = useCallback(async (date) => {
        if (!user?.id) return;
        setDrawerLoading(true);
        try {
            const resp = await axios.get(`/api/bookings/dietitian/${user.id}/booked-slots`, {
                params: { date, userId: user.id },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.data && resp.data.success) {
                setBookedSlots(resp.data.bookedSlots || []);
                setUserConflictingTimes(resp.data.userConflictingTimes || []);
                setBookingDetails(resp.data.bookingDetails || []);
                setBlockedSlots(resp.data.blockedSlots || []);
                const now = new Date();
                const isToday = new Date(date).toDateString() === now.toDateString();
                const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].filter(slot => {
                    if (!isToday) return true;
                    const [h, m] = slot.split(':').map(Number);
                    const mins = h * 60 + m;
                    const current = now.getHours() * 60 + now.getMinutes();
                    return mins > current;
                });
                const categorized = {
                    morning: allSlots.filter(s => Number(s.split(':')[0]) < 12),
                    afternoon: allSlots.filter(s => { const h = Number(s.split(':')[0]); return h >= 12 && h < 17; }),
                    evening: allSlots.filter(s => Number(s.split(':')[0]) >= 17),
                };
                setAvailableSlots(categorized);
            } else {
                setBookedSlots([]);
                setAvailableSlots({ morning: [], afternoon: [], evening: [] });
            }
        } catch (err) {
            console.error('Error fetching dietitian slots:', err);
            setBookedSlots([]);
            setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        } finally {
            setDrawerLoading(false);
        }
    }, [user?.id, token]);

    const fetchRescheduleSlots = useCallback(async (date, bookingUserId = null) => {
        if (!user?.id || !date) return;
        try {
            const resp = await axios.get(`/api/bookings/dietitian/${user.id}/booked-slots`, {
                params: { date, userId: bookingUserId || user.id },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.data && resp.data.success) {
                const bookedSlots = resp.data.bookedSlots || [];
                const blockedSlots = resp.data.blockedSlots || [];
                const userConflictingTimes = resp.data.userConflictingTimes || [];
                const now = new Date();
                const isToday = new Date(date).toDateString() === now.toDateString();
                const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].filter(slot => {
                    if (!isToday) return true;
                    const [h, m] = slot.split(':').map(Number);
                    const mins = h * 60 + m;
                    const current = now.getHours() * 60 + now.getMinutes();
                    return mins > current;
                });
                const available = allSlots.filter(slot => !bookedSlots.includes(slot) && !blockedSlots.includes(slot) && !userConflictingTimes.includes(slot));
                const categorized = {
                    morning: available.filter(s => Number(s.split(':')[0]) < 12),
                    afternoon: available.filter(s => { const h = Number(s.split(':')[0]); return h >= 12 && h < 17; }),
                    evening: available.filter(s => Number(s.split(':')[0]) >= 17),
                };
                setRescheduleSlots(categorized);
            }
        } catch (err) {
            console.error('Error fetching reschedule slots:', err);
            setRescheduleSlots({ morning: [], afternoon: [], evening: [] });
        }
    }, [user?.id, token]);

    // Fetch blocked days list for sidebar highlight
    const fetchBlockedDays = useCallback(async () => {
        if (!user?.id) return;
        try {
            // Check each of the next 30 days if they are fully blocked
            // We piggyback on the booked-slots API which already returns blockedSlots
            const days = [];
            const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
            const checks = sortedDays.map(async ([, dayInfo]) => {
                try {
                    const resp = await axios.get(`/api/bookings/dietitian/${user.id}/booked-slots`, {
                        params: { date: dayInfo.fullDateKey, userId: user.id },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (resp.data?.success) {
                        const bs = resp.data.blockedSlots || [];
                        if (bs.length >= allSlots.length) days.push(dayInfo.fullDateKey);
                    }
                } catch (error) {
                    console.error('Error fetching blocked slots:', error);
                }
            });
            await Promise.all(checks);
            setBlockedDays(days);
        } catch (err) {
            console.error('Error fetching blocked days:', err);
        }
    }, [user?.id, token, sortedDays]);

    // Real-time WebSocket listener for booking changes
    useEffect(() => {
        if (!user?.id || !token) return;

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            withCredentials: true,
        });

        socket.on('connect', () => {
            console.log('Connected to real-time server (DietitianSchedule)');
            socket.emit('register_dietitian', user.id);
        });

        const refreshData = () => {
            console.log('Refreshing schedule data due to socket event');
            const fetchBookings = async () => {
                try {
                    const response = await axios.get(`/api/bookings/dietitian/${user.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.data.success) setBookings(response.data.data);
                } catch (error) {
                    console.error('Error fetching bookings:', error);
                }
            };
            fetchBookings();
            if (isDrawerOpen && drawerDate) {
                fetchDietitianSlots(drawerDate);
            }
            fetchBlockedDays();
        };

        socket.on('new_booking', refreshData);
        socket.on('booking_updated', refreshData);

        return () => {
            socket.disconnect();
        };
    }, [user?.id, token, isDrawerOpen, drawerDate, fetchDietitianSlots, fetchBlockedDays]);

    const bookingsByDay = useMemo(() => {
        const grouped = {};
        bookings.forEach(booking => {
            const dateKey = new Date(booking.date).toISOString().split('T')[0];
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({
                time: booking.time,
                consultationType: booking.consultationType,
                specialization: booking.dietitianSpecialization || 'General Consultation',
                clientName: booking.username,
                clientEmail: booking.email,
                clientPhone: booking.userPhone,
                clientAddress: booking.userAddress,
                status: booking.status,
                bookingId: booking._id,
                amount: booking.amount,
                profileImage: null,
                meetingUrl: booking.meetingUrl
            });
        });
        return grouped;
    }, [bookings]);

    const activeDayInfo = weekDates[activeDayKey];
    const sortedAppointments = useMemo(() => {
        const dayAppointments = bookingsByDay[activeDayInfo?.fullDateKey] || [];
        return dayAppointments.sort((a, b) => convertTimeTo24Hour(a.time) - convertTimeTo24Hour(b.time));
    }, [activeDayInfo, bookingsByDay]);

    useEffect(() => {
        if (activeDayInfo?.fullDateKey) setDrawerDate(activeDayInfo.fullDateKey);
    }, [activeDayInfo]);

    useEffect(() => { fetchBlockedDays(); }, [fetchBlockedDays]);

    const handleGenerateMeetingLink = async (bookingId, consultationType) => {
        if (consultationType?.toLowerCase() !== 'online') {
            alert('Meeting links are available only for online consultations.');
            return;
        }
        try {
            const resp = await axios.post(`/api/bookings/${bookingId}/meeting-link`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.data?.success && resp.data.meetingUrl) {
                setMeetingLinks(prev => ({ ...prev, [bookingId]: resp.data.meetingUrl }));
                window.open(resp.data.meetingUrl, '_blank');
            }
        } catch (error) {
            console.error('Error creating meeting link:', error);
            alert(error.response?.data?.message || 'Unable to create meeting link');
        }
    };

    const handleDownloadICS = async (bookingId) => {
        try {
            const resp = await axios.get(`/api/bookings/${bookingId}/ics`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const blobUrl = window.URL.createObjectURL(new Blob([resp.data], { type: 'text/calendar' }));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `booking-${bookingId}.ics`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Error downloading calendar invite:', error);
            alert(error.response?.data?.message || 'Unable to download calendar invite');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showBlockingMenu && !event.target.closest('.blocking-options-container')) setShowBlockingMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showBlockingMenu]);

    const openDrawerForDate = (date) => {
        setDrawerDate(date);
        setIsDrawerOpen(true);
        fetchDietitianSlots(date);
    };

    const handleBlockSlot = async (time) => {
        if (!drawerDate || !user?.id) return;
        setBlockedSlots(prev => [...prev, time]);
        try {
            await axios.post(`/api/dietitians/${user.id}/block-slot`, { date: drawerDate, time }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Slot ${time} blocked successfully.`);
        } catch (err) {
            console.error('Error blocking slot (backend may not support this yet):', err);
            setBlockedSlots(prev => prev.filter(t => t !== time));
            alert('Failed to block slot. Backend endpoint may be missing.');
        }
    };

    const handleRescheduleBooking = async (oldTime, newDate, newTime) => {
        const bookingDetail = bookingDetails.find(detail => detail.time === oldTime);
        if (!bookingDetail) {
            alert('Booking details not found for this slot.');
            return;
        }
        try {
            await axios.patch(`/api/bookings/${bookingDetail.bookingId}/reschedule`, { date: newDate, time: newTime }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Booking rescheduled from ${drawerDate} ${oldTime} to ${newDate} ${newTime}.`);
            fetchDietitianSlots(drawerDate);
        } catch (err) {
            console.error('Error rescheduling booking:', err);
            alert('Failed to reschedule booking. ' + (err.response?.data?.message || 'Unknown error'));
        }
    };

    const handleUnblockSlot = async (time) => {
        if (!drawerDate || !user?.id) return;
        setBlockedSlots(prev => prev.filter(t => t !== time));
        try {
            await axios.post(`/api/dietitians/${user.id}/unblock-slot`, { date: drawerDate, time }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Slot ${time} unblocked successfully.`);
        } catch (err) {
            console.error('Error unblocking slot:', err);
            setBlockedSlots(prev => [...prev, time]);
            alert('Failed to unblock slot. ' + (err.response?.data?.message || 'Unknown error'));
        }
    };

    const handleBlockMultipleDates = async () => {
        if (selectedDatesToBlock.length === 0 || !user?.id) {
            alert('Please select at least one date to block.');
            return;
        }
        if (!leaveReason.trim()) {
            alert('Please provide a reason for the leave.');
            return;
        }

        // Check for dates with bookings and warn the user
        const datesWithBookings = selectedDatesToBlock.filter(date => bookingsByDay[date] && bookingsByDay[date].length > 0);
        if (datesWithBookings.length > 0) {
            const bookingList = datesWithBookings.map(date => {
                const count = bookingsByDay[date].length;
                return `${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${count} booking${count > 1 ? 's' : ''})`;
            }).join('\n');
            const confirmed = window.confirm(
                `WARNING: These dates have existing bookings:\n\n${bookingList}\n\nClients will be notified when you block these dates.\n\nDo you want to proceed?`
            );
            if (!confirmed) return;
        }

        setIsBlockingMultipleDays(true);
        try {
            const results = await Promise.allSettled(
                selectedDatesToBlock.map(date => axios.post(`/api/dietitians/${user.id}/block-day`, { date }, {
                    headers: { Authorization: `Bearer ${token}` }
                }))
            );
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            // Notify admin via email (non-fatal)
            try {
                await axios.post(`/api/dietitians/${user.id}/notify-leave`, {
                    dates: selectedDatesToBlock,
                    reason: leaveReason.trim()
                }, { headers: { Authorization: `Bearer ${token}` } });
            } catch (emailErr) {
                console.error('Failed to send leave email:', emailErr.message);
            }

            if (failed > 0) alert(`Blocking completed: ${successful} day(s) blocked, ${failed} failed (may have existing bookings). Admin notified.`);
            else alert(`All ${successful} day(s) blocked successfully! Admin has been notified.`);
            setSelectedDatesToBlock([]);
            setLeaveReason('');
            setShowMultiDateModal(false);
            fetchDietitianSlots(drawerDate);
            fetchBlockedDays();
        } catch (err) {
            console.error('Error blocking multiple dates:', err);
            alert('Failed to block dates. Please try again.');
        } finally {
            setIsBlockingMultipleDays(false);
        }
    };

    const handleUnblockMultipleDates = async () => {
        if (selectedDatesToBlock.length === 0 || !user?.id) {
            alert('Please select at least one date to unblock.');
            return;
        }
        setIsBlockingMultipleDays(true);
        try {
            const results = await Promise.allSettled(
                selectedDatesToBlock.map(date => axios.post(`/api/dietitians/${user.id}/unblock-day`, { date }, {
                    headers: { Authorization: `Bearer ${token}` }
                }))
            );
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) alert(`Unblocking: ${successful} day(s) unblocked, ${failed} had no blocks.`);
            else alert(`All ${successful} day(s) unblocked successfully!`);
            setSelectedDatesToBlock([]);
            setShowUnblockModal(false);
            fetchDietitianSlots(drawerDate);
            fetchBlockedDays();
        } catch (err) {
            console.error('Error unblocking multiple dates:', err);
            alert('Failed to unblock dates. Please try again.');
        } finally {
            setIsBlockingMultipleDays(false);
        }
    };

    const toggleDateSelection = (date) => {
        setSelectedDatesToBlock(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
    };

    const getCalendarDates = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push({
                dateString: date.toISOString().split('T')[0],
                displayDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                dayOfWeek: date.getDay(),
                isToday: i === 0
            });
        }
        return dates;
    };

    const handleDateRangeSelect = () => {
        if (!dateRangeFrom || !dateRangeTo) {
            alert('Please select both From and To dates.');
            return;
        }
        const fromDate = new Date(dateRangeFrom);
        const toDate = new Date(dateRangeTo);
        if (fromDate > toDate) {
            alert('From date must be before To date.');
            return;
        }
        const dates = [];
        const currentDate = new Date(fromDate);
        while (currentDate <= toDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        setSelectedDatesToBlock(dates);
    };

    const renderDrawerTimeSlot = (time) => {
        const isBooked = bookedSlots.includes(time);
        const isUserConflict = userConflictingTimes.includes(time);
        const isBlocked = blockedSlots.includes(time);
        let buttonClass = "w-full px-4 py-2 rounded-lg transition font-medium text-center relative border-2 ";
        let isDisabled = false;
        let label = null;
        if (isBooked) {
            buttonClass += "bg-red-100 text-red-700 border-red-300";
            label = <span className="block text-[9px] mt-1 font-bold uppercase">Booked</span>;
        } else if (isUserConflict) {
            buttonClass += "bg-yellow-100 text-yellow-700 cursor-not-allowed opacity-80 border-yellow-300";
            isDisabled = true;
            label = <span className="block text-[9px] mt-1 font-bold uppercase">Unavailable</span>;
        } else if (isBlocked) {
            buttonClass += "bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer border-orange-300";
            label = <span className="block text-[9px] mt-1 font-bold uppercase">Blocked</span>;
        } else {
            buttonClass += "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer border-gray-300";
            label = <span className="block text-[9px] mt-1 font-bold uppercase">Free</span>;
        }
        return (
            <div key={time}>
                <button className={buttonClass} disabled={isDisabled} onClick={() => {
                    if (!isBooked && !isUserConflict && !isBlocked) {
                        setSelectedSlot(time);
                        setModalType('block');
                        setShowModal(true);
                    } else if (isBooked) {
                        const bookingDetail = bookingDetails.find(detail => detail.time === time);
                        // Booking detail retrieved for rescheduling
                        if (bookingDetail) {
                            // Booking info available
                        }
                        setSelectedSlot(time);
                        setModalType('reschedule');
                        setRescheduleDate(drawerDate);
                        const bookingUserId = bookingDetails.find(detail => detail.time === time)?.userId;
                        fetchRescheduleSlots(drawerDate, bookingUserId);
                        setShowModal(true);
                    } else if (isBlocked) {
                        setSelectedSlot(time);
                        setModalType('unblock');
                        setShowModal(true);
                    }
                }}>
                    <span className="font-semibold text-sm">{time}</span>
                    {label}
                </button>
            </div>
        );
    };

    const getDayIcon = (dayKey) => {
        switch (dayKey.toLowerCase()) {
            case 'sunday': return 'fa-bed';
            case 'monday': return 'fa-sun';
            case 'tuesday': return 'fa-cloud';
            case 'wednesday': return 'fa-umbrella';
            case 'thursday': return 'fa-cloud-sun';
            case 'friday': return 'fa-moon';
            case 'saturday': return 'fa-star';
            default: return 'fa-calendar';
        }
    };

    const getCardColor = (type) => {
        switch (type.toLowerCase()) {
            case 'workshop': return `border-l-[4px] border-[${WARNING_COLOR}]`;
            case 'consultation': return `border-l-[4px] border-[${PRIMARY_GREEN}]`;
            case 'group': return `border-l-[4px] border-[${ACCENT_GREEN}]`;
            case 'followup': return `border-l-[4px] border-[${CARD_FOLLOWUP_COLOR}]`;
            default: return 'border-l-[4px] border-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 to-teal-50">
            {loading && (
                <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="text-center bg-white rounded-2xl shadow-xl p-8 border border-emerald-200">
                        <i className="fas fa-spinner fa-spin text-4xl text-emerald-600 mb-4"></i>
                        <p className="text-emerald-800 font-medium">Loading your appointments...</p>
                    </div>
                </div>
            )}
            <div className="flex flex-1 w-full p-4">
                <aside className="sidebar sticky w-70 bg-white shadow-xl h-[calc(100vh-120px)] overflow-y-auto p-4 mt-0 border-r-2 border-emerald-200 rounded-tr-2xl rounded-br-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-linear-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <i className="fas fa-calendar-days text-white text-lg"></i>
                        </div>
                        <h3 className="text-lg font-bold text-teal-900">Next 7 Days</h3>
                    </div>
                    <div className="border-t-2 border-emerald-200 mb-4"></div>
                    {sortedDays.map(([key, dayInfo]) => (
                        <div key={`day-${key}`} className={`day p-3 my-2 cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-3 transform hover:scale-105 ${activeDayKey === key ? 'active shadow-lg' : 'hover:shadow-md'}`} onClick={() => setActiveDayKey(key)} style={{ color: activeDayKey === key ? 'white' : '#0F766E', backgroundColor: activeDayKey === key ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'white', borderLeft: activeDayKey === key ? `4px solid ${ACCENT_GREEN}` : '2px solid #E5E7EB', background: activeDayKey === key ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'white' }}>
                            <i className={`fas ${getDayIcon(dayInfo.name)} text-lg w-6 text-center shrink-0 ${activeDayKey === key ? 'text-white' : 'text-emerald-600'}`}></i>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm">{dayInfo.name}</div>
                                <div className="text-xs opacity-80">{dayInfo.shortDate}</div>
                            </div>
                            {blockedDays.includes(dayInfo.fullDateKey) && (
                                <span title="Day fully blocked" className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${activeDayKey === key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}><i className="fas fa-ban mr-0.5"></i>Blocked</span>
                            )}
                        </div>
                    ))}
                </aside>
                <main className="flex-1 p-6 bg-transparent">
                    {activeDayInfo && (
                        <div className="day-header flex justify-between items-center mb-6 pb-4 border-b-2 border-emerald-200 bg-white rounded-2xl p-6 shadow-lg">
                            <div>
                                <h2 className="text-4xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{activeDayInfo.name}</h2>
                                <p className="text-base text-gray-600 mt-0 flex items-center gap-2">
                                    <i className="fas fa-calendar-alt text-emerald-500"></i>{activeDayInfo.fullDate}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="inline-block bg-linear-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">{sortedAppointments.length} {sortedAppointments.length === 1 ? 'Appointment' : 'Appointments'}</div>
                            </div>
                        </div>
                    )}
                    <div className="appointments-container grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {sortedAppointments.length === 0 ? (
                            <div className="no-appointments lg:col-span-3 bg-white rounded-2xl shadow-xl p-8 mt-0 text-center border-2 border-dashed border-emerald-200">
                                <div className="w-20 h-20 bg-linear-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-calendar-check fa-2x text-emerald-600"></i>
                                </div>
                                <h4 className="text-xl font-bold text-teal-900 mb-2">No Appointments</h4>
                                <p className="text-gray-600 text-sm">Clear schedule for this day!</p>
                            </div>
                        ) : (
                            sortedAppointments.map((appointment, index) => (
                                <div key={`${appointment.bookingId || appointment._id || index}`} className={`appointment-card bg-white rounded-2xl shadow-lg p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-t-4 transform ${getCardColor(appointment.consultationType)}`}>
                                    <div className="appointment-time text-sm text-gray-600 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                            <i className="fas fa-clock text-emerald-600 text-xs"></i>
                                        </div>
                                        <span className="font-bold text-gray-800 text-base">{appointment.time || 'N/A'}</span>
                                        <span className={`px-3 py-1 ml-auto text-xs font-bold rounded-full uppercase tracking-tight whitespace-nowrap ${appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' : appointment.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{appointment.status || appointment.consultationType}</span>
                                    </div>
                                    <h3 className="appointment-title text-lg font-bold text-gray-800 mb-2 truncate">{appointment.clientName || 'Booked Client'}</h3>
                                    <p className="appointment-details text-sm text-gray-600 mb-2 flex items-center gap-2 min-w-0">
                                        <i className="fas fa-notes-medical text-emerald-600 opacity-70 text-sm shrink-0"></i>
                                        <span className="flex-1 min-w-0">{decodeHtmlEntities(appointment.specialization) || 'General Consultation'}</span>
                                    </p>
                                    <p className="appointment-details text-sm text-gray-600 mb-3 flex items-center gap-2">
                                        <i className="fas fa-video text-emerald-600 opacity-70 text-sm"></i>
                                        {appointment.consultationType}
                                    </p>
                                    <div className="client-info flex items-center gap-3 mt-0 pt-3 border-t-2 border-gray-100">
                                        {appointment.profileImage ? (
                                            <img src={appointment.profileImage} alt={appointment.clientName} className="w-10 h-10 rounded-xl object-cover shadow-md border-2 border-emerald-200" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md border-2 border-emerald-200" style={{ backgroundColor: DARK_GREEN }}>{appointment.clientName.charAt(0)}</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <span className="client-name text-sm font-bold text-gray-800 truncate block">Client</span>
                                            {appointment.clientEmail && (
                                                <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(appointment.clientEmail)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:text-emerald-700 underline truncate block transition-colors" title={`Email ${appointment.clientEmail} via Gmail`}>
                                                    <i className="fas fa-envelope mr-1"></i>Contact
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-0 pt-3 border-t-2 border-gray-100 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            {appointment.clientEmail ? (
                                                <a 
                                                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(appointment.clientEmail)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-emerald-600 hover:text-emerald-700 underline truncate transition-colors"
                                                    title={`Email ${appointment.clientEmail} via Gmail`}
                                                >
                                                    <i className="fas fa-envelope mr-1"></i>
                                                    Contact
                                                </a>
                                            ) : (
                                                <span className="text-sm text-gray-400">No email</span>
                                            )}
                                            <button
                                                className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                onClick={() => handleDownloadICS(appointment.bookingId)}
                                            >
                                                <i className="fas fa-calendar-plus mr-1"></i>Add to Calendar
                                            </button>
                                            {appointment.consultationType?.toLowerCase() === 'online' && (
                                                <button
                                                    className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                                                    onClick={() => handleGenerateMeetingLink(appointment.bookingId, appointment.consultationType)}
                                                    title={meetingLinks[appointment.bookingId] || appointment.meetingUrl || 'Create meeting link'}
                                                >
                                                    <i className="fas fa-video mr-1"></i>{meetingLinks[appointment.bookingId] || appointment.meetingUrl ? 'Open Link' : 'Get Link'}
                                                </button>
                                            )}
                                        </div>
                                        {appointment.amount && (
                                            <span className="text-sm text-gray-600 flex items-center gap-2 shrink-0">
                                                <i className="fas fa-rupee-sign text-emerald-600"></i>
                                                <span className="font-bold text-gray-800">₹{appointment.amount}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
                <div>
                    <button onClick={() => { if (!isDrawerOpen) openDrawerForDate(drawerDate || activeDayInfo?.fullDateKey); else setIsDrawerOpen(false); }} aria-label="Open slot manager" className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border border-emerald-200 rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-50 transition-all duration-300 hover:scale-110" title="Manage Slots">
                        <i className={`fas ${isDrawerOpen ? 'fa-chevron-right' : 'fa-chevron-left'} text-lg`}></i>
                    </button>
                    <aside className={`fixed top-16 right-0 w-[30vw] max-h-[calc(100vh-4rem)] bg-white shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <i className="fas fa-arrow-left text-gray-600"></i>
                                </button>
                                <h3 className="text-xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Slot Management</h3>
                                <div className="w-10"></div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">Select Date</label>
                                <input type="date" value={drawerDate} onChange={(e) => { setDrawerDate(e.target.value); fetchDietitianSlots(e.target.value); }} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                            <div className="mb-4 relative blocking-options-container">
                                <button
                                    onClick={() => setShowBlockingMenu(prev => !prev)}
                                    disabled={drawerLoading}
                                    className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold text-sm disabled:opacity-50 flex items-center justify-between gap-2 shadow-md"
                                >
                                    <span className="flex items-center gap-2"><i className="fas fa-calendar-times"></i>Blocking Options</span>
                                    <i className={`fas fa-chevron-${showBlockingMenu ? 'up' : 'down'} text-sm`}></i>
                                </button>
                                {showBlockingMenu && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-emerald-200 overflow-hidden z-20">
                                        <button
                                            onClick={() => { setShowBlockingMenu(false); setSelectedDatesToBlock([]); setLeaveReason(''); setShowMultiDateModal(true); }}
                                            disabled={drawerLoading}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3 border-b border-gray-100 disabled:opacity-50"
                                        >
                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><i className="fas fa-ban text-emerald-600"></i></div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-800 text-sm">Block Days</div>
                                                <div className="text-xs text-gray-500">Select one or multiple days to block</div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { setShowBlockingMenu(false); setSelectedDatesToBlock([]); setShowUnblockModal(true); }}
                                            disabled={drawerLoading}
                                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition flex items-center gap-3 disabled:opacity-50"
                                        >
                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><i className="fas fa-check-circle text-emerald-600"></i></div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-800 text-sm">Unblock Days</div>
                                                <div className="text-xs text-gray-500">Remove blocks from selected days</div>
                                            </div>
                                        </button>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-500 mt-2 italic flex items-center gap-1"><i className="fas fa-info-circle"></i>Admin will be emailed your reason when blocking days.</p>
                            </div>
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-semibold mb-2 text-gray-700">Legend:</p>
                                <div className="flex gap-4 text-xs">
                                    <span className="flex items-center"><span className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2"></span>Free</span>
                                    <span className="flex items-center"><span className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2"></span>Booked</span>
                                    <span className="flex items-center"><span className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded mr-2"></span>Busy</span>
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold mb-3 text-gray-700">Available Time Slots{drawerLoading && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}</label>
                                {availableSlots.morning.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-600 mb-2  font-semibold uppercase tracking-wide">Morning</p>
                                        <div className="grid grid-cols-3 gap-2 ">{availableSlots.morning.map(renderDrawerTimeSlot)}</div>
                                    </div>
                                )}
                                {availableSlots.afternoon.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Afternoon</p>
                                        <div className="grid grid-cols-3 gap-2 ">{availableSlots.afternoon.map(renderDrawerTimeSlot)}</div>
                                    </div>
                                )}
                                {availableSlots.evening.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Evening</p>
                                        <div className="grid grid-cols-3 gap-2 ">{availableSlots.evening.map(renderDrawerTimeSlot)}</div>
                                    </div>
                                )}
                                {availableSlots.morning.length === 0 && availableSlots.afternoon.length === 0 && availableSlots.evening.length === 0 && <p className="text-gray-600 text-sm">No slots available</p>}
                            </div>
                            <div className="flex justify-end pt-4 border-t border-gray-200">
                                <button onClick={() => setIsDrawerOpen(false)} className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold">Close</button>
                            </div>
                        </div>
                    </aside>
                </div>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <h4 className="text-lg font-bold mb-4 text-gray-800">Slot Action</h4>
                            <p className="text-sm text-gray-600 mb-2">Selected slot: <span className="font-semibold">{selectedSlot}</span></p>
                            {modalType === 'reschedule' && bookingDetails.find(detail => detail.time === selectedSlot) && (
                                <p className="text-sm text-gray-600 mb-4">Booked by: <span className="font-semibold text-emerald-600">{bookingDetails.find(detail => detail.time === selectedSlot).userName}</span></p>
                            )}
                            {modalType === 'reschedule' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Date</label>
                                    <input type="date" value={rescheduleDate} onChange={(e) => { setRescheduleDate(e.target.value); const bookingUserId = bookingDetails.find(detail => detail.time === selectedSlot)?.userId; fetchRescheduleSlots(e.target.value, bookingUserId); }} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-4" />
                                    {rescheduleDate && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
                                            {rescheduleSlots.morning.length > 0 && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-600 mb-1 font-semibold">Morning</p>
                                                    <div className="flex flex-wrap gap-1">{rescheduleSlots.morning.map(slot => <button key={slot} onClick={() => setNewTime(slot)} className={`px-2 py-1 text-xs rounded ${newTime === slot ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{slot}</button>)}</div>
                                                </div>
                                            )}
                                            {rescheduleSlots.afternoon.length > 0 && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-600 mb-1 font-semibold">Afternoon</p>
                                                    <div className="flex flex-wrap gap-1">{rescheduleSlots.afternoon.map(slot => <button key={slot} onClick={() => setNewTime(slot)} className={`px-2 py-1 text-xs rounded ${newTime === slot ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{slot}</button>)}</div>
                                                </div>
                                            )}
                                            {rescheduleSlots.evening.length > 0 && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-600 mb-1 font-semibold">Evening</p>
                                                    <div className="flex flex-wrap gap-1">{rescheduleSlots.evening.map(slot => <button key={slot} onClick={() => setNewTime(slot)} className={`px-2 py-1 text-xs rounded ${newTime === slot ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{slot}</button>)}</div>
                                                </div>
                                            )}
                                            {rescheduleSlots.morning.length === 0 && rescheduleSlots.afternoon.length === 0 && rescheduleSlots.evening.length === 0 && <p className="text-xs text-gray-500">No available slots on this date</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-3">
                                {modalType === 'block' && <button onClick={() => { handleBlockSlot(selectedSlot); setShowModal(false); }} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold">Block Slot</button>}
                                {modalType === 'reschedule' && <button onClick={() => { if (!rescheduleDate || !newTime) { alert('Please select a date and time.'); return; } handleRescheduleBooking(selectedSlot, rescheduleDate, newTime); setShowModal(false); setNewTime(''); setRescheduleDate(''); setRescheduleSlots({ morning: [], afternoon: [], evening: [] }); }} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold">Reschedule</button>}
                                {modalType === 'unblock' && <button onClick={() => { handleUnblockSlot(selectedSlot); setShowModal(false); }} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">Unblock Slot</button>}
                                <button onClick={() => { setShowModal(false); setNewTime(''); setRescheduleDate(''); setRescheduleSlots({ morning: [], afternoon: [], evening: [] }); }} className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {showMultiDateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => !isBlockingMultipleDays && setShowMultiDateModal(false)}>
                        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                                <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2"><i className="fas fa-calendar-alt text-emerald-600"></i>Select Days to Block</h4>
                                <button onClick={() => setShowMultiDateModal(false)} disabled={isBlockingMultipleDays} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"><i className="fas fa-times text-gray-600"></i></button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">Click on dates to select or deselect them. You can select multiple days at once.</p>
                            <div className="mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                                <p className="text-sm font-semibold text-teal-800 mb-3 flex items-center gap-2"><i className="fas fa-calendar-alt"></i>Select Date Range</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">From Date</label>
                                        <input type="date" value={dateRangeFrom} onChange={(e) => setDateRangeFrom(e.target.value)} min={new Date().toISOString().split('T')[0]} max={(() => { const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30); return maxDate.toISOString().split('T')[0]; })()} disabled={isBlockingMultipleDays} className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm disabled:opacity-50" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-600 mb-1">To Date</label>
                                        <input type="date" value={dateRangeTo} onChange={(e) => setDateRangeTo(e.target.value)} min={dateRangeFrom || new Date().toISOString().split('T')[0]} max={(() => { const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30); return maxDate.toISOString().split('T')[0]; })()} disabled={isBlockingMultipleDays} className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm disabled:opacity-50" />
                                    </div>
                                    <div className="flex items-end">
                                        <button onClick={handleDateRangeSelect} disabled={!dateRangeFrom || !dateRangeTo || isBlockingMultipleDays} className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"><i className="fas fa-check mr-2"></i>Apply Range</button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-teal-600 mt-2 italic"><i className="fas fa-lightbulb mr-1"></i>Select a date range to quickly block multiple consecutive days</p>
                            </div>
                            {selectedDatesToBlock.length > 0 && (
                                <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <p className="text-sm font-semibold text-emerald-800 mb-2">Selected: {selectedDatesToBlock.length} day(s)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDatesToBlock.map(date => (
                                            <span key={date} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium flex items-center gap-1">
                                                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                <button onClick={() => toggleDateSelection(date)} className="ml-1 hover:text-emerald-900"><i className="fas fa-times text-[10px]"></i></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">{day}</div>)}
                                {getCalendarDates().map(({ dateString, displayDate, dayOfWeek }, index) => {
                                    const emptyCell = index === 0 && dayOfWeek > 0;
                                    const isSelected = selectedDatesToBlock.includes(dateString);
                                    const alreadyBlocked = blockedDays.includes(dateString);
                                    const hasBookings = bookingsByDay[dateString] && bookingsByDay[dateString].length > 0;
                                    const bookingCount = bookingsByDay[dateString]?.length || 0;
                                    const isDisabled = isBlockingMultipleDays || alreadyBlocked;
                                    return (
                                        <React.Fragment key={dateString}>
                                            {emptyCell && Array(dayOfWeek).fill(null).map((_, i) => <div key={`empty-${i}`} className="p-2"></div>)}
                                            <button onClick={() => !alreadyBlocked && toggleDateSelection(dateString)} disabled={isDisabled} className={`p-2 rounded-lg text-sm font-medium transition-all relative flex flex-col items-center justify-center ${alreadyBlocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60 border-2 border-gray-400' : hasBookings ? 'bg-white text-orange-600 border-2 border-orange-500 cursor-not-allowed opacity-60' : isSelected ? 'bg-emerald-500 text-white shadow-md transform hover:scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105 cursor-pointer'}`} title={alreadyBlocked ? 'Already blocked' : hasBookings ? `${bookingCount} booking(s) - ${displayDate}` : displayDate}>
                                                <div className="text-xs font-semibold">{new Date(dateString).getDate()}</div>
                                                {hasBookings && !alreadyBlocked && <div className="text-[7px] font-bold text-orange-600">
                                                    <i className="fas fa-users text-[6px]"></i>
                                                    {bookingCount}
                                                </div>}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs font-semibold text-blue-800 mb-2">Calendar Legend:</p>
                                <div className="flex justify-evenly text-xs">
                                    <span className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 border border-gray-300 rounded"></span>Available</span>
                                    <span className="flex items-center gap-2"><span className="w-5 h-5 bg-white border-2 border-orange-500 rounded text-orange-600 flex items-center justify-center text-[8px]"><i className="fas fa-users"></i></span>Has Bookings</span>
                                    <span className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 border-2 border-gray-400 rounded opacity-60"></span>Already Blocked</span>
                                </div>
                                <p className="text-[10px] text-blue-600 mt-2 italic"><i className="fas fa-info-circle mr-1"></i>Dates with bookings show the number of clients. You can still block them, but clients will be notified.</p>
                            </div>
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Quick Select:</p>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => { const weekdays = getCalendarDates().filter(d => d.dayOfWeek !== 0 && d.dayOfWeek !== 6).map(d => d.dateString).slice(0, 10); setSelectedDatesToBlock(weekdays); }} disabled={isBlockingMultipleDays} className="px-3 py-1 bg-teal-500 text-white rounded text-xs hover:bg-teal-600 transition disabled:opacity-50">Next 10 Weekdays</button>
                                    <button onClick={() => { const dates = getCalendarDates().slice(0, 7).map(d => d.dateString); setSelectedDatesToBlock(dates); }} disabled={isBlockingMultipleDays} className="px-3 py-1 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600 transition disabled:opacity-50">Next 7 Days</button>
                                    <button onClick={() => setSelectedDatesToBlock([])} disabled={isBlockingMultipleDays} className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition disabled:opacity-50">Clear All</button>
                                </div>
                            </div>

                            {/* Leave Reason - required */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Reason for Leave <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={leaveReason}
                                    onChange={(e) => setLeaveReason(e.target.value)}
                                    disabled={isBlockingMultipleDays}
                                    rows={3}
                                    placeholder="e.g. Personal health issue, family emergency, attending a conference..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none disabled:opacity-50"
                                />
                                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><i className="fas fa-envelope text-red-400"></i>This reason will be emailed to the admin for records.</p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleBlockMultipleDates}
                                    disabled={selectedDatesToBlock.length === 0 || !leaveReason.trim() || isBlockingMultipleDays}
                                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                                >
                                    {isBlockingMultipleDays ? (<><i className="fas fa-spinner fa-spin"></i>Blocking...</>) : (<><i className="fas fa-ban"></i>Block {selectedDatesToBlock.length > 0 ? `${selectedDatesToBlock.length} Day(s)` : 'Days'}</>)}
                                </button>
                                <button onClick={() => { setShowMultiDateModal(false); setSelectedDatesToBlock([]); setLeaveReason(''); }} disabled={isBlockingMultipleDays} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Unblock Days Modal */}
                {showUnblockModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => !isBlockingMultipleDays && setShowUnblockModal(false)}>
                        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                                <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2"><i className="fas fa-calendar-check text-emerald-600"></i>Select Days to Unblock</h4>
                                <button onClick={() => setShowUnblockModal(false)} disabled={isBlockingMultipleDays} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"><i className="fas fa-times text-gray-600"></i></button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">Click on dates to select or deselect them for unblocking.</p>
                            {selectedDatesToBlock.length > 0 && (
                                <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <p className="text-sm font-semibold text-emerald-800 mb-2">Selected: {selectedDatesToBlock.length} day(s)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDatesToBlock.map(date => (
                                            <span key={date} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium flex items-center gap-1">
                                                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                <button onClick={() => toggleDateSelection(date)} className="ml-1 hover:text-emerald-900"><i className="fas fa-times text-[10px]"></i></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">{day}</div>)}
                                {getCalendarDates().map(({ dateString, displayDate, dayOfWeek }, index) => {
                                    const emptyCell = index === 0 && dayOfWeek > 0;
                                    const isSelected = selectedDatesToBlock.includes(dateString);
                                    const isFullyBlocked = blockedDays.includes(dateString);
                                    const isDisabled = isBlockingMultipleDays || !isFullyBlocked;
                                    return (
                                        <React.Fragment key={dateString}>
                                            {emptyCell && Array(dayOfWeek).fill(null).map((_, i) => <div key={`empty-${i}`} className="p-2"></div>)}
                                            <button
                                                onClick={() => isFullyBlocked && toggleDateSelection(dateString)}
                                                disabled={isDisabled}
                                                title={isFullyBlocked ? displayDate : 'Not blocked'}
                                                className={`p-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center ${isSelected ? 'bg-emerald-500 text-white shadow-md transform hover:scale-105' : isFullyBlocked ? 'bg-white text-gray-700 border-2 border-gray-400 hover:scale-105 cursor-pointer' : 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60 border border-gray-300'}`}
                                            >
                                                <div className="text-xs font-semibold">{new Date(dateString).getDate()}</div>
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs font-semibold text-blue-800 mb-2">Calendar Legend:</p>
                                <div className="flex justify-evenly text-xs">
                                    <span className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 border border-gray-300 rounded opacity-60"></span>Not Blocked</span>
                                    <span className="flex items-center gap-2"><span className="w-5 h-5 bg-white border-2 border-gray-400 rounded"></span>Blocked</span>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button onClick={handleUnblockMultipleDates} disabled={selectedDatesToBlock.length === 0 || isBlockingMultipleDays} className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
                                    {isBlockingMultipleDays ? (<><i className="fas fa-spinner fa-spin"></i>Unblocking...</>) : (<><i className="fas fa-check-circle"></i>Unblock {selectedDatesToBlock.length > 0 ? `${selectedDatesToBlock.length} Day(s)` : 'Days'}</>)}
                                </button>
                                <button onClick={() => { setShowUnblockModal(false); setSelectedDatesToBlock([]); }} disabled={isBlockingMultipleDays} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DietitianSchedule;
