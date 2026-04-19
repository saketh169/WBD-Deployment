const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Dietitian, UserAuth } = require('../models/userModel');
const Booking = require('../models/bookingModel');
const { BlockedSlot } = require('../models/bookingModel');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { cacheOrFetch } = require('../utils/redisClient');

// Get all verified dietitians
/**
 * @swagger
 * /api/dietitians:
 *   get:
 *     tags: ['Dietitian']
 *     summary: Get all verified dietitians
 *     responses:
 *       200:
 *         description: List of verified dietitians
 */
router.get('/dietitians', async (req, res) => {
  try {
    const { search } = req.query;
    
    // Redis cache key depends on search query
    const cacheKey = search ? `dietitians:search:${search}` : 'dietitians:list:verified';

    const { data: dietitiansWithImages, cacheStatus, duration } = await cacheOrFetch(cacheKey, 3600, async () => {
      let filter = {
        'verificationStatus.finalReport': 'Verified',
        isDeleted: false
      };

      if (search) {
        // Use Elasticsearch for high-performance fuzzy search
        const { searchElastic } = require('../utils/elasticClient');
        const elasticResults = await searchElastic(search, 'dietitians', { limit: 100 });
        
        if (elasticResults && elasticResults.length > 0) {
          const elasticIds = elasticResults.map(doc => doc.entityId);
          filter._id = { $in: elasticIds };
        } else if (elasticResults === null) {
          // Fallback to basic MongoDB regex if Elastic is down
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { specializationDomain: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } }
          ];
        } else {
          // Elastic is up but no results found
          return [];
        }
      }

      const dietitians = await Dietitian.find(filter)
        .select('-password -files -documents -verificationStatus');

      return dietitians.map(dietitian => {
        const dietitianObj = dietitian.toObject();
        if (dietitianObj.profileImage) {
          if (typeof dietitianObj.profileImage === 'string' && dietitianObj.profileImage.startsWith('http')) {
            dietitianObj.photo = dietitianObj.profileImage;
          } else if (Buffer.isBuffer(dietitianObj.profileImage)) {
            dietitianObj.photo = `data:image/jpeg;base64,${dietitianObj.profileImage.toString('base64')}`;
          } else {
            dietitianObj.photo = dietitianObj.profileImage;
          }
        } else {
          dietitianObj.photo = null;
        }
        return dietitianObj;
      });
    });

    res.set({
      'X-Cache': cacheStatus,
      'X-Cache-Key': cacheKey,
      'X-Response-Time': `${duration}ms`
    });

    res.json({
      success: true,
      data: dietitiansWithImages,
      count: dietitiansWithImages.length
    });
  } catch (error) {
    console.error('Error fetching dietitians:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dietitians'
    });
  }
});

// Get dietitian by ID
/**
 * @swagger
 * /api/dietitians/{id}:
 *   get:
 *     tags: ['Dietitian']
 *     summary: Get dietitian by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian details
 *       404:
 *         description: Dietitian not found
 */
router.get('/dietitians/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dietitian ID format'
      });
    }

    const cacheKey = `dietitians:profile:${req.params.id}`;
    
    const { data: dietitianObjCache, cacheStatus, duration } = await cacheOrFetch(cacheKey, 900, async () => {
      const dietitian = await Dietitian.findOne({
        _id: req.params.id,
        'verificationStatus.finalReport': 'Verified',
        isDeleted: false
      }).select('-password -files -documents -verificationStatus');

      if (!dietitian) {
        return null;
      }

      // Convert profileImage buffer or string to photo URL
      const dietitianObj = dietitian.toObject();
      if (dietitianObj.profileImage) {
        if (typeof dietitianObj.profileImage === 'string' && dietitianObj.profileImage.startsWith('http')) {
          dietitianObj.photo = dietitianObj.profileImage;
        } else if (Buffer.isBuffer(dietitianObj.profileImage)) {
          dietitianObj.photo = `data:image/jpeg;base64,${dietitianObj.profileImage.toString('base64')}`;
        } else {
          dietitianObj.photo = dietitianObj.profileImage;
        }
      } else {
        dietitianObj.photo = null;
      }
      return dietitianObj;
    });

    if (!dietitianObjCache) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    res.set({
      'X-Cache': cacheStatus,
      'X-Cache-Key': cacheKey,
      'X-Response-Time': `${duration}ms`
    });

    res.json({
      success: true,
      data: dietitianObjCache
    });
  } catch (error) {
    console.error('Error fetching dietitian:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dietitian'
    });
  }
});

