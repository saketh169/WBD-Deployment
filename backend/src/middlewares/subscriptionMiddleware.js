const Payment = require('../models/paymentModel');
const Booking = require('../models/bookingModel');
const { Blog } = require('../models/blogModel');
const Progress = require('../models/progressModel');
const { ChatHistory } = require('../models/chatbotModels');

// Progress plan types available for each subscription tier
const PROGRESS_PLAN_ACCESS = {
  free: [
    'general',      // General Wellness - basic overall health tracking
    'weight-loss',  // Weight Loss - most common goal
    'hydration'     // Hydration Goal - simple water tracking
  ],
  basic: [
    // Includes free plans plus:
    'general', 'weight-loss', 'hydration',
    'balanced-diet',   // Balanced Diet - meal planning basics
    'cardio',          // Cardio Fitness - running, cycling
    'energy',          // Energy Boost - nutrition optimization
    'flexibility'      // Flexibility & Mobility - yoga, stretching
  ],
  premium: [
    // Includes basic plans plus:
    'general', 'weight-loss', 'hydration', 'balanced-diet', 'cardio', 'energy', 'flexibility',
    'muscle-gain',     
    'stamina',        
    'detox',          
    'stress',         
    'maintenance'     
  ],
  ultimate: [
    // All plans including specialized ones:
    'general', 'weight-loss', 'hydration', 'balanced-diet', 'cardio', 'energy', 'flexibility',
    'muscle-gain', 'stamina', 'detox', 'stress', 'maintenance',
    'diabetes',        
    'recovery',       
    'athletic'         
  ]
};

// Subscription feature limits configuration
const SUBSCRIPTION_LIMITS = {
  free: {
    monthlyBookings: 3,
    advanceBookingDays: 5,
    chatbotDailyQueries: 25,
    monthlyBlogPosts: 0,
    monthlyMealPlans: 1,
    progressPlans: PROGRESS_PLAN_ACCESS.free // Array of accessible plan types
  },
  basic: {
    monthlyBookings: 5,
    advanceBookingDays: 7,
    chatbotDailyQueries: 40,
    monthlyBlogPosts: 3,
    monthlyMealPlans: 5,
    progressPlans: PROGRESS_PLAN_ACCESS.basic
  },
  premium: {
    monthlyBookings: 12,
    advanceBookingDays: 14,
    chatbotDailyQueries: 75,
    monthlyBlogPosts: 10,
    monthlyMealPlans: 20,
    progressPlans: PROGRESS_PLAN_ACCESS.premium
  },
  ultimate: {
    monthlyBookings: -1, // unlimited
    advanceBookingDays: 30,
    chatbotDailyQueries: -1, // unlimited
    monthlyBlogPosts: -1, // unlimited
    monthlyMealPlans: -1, // unlimited
    progressPlans: PROGRESS_PLAN_ACCESS.ultimate // All plans
  }
};

// Get user's subscription and limits
async function getUserSubscription(userId) {
  try {
    // First check if there are any payments for this user
    const allPayments = await Payment.find({ userId }).sort({ createdAt: -1 });
    
    if (allPayments.length > 0) {
      const latestPayment = allPayments[0];
    }
    
    const subscription = await Payment.findActiveSubscription(userId);
    
    if (!subscription) {
      return {
        planType: 'free',
        limits: SUBSCRIPTION_LIMITS.free,
        hasSubscription: false
      };
    }

    return {
      planType: subscription.planType,
      limits: SUBSCRIPTION_LIMITS[subscription.planType] || SUBSCRIPTION_LIMITS.free,
      hasSubscription: true,
      subscription: subscription
    };
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    return {
      planType: 'free',
      limits: SUBSCRIPTION_LIMITS.free,
      hasSubscription: false
    };
  }
}

// Check booking limits
async function checkBookingLimit(req, res, next) {
  try {
    // Get userId from JWT (preferred) — never trust body for identity
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const { planType, limits, hasSubscription } = await getUserSubscription(userId);
    
    // Free users cannot book — require a subscription
    if (!hasSubscription || planType === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Booking consultations requires a subscription. Please subscribe to a plan to book appointments!',
        limitReached: true,
        planType: 'free',
        requiresSubscription: true
      });
    }

    // Check monthly booking count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const bookingsThisMonth = await Booking.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth },
      status: { $in: ['confirmed', 'completed', 'pending'] }
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
    
    // Check advance booking days
    const bookingDate = new Date(req.body.date);
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

    // Attach limits info to request for later use
    req.subscriptionInfo = { planType, limits, bookingsThisMonth };
    next();
  } catch (error) {
    console.error('Error checking booking limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription limits'
    });
  }
}

