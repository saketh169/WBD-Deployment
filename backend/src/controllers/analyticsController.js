const { User, Dietitian, Organization } = require('../models/userModel');
const Booking = require('../models/bookingModel');
const MealPlan = require('../models/mealPlanModel');
const Payment = require('../models/paymentModel');
const Settings = require('../models/settingsModel');

// Get all users
exports.getUsersList = async (req, res) => {
    try {
        const total = await User.countDocuments({});

        res.json({
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// Get user growth analytics
exports.getUserGrowth = async (req, res) => {
    try {
        // Get all users with their creation dates
        const users = await User.find({}, 'createdAt').sort({ createdAt: 1 });

        const now = new Date();
        const monthlyGrowth = [];

        // Calculate user growth for the last 12 months
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            // Count users registered in this month
            const usersInMonth = users.filter(user => {
                const userDate = new Date(user.createdAt);
                return userDate >= monthStart && userDate <= monthEnd;
            }).length;

            monthlyGrowth.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                users: usersInMonth,
                cumulative: 0 // Will be calculated below
            });
        }

        // Calculate cumulative users
        let cumulativeTotal = 0;
        monthlyGrowth.forEach(month => {
            cumulativeTotal += month.users;
            month.cumulative = cumulativeTotal;
        });

        res.json({
            monthlyGrowth,
            totalUsers: users.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user growth data' });
    }
};

// Get all dietitians
exports.getDietitiansList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        const dietitians = await Dietitian.find({}, 'name email phone specialization fees').skip(skip).limit(limit);
        const total = await Dietitian.countDocuments({});

        res.json({
            data: dietitians,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dietitians' });
    }
};

// Get verifying organizations
exports.getVerifyingOrganizations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        const organizations = await Organization.find({ documentUploadStatus: 'pending' }, 'name email phone').skip(skip).limit(limit);
        const total = await Organization.countDocuments({ documentUploadStatus: 'pending' });

        res.json({
            data: organizations,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching organizations' });
    }
};

// Get all organizations
exports.getAllOrganizations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        const organizations = await Organization.find({}, 'name email phone').skip(skip).limit(limit);
        const total = await Organization.countDocuments({});

        res.json({
            data: organizations,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching organizations' });
    }
};


// Get active diet plans
exports.getActiveDietPlans = async (req, res) => {
    try {
        const activePlans = await MealPlan.find({ isActive: true });
        res.json({ data: activePlans });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching active diet plans' });
    }
};

// Get subscriptions (using Payment model)
exports.getSubscriptions = async (req, res) => {
    try {
        // Using Payment model for subscriptions
        const payments = await Payment.find({})
            .populate('userId', 'name')
            .select('planType billingCycle amount paymentMethod transactionId subscriptionStartDate subscriptionEndDate createdAt paymentDate userId userName');
        // Format to match frontend expectation
        const formatted = payments.map(payment => ({
            id: payment._id,
            name: payment.userName,
            plan: payment.planType,
            cycle: payment.billingCycle,
            revenue: payment.amount,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            startDate: payment.subscriptionStartDate || payment.createdAt,
            expiresAt: payment.subscriptionEndDate,
            status: payment.paymentStatus || 'unknown',
            createdAt: payment.createdAt,
            paymentDate: payment.paymentDate,
            userId: { name: payment.userId?.name || payment.userName }
        }));
        res.json({ data: formatted });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscriptions' });
    }
};

// Get membership/subscription revenue
exports.getMembershipRevenue = async (req, res) => {
    try {
        const subscriptions = await Payment.find({ paymentStatus: 'success' })
            .select('amount planType billingCycle createdAt subscriptionStartDate subscriptionEndDate')
            .sort({ createdAt: -1 });

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        // Calculate daily revenue
        const dailySubscriptions = subscriptions.filter(sub => {
            const subDate = new Date(sub.subscriptionStartDate || sub.createdAt);
            return subDate >= today;
        });
        const dailyRevenue = dailySubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

        // Calculate monthly revenue
        const monthlySubscriptions = subscriptions.filter(sub => {
            const subDate = new Date(sub.subscriptionStartDate || sub.createdAt);
            return subDate >= monthStart;
        });
        const monthlyRevenue = monthlySubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

        // Calculate yearly revenue
        const yearlySubscriptions = subscriptions.filter(sub => {
            const subDate = new Date(sub.subscriptionStartDate || sub.createdAt);
            return subDate >= yearStart;
        });
        const yearlyRevenue = yearlySubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

        res.json({
            dailyPeriods: dailySubscriptions.map(sub => ({
                date: sub.subscriptionStartDate || sub.createdAt,
                amount: sub.amount,
                planType: sub.planType,
                billingCycle: sub.billingCycle
            })),
            monthlyPeriods: monthlySubscriptions.map(sub => ({
                date: sub.subscriptionStartDate || sub.createdAt,
                amount: sub.amount,
                planType: sub.planType,
                billingCycle: sub.billingCycle
            })),
            yearlyPeriods: yearlySubscriptions.map(sub => ({
                date: sub.subscriptionStartDate || sub.createdAt,
                amount: sub.amount,
                planType: sub.planType,
                billingCycle: sub.billingCycle
            })),
            daily: dailyRevenue,
            monthly: monthlyRevenue,
            yearly: yearlyRevenue
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching membership revenue' });
    }
};

// Get consultation revenue
exports.getConsultationRevenue = async (req, res) => {
    try {
        const consultations = await Booking.find({ paymentStatus: 'completed' })
            .select('date amount createdAt time consultationType')
            .sort({ createdAt: -1 });

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Calculate revenue for last 7 days
        const dailyPeriods = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(now);
            dayDate.setDate(now.getDate() - i);
            const nextDay = new Date(dayDate);
            nextDay.setDate(dayDate.getDate() + 1);

            const dayConsultations = consultations.filter(con => {
                const conDate = new Date(con.createdAt);
                return conDate >= dayDate && conDate < nextDay;
            });

            dailyPeriods.push({
                date: dayDate.toISOString(),
                displayDate: dayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                revenue: dayConsultations.reduce((sum, con) => sum + (con.amount || 0), 0),
                consultations: dayConsultations.map(con => ({
                    amount: con.amount,
                    time: con.time,
                    consultationType: con.consultationType
                }))
            });
        }

        // Calculate monthly revenue for last 6 months
        const monthlyPeriods = [];
        for (let i = 0; i < 6; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

            const monthConsultations = consultations.filter(con => {
                const conDate = new Date(con.createdAt);
                return conDate >= monthDate && conDate < nextMonth;
            });

            monthlyPeriods.push({
                month: monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
                revenue: monthConsultations.reduce((sum, con) => sum + (con.amount || 0), 0)
            });
        }

        // Calculate yearly revenue for last 4 years
        const yearlyPeriods = [];
        for (let i = 0; i < 4; i++) {
            const year = now.getFullYear() - i;
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year + 1, 0, 1);

            const yearConsultations = consultations.filter(con => {
                const conDate = new Date(con.createdAt);
                return conDate >= yearStart && conDate < yearEnd;
            });

            yearlyPeriods.push({
                year: year,
                revenue: yearConsultations.reduce((sum, con) => sum + (con.amount || 0), 0)
            });
        }

        // Total for today
        const today = new Date(now);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const todayConsultations = consultations.filter(con => {
            const conDate = new Date(con.createdAt);
            return conDate >= today && conDate < tomorrow;
        });
        const dailyRevenue = todayConsultations.reduce((sum, con) => sum + (con.amount || 0), 0);

        // Monthly total
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyConsultations = consultations.filter(con => {
            const conDate = new Date(con.createdAt);
            return conDate >= monthStart;
        });
        const monthlyRevenue = monthlyConsultations.reduce((sum, con) => sum + (con.amount || 0), 0);

        // Yearly total
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearlyConsultations = consultations.filter(con => {
            const conDate = new Date(con.createdAt);
            return conDate >= yearStart;
        });
        const yearlyRevenue = yearlyConsultations.reduce((sum, con) => sum + (con.amount || 0), 0);

        res.json({
            data: consultations,
            dailyPeriods: dailyPeriods,
            monthlyPeriods: monthlyPeriods,
            yearlyPeriods: yearlyPeriods,
            daily: dailyRevenue,
            monthly: monthlyRevenue,
            yearly: yearlyRevenue
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching consultation revenue' });
    }
};

// Get revenue analytics with commission calculations
exports.getRevenueAnalytics = async (req, res) => {
    try {
        const buildHourlyRevenue = (items, getDate, getAmount) => {
            const hourlyTotals = Array.from({ length: 24 }, (_, hour) => ({
                hour,
                hourLabel: `${String(hour).padStart(2, '0')}:00`,
                revenue: 0
            }));

            items.forEach(item => {
                const dateValue = getDate(item);
                const amountValue = Number(getAmount(item) || 0);
                const parsedDate = dateValue ? new Date(dateValue) : null;

                if (!parsedDate || Number.isNaN(parsedDate.getTime()) || amountValue <= 0) {
                    return;
                }

                const hour = parsedDate.getHours();
                hourlyTotals[hour].revenue += amountValue;
            });

            return hourlyTotals;
        };

        // Get current settings for commission rates and subscription tiers
        const settings = await Settings.findOne();
        const consultationCommission = settings?.consultationCommission || 15; // default 15%
        const platformShare = settings?.platformShare || 20; // default 20%

        // Get subscription tiers from settings
        const monthlyTiers = settings?.monthlyTiers || [];
        const yearlyTiers = settings?.yearlyTiers || [];

        // Get subscription data using same logic as subscription table
        const subscriptions = await Payment.find({})
            .populate('userId', 'name')
            .select('planType billingCycle amount paymentMethod transactionId subscriptionStartDate subscriptionEndDate createdAt paymentDate userId userName');

        // Get actual subscription payments to determine active subscriptions
        const subscriptionPayments = await Payment.find({ paymentStatus: 'success' })
            .select('amount planType billingCycle createdAt subscriptionEndDate')
            .sort({ createdAt: -1 });

        // Get consultation revenue
        const consultationBookings = await Booking.find({ paymentStatus: 'completed' })
            .select('amount createdAt date')
            .populate('dietitianId', 'name');

        // Calculate subscription revenue - use same logic as subscription table (sum of payment amounts)
        const totalSubscriptionRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

        // Get consultation revenue
        const totalConsultationRevenue = consultationBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        const totalRevenue = totalSubscriptionRevenue + totalConsultationRevenue;

        const consultationHourly = buildHourlyRevenue(
            consultationBookings,
            booking => booking.createdAt,
            booking => booking.amount
        );

        const membershipHourly = buildHourlyRevenue(
            subscriptionPayments,
            payment => payment.createdAt,
            payment => payment.amount
        );

        const topConsultationHours = consultationHourly
            .filter(slot => slot.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const topMembershipHours = membershipHourly
            .filter(slot => slot.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Calculate commission-based earnings (only consultation commission)
        const consultationCommissionAmount = (totalConsultationRevenue * consultationCommission) / 100;
        const platformShareAmount = (totalSubscriptionRevenue * platformShare) / 100;
        const totalPlatformEarnings = consultationCommissionAmount + platformShareAmount; // Include both consultation commission and subscription platform share

        // Calculate dietitian earnings (what's left after commission)
        const totalDietitianEarnings = totalConsultationRevenue - consultationCommissionAmount;

        // Monthly breakdown for the last 12 months
        const monthlyData = [];
        const currentDate = new Date();

        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

            // Calculate subscription revenue for this month - use exact same logic as membership revenue
            const monthSubscriptions = subscriptions.filter(sub => {
                const paymentDate = new Date(sub.subscriptionStartDate || sub.createdAt);
                return paymentDate >= monthStart && paymentDate <= monthEnd;
            });
            const monthSubRevenue = monthSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

            const monthConsultations = consultationBookings.filter(booking => {
                const bookingDate = new Date(booking.createdAt);
                return bookingDate >= monthStart && bookingDate <= monthEnd;
            });

            const monthConsRevenue = monthConsultations.reduce((sum, booking) => sum + (booking.amount || 0), 0);

            const monthCommission = (monthConsRevenue * consultationCommission) / 100;
            const monthPlatformShare = (monthSubRevenue * platformShare) / 100;

            monthlyData.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                subscriptionRevenue: monthSubRevenue,
                consultationRevenue: monthConsRevenue,
                totalRevenue: monthSubRevenue + monthConsRevenue,
                platformEarnings: monthCommission + monthPlatformShare, // Include both consultation commission and subscription platform share
                dietitianEarnings: monthConsRevenue - monthCommission
            });
        }

        // Revenue by subscription plan (using membership tiers) - REMOVED

        res.json({
            data: {
                summary: {
                    totalRevenue,
                    totalSubscriptionRevenue,
                    totalConsultationRevenue,
                    totalPlatformEarnings, // Includes both consultation commission and subscription platform share
                    totalDietitianEarnings,
                    platformShareAmount, // Separate field for subscription platform share
                    commissionRates: {
                        consultationCommission: `${consultationCommission}%`,
                        platformShare: `${platformShare}%`
                    }
                },
                peakHours: {
                    consultation: topConsultationHours,
                    membership: topMembershipHours
                },
                monthlyBreakdown: monthlyData,
                recentConsultations: consultationBookings
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 10)
                    .map(booking => ({
                        date: booking.date,
                        amount: booking.amount,
                        dietitian: booking.dietitianId?.name || 'Unknown',
                        commission: (booking.amount * consultationCommission) / 100,
                        dietitianEarnings: booking.amount - ((booking.amount * consultationCommission) / 100)
                    })),
                recentSubscriptions: subscriptionPayments
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 10)
                    .map(payment => {
                        // Find tier information
                        let tierPrice = payment.amount || 0;
                        let tierName = payment.planType || 'Unknown';

                        if (payment.billingCycle === 'monthly') {
                            const tier = monthlyTiers.find(t => t.name === payment.planType);
                            tierPrice = tier?.price || payment.amount || 0;
                        } else if (payment.billingCycle === 'yearly') {
                            const tier = yearlyTiers.find(t => t.name === payment.planType);
                            tierPrice = tier?.price || payment.amount || 0;
                        }

                        return {
                            date: payment.createdAt,
                            planType: tierName,
                            billingCycle: payment.billingCycle,
                            amount: tierPrice,
                            platformShare: (tierPrice * platformShare) / 100,
                            netRevenue: tierPrice - ((tierPrice * platformShare) / 100)
                        };
                    })
            }
        });
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ message: 'Error fetching revenue analytics' });
    }
};

