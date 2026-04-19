const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { checkBookingLimit, getUserSubscription } = require("../middlewares/subscriptionMiddleware");
const Booking = require("../models/bookingModel");
const { authenticateJWT } = require("../middlewares/authMiddleware");

/**
 * BOOKING ROUTES
 * Base path: /api/bookings
 */

// All booking routes require authentication
router.use(authenticateJWT);

/**
 * @swagger
 * /api/bookings/check-limits:
 *   post:
 *     tags: ['Bookings']
 *     summary: Check booking limits based on subscription plan
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Booking limit check result
 *       403:
 *         description: Booking limit reached or subscription required
 */
// POST /api/bookings/check-limits
router.post("/check-limits", async (req, res) => {
  try {
    const { userId, date } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const { planType, limits, hasSubscription } = await getUserSubscription(userId);

    // Free users cannot book — require subscription
    if (!hasSubscription || planType === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Booking consultations requires a subscription. Please subscribe to a plan!',
        limitReached: true,
        planType: 'free',
        requiresSubscription: true,
        limits: limits
      });
    }

    // Check monthly booking count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const bookingsThisMonth = await Booking.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth },
      status: { $in: ['confirmed', 'completed', 'no-show'] }
    });

    if (limits.monthlyBookings !== -1 && bookingsThisMonth >= limits.monthlyBookings) {
      return res.status(403).json({
        success: false,
        message: `Monthly booking limit reached. Your ${planType} plan allows ${limits.monthlyBookings} bookings per month. Upgrade for more bookings!`,
        limitReached: true,
        currentCount: bookingsThisMonth,
        limit: limits.monthlyBookings,
        planType: planType
      });
    }

    // Check advance booking days if date is provided
    if (date) {
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      bookingDate.setHours(0, 0, 0, 0);

      const daysDifference = Math.floor((bookingDate - today) / (1000 * 60 * 60 * 24));

      if (limits.advanceBookingDays !== -1 && daysDifference > limits.advanceBookingDays) {
        return res.status(403).json({
          success: false,
          message: `Your ${planType} plan allows booking up to ${limits.advanceBookingDays} days in advance. Upgrade to book further ahead!`,
          limitReached: true,
          planType: planType,
          maxAdvanceDays: limits.advanceBookingDays,
          attemptedDays: daysDifference
        });
      }
    }

    // All checks passed
    return res.json({
      success: true,
      message: 'Within subscription limits',
      planType: planType,
      currentCount: bookingsThisMonth,
      limit: limits.monthlyBookings,
      advanceBookingDays: limits.advanceBookingDays
    });

  } catch (error) {
    console.error('Error checking booking limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription limits'
    });
  }
});

/**
 * @swagger
 * /api/bookings/create:
 *   post:
 *     tags: ['Bookings']
 *     summary: Create new consultation booking
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - dietitianId
 *               - dietitianName
 *               - dietitianEmail
 *               - date
 *               - time
 *               - consultationType
 *               - amount
 *               - paymentMethod
 *               - paymentId
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               userPhone:
 *                 type: string
 *               userAddress:
 *                 type: string
 *               dietitianId:
 *                 type: string
 *               dietitianName:
 *                 type: string
 *               dietitianEmail:
 *                 type: string
 *               dietitianPhone:
 *                 type: string
 *               dietitianSpecialization:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               consultationType:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *               paymentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       403:
 *         description: Subscription limit reached
 */
// POST /api/bookings/create (with subscription limit check)
router.post("/payment/order", checkBookingLimit, bookingController.createBookingPaymentOrder);
router.post("/create", checkBookingLimit, bookingController.createBooking);

// Redis Booking Concurency Locks
router.post("/hold", bookingController.holdSlot);
router.post("/release", bookingController.releaseSlot);
router.get("/dietitian/:dietitianId/holds", bookingController.getDietitianHolds);

/**
 * @swagger
 * /api/bookings/user/{userId}:
 *   get:
 *     tags: ['Bookings']
 *     summary: Get all bookings for a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user bookings
 */
// GET /api/bookings/user/:userId
router.get("/user/:userId", bookingController.getUserBookings);

/**
 * @swagger
 * /api/bookings/user/{userId}/booked-slots:
 *   get:
 *     tags: ['Bookings']
 *     summary: Get user's booked time slots
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: List of booked slots
 */
// GET /api/bookings/user/:userId/booked-slots
router.get("/user/:userId/booked-slots", bookingController.getUserBookedSlots);

/**
 * @swagger
 * /api/bookings/dietitian/{dietitianId}:
 *   get:
 *     tags: ['Bookings']
 *     summary: Get all bookings for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of dietitian bookings
 */
// GET /api/bookings/dietitian/:dietitianId
router.get("/dietitian/:dietitianId", bookingController.getDietitianBookings);

/**
 * @swagger
 * /api/bookings/dietitian/{dietitianId}/booked-slots:
 *   get:
 *     tags: ['Bookings']
 *     summary: Get dietitian's available and booked slots
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dietitianId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional user id to include user conflict details
 *     responses:
 *       200:
 *         description: Dietitian's booked slots
 */
// GET /api/bookings/dietitian/:dietitianId/booked-slots
router.get(
  "/dietitian/:dietitianId/booked-slots",
  bookingController.getBookedSlots
);

// Create or fetch meeting link for an online consultation
router.post("/:bookingId/meeting-link", bookingController.createMeetingLink);

// Download calendar invite (.ics)
router.get("/:bookingId/ics", bookingController.getCalendarInvite);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     tags: ['Bookings']
 *     summary: Get specific booking details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
// GET /api/bookings/:bookingId
router.get("/:bookingId", bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings/{bookingId}/status:
 *   patch:
 *     tags: ['Bookings']
 *     summary: Update booking status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, cancelled, completed, no-show]
 *     responses:
 *       200:
 *         description: Booking status updated
 */
// PATCH /api/bookings/:bookingId/status
router.patch("/:bookingId/status", bookingController.updateBookingStatus);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   delete:
 *     tags: ['Bookings']
 *     summary: Cancel a booking
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       404:
 *         description: Booking not found
 */
// DELETE /api/bookings/:bookingId
router.delete("/:bookingId", bookingController.cancelBooking);

/**
 * @swagger
 * /api/bookings/{bookingId}/reschedule:
 *   patch:
 *     tags: ['Bookings']
 *     summary: Reschedule a booking to new date/time
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - time
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *                 example: '10:30'
 *               newDate:
 *                 type: string
 *                 format: date
 *                 description: Backward-compatible alias for date
 *               newTime:
 *                 type: string
 *                 description: Backward-compatible alias for time
 *     responses:
 *       200:
 *         description: Booking rescheduled successfully
 */
// PATCH /api/bookings/:bookingId/reschedule
router.patch("/:bookingId/reschedule", bookingController.rescheduleBooking);

module.exports = router;