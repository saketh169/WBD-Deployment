# 🛡️ Backend Third-Party Libraries & Middleware Guide

> Complete technical breakdown of every third-party package, cloud integration, security middleware, and external service used across the NutriConnect Express backend. Includes purpose, file location, and runnable code examples directly from the codebase.

---

## 📋 Quick Dependency Matrix

| Package | Category | Primary Location | Purpose |
| :--- | :--- | :--- | :--- |
| **`cloudinary`** | Cloud Storage | `backend/src/controllers/profileController.js` | Cloud image storage for user/dietitian profile avatars |
| **`express-rate-limit`** | Security Middleware | `backend/src/middlewares/rateLimiter.js` | Brute-force & DDoS rate limiting for OTP and Auth |
| **`razorpay`** | Payment Gateway | `backend/src/services/paymentService.js` | Orders, payments, subscriptions, and webhook signatures |
| **`google-auth-library`** | OAuth Authentication | `backend/src/controllers/authController.js` | Validates Google ID tokens for One-Tap / OAuth sign-in |
| **`@google/generative-ai`** | AI / LLM Engine | `backend/src/controllers/chatbotController.js` | Gemini 2.5 Flash virtual dietary & nutrition assistant |
| **`ioredis`** | In-Memory Cache | `backend/src/utils/redisClient.js` | Cache & distributed lock (`SET NX EX`) for double-booking prevention |
| **`@elastic/elasticsearch`** | Search Engine | `backend/src/utils/elasticClient.js` | Full-text fuzzy search for dietitians and blog articles |
| **`multer`** | File Upload Handling | `backend/src/middlewares/uploadMiddleware.js` | Multipart form-data handling for images and reports |
| **`nodemailer`** | Email Delivery | `backend/src/services/emailService.js` | Sends transactional HTML emails (OTP, receipts, password reset) |
| **`socket.io`** | WebSockets | `backend/src/utils/socket.js` | Real-time bi-directional messaging between clients & dietitians |
| **`jsonwebtoken`** | Authorization | `backend/src/middlewares/authMiddleware.js` | Generates and verifies HMAC SHA256 JWT access tokens |
| **`bcrypt` / `bcryptjs`** | Cryptography | `backend/src/models/userModel.js` | Salted password hashing and comparison |
| **`helmet` & `cors`** | HTTP Security | `backend/src/server.js` | HTTP security headers & Cross-Origin Resource Sharing control |
| **`swagger-ui-express`** | Documentation | `backend/src/server.js` | Interactive OpenAPI 3.0 API testing interface on `/api-docs` |
| **`csv-parser`** | Data Ingestion | `backend/src/controllers/employeeController.js` | Streams and parses bulk employee onboarding CSV files |
| **`node-cron`** | Background Worker | `backend/src/utils/cronJobs.js` | Scheduled tasks (daily quota reset, expired hold cleanup) |

---

## 1. Cloudinary (`cloudinary` & `streamifier`)

* **Category**: Cloud Media Storage
* **Files Where Used**:
  * [`backend/src/controllers/profileController.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/controllers/profileController.js)
  * [`backend/src/routes/profileRoutes.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/routes/profileRoutes.js)
* **Why It Is Used**: Rather than storing heavy binary images on the local server filesystem (which bloats server disks and breaks multi-container scaling), images are streamed directly to Cloudinary's global CDN.
* **How It Works**: Multer captures the uploaded image into memory (`req.file.buffer`). `streamifier` converts this buffer into a readable Node.js stream, and Cloudinary uploads it and returns an optimized HTTPS URL.

### Code Example:
```javascript
// backend/src/controllers/profileController.js
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure API credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image buffer directly from memory stream
const uploadToCloudinary = (buffer, folder = 'avatars') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `nutriconnect/${folder}`, transformation: [{ width: 500, height: 500, crop: 'limit' }] },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};
```

---

## 2. Rate Limiting (`express-rate-limit`)

* **Category**: Defensive Security Middleware
* **Files Where Used**:
  * [`backend/src/middlewares/rateLimiter.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/middlewares/rateLimiter.js)
  * [`backend/src/routes/authRoutes.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/routes/authRoutes.js)
* **Why It Is Used**: Protects sensitive endpoints (OTP sending, password resets, login attempts) from automated brute-force attacks and SMS/Email exhaustion abuse.
* **How It Works**: Tracks client IP requests inside memory windows and returns HTTP `429 Too Many Requests` when limits are exceeded.

