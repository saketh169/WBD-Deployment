const mongoose = require("mongoose");
const Booking = require("../models/bookingModel");
const { BlockedSlot } = require("../models/bookingModel");
const { redis, isConnected: isRedisConnected } = require("../utils/redisClient");
const {
  sendBookingConfirmationToUser,
  sendBookingNotificationToDietitian,
} = require("../services/bookingService");
const razorpayService = require("../services/razorpayService");
const { notifyDietitianNewBooking, notifyBookingUpdate, notifyUserUpdate, notifySlotLockChange } = require("../utils/socket");
const crypto = require("crypto");

// Lightweight ICS generator (no external deps)
function buildICS({ uid, start, end, title, description, location, url }) {
  const formatDate = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtStamp = formatDate(new Date());
  const dtStart = formatDate(start);
  const dtEnd = formatDate(end);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NutriConnect//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, "\\n")}` : "",
    location ? `LOCATION:${location}` : "",
    url ? `URL:${url}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean).join("\r\n");
}

// Create a Razorpay order for consultation booking payment
exports.createBookingPaymentOrder = async (req, res) => {
  try {
    const {
      amount,
      currency = 'INR',
      dietitianId,
      date,
      time,
      consultationType
    } = req.body;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount for booking payment'
      });
    }

    if (!razorpayService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not configured'
      });
    }

    const amountInPaise = Math.round(numericAmount * 100);
    const receipt = `BK${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const order = await razorpayService.createOrder({
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        userId: String(req.user.roleId || req.user.employeeId || req.user.userId || ''),
        dietitianId: String(dietitianId || ''),
        date: String(date || ''),
        time: String(time || ''),
        consultationType: String(consultationType || '')
      }
    });

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      keyId: razorpayService.getPublicKey()
    });
  } catch (error) {
    console.error('Error creating booking payment order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create booking payment order'
    });
  }
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const {
      username,
      email,
      userPhone,
      userAddress,
      dietitianId,
      dietitianName,
      dietitianEmail,
      dietitianPhone,
      dietitianSpecialization,
      date,
      time,
      consultationType,
      amount,
      paymentMethod,
      paymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    const normalizedPaymentId = paymentId || razorpayPaymentId;

    // Use authenticated user ID from JWT — never trust userId from body
    const userId = req.user.roleId || req.user.employeeId || req.user.userId;

    // Validate required fields
    if (
      !userId ||
      !username ||
      !email ||
      !dietitianId ||
      !dietitianName ||
      !dietitianEmail ||
      !date ||
      !time ||
      !consultationType ||
      !amount ||
      !paymentMethod ||
      !normalizedPaymentId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      // Log which fields are missing
      const missingFields = [];
      if (!userId) missingFields.push("userId");
      if (!username) missingFields.push("username");
      if (!email) missingFields.push("email");
      if (!dietitianId) missingFields.push("dietitianId");
      if (!dietitianName) missingFields.push("dietitianName");
      if (!dietitianEmail) missingFields.push("dietitianEmail");
      if (!date) missingFields.push("date");
      if (!time) missingFields.push("time");
      if (!consultationType) missingFields.push("consultationType");
      if (!amount) missingFields.push("amount");
      if (!paymentMethod) missingFields.push("paymentMethod");
      if (!normalizedPaymentId) missingFields.push("paymentId");
      if (!razorpayOrderId) missingFields.push("razorpayOrderId");
      if (!razorpayPaymentId) missingFields.push("razorpayPaymentId");
      if (!razorpaySignature) missingFields.push("razorpaySignature");

      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (!razorpayService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured",
      });
    }

    const isSignatureValid = razorpayService.verifySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid Razorpay signature.",
      });
    }

    // Validate date is in the future
    // Parse date as UTC to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day)); // Create UTC date at midnight
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: "Booking date must be today or in the future",
      });
    }

    const dayStart = new Date(bookingDate);
    const dayEnd = new Date(bookingDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // **NEW: Check if the user already has a booking at this time (with any dietitian)**
    const userConflictingBooking = await Booking.findOne({
      userId,
      date: { $gte: dayStart, $lt: dayEnd },
      time,
      status: { $in: ["confirmed", "completed"] },
    });

    if (userConflictingBooking) {
      return res.status(409).json({
        success: false,
        message: `You already have an appointment with ${userConflictingBooking.dietitianName} at ${time} on this date. Please select a different time slot.`,
        conflictingBooking: {
          dietitianName: userConflictingBooking.dietitianName,
          time: userConflictingBooking.time,
          date: userConflictingBooking.date,
        },
      });
    }

    // Check if the slot is already booked with this specific dietitian
    const dietitianSlotBooked = await Booking.findOne({
      dietitianId,
      date: { $gte: dayStart, $lt: dayEnd },
      time,
      status: { $in: ["confirmed", "completed"] },
    });

    if (dietitianSlotBooked) {
      return res.status(409).json({
        success: false,
        message:
          "This time slot is already booked with this dietitian. Please select another slot.",
      });
    }

    // **NEW: Redis Concurrency Check (Cinema-style logic)**
    if (isRedisConnected()) {
      const lockKey = `lock:booking:${dietitianId}:${date}:${time}`;
      const lockHolder = await redis.get(lockKey);
      
      // If there IS a hold and it's NOT this user, block it.
      if (lockHolder && lockHolder !== userId.toString()) {
        return res.status(423).json({
          success: false,
          message: "This slot is currently being held by another user. Please wait for them to finish or select another time."
        });
      }

      // If there is no hold at all, we should probably allow it (race condition back to DB check)
      // but ideally the frontend always calls /hold first.
      
      // Cleanup the lock after successful booking verification
      await redis.del(lockKey);
    }

    // Check if payment ID is unique
    const existingPayment = await Booking.findOne({ paymentId: normalizedPaymentId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "This payment ID has already been used",
      });
    }

    // Create new booking
    const booking = new Booking({
      userId,
      username,
      email,
      userPhone,
      userAddress,
      dietitianId,
      dietitianName,
      dietitianEmail,
      dietitianPhone,
      dietitianSpecialization,
      date: bookingDate, // Use normalized date
      time,
      consultationType,
      amount,
      paymentMethod,
      paymentId: normalizedPaymentId,
      paymentStatus: "completed",
      status: "confirmed",
    });

    // Save to database
    const savedBooking = await booking.save();

    // Trigger real-time WebSocket update for the dietitian
    try {
      notifyDietitianNewBooking(dietitianId, savedBooking);
    } catch (socketErr) {
      console.error("Socket error (non-fatal):", socketErr);
    }

    // Send confirmation emails asynchronously (don't wait for them)
    // Booking is saved first, then emails are sent in background (non-blocking)
    // This ensures response time < 2 mins
    try {
      const emailData = {
        username,
        email,
        userPhone,
        userAddress,
        dietitianName,
        dietitianEmail,
        dietitianSpecialization,
        date: bookingDate,
        time,
        consultationType,
        amount,
        paymentId: normalizedPaymentId,
        bookingId: savedBooking._id,
      };

      // Fire and forget - send emails in background without waiting
      // This is a non-blocking async operation
      sendBookingConfirmationToUser(emailData).catch(err =>
        console.error("Error sending confirmation to user:", err)
      );
      sendBookingNotificationToDietitian(emailData).catch(err =>
        console.error("Error sending notification to dietitian:", err)
      );

      console.log("Emails queued for sending in background");
    } catch (emailErr) {
      console.error("Error queueing emails:", emailErr);
      // Don't fail the request if email queuing fails
    }

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: savedBooking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to create booking",
    });
  }
};