// Get dietitian profile by ID (for editing - includes all fields, requires auth)
/**
 * @swagger
 * /api/dietitians/profile/{id}:
 *   get:
 *     tags: ['Dietitian']
 *     summary: Get dietitian profile for editing
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian profile
 *       404:
 *         description: Dietitian not found
 */
router.get('/dietitians/profile/:id', authenticateJWT, async (req, res) => {
  try {
    const dietitian = await Dietitian.findOne({
      _id: req.params.id,
      isDeleted: false
    }).select('-password -files -documents -verificationStatus');

    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // Convert profileImage buffer or string to photo URL
    const dietitianObj = dietitian.toObject();
    if (dietitianObj.profileImage) {
      if (typeof dietitianObj.profileImage === 'string' && dietitianObj.profileImage.startsWith('http')) {
        dietitianObj.photo = dietitianObj.profileImage;
      } else if (Buffer.isBuffer(dietitianObj.profileImage)) {
        dietitianObj.photo = `data:image/jpeg;base64,${dietitianObj.profileImage.toString('base64')}`;
      } else {
        dietitianObj.photo = dietitianObj.profileImage;
      }
    } else {
      dietitianObj.photo = null;
    }
    // Keep profileImage but also provide photo for frontend compatibility

    res.json({
      success: true,
      data: dietitianObj
    });
  } catch (error) {
    console.error('Error fetching dietitian profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dietitian profile'
    });
  }
});

// Get clients for a dietitian (requires auth)
/**
 * @swagger
 * /api/dietitians/{id}/clients:
 *   get:
 *     tags: ['Dietitian']
 *     summary: Get clients for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of clients
 */