### Code Example:
```javascript
// backend/src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Strict limit for OTP requests: max 3 requests every 5 minutes
exports.otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    isError: true,
    success: false,
    message: 'Too many OTP requests from this IP. Please wait 5 minutes before retrying.'
  }
});

// Auth brute-force protection: max 10 login attempts every 15 minutes
exports.authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    isError: true,
    success: false,
    message: 'Too many login attempts. Account temporarily locked for 15 minutes.'
  }
});
```

---

## 3. Razorpay Payment Gateway (`razorpay`)

* **Category**: Financial Payment Gateway
* **Files Where Used**:
  * [`backend/src/services/paymentService.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/services/paymentService.js)
  * [`backend/src/controllers/paymentController.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/controllers/paymentController.js)
* **Why It Is Used**: Handles consultations and recurring client memberships in Indian Rupees (INR) with RBI compliance.
* **How It Works**: 
  1. Backend generates an order ID with an amount in smallest currency unit (paise).
  2. Frontend checkout modal collects payment from user.
  3. Backend verifies HMAC SHA-256 cryptographic signature to guarantee the payment was not forged.

### Code Example:
```javascript
// backend/src/services/paymentService.js
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1. Create Order
exports.createOrder = async (amountInRupees, receiptId) => {
  const options = {
    amount: amountInRupees * 100, // paise (500 INR = 50000 paise)
    currency: 'INR',
    receipt: receiptId
  };
  return await razorpay.orders.create(options);
};

// 2. Cryptographic Signature Verification
exports.verifyPaymentSignature = (orderId, paymentId, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
};
```

---

## 4. Google OAuth (`google-auth-library`)