// Hold a slot using Redis (Cinema-style locking)
exports.holdSlot = async (req, res) => {
  try {
    const { dietitianId, date, time } = req.body;
    const userId = req.user.roleId || req.user.userId;

    if (!dietitianId || !date || !time) {
      return res.status(400).json({ success: false, message: "Dietitian, date, and time are required" });
    }

    if (!isRedisConnected()) {
      return res.status(503).json({ success: false, message: "Booking lock service is temporarily unavailable" });
    }

    const lockKey = `lock:booking:${dietitianId}:${date}:${time}`;
    
    // Check if slot is already officially booked in DB first
    const [year, month, day] = date.split('-').map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));
    const dayStart = new Date(bookingDate);
    const dayEnd = new Date(bookingDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const alreadyBooked = await Booking.findOne({
      dietitianId,
      date: { $gte: dayStart, $lt: dayEnd },
      time,
      status: { $in: ["confirmed", "completed"] },
    });

    if (alreadyBooked) {
      return res.status(409).json({ success: false, message: "This slot is already officially booked." });
    }

    // Try to acquire Redis lock for 10 minutes (600 seconds)
    // NX: Only set if not exists
    const acquired = await redis.set(lockKey, userId.toString(), "EX", 600, "NX");

    if (!acquired) {
      // Check if it's already held by the SAME user
      const currentHolder = await redis.get(lockKey);
      if (currentHolder === userId.toString()) {
        return res.status(200).json({ success: true, message: "Slot is already held by you", expiresAt: Date.now() + 600000 });
      }
      return res.status(423).json({ success: false, message: "This slot is currently being held by another user. Try again in 10 minutes." });
    }

    try {
      notifySlotLockChange(dietitianId, { date, time, action: 'hold', userId: userId.toString() });
    } catch (sockErr) {
      console.error('Socket error notifying hold:', sockErr);
    }

    res.status(200).json({
      success: true,
      message: "Slot held successfully for 10 minutes",
      expiresAt: Date.now() + 600000
    });
  } catch (error) {
    console.error("Error holding slot:", error);
    res.status(500).json({ success: false, message: "Error locking slot" });
  }
};