// Check blog posting limits
async function checkBlogLimit(req, res, next) {
  try {
    // Dietitians and admins are service providers — skip subscription check
    if (req.user?.role === 'dietitian' || req.user?.role === 'admin') {
      return next();
    }

    // Use roleId from JWT to match userId in payments collection
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const { planType, limits, hasSubscription } = await getUserSubscription(userId);
    
    // Free users cannot post blogs — require a subscription
    if (!hasSubscription || planType === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Blog posting requires a subscription. Please subscribe to a plan to start posting!',
        limitReached: true,
        planType: 'free',
        requiresSubscription: true
      });
    }

    // Check monthly blog post count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const blogsThisMonth = await Blog.countDocuments({
      'author.userId': userId,
      createdAt: { $gte: startOfMonth }
    });

    if (limits.monthlyBlogPosts === 0) {
      return res.status(403).json({
        success: false,
        message: `Blog posting requires a subscription. Please upgrade your plan to start posting blogs!`,
        limitReached: true,
        currentCount: blogsThisMonth,
        limit: 0,
        planType: planType
      });
    }

    if (limits.monthlyBlogPosts !== -1 && blogsThisMonth >= limits.monthlyBlogPosts) {
      return res.status(403).json({
        success: false,
        message: `Monthly blog post limit reached. Your ${planType} plan allows ${limits.monthlyBlogPosts} posts per month. Upgrade for unlimited posts!`,
        limitReached: true,
        currentCount: blogsThisMonth,
        limit: limits.monthlyBlogPosts,
        planType: planType
      });
    }

    // Attach limits info to request
    req.subscriptionInfo = { planType, limits, blogsThisMonth };
    next();
  } catch (error) {
    console.error('Error checking blog limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription limits'
    });
  }
}

// Check chatbot query limits
async function checkChatbotLimit(req, res, next) {
  try {
    // Use roleId from JWT to match userId in payments collection
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;
    const sessionId = req.body.sessionId;
    
    // If no userId, treat as anonymous free user, use sessionId for tracking
    const isAnonymous = !userId;
    const identifier = userId || sessionId || 'anonymous';
    
    let planType = 'free';
    let limits = SUBSCRIPTION_LIMITS.free;
    
    if (!isAnonymous) {
      const subscription = await getUserSubscription(userId);
      planType = subscription.planType;
      limits = subscription.limits;
    }

    // For unlimited plans, skip check
    if (limits.chatbotDailyQueries === -1) {
      req.subscriptionInfo = { planType, limits, queriesRemaining: -1 };
      return next();
    }

    // Count today's queries from the database (persistent across restarts)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let queriesUsedToday = 0;

    if (!isAnonymous) {
      // For logged-in users, count by userId in ChatHistory
      const chatHistories = await ChatHistory.find({
        userId: userId,
        createdAt: { $gte: startOfDay }
      });
      queriesUsedToday = chatHistories.reduce((count, chat) => {
        return count + chat.messages.filter(m => m.type === 'user').length;
      }, 0);
    } else if (sessionId) {
      // For anonymous users, count by sessionId
      const chatHistories = await ChatHistory.find({
        sessionId: sessionId,
        createdAt: { $gte: startOfDay }
      });
      queriesUsedToday = chatHistories.reduce((count, chat) => {
        return count + chat.messages.filter(m => m.type === 'user').length;
      }, 0);
    }

    if (queriesUsedToday >= limits.chatbotDailyQueries) {
      return res.status(403).json({
        success: false,
        message: `Daily chatbot query limit reached. Your ${planType} plan allows ${limits.chatbotDailyQueries} queries per day. Upgrade for more queries!`,
        limitReached: true,
        currentCount: queriesUsedToday,
        limit: limits.chatbotDailyQueries,
        planType: planType
      });
    }

    // Attach limits info to request
    req.subscriptionInfo = { 
      planType, 
      limits, 
      queriesUsedToday: queriesUsedToday + 1,
      queriesRemaining: limits.chatbotDailyQueries - queriesUsedToday - 1
    };
    
    next();
  } catch (error) {
    console.error('Error checking chatbot limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription limits'
    });
  }
}

// Check meal plan limits (for when meal plans are received)
async function checkMealPlanLimit(req, res, next) {
  try {
    // Dietitians are service providers — skip subscription check for them
    if (req.user?.role === 'dietitian' || req.user?.role === 'admin') {
      return next();
    }

    // For regular users, check their own subscription
    const userId = req.body.userId || req.user?.roleId || req.user?.employeeId || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const { planType, limits } = await getUserSubscription(userId);

    // For unlimited plans, skip check
    if (limits.monthlyMealPlans === -1) {
      req.subscriptionInfo = { planType, limits };
      return next();
    }

    // Count meal plans received this month
    const MealPlan = require('../models/mealPlanModel');
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const mealPlansThisMonth = await MealPlan.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth }
    });

    if (limits.monthlyMealPlans === 0) {
      return res.status(403).json({
        success: false,
        message: `Meal plans require a subscription. Please upgrade your plan to receive meal plans!`,
        limitReached: true,
        planType: planType
      });
    }

    if (mealPlansThisMonth >= limits.monthlyMealPlans) {
      return res.status(403).json({
        success: false,
        message: `Monthly meal plan limit reached. Your ${planType} plan allows ${limits.monthlyMealPlans} meal plans per month. Upgrade for more plans!`,
        limitReached: true,
        currentCount: mealPlansThisMonth,
        limit: limits.monthlyMealPlans,
        planType: planType
      });
    }

    req.subscriptionInfo = { planType, limits, mealPlansThisMonth };
    next();
  } catch (error) {
    console.error('Error checking meal plan limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription limits'
    });
  }
}