// Get dietitian-specific revenue
exports.getDietitianRevenue = async (req, res) => {
    try {
        // Get all completed consultation bookings with dietitian information
        const consultations = await Booking.find({ paymentStatus: 'completed' })
            .populate('dietitianId', 'name')
            .select('dietitianId dietitianName amount createdAt');

        // Group revenue by dietitian
        const dietitianRevenueMap = {};

        consultations.forEach(booking => {
            const dietitianId = booking.dietitianId?._id?.toString() || 'unknown';
            const dietitianName = booking.dietitianId?.name || booking.dietitianName || 'Unknown Dietitian';
            const amount = booking.amount || 0;

            if (!dietitianRevenueMap[dietitianId]) {
                dietitianRevenueMap[dietitianId] = {
                    dietitianId,
                    dietitianName,
                    totalRevenue: 0,
                    consultationCount: 0
                };
            }

            dietitianRevenueMap[dietitianId].totalRevenue += amount;
            dietitianRevenueMap[dietitianId].consultationCount += 1;
        });

        // Convert to array and sort by revenue (descending)
        const dietitianRevenue = Object.values(dietitianRevenueMap)
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        res.json({
            data: dietitianRevenue,
            totalDietitians: dietitianRevenue.length,
            totalRevenue: dietitianRevenue.reduce((sum, d) => sum + d.totalRevenue, 0)
        });
    } catch (error) {
        console.error('Error fetching dietitian revenue:', error);
        res.status(500).json({ message: 'Error fetching dietitian revenue' });
    }
};