// Explicitly release a slot hold
exports.releaseSlot = async (req, res) => {
  try {
    const { dietitianId, date, time } = req.body;
    const userId = req.user.roleId || req.user.userId;
    const lockKey = `lock:booking:${dietitianId}:${date}:${time}`;

    const currentHolder = await redis.get(lockKey);
    if (currentHolder === userId.toString()) {
      await redis.del(lockKey);
      try {
        notifySlotLockChange(dietitianId, { date, time, action: 'release', userId: userId.toString() });
      } catch (sockErr) {
        console.error('Socket error notifying release:', sockErr);
      }
      return res.status(200).json({ success: true, message: "Slot hold released" });
    }
    
    res.status(403).json({ success: false, message: "You do not have a hold on this slot" });
  } catch (error) {
    console.error("Error releasing slot:", error);
    res.status(500).json({ success: false, message: "Error releasing slot hold" });
  }
};

// Get all active holds for a dietitian and date
exports.getDietitianHolds = async (req, res) => {
  try {
    const { dietitianId } = req.params;
    const { date } = req.query;
    
    if (!dietitianId || !date) {
      return res.status(400).json({ success: false, message: "Dietitian ID and date are required" });
    }

    const pattern = `lock:booking:${dietitianId}:${date}:*`;
    const keys = await redis.keys(pattern);
    
    // Extract time from keys (e.g., 'lock:booking:id:date:10:00' -> '10:00')
    const heldSlots = keys.map(key => key.split(':').pop());
    
    res.status(200).json({ 
      success: true, 
      heldSlots 
    });
  } catch (error) {
    console.error("Error fetching dietitian holds:", error);
    res.status(500).json({ success: false, message: "Error fetching held slots" });
  }
};

/**
 * Get all bookings for a user
 * GET /api/bookings/user/:userId
 */
exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, sort = "-createdAt" } = req.query;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    let query = { userId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query).sort(sort).exec();

    res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to fetch bookings",
    });
  }
};

/**
 * Get all bookings for a dietitian
 * GET /api/bookings/dietitian/:dietitianId
 */
exports.getDietitianBookings = async (req, res) => {
  try {
    const { dietitianId } = req.params;
    const { status, sort = "-createdAt" } = req.query;

    // Validate dietitianId
    if (!mongoose.Types.ObjectId.isValid(dietitianId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dietitian ID",
      });
    }

    let query = { dietitianId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query).sort(sort).exec();

    res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error("Error fetching dietitian bookings:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to fetch bookings",
    });
  }
};

/**
 * Get a specific booking by ID
 * GET /api/bookings/:bookingId
 */
exports.getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to fetch booking",
    });
  }
};

// Generate a lightweight Jitsi meeting link for an online consultation
exports.createMeetingLink = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Authorization: only the booked user or the dietitian can create/view the link
    if (booking.userId.toString() !== String(userId) && booking.dietitianId.toString() !== String(userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (booking.consultationType !== "Online") {
      return res.status(400).json({ success: false, message: "Meeting links are only available for online consultations" });
    }

    // Reuse existing link if present to avoid changing user invites
    if (booking.meetingUrl) {
      return res.json({ success: true, meetingUrl: booking.meetingUrl, provider: booking.meetingProvider || "jitsi" });
    }

    const domain = process.env.JITSI_DOMAIN || "https://meet.jit.si";
    const room = `NutriConnect-${booking._id}-${crypto.randomBytes(4).toString("hex")}`;
    const meetingUrl = `${domain.replace(/\/$/, "")}/${room}`;

    booking.meetingUrl = meetingUrl;
    booking.meetingProvider = "jitsi";
    booking.meetingCreatedAt = new Date();
    await booking.save();

    return res.json({ success: true, meetingUrl, provider: "jitsi" });
  } catch (error) {
    console.error("Error creating meeting link:", error);
    return res.status(500).json({ success: false, message: "Failed to create meeting link" });
  }
};