// Check progress plan access based on subscription
async function checkProgressLimit(req, res, next) {
  try {
    // Use roleId from JWT to match userId in payments collection
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const { planType, limits, hasSubscription } = await getUserSubscription(userId);
    const requestedPlan = req.body.plan;

    // Check if the requested plan is accessible for this subscription
    const accessiblePlans = limits.progressPlans || PROGRESS_PLAN_ACCESS.free;
    
    if (requestedPlan && !accessiblePlans.includes(requestedPlan)) {
      // Find what tier this plan belongs to
      let requiredTier = 'ultimate';
      if (PROGRESS_PLAN_ACCESS.premium.includes(requestedPlan)) requiredTier = 'premium';
      if (PROGRESS_PLAN_ACCESS.basic.includes(requestedPlan)) requiredTier = 'basic';
      if (PROGRESS_PLAN_ACCESS.free.includes(requestedPlan)) requiredTier = 'free';
      
      const planNames = {
        'weight-loss': 'Weight Loss',
        'muscle-gain': 'Muscle Gain',
        'cardio': 'Cardio Fitness',
        'hydration': 'Hydration Goal',
        'balanced-diet': 'Balanced Diet',
        'energy': 'Energy Boost',
        'detox': 'Detox Program',
        'stamina': 'Stamina Building',
        'maintenance': 'Weight Maintenance',
        'flexibility': 'Flexibility & Mobility',
        'recovery': 'Post-Injury Recovery',
        'diabetes': 'Diabetes Management',
        'stress': 'Stress Relief',
        'athletic': 'Athletic Performance',
        'general': 'General Wellness'
      };
      
      return res.status(403).json({
        success: false,
        message: `The "${planNames[requestedPlan] || requestedPlan}" plan requires a ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} subscription or higher. Upgrade to access this plan!`,
        planRestricted: true,
        requestedPlan: requestedPlan,
        requiredTier: requiredTier,
        currentTier: planType,
        accessiblePlans: accessiblePlans
      });
    }

    req.subscriptionInfo = { 
      planType, 
      limits, 
      hasSubscription,
      accessiblePlans
    };
    next();
  } catch (error) {
    console.error('Error checking progress plan access:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription limits'
    });
  }
}

// Get subscription status endpoint
async function getSubscriptionStatus(req, res) {
  try {
    // Use roleId (profile ID) to match how payments/subscriptions are stored
    const userId = req.user?.roleId || req.user?.employeeId || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const subscriptionInfo = await getUserSubscription(userId);

    // Get current usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [bookingsThisMonth, blogsThisMonth] = await Promise.all([
      Booking.countDocuments({
        userId,
        createdAt: { $gte: startOfMonth },
        status: { $in: ['confirmed', 'completed', 'pending'] }
      }),
      Blog.countDocuments({
        'author.userId': userId,
        createdAt: { $gte: startOfMonth }
      })
    ]);

    // Count chatbot queries from DB (persistent)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const chatHistories = await ChatHistory.find({
      userId: userId,
      createdAt: { $gte: startOfDay }
    });
    const chatbotQueriesUsed = chatHistories.reduce((count, chat) => {
      return count + chat.messages.filter(m => m.type === 'user').length;
    }, 0);

    res.json({
      success: true,
      subscription: {
        planType: subscriptionInfo.planType,
        hasSubscription: subscriptionInfo.hasSubscription,
        limits: subscriptionInfo.limits,
        usage: {
          bookings: {
            used: bookingsThisMonth,
            limit: subscriptionInfo.limits.monthlyBookings,
            remaining: subscriptionInfo.limits.monthlyBookings === -1 ? -1 : 
                      Math.max(0, subscriptionInfo.limits.monthlyBookings - bookingsThisMonth)
          },
          blogs: {
            used: blogsThisMonth,
            limit: subscriptionInfo.limits.monthlyBlogPosts,
            remaining: subscriptionInfo.limits.monthlyBlogPosts === -1 ? -1 : 
                      Math.max(0, subscriptionInfo.limits.monthlyBlogPosts - blogsThisMonth)
          },
          chatbot: {
            used: chatbotQueriesUsed,
            limit: subscriptionInfo.limits.chatbotDailyQueries,
            remaining: subscriptionInfo.limits.chatbotDailyQueries === -1 ? -1 : 
                      Math.max(0, subscriptionInfo.limits.chatbotDailyQueries - chatbotQueriesUsed)
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription status'
    });
  }
}

module.exports = {
  checkBookingLimit,
  checkBlogLimit,
  checkChatbotLimit,
  checkMealPlanLimit,
  checkProgressLimit,
  getSubscriptionStatus,
  getUserSubscription,
  SUBSCRIPTION_LIMITS,
  PROGRESS_PLAN_ACCESS
};
