import React, { useState, useRef, useEffect } from "react";
import TextareaAutoSize from "react-textarea-autosize";
import {
  Send,
  Stethoscope,
  Copy,
  Check,
  Menu,
  X,
  RotateCcw,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  DietitianCard,
  NutritionCard,
  PatientProfileCard,
  MealPlanCard,
  SlotBookingCard,
  BookingConfirmationCard,
  UserScheduleCard,
  BotFormattedText,
  STARTER_PROMPTS,
  DEFAULT_WELCOME_MESSAGE,
} from "./features";
import { AgentSidebar } from "./AgentSidebar";
import { io } from "socket.io-client";
import {
  getAgentResponse,
  getAgentSessions,
  getAgentSessionHistory,
  saveAgentMessage,
  deleteAgentSession,
  clearAgentSessions,
} from "../services/misc/miscService";
import SubscriptionAlert from "../middleware/SubscriptionAlert";
import PaymentModal from "../pages/Consultations/PaymentModal";
import { useAuthContext } from "../hooks/useAuthContext";

function formatSessionDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const to24 = (t) => {
  const m = String(t || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return (t || "").slice(0, 5);
  let h = +m[1];
  if (/PM/i.test(m[3]) && h < 12) h += 12;
  if (/AM/i.test(m[3]) && h === 12) h = 0;
  return `${h < 10 ? "0" : ""}${h}:${m[2]}`;
};

const toDate = (d) => {
  if (!d) return "";
  const m = String(d).match(/^(\d{4}-\d{2}-\d{2})/);
  return m
    ? m[1]
    : isNaN(new Date(d).getTime())
      ? ""
      : new Date(d).toLocaleDateString("en-CA");
};

function applyBookingToCards(cards, b, currentUserId) {
  if (!cards?.length || !b) return cards;
  const bt = to24(b.time),
    bd = toDate(b.date);
  if (!bt || !bd) return cards;
  const bDoc = (b.dietitianName || "")
    .replace(/^Dr\.?\s*/i, "")
    .trim()
    .toLowerCase();
  const bId = String(b.dietitianId || "");
  const isCurrentUser = Boolean(
    currentUserId && b.userId && String(b.userId) === String(currentUserId)
  );

  return cards.map((c) => {
    if (c.type !== "slot_booking_card" || !c.data?.dailySchedules) return c;
    const cDoc = (c.data.dietitian?.name || "")
      .replace(/^Dr\.?\s*/i, "")
      .trim()
      .toLowerCase();
    const cId = String(c.data.dietitian?.id || c.data.dietitian?._id || "");
    const isSame =
      (bId && cId && bId === cId) ||
      (bDoc &&
        cDoc &&
        (bDoc === cDoc || cDoc.includes(bDoc) || bDoc.includes(cDoc)));

    const dailySchedules = c.data.dailySchedules.map((day) => {
      if (toDate(day.date) !== bd) return day;
      const booked = (day.bookedSlots || []).map(to24);
      const userBooked = (day.userBookedSlots || []).map(to24);
      const otherBooked = (day.bookedByOthers || []).map(to24);
      const conf = (day.userConflictSlots || []).map((x) =>
        typeof x === "string"
          ? { time: to24(x), dietitianName: "Another Specialist" }
          : { ...x, time: to24(x.time) },
      );

      if (isSame) {
        if (!booked.includes(bt)) booked.push(bt);
        if (isCurrentUser) {
          if (!userBooked.includes(bt)) userBooked.push(bt);
        } else {
          if (!otherBooked.includes(bt)) otherBooked.push(bt);
        }
      }
      if (!isSame && isCurrentUser && !conf.some((x) => x.time === bt)) {
        conf.push({
          time: bt,
          dietitianName: b.dietitianName || "Another Specialist",
        });
      }
      const free = (day.freeSlots || []).filter(
        (s) =>
          !booked.includes(to24(s)) && !conf.some((x) => x.time === to24(s)),
      );
      return {
        ...day,
        bookedSlots: booked,
        userBookedSlots: userBooked,
        bookedByOthers: otherBooked,
        userConflictSlots: conf,
        freeSlots: free,
        freeSlotsCount: free.length,
      };
    });

    const activeD = toDate(
      c.data.selectedDate || c.data.dailySchedules[0]?.date,
    );
    const avail =
      activeD === bd
        ? (c.data.availableSlots || []).filter((s) => to24(s) !== bt)
        : c.data.availableSlots;
    return { ...c, data: { ...c.data, dailySchedules, availableSlots: avail } };
  });
}

export function NutriAgentPage() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([DEFAULT_WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState(
    "Formulating clinical response...",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("services");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [subscriptionAlert, setSubscriptionAlert] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPaymentDetails, setPendingPaymentDetails] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const messagesContainerRef = useRef(null);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await getAgentSessions();
      if (!res.isError && Array.isArray(res.data?.sessions)) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.error("Failed to load consultation sessions", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSessionHistory = async (sessId) => {
    if (!sessId) return;
    try {
      const res = await getAgentSessionHistory(sessId);
      if (!res.isError && res.data?.session?.messages?.length > 0) {
        let loadedMsgs = res.data.session.messages.map((m) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }));

        const confirmedBookings = loadedMsgs
          .flatMap((m) => m.cards || [])
          .filter((c) => c.type === "booking_confirmation_card" && c.data)
          .map((c) => c.data);

        const currentUserId = user?.id || user?._id || user?.roleId || null;
        confirmedBookings.forEach((bData) => {
          loadedMsgs = loadedMsgs.map((m) => {
            if (!m.cards?.length) return m;
            return {
              ...m,
              cards: applyBookingToCards(m.cards, bData, currentUserId),
            };
          });
        });

        setMessages(loadedMsgs);
        setSessionId(sessId);
        localStorage.setItem("nutriagent_session_id", sessId);
      } else {
        localStorage.removeItem("nutriagent_session_id");
        setSessionId(null);
        setMessages([DEFAULT_WELCOME_MESSAGE]);
      }
    } catch (err) {
      console.error("Failed to load session history", err);
    }
  };

  useEffect(() => {
    loadSessions();
    const savedSessionId = localStorage.getItem("nutriagent_session_id");
    if (savedSessionId) {
      loadSessionHistory(savedSessionId);
    }
  }, [user]);

  // Lock body and html scroll so only the chat stream and sidebar scroll internally
  useEffect(() => {
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, []);

  const currentAuthUserId = user?.id || user?._id || user?.roleId || "";

  // Real-time WebSocket listener for live slot availability updates
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      withCredentials: true,
    });

    if (currentAuthUserId) {
      socket.emit("register_dietitian", currentAuthUserId);
    }

    let lastBookingKey = "";
    let lastBookingTime = 0;

    const handleLiveBookingUpdate = (booking) => {
      if (!booking) return;
      const bookingKey = String(
        booking._id || booking.id || `${booking.date}_${booking.time}_${booking.dietitianId}`
      );
      const now = Date.now();
      if (lastBookingKey === bookingKey && now - lastBookingTime < 1500) {
        return;
      }
      lastBookingKey = bookingKey;
      lastBookingTime = now;

      window.dispatchEvent(
        new CustomEvent("nutri_booking_update", { detail: booking })
      );
      setMessages((prevMsgs) =>
        prevMsgs.map((msg) => {
          if (!msg.cards?.length) return msg;
          return {
            ...msg,
            cards: applyBookingToCards(msg.cards, booking, currentAuthUserId),
          };
        }),
      );
    };

    socket.on("new_booking", handleLiveBookingUpdate);
    socket.on("booking_updated", handleLiveBookingUpdate);

    return () => {
      socket.off("new_booking", handleLiveBookingUpdate);
      socket.off("booking_updated", handleLiveBookingUpdate);
      socket.disconnect();
    };
  }, [currentAuthUserId]);

  const handleStartEdit = (index, content) => {
    setEditingIndex(index);
    setEditingText(content);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  const handleSaveAndResend = (index) => {
    const updatedQuery = editingText.trim();
    if (!updatedQuery) return;
    setEditingIndex(null);
    setEditingText("");
    const historyBeforeThis = messages.slice(0, index);
    handleSendMessage(updatedQuery, historyBeforeThis);
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNewConsultation = () => {
    setSessionId(null);
    localStorage.removeItem("nutriagent_session_id");
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setSidebarOpen(false);
  };

  const handleClearChat = () => {
    handleNewConsultation();
  };

  const handleSelectSession = async (sessId) => {
    if (sessId === sessionId) {
      setSidebarOpen(false);
      return;
    }
    await loadSessionHistory(sessId);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (e, sessId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this consultation session?")) return;
    try {
      await deleteAgentSession(sessId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessId));
      if (sessionId === sessId) {
        handleNewConsultation();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleClearAllSessions = async () => {
    if (
      !window.confirm("Clear all consultation history? This cannot be undone.")
    )
      return;
    try {
      await clearAgentSessions();
      setSessions([]);
      handleNewConsultation();
    } catch (err) {
      console.error("Failed to clear sessions", err);
    }
  };

  const handleSlotSelectForPayment = ({ dietitian, doctor, date, slot }) => {
    const target = dietitian || doctor;
    const currentUserId = user?.id || user?._id || user?.roleId;
    if (!currentUserId) {
      alert("Please sign in to proceed with booking payment.");
      return;
    }
    const amount = Number(target?.fee || target?.onlineFee || 0);
    setPendingPaymentDetails({
      dietitianId: target?.id || target?._id,
      dietitianName: target?.name || "Dietitian",
      dietitianEmail: target?.email || "",
      dietitianSpecialization: Array.isArray(target?.specialties)
        ? target.specialties[0]
        : target?.specialties || "",
      date,
      time: slot,
      amount,
      type: "Online",
      consultationType: "Online",
      userId: currentUserId,
      userName: user?.name || "Patient",
      userEmail: user?.email || "",
      userPhone: user?.phone || "",
      userAddress: user?.address || "",
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentCompleted = async (paymentResult) => {
    setIsPaymentModalOpen(false);
    const details = pendingPaymentDetails;
    setPendingPaymentDetails(null);

    const bookingConfirmationMsg = {
      type: "bot",
      content: `Your consultation booking with **${details?.dietitianName}** has been confirmed! An email confirmation has been sent to **${paymentResult?.email || details?.userEmail}**.`,
      cards: [
        {
          type: "booking_confirmation_card",
          data: {
            dietitianName: details?.dietitianName,
            date: details?.date,
            time: details?.time,
            fee: details?.amount,
            consultationType: details?.consultationType || "Online",
            bookingId:
              paymentResult?.bookingId ||
              paymentResult?.transactionId ||
              `BK-${Date.now().toString().slice(-6)}`,
            status: "confirmed",
          },
        },
      ],
      toolsExecuted: ["book_dietitian_appointment"],
      timestamp: new Date(),
    };

    const currentUserId = user?.id || user?._id || user?.roleId || null;

    // Update all slot cards in chat state live & add confirmation
    setMessages((prev) => {
      const updatedPrev = prev.map((msg) => {
        if (!msg.cards?.length) return msg;
        return {
          ...msg,
          cards: applyBookingToCards(msg.cards, details, currentUserId),
        };
      });
      return [...updatedPrev, bookingConfirmationMsg];
    });

    // Persist confirmation to backend session so it remains when navigating/switching
    try {
      const activeSess =
        sessionId || localStorage.getItem("nutriagent_session_id");
      const currentUserId = user?.id || user?._id || user?.roleId || null;
      if (activeSess) {
        await saveAgentMessage(
          activeSess,
          bookingConfirmationMsg,
          currentUserId,
        );
      }
    } catch (saveErr) {
      console.warn("Session save warning:", saveErr);
    }
  };

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
    setPendingPaymentDetails(null);
  };

  const handleSendMessage = async (customPrompt, overrideHistory = null) => {
    const query = (customPrompt || inputValue).trim();
    if (!query) return;

    const baseHistory = overrideHistory !== null ? overrideHistory : messages;
    const userMsg = {
      type: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages([...baseHistory, userMsg]);
    setInputValue("");
    setIsTyping(true);
    setTypingStatus("Formulating clinical response...");

    try {
      const currentUserId = user?.id || user?._id || user?.roleId || null;
      const res = await getAgentResponse(
        query,
        baseHistory,
        currentUserId,
        null,
        sessionId,
      );
      if (!res.isError && res.data?.reply) {
        if (res.data.sessionId) {
          setSessionId(res.data.sessionId);
          localStorage.setItem("nutriagent_session_id", res.data.sessionId);
          loadSessions();
        }
        const botCards = res.data.cards || [];
        setMessages([
          ...baseHistory,
          userMsg,
          {
            type: "bot",
            content: res.data.reply,
            cards: botCards,
            toolsExecuted: res.data.toolsExecuted || [],
            timestamp: new Date(),
          },
        ]);

        // If direct booking was requested, directly open payment modal without intermediate cards
        if (res.data.openPaymentDetails) {
          const pDetails = res.data.openPaymentDetails;
          handleSlotSelectForPayment({
            dietitian: {
              id: pDetails.dietitianId,
              name: pDetails.dietitianName,
              email: pDetails.dietitianEmail,
              specialties: pDetails.dietitianSpecialization,
              fee: pDetails.amount || pDetails.fee,
            },
            date: pDetails.date,
            slot: pDetails.time,
          });
        }
      } else {
        if (res.limitReached || res.data?.limitReached) {
          setSubscriptionAlert({
            message: res.message || res.data?.message,
            planType: res.planType || res.data?.planType || "free",
            limitType: "chatbot",
            currentCount: res.currentCount || res.data?.currentCount,
            limit: res.limit || res.data?.limit,
          });
        }
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content:
              res.message ||
              "NutriConnect assistant is temporarily unavailable. Please retry in a moment.",
            isError: true,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content:
            "An unexpected error occurred while communicating with the health assistant.",
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full h-full max-h-full flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-2xs"
        />
      )}

      {/* LEFT SIDEBAR: Capabilities & Past Consultations */}
      <AgentSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        sessions={sessions}
        sessionId={sessionId}
        loadingSessions={loadingSessions}
        handleNewConsultation={handleNewConsultation}
        handleSelectSession={handleSelectSession}
        handleDeleteSession={handleDeleteSession}
        handleClearAllSessions={handleClearAllSessions}
        handleSendMessage={handleSendMessage}
        handleClearChat={handleClearChat}
        formatSessionDate={formatSessionDate}
      />

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white px-5 py-3 border-b-2 border-emerald-100 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 p-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer"
              title="Open Services Menu"
            >
              <Menu className="w-5 h-5 text-emerald-700" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base leading-tight">
                  NutriConnect Clinical Desk
                </h1>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified Clinical AI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Dietitian matchmaker, USDA nutrition facts, and clinical meal
                plans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConsultation}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
              title="Start New Consultation"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button
              onClick={handleClearChat}
              className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Reset Chat View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 space-y-5 [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:rounded-full"
        >
          {messages.map((msg, index) => {
            const isUser = msg.type === "user";
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-4xl ${isUser ? "ml-auto justify-end" : "mr-auto justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`space-y-2.5 ${isUser ? "items-end" : "items-start"} max-w-3xl`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl relative group transition-all text-sm sm:text-base leading-relaxed ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-xs shadow-xs font-normal"
                        : "bg-white border-2 border-slate-200/90 text-slate-900 rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {isUser ? (
                      editingIndex === index ? (
                        <div className="space-y-2 min-w-[260px] sm:min-w-[340px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveAndResend(index);
                              }
                            }}
                            className="w-full bg-emerald-700/80 text-white placeholder-emerald-200 border border-emerald-400/50 rounded-xl p-2.5 text-sm sm:text-base focus:outline-hidden focus:ring-1 focus:ring-white resize-none leading-relaxed"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleCancelEdit}
                              className="px-2.5 py-1 text-xs font-semibold text-white/80 hover:text-white hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveAndResend(index)}
                              disabled={!editingText.trim()}
                              className="px-3 py-1 text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                            >
                              Save & Resend
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                            <button
                              onClick={() =>
                                handleStartEdit(index, msg.content)
                              }
                              className="text-white/80 hover:text-white bg-black/15 hover:bg-black/25 p-1.5 rounded-md cursor-pointer transition-colors"
                              title="Edit message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopy(msg.content, index)}
                              className="text-white/80 hover:text-white bg-black/15 hover:bg-black/25 p-1.5 rounded-md cursor-pointer transition-colors"
                              title="Copy message"
                            >
                              {copiedIndex === index ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <>
                        <BotFormattedText content={msg.content} />
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-md cursor-pointer"
                          title="Copy response"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Tool Execution Pill */}
                  {!isUser && msg.toolsExecuted?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Verified Sources:
                      </span>
                      {msg.toolsExecuted
                        .filter((t) => {
                          const name = typeof t === "string" ? t : t?.tool || "";
                          return name && name !== "patient_context_loader";
                        })
                        .map((tool, tIdx) => {
                          const toolName = typeof tool === "string" ? tool : tool?.tool || "";
                          const labelMap = {
                            search_dietitians: "Specialist Registry",
                            check_dietitian_availability: "Live Dietitian Schedule",
                            get_user_schedule: "User Consultation Calendar",
                            book_dietitian_appointment: "Confirmed Consultation Booking",
                            lookup_nutrition: "USDA FoodData Central",
                            generate_meal_plan: "Clinical Meal Plan Engine",
                            get_user_health_reports: "Clinical Health & Lab Reports",
                          };
                          const label = labelMap[toolName] || toolName.replace(/_/g, " ");
                          return (
                            <span
                              key={tIdx}
                              className="bg-emerald-50 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {label}
                            </span>
                          );
                        })}
                    </div>
                  )}

                  {/* Structured Result Cards */}
                  {!isUser && msg.cards?.length > 0 && (
                    <div className="space-y-2.5 pt-1 w-full">
                      {msg.cards.map((card, cIdx) => {
                        if (
                          card.type === "booking_confirmation_card" &&
                          card.data
                        ) {
                          return (
                            <BookingConfirmationCard
                              key={cIdx}
                              data={card.data}
                            />
                          );
                        }
                        if (card.type === "user_schedule_card" && card.data) {
                          return (
                            <UserScheduleCard key={cIdx} data={card.data} />
                          );
                        }
                        if (card.type === "meal_plan_card" && card.data) {
                          return <MealPlanCard key={cIdx} plan={card.data} />;
                        }
                        if (
                          card.type === "dietitian_cards" &&
                          Array.isArray(card.data)
                        ) {
                          return (
                            <div key={cIdx} className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Accredited Specialist Matches</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {card.data.map((doc, dIdx) => (
                                  <DietitianCard
                                    key={dIdx}
                                    doc={doc}
                                    onBook={(name) =>
                                      handleSendMessage(
                                        `Check available appointment dates and slots for ${name}`,
                                      )
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        }
                        if (card.type === "slot_booking_card" && card.data) {
                          return (
                            <SlotBookingCard
                              key={cIdx}
                              data={card.data}
                              onBookSlot={handleSlotSelectForPayment}
                            />
                          );
                        }
                        if (card.type === "nutrition_card" && card.data) {
                          return <NutritionCard key={cIdx} data={card.data} />;
                        }
                        if (card.type === "patient_profile_card" && card.data) {
                          return (
                            <PatientProfileCard
                              key={cIdx}
                              profile={card.data}
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 max-w-lg items-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="bg-white border-2 border-emerald-100 rounded-xl rounded-tl-xs px-3.5 py-2.5 shadow-xs flex items-center gap-2.5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {typingStatus}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Strip Above Input */}
        <div className="px-4 sm:px-8 py-2 bg-emerald-50/40 border-t border-emerald-100 overflow-x-auto scrollbar-none flex gap-2 shrink-0">
          {STARTER_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.prompt)}
              className="text-xs font-semibold text-slate-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-200/90 hover:border-emerald-400 px-3 py-1 rounded-full transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* BOTTOM INPUT DOCK */}
        <div className="p-3 sm:p-4 sm:px-8 bg-white border-t border-emerald-100 shrink-0">
          <div className="max-w-4xl mx-auto flex items-end gap-2 bg-white border-2 border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200/60 rounded-2xl p-2.5 transition-all shadow-xs">
            <TextareaAutoSize
              minRows={1}
              maxRows={5}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about dietitians, appointment slots, whole food nutrition, or clinical meal plans..."
              className="flex-1 bg-transparent px-2 py-1.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none leading-relaxed"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl p-2.5 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
            Medical answers are referenced against certified clinician
            directories and USDA records.
          </p>
        </div>
      </main>

      {/* Subscription Alert Modal */}
      {subscriptionAlert && (
        <SubscriptionAlert
          message={subscriptionAlert.message}
          planType={subscriptionAlert.planType}
          limitType={subscriptionAlert.limitType}
          currentCount={subscriptionAlert.currentCount}
          limit={subscriptionAlert.limit}
          onClose={() => setSubscriptionAlert(null)}
        />
      )}

      {/* Consultation Payment Modal */}
      {isPaymentModalOpen && pendingPaymentDetails && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentClose}
          onSubmit={handlePaymentCompleted}
          paymentDetails={pendingPaymentDetails}
        />
      )}
    </div>
  );
}

export default NutriAgentPage;