router.get('/dietitians/:id/clients', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Get all bookings for this dietitian
    const bookings = await Booking.find({ dietitianId: id }).sort({ createdAt: -1 });

    // Group by userId to get unique clients with aggregated data
    const clientMap = new Map();
    const userIds = [...new Set(bookings.map(b => b.userId))];

    // Fetch actual user profiles to get real profile images
    const { User } = require('../models/userModel');
    const users = await User.find({ _id: { $in: userIds } }).select('name email phone address profileImage');
    const userProfileMap = new Map();
    users.forEach(u => {
      userProfileMap.set(u._id.toString(), {
        name: u.name,
        email: u.email,
        phone: u.phone,
        address: u.address,
        profileImage: u.profileImage
      });
    });

    bookings.forEach(booking => {
      const clientId = booking.userId.toString();
      const dateStr = new Date(booking.date).toISOString().split('T')[0];
      const bookingDateTime = new Date(`${dateStr}T${booking.time}`);
      const now = new Date();
      const hoursSinceAppointment = (now - bookingDateTime) / (1000 * 60 * 60);

      // Skip only if appointment was more than 12 hours ago
      if (hoursSinceAppointment > 12 && bookingDateTime < now) {
        return; // Skip old past appointments (more than 12 hours ago)
      }

      if (clientMap.has(clientId)) {
        const existing = clientMap.get(clientId);
        existing.totalSessions += 1;

        // Update next appointment if this booking is in the future and earlier
        if (bookingDateTime > now && (!existing.nextAppointment || bookingDateTime < new Date(existing.nextAppointment))) {
          existing.nextAppointment = `${dateStr} ${booking.time}`;
        }

        // Update last consultation if this is more recent
        if (new Date(booking.date) > new Date(existing.lastConsultation)) {
          existing.lastConsultation = dateStr;
        }
      } else {
        const isUpcoming = bookingDateTime > now;
        const isPast = bookingDateTime < now;

        // Determine status: Active for upcoming/current, Completed for past
        let clientStatus = 'Active';
        if (isPast && booking.status === 'completed') {
          clientStatus = 'Completed';
        } else if (isPast) {
          clientStatus = 'Completed';
        } else if (booking.status === 'cancelled') {
          clientStatus = 'Completed';
        }

        const userProfile = userProfileMap.get(clientId) || {};

        clientMap.set(clientId, {
          id: clientId,
          name: userProfile.name || booking.username,
          email: userProfile.email || booking.email,
          phone: userProfile.phone || booking.userPhone || 'N/A',
          age: 'N/A', // Not available in booking
          location: userProfile.address || booking.userAddress || 'N/A',
          consultationType: booking.consultationType || 'General Consultation',
          nextAppointment: isUpcoming ? `${dateStr} ${booking.time}` : null,
          status: clientStatus,
          profileImage: userProfile.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || booking.username)}&background=28B463&color=fff&size=128`,
          lastConsultation: dateStr,
          totalSessions: 1,
          goals: [booking.dietitianSpecialization || 'General Health'],
          isPast: isPast
        });
      }
    });

    // Return all clients that have relevant bookings
    const clients = Array.from(clientMap.values());

    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching dietitian clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients'
    });
  }
});
/*
router.post('/dietitians/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const dietitian = await Dietitian.findByIdAndUpdate(id, updateData, { new: true });

    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    res.json({
      success: true,
      data: dietitian,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating dietitian:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating dietitian'
    });
  }
}); */

// Dietitian profile setup route (requires auth)
/**
 * @swagger
 * /api/dietitian-profile-setup/{id}:
 *   post:
 *     tags: ['Dietitian']
 *     summary: Setup dietitian profile
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               specialization:
 *                 type: string
 *               experience:
 *                 type: number
 *               fees:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profile setup completed
 */
router.post('/dietitian-profile-setup/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const setupData = req.body;

    // Validate required fields for setup
    const requiredFields = ['name', 'email', 'phone', 'age', 'specialization', 'experience', 'fees', 'languages', 'location', 'education'];
    const missingFields = requiredFields.filter(field => !setupData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const dietitian = await Dietitian.findByIdAndUpdate(id, setupData, { new: true });

    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    res.json({
      success: true,
      data: dietitian,
      message: 'Profile setup completed successfully'
    });
  } catch (error) {
    console.error('Error setting up dietitian profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up dietitian profile'
    });
  }
});

// Get available slots for a dietitian on a specific date
/**
 * @swagger
 * /api/dietitians/{id}/slots:
 *   get:
 *     tags: ['Dietitian']
 *     summary: Get available booking slots for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available slots
 */
router.get('/dietitians/:id/slots', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, userId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const dietitian = await Dietitian.findById(id);
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // For now, assume standard working hours: 9:00 AM to 8:00 PM (20:00)
    // In a real implementation, this would come from dietitian's availability settings
    const startHour = 9;
    const endHour = 20; // 8:00 PM
    const slotDuration = 30; // minutes

    let availableSlots = [];
    let currentHour = startHour;
    let currentMinute = 0;

    // Generate 30-minute slots from start to end time
    while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
      const slot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      availableSlots.push(slot);

      currentMinute += slotDuration;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }

    // Parse and normalize the query date as UTC
    const [year, month, day] = date.split('-').map(Number);
    const queryDate = new Date(Date.UTC(year, month - 1, day));

    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Fetch slots booked by the current user for ANY dietitian on this date
    const userBookedSlots = await Booking.find({
      userId,
      date: { $gte: queryDate, $lt: nextDay },
      status: { $in: ['confirmed', 'completed'] }
    }).select('time dietitianName');

    // Fetch slots booked for this specific dietitian by ANY user on this date
    const dietitianBookedSlots = await Booking.find({
      dietitianId: id,
      date: { $gte: queryDate, $lt: nextDay },
      status: { $in: ['confirmed', 'completed'] }
    }).select('time userId');

    // Create maps for quick lookup
    const userBookedMap = new Map();
    userBookedSlots.forEach(booking => {
      userBookedMap.set(booking.time, booking.dietitianName);
    });

    const dietitianBookedMap = new Map();
    dietitianBookedSlots.forEach(booking => {
      dietitianBookedMap.set(booking.time, booking.userId);
    });

    // Categorize each slot
    const slotsWithStatus = availableSlots.map(slot => {
      let status = 'available';
      let dietitianName = null;
      let isUserBooking = false;

      if (userBookedMap.has(slot)) {
        if (dietitianBookedMap.has(slot) && dietitianBookedMap.get(slot).toString() === userId.toString()) {
          // User has booked with this dietitian
          status = 'booked_with_this_dietitian';
          isUserBooking = true;
        } else {
          // User has booked with another dietitian
          status = 'you_are_booked';
          dietitianName = userBookedMap.get(slot);
        }
      } else if (dietitianBookedMap.has(slot)) {
        // Slot booked with this dietitian by someone else
        status = 'booked';
      }

      return {
        time: slot,
        status,
        dietitianName,
        isUserBooking
      };
    });

    // Filter to only show slots associated with this user and dietitian
    const filteredSlots = slotsWithStatus.filter(slot => {
      return slot.status === 'available' ||
        slot.status === 'booked_with_this_dietitian' ||
        slot.status === 'you_are_booked';
    });

    res.json({
      success: true,
      slots: filteredSlots,
      date: queryDate
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots'
    });
  }
});

// ==================== TESTIMONIAL ROUTES ====================

// Add a testimonial to a dietitian (only if user has consulted this dietitian)
/**
 * @swagger
 * /api/dietitians/{id}/testimonials:
 *   post:
 *     tags: ['Dietitian']
 *     summary: Add testimonial/review for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               text:
 *                 type: string
 *               rating:
 *                 type: number
 *     responses:
 *       201:
 *         description: Testimonial added
 */
router.post('/dietitians/:id/testimonials', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, rating } = req.body;
    const userId = req.user.roleId || req.user.employeeId || req.user.userId;

    // Validate required fields
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review text is required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const dietitian = await Dietitian.findById(id);
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // Check if user has consulted this dietitian (has a confirmed or completed booking)
    const hasConsulted = await Booking.findOne({
      userId: userId,
      dietitianId: id,
      status: { $in: ['confirmed', 'completed'] }
    });

    if (!hasConsulted) {
      return res.status(403).json({
        success: false,
        message: 'You can only review dietitians you have consulted with'
      });
    }

    // Get user info for author name
    const { User } = require('../models/userModel');
    const user = await User.findById(userId);
    const authorName = user?.name || 'Anonymous User';

    // Create new testimonial - store authorId as string for easier comparison
    const newTestimonial = {
      text: text.trim(),
      author: authorName,
      rating: rating,
      authorId: new mongoose.Types.ObjectId(userId),
      createdAt: new Date()
    };

    // Add to testimonials array
    if (!dietitian.testimonials) {
      dietitian.testimonials = [];
    }
    dietitian.testimonials.unshift(newTestimonial);

    // Recalculate average rating
    const totalRatings = dietitian.testimonials.reduce((sum, t) => sum + (t.rating || 0), 0);
    dietitian.rating = Number((totalRatings / dietitian.testimonials.length).toFixed(1));

    // Mark the testimonials array as modified to ensure Mongoose saves it
    dietitian.markModified('testimonials');

    await dietitian.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      testimonial: newTestimonial,
      newRating: dietitian.rating,
      totalReviews: dietitian.testimonials.length
    });
  } catch (error) {
    console.error('Error adding testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review'
    });
  }
});

// Delete a testimonial (only by the author)
/**
 * @swagger
 * /api/dietitians/{id}/testimonials/{testimonialIndex}:
 *   delete:
 *     tags: ['Dietitian']
 *     summary: Delete a testimonial/review
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: testimonialIndex
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Testimonial deleted
 */
router.delete('/dietitians/:id/testimonials/:testimonialIndex', authenticateJWT, async (req, res) => {
  try {
    const { id, testimonialIndex } = req.params;
    const userId = req.user.roleId || req.user.employeeId || req.user.userId;

    const dietitian = await Dietitian.findById(id);
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    const index = parseInt(testimonialIndex);
    if (isNaN(index) || index < 0 || index >= dietitian.testimonials.length) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    const testimonial = dietitian.testimonials[index];

    // Check if the user is the author
    if (testimonial.authorId && testimonial.authorId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    // Remove testimonial
    dietitian.testimonials.splice(index, 1);

    // Recalculate average rating
    if (dietitian.testimonials.length > 0) {
      const totalRatings = dietitian.testimonials.reduce((sum, t) => sum + (t.rating || 0), 0);
      dietitian.rating = Number((totalRatings / dietitian.testimonials.length).toFixed(1));
    } else {
      dietitian.rating = 0;
    }

    await dietitian.save();

    res.json({
      success: true,
      message: 'Review deleted successfully',
      newRating: dietitian.rating,
      totalReviews: dietitian.testimonials.length
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting review'
    });
  }
});

// Get dietitian stats (rating, consultation count)
/**
 * @swagger
 * /api/dietitians/{id}/stats:
 *   get:
 *     tags: ['Dietitian']
 *     summary: Get dietitian statistics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dietitian statistics
 */
router.get('/dietitians/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const dietitian = await Dietitian.findById(id).select('rating testimonials');
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // Get total consultations count (confirmed + completed)
    const totalConsultations = await Booking.countDocuments({
      dietitianId: id,
      status: { $in: ['confirmed', 'completed'] }
    });

    res.json({
      success: true,
      data: {
        rating: dietitian.rating || 0,
        totalReviews: dietitian.testimonials?.length || 0,
        completedConsultations: totalConsultations
      }
    });
  } catch (error) {
    console.error('Error fetching dietitian stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
});

// Check if user can add a review (has consulted and hasn't already reviewed)
/**
 * @swagger
 * /api/dietitians/{id}/can-review:
 *   get:
 *     tags: ['Dietitian']
 *     summary: Check if user can add review
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review eligibility status
 */
router.get('/dietitians/:id/can-review', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.roleId || req.user.employeeId || req.user.userId;

    // Check if user has consulted this dietitian
    const hasConsulted = await Booking.findOne({
      userId: userId,
      dietitianId: id,
      status: { $in: ['confirmed', 'completed'] }
    });

    if (!hasConsulted) {
      return res.json({
        success: true,
        canReview: false,
        reason: 'You need to consult this dietitian before adding a review'
      });
    }

    res.json({
      success: true,
      canReview: true
    });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking review eligibility'
    });
  }
});

// Block a slot for a dietitian
/**
 * @swagger
 * /api/dietitians/{id}/block-slot:
 *   post:
 *     tags: ['Dietitian']
 *     summary: Block a time slot for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *     responses:
 *       200:
 *         description: Slot blocked
 */
router.post('/dietitians/:id/block-slot', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Date and time are required'
      });
    }

    // Check if the dietitian exists
    const dietitian = await Dietitian.findById(id);
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // Check if slot is already booked
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existingBooking = await Booking.findOne({
      dietitianId: id,
      date: { $gte: dayStart, $lt: dayEnd },
      time,
      status: { $in: ['confirmed', 'completed'] }
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: 'Cannot block a slot that is already booked'
      });
    }

    // Check if already blocked
    const existingBlock = await BlockedSlot.findOne({
      dietitianId: id,
      date,
      time
    });

    if (existingBlock) {
      return res.status(409).json({
        success: false,
        message: 'Slot is already blocked'
      });
    }

    // Create blocked slot
    const blockedSlot = new BlockedSlot({
      dietitianId: id,
      date,
      time
    });

    await blockedSlot.save();

    res.json({
      success: true,
      message: 'Slot blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking slot'
    });
  }
});

// Unblock a slot for a dietitian
/**
 * @swagger
 * /api/dietitians/{id}/unblock-slot:
 *   post:
 *     tags: ['Dietitian']
 *     summary: Unblock a time slot for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *     responses:
 *       200:
 *         description: Slot unblocked
 */
router.post('/dietitians/:id/unblock-slot', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Date and time are required'
      });
    }

    // Check if the dietitian exists
    const dietitian = await Dietitian.findById(id);
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // Find and remove the blocked slot
    const blockedSlot = await BlockedSlot.findOneAndDelete({
      dietitianId: id,
      date,
      time
    });

    if (!blockedSlot) {
      return res.status(404).json({
        success: false,
        message: 'Slot was not blocked'
      });
    }

    res.json({
      success: true,
      message: 'Slot unblocked successfully'
    });
  } catch (error) {
    console.error('Error unblocking slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking slot'
    });
  }
});

// Block entire day for a dietitian
/**
 * @swagger
 * /api/dietitians/{id}/block-day:
 *   post:
 *     tags: ['Dietitian']
 *     summary: Block entire day for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Day blocked
 */
router.post('/dietitians/:id/block-day', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Check if the dietitian exists
    const dietitian = await Dietitian.findById(id);
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // Define all time slots
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
    ];

    // Check for existing bookings on this day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existingBookings = await Booking.find({
      dietitianId: id,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $in: ['confirmed', 'completed'] }
    });

    if (existingBookings.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot block entire day. There are ${existingBookings.length} existing booking(s).`
      });
    }

    // Block all slots that aren't already blocked
    const blockedSlots = [];
    for (const time of allSlots) {
      const existingBlock = await BlockedSlot.findOne({
        dietitianId: id,
        date,
        time
      });

      if (!existingBlock) {
        const blockedSlot = new BlockedSlot({
          dietitianId: id,
          date,
          time
        });
        await blockedSlot.save();
        blockedSlots.push(time);
      }
    }

    res.json({
      success: true,
      message: `Entire day blocked successfully. ${blockedSlots.length} slots blocked.`,
      blockedSlots
    });
  } catch (error) {
    console.error('Error blocking entire day:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking entire day'
    });
  }
});