// Provide an .ics calendar invite for a booking
exports.getCalendarInvite = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.userId.toString() !== String(userId) && booking.dietitianId.toString() !== String(userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Build start/end Date objects using stored date (midnight UTC) + time (HH:MM)
    // Support "HH:MM" or "HH:MM AM/PM" time formats
    const timeParts = booking.time.trim().toUpperCase();
    const timeMatch = timeParts.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
    if (!timeMatch) {
      return res.status(400).json({ success: false, message: "Invalid time format on booking" });
    }
    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10) || 0;
    const meridian = timeMatch[3];
    if (meridian === "PM" && hour < 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;

    const start = new Date(booking.date);
    start.setUTCHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000); // default 30 mins

    const title = `Consultation with ${booking.dietitianName}`;
    const descriptionParts = [
      `Consultation Type: ${booking.consultationType}`,
      `Dietitian: ${booking.dietitianName}`,
      `Client: ${booking.username}`,
      booking.meetingUrl ? `Join: ${booking.meetingUrl}` : null
    ].filter(Boolean);

    const ics = buildICS({
      uid: `booking-${booking._id}@nutriconnect`,
      start,
      end,
      title,
      description: descriptionParts.join("\n"),
      location: booking.meetingUrl || "Online",
      url: booking.meetingUrl || undefined
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=booking-${booking._id}.ics`);
    return res.send(ics);
  } catch (error) {
    console.error("Error generating calendar invite:", error);
    return res.status(500).json({ success: false, message: "Failed to generate calendar invite" });
  }
};

/**
 * Update booking status
 * PATCH /api/bookings/:bookingId/status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Validate status value
    const validStatuses = ["confirmed", "cancelled", "completed", "no-show"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: booking,
    });

    // Trigger real-time updates
    try {
      notifyBookingUpdate(booking.dietitianId, booking);
      notifyUserUpdate(booking.userId, booking);
    } catch (err) {
      console.error("Socket notification error:", err);
    }
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to update booking",
    });
  }
};

/**
 * Cancel a booking
 * DELETE /api/bookings/:bookingId
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if booking can be cancelled
    if (booking.status === "completed" || booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${booking.status} booking`,
      });
    }

    // Update booking status
    booking.status = "cancelled";
    booking.updatedAt = Date.now();
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });

    // Trigger real-time updates
    try {
      notifyBookingUpdate(booking.dietitianId, booking);
      notifyUserUpdate(booking.userId, booking);
    } catch (err) {
      console.error("Socket notification error:", err);
    }
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to cancel booking",
    });
  }
};

/**
 * Get booked slots for a dietitian on a specific date
 * GET /api/bookings/dietitian/:dietitianId/booked-slots?date=YYYY-MM-DD&userId=xxx
 */
