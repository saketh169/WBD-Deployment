// Load environment variables first (before any other imports that may use process.env)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const connectDB = require('./utils/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const progressRoutes = require('./routes/progressRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const statusRoutes = require('./routes/statusRoutes');
const blogRoutes = require('./routes/blogRoutes');
const { initElastic } = require('./utils/elasticClient');
const contactusRoutes = require('./routes/contactusRoutes');
const crudRoutes = require('./routes/crudRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const dietitianRoutes = require('./routes/dietitianRoutes');
const mealPlanRoutes = require('./routes/mealPlanRoutes');
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const labReportRoutes = require('./routes/labReportRoutes');
const healthReportRoutes = require('./routes/healthReportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const teamBoardRoutes = require('./routes/teamBoardRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const searchRoutes = require('./routes/searchRoutes');
const publicApiRoutes = require('./routes/publicApiRoutes');

// Middleware imports
const { helmetMiddleware, rateLimiter, sanitizeInput } = require('./middlewares/securityMiddleware');
const { requestLogger } = require('./middlewares/loggerMiddleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');
const compression = require('compression');

const app = express();
// Enable response compression 
app.use(compression());

// Trust the first proxy (Docker/Nginx) for correct IP rate-limiting
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// Allowed frontend origins (configure via env for production)
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'];

// --- Middlewares ---
// Connect to the database
connectDB();

// Security middlewares
app.use(helmetMiddleware);
app.use(rateLimiter);

// Request logger
app.use(requestLogger);

// Enable CORS with specific origins
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Parse incoming JSON requests with increased limits for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Sanitize input for XSS protection
app.use(sanitizeInput);

// --- SWAGGER DOCUMENTATION ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NutriConnect API',
      version: '1.0.0',
      description: 'Complete API documentation for NutriConnect - A comprehensive nutrition and diet management platform',
      contact: {
        name: 'NutriConnect Support',
        email: 'support@nutriconnect.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server'
      },
      {
        url: process.env.PRODUCTION_URL || 'https://api.nutriconnect.com',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication and user registration' },
      { name: 'Profile', description: 'User profile management' },
      { name: 'Bookings', description: 'Consultation bookings' },
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Chatbot', description: 'Chatbot interaction' },
      { name: 'Blog', description: 'Blog management' },
      { name: 'Meal Plans', description: 'Meal plan operations' },
      { name: 'Health Reports', description: 'Health report management' },
      { name: 'Lab Reports', description: 'Lab report management' },
      { name: 'Progress', description: 'User progress tracking' },
      { name: 'Analytics', description: 'Platform analytics' },
      { name: 'Settings', description: 'Platform settings' },
      { name: 'Notifications', description: 'Notification management' },
      { name: 'Employee', description: 'Employee management' },
      { name: 'TeamBoard', description: 'Team board operations' },
      { name: 'ActivityLog', description: 'Activity logging' },
      { name: 'Chat', description: 'Real-time messaging' },
      { name: 'ContactUs', description: 'Contact us' },
      { name: 'Status', description: 'Status checks' },
      { name: 'Verify', description: 'Verification operations' },
      { name: 'Crud', description: 'General CRUD operations' },
      { name: 'Dietitian', description: 'Dietitian management' },
      { name: 'Search', description: 'Global search across the platform' },
      { name: 'B2B Public API', description: 'Public APIs for partner integrations (B2B)' }
    ]
  },
  apis: [
    './src/routes/authRoutes.js',
    './src/routes/profileRoutes.js',
    './src/routes/bookingRoutes.js',
    './src/routes/paymentRoutes.js',
    './src/routes/chatbotRoutes.js',
    './src/routes/blogRoutes.js',
    './src/routes/mealPlanRoutes.js',
    './src/routes/healthReportRoutes.js',
    './src/routes/labReportRoutes.js',
    './src/routes/progressRoutes.js',
    './src/routes/analyticsRoutes.js',
    './src/routes/settingsRoutes.js',
    './src/routes/notificationRoutes.js',
    './src/routes/employeeRoutes.js',
    './src/routes/teamBoardRoutes.js',
    './src/routes/activityLogRoutes.js',
    './src/routes/chatRoutes.js',
    './src/routes/contactusRoutes.js',
    './src/routes/statusRoutes.js',
    './src/routes/verifyRoutes.js',
    './src/routes/crudRoutes.js',
    './src/routes/dietitianRoutes.js',
    './src/routes/searchRoutes.js',
    './src/routes/publicApiRoutes.js'
  ]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// --- API Routes ---
// Auth routes mounted at '/api' for signup and signin
app.use('/api', authRoutes);

// Profile routes mounted at '/api' for profile image operations
app.use('/api', profileRoutes);

// Progress routes mounted at '/api'
app.use('/api', progressRoutes);

// Chatbot routes mounted at '/api/chatbot'
app.use('/api/chatbot', chatbotRoutes);

// Verify routes mounted at '/api/verify'
app.use('/api/verify', verifyRoutes);

// Status routes mounted at '/api/status'
app.use('/api/status', statusRoutes);

// Blog routes mounted at '/api/blogs'
app.use('/api/blogs', blogRoutes);

// Contact us routes mounted at '/api/contact'
app.use('/api/contact', contactusRoutes);

// Booking routes mounted at '/api/bookings'
app.use('/api/bookings', bookingRoutes);

// Dietitian routes mounted at '/api'
app.use('/api', dietitianRoutes);

// CRUD routes mounted at '/api' for admin user management
app.use('/api', crudRoutes);

// Meal plan routes mounted at '/api/meal-plans'
app.use('/api/meal-plans', mealPlanRoutes);

// Chat routes mounted at '/api/chat'
app.use('/api/chat', chatRoutes);

// Payment routes mounted at '/api/payments'
app.use('/api/payments', paymentRoutes);

// Lab report routes mounted at '/api/lab-reports'
app.use('/api/lab-reports', labReportRoutes);

// Health report routes mounted at '/api/health-reports'
app.use('/api/health-reports', healthReportRoutes);

// Analytics routes mounted at '/api'
app.use('/api', analyticsRoutes);

// Settings routes mounted at '/api/settings'
app.use('/api/settings', settingsRoutes);

// Notification routes mounted at '/api/analytics'
app.use('/api/analytics', notificationRoutes);

// Employee routes mounted at '/api/employees'
app.use('/api/employees', employeeRoutes);

// Activity Log routes mounted at '/api/organization'
app.use('/api/organization', activityLogRoutes);

// Team Board routes mounted at '/api/teamboard'
app.use('/api/teamboard', teamBoardRoutes);

// Search routes mounted at '/api/search'
app.use('/api/search', searchRoutes);

// Public B2B API routes mounted at '/api/v1/public'
app.use('/api/v1/public', publicApiRoutes);

// Health check endpoint for frontend error handling
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Root route for health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Nutri-Connect Backend Server is running' });
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Initialize Cron Jobs
require('./utils/cronJobs').startCronJobs();

// Start server
if (require.main === module) {
  const server = app.listen(PORT, async () => {
    // Initialize Elasticsearch globally
    await initElastic();
    
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });

  // Initialize Socket.io
  require('./utils/socket').init(server, ALLOWED_ORIGINS);
}

module.exports = app;