// Unblock entire day for a dietitian
/**
 * @swagger
 * /api/dietitians/{id}/unblock-day:
 *   post:
 *     tags: ['Dietitian']
 *     summary: Unblock entire day for a dietitian
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Day unblocked
 */
router.post('/dietitians/:id/unblock-day', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Check if the dietitian exists
    const dietitian = await Dietitian.findById(id);
    if (!dietitian) {
      return res.status(404).json({
        success: false,
        message: 'Dietitian not found'
      });
    }

    // Remove all blocked slots for this day
    const result = await BlockedSlot.deleteMany({
      dietitianId: id,
      date
    });

    res.json({
      success: true,
      message: `Entire day unblocked successfully. ${result.deletedCount} slots unblocked.`,
      unblockedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error unblocking entire day:', error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking entire day'
    });
  }
});

// Notify admin about dietitian leave with a reason
/**
 * @swagger
 * /api/dietitians/{id}/notify-leave:
 *   post:
 *     tags: ['Dietitian']
 *     summary: Notify admin about leave
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               dates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave notification sent
 */
router.post('/dietitians/:id/notify-leave', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { dates, reason } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one date is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A reason is required' });
    }

    const dietitian = await Dietitian.findById(id).select('name email');
    if (!dietitian) {
      return res.status(404).json({ success: false, message: 'Dietitian not found' });
    }

    const { sendLeaveNotificationEmail } = require('../services/emailService');
    try {
      await sendLeaveNotificationEmail(dietitian.name, dietitian.email, dates, reason.trim());
    } catch (emailErr) {
      console.error('Failed to send leave notification email:', emailErr.message);
      // Non-fatal — blocking already happened, just warn
    }

    res.json({ success: true, message: 'Leave notification sent to admin' });
  } catch (error) {
    console.error('Error sending leave notification:', error);
    res.status(500).json({ success: false, message: 'Error sending leave notification' });
  }
});

module.exports = router;