exports.getBookedSlots = async (req, res) => {
  try {
    const { dietitianId } = req.params;
    const { date, userId } = req.query; // Add userId to query params

    // Handle null or "null" string userId
    const validUserId = userId && userId !== 'null' && userId !== 'undefined' ? userId : null;

    if (!dietitianId || !date) {
      return res.status(400).json({
        success: false,
        message: "Dietitian ID and date are required",
      });
    }

    // Parse and normalize the date as UTC
    const [year, month, day] = date.split('-').map(Number);
    const queryDate = new Date(Date.UTC(year, month - 1, day));

    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find all confirmed/completed bookings for this dietitian on this date
    const dietitianBookings = await Booking.find({
      dietitianId,
      date: { $gte: queryDate, $lt: nextDay },
      status: { $in: ["confirmed", "completed"] },
    }).select("time userId username _id");

    // Find all blocked slots for this dietitian on this date
    const blockedSlots = await BlockedSlot.find({
      dietitianId,
      date: queryDate.toISOString().split('T')[0]
    }).select("time");

    // Find all confirmed/completed bookings for this user on this date (with any dietitian)
    // Only query if we have a valid userId
    let userBookings = [];
    if (validUserId) {
      userBookings = await Booking.find({
        userId: validUserId,
        date: { $gte: queryDate, $lt: nextDay },
        status: { $in: ["confirmed", "completed"] },
      }).select("time dietitianName");
    }

    // Separate user's bookings from others' bookings for this dietitian
    const bookedSlots = [];
    const userBookingsWithThisDietitian = [];
    const bookingDetails = [];
    const blockedSlotsList = blockedSlots.map(slot => slot.time);

    dietitianBookings.forEach((booking) => {
      bookingDetails.push({
        time: booking.time,
        userId: booking.userId,
        userName: booking.username,
        bookingId: booking._id
      });
      if (validUserId && booking.userId.toString() === validUserId) {
        userBookingsWithThisDietitian.push(booking.time);
      } else {
        bookedSlots.push(booking.time);
      }
    });

    // Get times when user has any bookings (conflicts with booking multiple dietitians at same time)
    const userConflictingTimes = userBookings.map(booking => booking.time);

    // Return all booked slots for this dietitian (including user's own)
    const allBookedSlots = [...bookedSlots, ...userBookingsWithThisDietitian];

    res.status(200).json({
      success: true,
      bookedSlots: allBookedSlots, // All slots booked with this dietitian
      userBookings: userBookingsWithThisDietitian, // Slots booked by current user with this dietitian
      userConflictingTimes, // All times when user has bookings with any dietitian
      bookingDetails, // Details of all bookings with IDs
      blockedSlots: blockedSlotsList, // Blocked slots
      date: queryDate,
    });
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to fetch booked slots",
    });
  }
};

/**
 * Get user's booked slots for a specific date (to check conflicts)
 * GET /api/bookings/user/:userId/booked-slots?date=YYYY-MM-DD
 */
exports.getUserBookedSlots = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        message: "User ID and date are required",
      });
    }

    // Parse and normalize the date as UTC
    const [year, month, day] = date.split('-').map(Number);
    const queryDate = new Date(Date.UTC(year, month - 1, day));

    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find all confirmed/completed bookings for this user on this date
    const bookings = await Booking.find({
      userId,
      date: { $gte: queryDate, $lt: nextDay },
      status: { $in: ["confirmed", "completed"] },
    }).select("time dietitianName");

    // Extract time slots with dietitian info
    const bookedSlots = bookings.map((booking) => ({
      time: booking.time,
      dietitianName: booking.dietitianName,
    }));

    res.status(200).json({
      success: true,
      bookedSlots,
      date: queryDate,
    });
  } catch (error) {
    console.error("Error fetching user booked slots:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to fetch booked slots",
    });
  }
};

/**
 * Reschedule a booking
 * PATCH /api/bookings/:bookingId/reschedule
 */
exports.rescheduleBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, time, newDate, newTime } = req.body;
    const targetDate = date || newDate;
    const targetTime = time || newTime;

    if (!targetDate || !targetTime) {
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const [year, month, day] = targetDate.split('-').map(Number);
    const normalizedTargetDate = new Date(Date.UTC(year, month - 1, day));
    const normalizedTargetDateString = normalizedTargetDate.toISOString().split('T')[0];

    // Check if the new slot is available
    const existingBooking = await Booking.findOne({
      dietitianId: booking.dietitianId,
      date: normalizedTargetDate,
      time: targetTime,
      status: { $in: ["confirmed", "pending"] },
      _id: { $ne: bookingId }, // Exclude current booking
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "The selected time slot is already booked",
      });
    }

    // Check for blocked slots
    const blockedSlot = await BlockedSlot.findOne({
      dietitianId: booking.dietitianId,
      date: normalizedTargetDateString,
      time: targetTime,
    });

    if (blockedSlot) {
      return res.status(400).json({
        success: false,
        message: "The selected time slot is blocked",
      });
    }

    // Update the booking
    booking.date = normalizedTargetDate;
    booking.time = targetTime;
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking rescheduled successfully",
      booking: {
        _id: booking._id,
        date: booking.date,
        time: booking.time,
      },
    });

    // Trigger real-time updates
    try {
      notifyBookingUpdate(booking.dietitianId, booking);
      notifyUserUpdate(booking.userId, booking);
    } catch (err) {
      console.error("Socket notification error:", err);
    }
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    res.status(500).json({
      success: false,
      message: "`Failed to reschedule booking",
    });
  }
};

module.exports = exports;
