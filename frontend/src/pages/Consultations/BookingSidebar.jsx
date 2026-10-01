import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuthContext } from "../../hooks/useAuthContext";
import SubscriptionAlert from '../../middleware/SubscriptionAlert';
import { io } from "socket.io-client";
import {
  fetchBookedSlots,
  fetchUserBookedSlots,
  checkBookingLimits,
  holdSlot,
  releaseSlot,
  selectBookedSlots,
  selectUserBookedSlots,
  selectCurrentUserBookedTimesWithDietitian,
  selectSubscriptionAlertData,
  selectShowSubscriptionAlert,
  selectIsLoadingSlots,
  clearSubscriptionAlert,
  clearBookedSlots
} from "../../redux/slices/bookingSlice";
import {
  getCategorizedSlots,
  BookingLegend,
  TimeSlotSections
} from "./BookingTimeSlots";
import { getDietitianHolds } from "../../services/booking/bookingService";

const hold = 30; // Hold duration in seconds — change once here to update entire page

const BookingSidebar = ({
  isOpen,
  onClose,
  onProceedToPayment,
  dietitianId,
  dietitian,
}) => {
  const dispatch = useDispatch();
  const { user } = useAuthContext();

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedTime, setSelectedTime] = useState("");
  const [consultationType, setConsultationType] = useState("Online");
  const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [], evening: [] });

  const getFeeForType = useCallback((type) => {
    const t = (type || consultationType || "Online").toLowerCase();
    const matched = dietitian?.consultationTypes?.find(
      (c) => c.type?.toLowerCase() === t
    );
    if (matched && matched.fee) return matched.fee;
    if (t === "online" && dietitian?.onlineFee) return dietitian.onlineFee;
    if (t === "in-person" && dietitian?.inPersonFee) return dietitian.inPersonFee;

    const baseFee = dietitian?.fees || dietitian?.consultationFee || 500;
    if (t === "in-person") return Math.round(baseFee * 1.4);
    return baseFee;
  }, [consultationType, dietitian]);

  const currentFee = getFeeForType(consultationType);

  const bookedSlots = useSelector(selectBookedSlots);
  const userBookedSlots = useSelector(selectUserBookedSlots);
  const currentUserBookedTimesWithDietitian = useSelector(selectCurrentUserBookedTimesWithDietitian);
  const subscriptionAlertData = useSelector(selectSubscriptionAlertData);
  const showSubscriptionAlert = useSelector(selectShowSubscriptionAlert);
  const isLoading = useSelector(selectIsLoadingSlots);

  const [message, setMessage] = useState("");
  const [realTimeHeldSlots, setRealTimeHeldSlots] = useState([]);
  const [holdTimeLeft, setHoldTimeLeft] = useState(hold);

  const formatHoldTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isOpen || !dietitianId) return;
    const socketURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(socketURL);

    socket.emit("viewing_dietitian", dietitianId);

    socket.on("slot_lock_change", (data) => {
      if (data.date === selectedDate) {
        setRealTimeHeldSlots((prev) => {
          if (data.action === "hold") {
            if (!prev.includes(data.time)) return [...prev, data.time];
            return prev;
          } else if (data.action === "release") {
            return prev.filter((t) => t !== data.time);
          }
          return prev;
        });
      }
    });

    return () => {
      socket.emit("leave_dietitian", dietitianId);
      socket.disconnect();
    };
  }, [isOpen, dietitianId, selectedDate]);

  const fetchInitialHolds = useCallback(async () => {
    if (!dietitianId || !selectedDate) return;
    try {
      const res = await getDietitianHolds(dietitianId, selectedDate);
      if (!res.isError && res.data) {
        const held = res.data.heldSlots || (Array.isArray(res.data) ? res.data : []);
        setRealTimeHeldSlots(held);
      }
    } catch (err) {
      console.error("Error fetching initial holds:", err);
    }
  }, [dietitianId, selectedDate]);

  useEffect(() => {
    setSelectedTime("");
    setMessage("");
    setHoldTimeLeft(hold);

    if (!isOpen || !dietitianId || !selectedDate) return;
    const userId = user?.id || '';

    const categorizedSlots = getCategorizedSlots(selectedDate);
    setAvailableSlots(categorizedSlots);

    dispatch(clearBookedSlots());
    dispatch(fetchBookedSlots({ dietitianId, date: selectedDate, userId }));
    if (userId) {
      dispatch(fetchUserBookedSlots({ userId, date: selectedDate }));
    }

    fetchInitialHolds();
    const pollInterval = setInterval(fetchInitialHolds, 3000);
    return () => clearInterval(pollInterval);
  }, [isOpen, dietitianId, selectedDate, user?.id, dispatch, fetchInitialHolds]);

  const getUserConflictAt = useCallback((time) => {
    return userBookedSlots.find(
      (slot) => slot.time === time && slot.dietitianId !== dietitianId
    );
  }, [userBookedSlots, dietitianId]);

  const isSlotUnavailable = useCallback((time) => {
    return (
      currentUserBookedTimesWithDietitian.includes(time) ||
      bookedSlots.includes(time) ||
      getUserConflictAt(time) ||
      (realTimeHeldSlots.includes(time) && time !== selectedTime)
    );
  }, [currentUserBookedTimesWithDietitian, bookedSlots, getUserConflictAt, realTimeHeldSlots, selectedTime]);

  useEffect(() => {
    if (selectedTime && isSlotUnavailable(selectedTime)) {
      setSelectedTime("");
    }
  }, [bookedSlots, currentUserBookedTimesWithDietitian, userBookedSlots, availableSlots, isSlotUnavailable, selectedTime]);

  const handleTimeClick = async (time) => {
    if (isSlotUnavailable(time)) return;
    if (time === selectedTime) return; // Already selected; double-click releases it

    const previousTime = selectedTime;

    // Instant optimistic update (0ms UI latency)
    setSelectedTime(time);
    setHoldTimeLeft(hold);
    setMessage("");

    try {
      if (previousTime) {
        dispatch(releaseSlot({ dietitianId, date: selectedDate, time: previousTime }));
      }

      const resultAction = await dispatch(holdSlot({ dietitianId, date: selectedDate, time }));

      if (!holdSlot.fulfilled.match(resultAction)) {
        const payload = resultAction.payload;
        const payloadMsg = typeof payload === "string" ? payload : (payload?.message || "");

        // Revert selection if slot is held by someone else or hold failed
        setSelectedTime("");
        setMessage(payloadMsg || "This slot is currently being held by another user.");

        // Refresh holds immediately so the slot displays as Held
        fetchInitialHolds();
      }
    } catch (error) {
      console.error("Error holding slot:", error);
      setSelectedTime("");
      setMessage("Error holding slot. Please try again.");
      fetchInitialHolds();
    }
  };

  useEffect(() => {
    if (!selectedTime) {
      setHoldTimeLeft(hold);
      return;
    }

    const timer = setInterval(() => {
      setHoldTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (dietitianId && selectedDate && selectedTime) {
            dispatch(releaseSlot({ dietitianId, date: selectedDate, time: selectedTime }));
          }
          setSelectedTime("");
          setMessage("Hold expired. The slot has been released. Please select a slot again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedTime, dietitianId, selectedDate, dispatch]);

  // Auto-clear banner messages after 3 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    return () => {
      if (selectedTime && dietitianId && selectedDate) {
        dispatch(releaseSlot({ dietitianId, date: selectedDate, time: selectedTime }));
      }
    };
  }, [dispatch, dietitianId, selectedDate, selectedTime]);

  const handleReleaseHeldSlot = (timeToRelease = selectedTime) => {
    if (!timeToRelease) return;
    // Instant optimistic release
    setSelectedTime("");
    setHoldTimeLeft(hold);
    setMessage("Slot released.");

    if (dietitianId && selectedDate) {
      dispatch(releaseSlot({ dietitianId, date: selectedDate, time: timeToRelease }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      setMessage("Please select a date and time slot.");
      return;
    }

    const conflict = getUserConflictAt(selectedTime);
    if (conflict) {
      setMessage(
        `You already have an appointment with ${conflict.dietitianName} at ${selectedTime}. Please select a different time.`
      );
      return;
    }

    try {
      const result = await dispatch(checkBookingLimits({
        userId: user?.id,
        date: selectedDate,
        time: selectedTime,
        dietitianId
      })).unwrap();

      if (!result.success && result.limitReached) return;
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      if (error?.limitReached || error?.requiresSubscription) return;
    }

    const dataToSend = {
      date: selectedDate,
      time: selectedTime,
      type: consultationType,
      consultationType,
      amount: currentFee,
      userId: user?.id || "",
      userName: user?.name || "",
      userEmail: user?.email || "",
      userPhone: user?.phone || "",
      userAddress: user?.address || "",
      dietitianId: dietitianId || dietitian?._id || "",
      dietitianName: dietitian?.name || "",
      dietitianEmail: dietitian?.email || "",
      dietitianPhone: dietitian?.phone || "",
      dietitianSpecialization: dietitian?.specialties?.[0] || dietitian?.specialization || "",
    };
    onProceedToPayment(dataToSend);
  };

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const maxDateStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div
      className={`fixed top-16 right-0 w-[33%] max-h-[calc(100vh-4rem)] bg-white shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <button
            onClick={onClose}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xl font-light rounded-full w-8 h-8 flex items-center justify-center transition-colors mr-3 cursor-pointer"
            aria-label="Collapse sidebar"
          >
            ›
          </button>
          <h2 className="text-2xl font-bold text-dark-accent flex-1 text-center">Book Appointment</h2>
          <button
            onClick={onClose}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-2xl font-light rounded-full w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-gray-700">Consultation Type</label>
              <span className="text-sm font-bold text-emerald-700">Fee: ₹{currentFee}</span>
            </div>
            <div className="flex gap-3">
              {["Online", "In-person"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setConsultationType(type)}
                  className={`flex-1 px-4 py-2 rounded-lg transition font-medium cursor-pointer ${
                    consultationType === type ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {type} (₹{getFeeForType(type)})
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-gray-700">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={todayStr}
              max={maxDateStr}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <BookingLegend />

          <TimeSlotSections
            availableSlots={availableSlots}
            currentUserBookedTimesWithDietitian={currentUserBookedTimesWithDietitian}
            bookedSlots={bookedSlots}
            getUserConflictAt={getUserConflictAt}
            realTimeHeldSlots={realTimeHeldSlots}
            selectedTime={selectedTime}
            onSelectTime={handleTimeClick}
            onReleaseTime={handleReleaseHeldSlot}
            isLoading={isLoading}
          />

          {message && (
            <div
              className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center justify-between border transition-all ${
                message.toLowerCase().includes("released")
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-red-50 border-red-300 text-red-700"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.toLowerCase().includes("released") ? (
                  <span className="text-emerald-600 text-base">✓</span>
                ) : (
                  <span className="text-red-600 text-base">⚠</span>
                )}
                <span>{message}</span>
              </div>
              <button
                type="button"
                onClick={() => setMessage("")}
                className="text-xs opacity-60 hover:opacity-100 ml-2 cursor-pointer font-bold"
                aria-label="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          {selectedTime && (
            <div className="mb-4 p-3.5 bg-blue-50 border-2 border-blue-400 text-blue-900 rounded-xl flex items-center justify-between text-sm shadow-xs">
              <div>
                <div className="font-semibold text-blue-900 flex items-center gap-2">
                  <span>Selected: {selectedTime}</span>
                </div>
                <p className="text-xs text-blue-600 mt-0.5">
                  Double-click slot to release
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-blue-600 font-medium block">Expires in</span>
                <span className="font-mono text-sm font-bold text-blue-700">
                  {formatHoldTime(holdTimeLeft)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={!selectedTime}
          >
            Proceed to Payment
          </button>
        </div>
      </div>

      {showSubscriptionAlert && subscriptionAlertData && (
        <SubscriptionAlert
          message={subscriptionAlertData.message}
          planType={subscriptionAlertData.planType}
          limitType={subscriptionAlertData.limitType}
          currentCount={subscriptionAlertData.currentCount}
          limit={subscriptionAlertData.limit}
          onClose={() => dispatch(clearSubscriptionAlert())}
        />
      )}
    </div>
  );
};

export default BookingSidebar;