* **Category**: Social Authentication / Identity Verification
* **Files Where Used**:
  * [`backend/src/controllers/authController.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/controllers/authController.js)
* **Why It Is Used**: Allows users to sign up and log in securely with their existing Google account with one tap, without storing plain passwords.
* **How It Works**: When user clicks Google Sign-In, Google generates a signed OpenID Connect JWT token. The backend verifies this token with Google's public keys.

### Code Example:
```javascript
// backend/src/controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleAuth = async (credentialToken) => {
  // Validate token directly with Google servers
  const ticket = await googleClient.verifyIdToken({
    idToken: credentialToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  const { email, name, picture, sub: googleId } = payload;

  return { email, name, picture, googleId };
};
```

---

## 5. Google Gemini AI (`@google/generative-ai`)

* **Category**: Generative Artificial Intelligence (LLM)
* **Files Where Used**:
  * [`backend/src/controllers/chatbotController.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/controllers/chatbotController.js)
* **Why It Is Used**: Powers the NutriConnect virtual nutrition assistant with evidence-based diet guidance, meal ideas, and multi-turn conversational memory.
* **How It Works**: Uses `gemini-2.5-flash` with strict system instructions that enforce domain boundaries (food, nutrition, health) and gracefully reject off-topic questions.

### Code Example:
```javascript
// backend/src/controllers/chatbotController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: 'You are NutriConnect virtual nutrition assistant. Answer only food/nutrition questions.'
});

// Multi-turn chat session with prior dialogue history
const chat = model.startChat({ history: formattedPastTurns });
const result = await chat.sendMessage(userQuery);
const botReply = result.response.text();
```

---

## 6. Redis In-Memory Engine (`ioredis`)

* **Category**: Caching & Distributed Concurrency Locking
* **Files Where Used**:
  * [`backend/src/utils/redisClient.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/utils/redisClient.js)
  * [`backend/src/controllers/bookingController.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/controllers/bookingController.js)
* **Why It Is Used**: 
  1. Caches MongoDB queries to respond in **1ms – 2ms** with `X-Cache: HIT`.
  2. Atomic distributed locks (`SET NX EX 600`) to guarantee that two users can never double-book the same dietitian slot simultaneously.

### Code Example:
```javascript
// backend/src/controllers/bookingController.js
const redis = require('../utils/redisClient');

// Atomic Slot Lock: SET key value NX (only if Not eXists) EX (Expires in seconds)
exports.holdSlot = async (dietitianId, slotTime, userId) => {
  const lockKey = `lock:slot:${dietitianId}:${slotTime}`;
  
  // Try to acquire 10-minute hold lock
  const acquired = await redis.set(lockKey, userId, 'NX', 'EX', 600);
  
  if (!acquired) {
    throw new Error('This time slot is currently being held by another client.');
  }
  return true;
};
```

---

## 7. Elasticsearch Engine (`@elastic/elasticsearch`)

* **Category**: Distributed Full-Text Search
* **Files Where Used**:
  * [`backend/src/scripts/syncElastic.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/scripts/syncElastic.js)
  * [`backend/src/utils/elasticClient.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/utils/elasticClient.js)
* **Why It Is Used**: MongoDB regex queries like `{$regex: 'keto'}` perform slow table scans on large datasets. Elasticsearch tokenizes text, supports typo-tolerant fuzzy matching, and searches millions of blogs in milliseconds.

### Code Example:
```javascript
// backend/src/utils/elasticClient.js
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

// Fuzzy blog search
exports.searchBlogs = async (queryText) => {
  const result = await client.search({
    index: 'nutriconnect_blogs',
    body: {
      query: {
        multi_match: {
          query: queryText,
          fields: ['title^3', 'tags^2', 'content'],
          fuzziness: 'AUTO'
        }
      }
    }
  });
  return result.hits.hits.map(h => h._source);
};
```

---

## 8. Multer File Uploader (`multer`)

* **Category**: Multipart Form-Data Parser
* **Files Where Used**:
  * [`backend/src/middlewares/uploadMiddleware.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/middlewares/uploadMiddleware.js)
  * [`backend/src/routes/healthReportRoutes.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/routes/healthReportRoutes.js)
* **Why It Is Used**: Standard Express `bodyParser.json()` cannot read binary file uploads. Multer extracts files from HTTP `multipart/form-data` requests and enforces size limits and MIME-type validation.

### Code Example:
```javascript
// backend/src/middlewares/uploadMiddleware.js
const multer = require('multer');

// Memory storage for Cloudinary streaming (keeps local disk empty)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, WEBP, and PDF files are allowed.'), false);
  }
};

exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB ceiling
  fileFilter
});
```

---

## 9. Transactional Emailer (`nodemailer`)

* **Category**: SMTP Transport Service
* **Files Where Used**:
  * [`backend/src/services/emailService.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/services/emailService.js)
  * [`backend/src/services/otpService.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/services/otpService.js)
* **Why It Is Used**: Dispatches transactional emails including 2FA login verification codes, appointment confirmation cards, and password reset magic links.

### Code Example:
```javascript
// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOTP = async (recipientEmail, otpCode) => {
  const mailOptions = {
    from: `"NutriConnect Health" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: 'Your Verification Code',
    html: `<h3>Your NutriConnect OTP is: <b>${otpCode}</b></h3><p>Valid for 5 minutes.</p>`
  };

  return await transporter.sendMail(mailOptions);
};
```

---

## 10. Real-Time Chat Gateway (`socket.io`)

* **Category**: Real-Time WebSockets
* **Files Where Used**:
  * [`backend/src/utils/socket.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/utils/socket.js)
  * [`backend/src/server.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/server.js)
* **Why It Is Used**: Enables instant, zero-delay messaging between clients and dietitians during consultations without needing continuous HTTP polling.

### Code Example:
```javascript
// backend/src/utils/socket.js
const { Server } = require('socket.io');

exports.initSocket = (httpServer, allowedOrigins) => {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true }
  });

  io.on('connection', (socket) => {
    // Join conversation room
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
    });

    // Handle incoming message and broadcast to room
    socket.on('send_message', (data) => {
      io.to(data.conversationId).emit('receive_message', data);
    });

    socket.on('disconnect', () => { /* Clean up */ });
  });

  return io;
};
```

---

## 11. Authentication & Security Middleware (`jsonwebtoken`, `bcryptjs`, `helmet`, `cors`)

* **Category**: Core Security & Session Integrity
* **Files Where Used**:
  * [`backend/src/middlewares/authMiddleware.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/middlewares/authMiddleware.js)
  * [`backend/src/server.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/backend/src/server.js)
* **Why It Is Used**:
  * **JWT**: Stateless cryptographic user tokens stored in frontend and passed in `Authorization: Bearer <token>`.
  * **Bcrypt**: One-way salt hashing so raw passwords never touch the database.
  * **Helmet**: Sets 14 HTTP headers (X-Frame-Options, CSP, HSTS) to protect against clickjacking and XSS.
  * **CORS**: Enforces that only authorized frontend origins can execute API requests.

### Code Example:
```javascript
// backend/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

exports.authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ isError: true, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ isError: true, message: 'Invalid or expired token' });
  }
};
```

---

*NutriConnect Architecture Reference — Verified and Documented for Production Backend.*