// Get user-specific revenue (subscription payments)
exports.getUserRevenue = async (req, res) => {
    try {
        // Get all subscription payments with user information
        const payments = await Payment.find({ paymentStatus: { $in: ['success', 'completed'] } })
            .populate('userId', 'name')
            .select('userId userName amount planType billingCycle createdAt');

        // Group revenue by user
        const userRevenueMap = {};

        payments.forEach(payment => {
            const userId = payment.userId?._id?.toString() || 'unknown';
            const userName = payment.userId?.name || payment.userName || 'Unknown User';
            const amount = payment.amount || 0;

            if (!userRevenueMap[userId]) {
                userRevenueMap[userId] = {
                    userId,
                    userName,
                    totalRevenue: 0,
                    subscriptionCount: 0,
                    plans: []
                };
            }

            userRevenueMap[userId].totalRevenue += amount;
            userRevenueMap[userId].subscriptionCount += 1;
            userRevenueMap[userId].plans.push({
                planType: payment.planType,
                billingCycle: payment.billingCycle,
                amount: amount
            });
        });

        // Convert to array and sort by revenue (descending)
        const userRevenue = Object.values(userRevenueMap)
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        res.json({
            data: userRevenue,
            totalUsers: userRevenue.length,
            totalRevenue: userRevenue.reduce((sum, u) => sum + u.totalRevenue, 0)
        });
    } catch (error) {
        console.error('Error fetching user revenue:', error);
        res.status(500).json({ message: 'Error fetching user revenue' });
    }
};
