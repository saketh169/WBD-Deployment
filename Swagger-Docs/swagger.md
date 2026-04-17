# Complete Swagger Documentation Guide for NutriConnect API

## Table of Contents
1. [What is Swagger?](#what-is-swagger)
2. [Current Setup Explained](#current-setup-explained)
3. [Accessing Swagger UI](#accessing-swagger-ui)
4. [Real Project Examples](#real-project-examples)
5. [Step-by-Step Usage Guide](#step-by-step-usage-guide)
6. [JWT Authentication](#jwt-authentication)
7. [File Upload Testing](#file-upload-testing)
8. [HTTP Response Codes](#http-response-codes)
9. [Common Patterns](#common-patterns)
10. [Adding Swagger to New Routes](#adding-swagger-to-new-routes)

---

## What is Swagger?

**Swagger (OpenAPI)** is a tool that automatically generates interactive API documentation from your code. Here's why it matters:

- **Self-documenting APIs** - Your code comments become beautiful, interactive documentation
- **Easy Testing** - Test API endpoints directly in the browser without Postman or cURL
- **Clear Communication** - Shows other developers exactly what parameters each endpoint needs
- **Standardized Format** - Uses OpenAPI 3.0 standard that tools understand universally

### How it works:
1. You write `@swagger` comments above your route handlers
2. The `swagger-jsdoc` npm package reads these comments
3. The `swagger-ui-express` package displays an interactive HTML interface
4. Users can click "Try it out" to test endpoints live

---

## Current Setup Explained

Your `backend/src/server.js` already has Swagger configured. Here's how:

### Step 1: Packages Already Installed
```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
```

### Step 2: Configuration Object
```javascript
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',           // OpenAPI version
    info: {
      title: 'NutriConnect API',
      version: '1.0.0',
      description: 'Complete API documentation for NutriConnect'
    }
  },
  // 'apis' array tells swagger-jsdoc which route files to scan
  apis: [
    './src/routes/authRoutes.js',
    './src/routes/bookingRoutes.js',
    './src/routes/healthReportRoutes.js',
    // ... 19 other route files
  ]
};
```

### Step 3: Generate Documentation
```javascript
const swaggerDocs = swaggerJsdoc(swaggerOptions);
```
This scans all the route files and extracts `@swagger` comments.

### Step 4: Serve UI
```javascript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
```
This serves the interactive UI at `/api-docs` endpoint.

**Bottom line:** Your server automatically finds all `@swagger` comments in route files and displays them as interactive docs. No manual updating needed!

---

## Accessing Swagger UI

### Quick Start
1. Start your server:
   ```bash
   npm start
   # or from backend folder:
   cd backend && npm start
   ```

2. Open in your browser:
   ```
   http://localhost:5000/api-docs
   ```

3. You'll see an interactive interface with all endpoints organized by tags (Auth, Bookings, Health Reports, etc.)

### What you see:
- **Left sidebar** - List of all endpoints grouped by feature
- **Main area** - Endpoint details: description, parameters, required fields, example responses
- **Try it out button** - Click to test endpoints live
- **Authorize button** - Top right, to add JWT tokens for protected endpoints

---

## Real Project Examples

### Example 1: Simple GET Endpoint (No Authentication)

**Your route in `bookingRoutes.js`:**
```javascript
/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     summary: Get specific booking details
 *     description: Retrieve detailed information about a single booking by its ID
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB booking ID
 *         example: "67a1b2c3d4e5f6g7h8i9j0k1"
 *     responses:
 *       200:
 *         description: Booking found and returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 clientId:
 *                   type: string
 *                 dietitianId:
 *                   type: string
 *                 date:
 *                   type: string
 *                 time:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, confirmed, completed, cancelled]
 *       404:
 *         description: Booking not found
 */
app.get('/:bookingId', getBookingById);
```

**In Swagger UI:**
- Shows endpoint path: `/api/bookings/{bookingId}`
- Shows bookingId is required path parameter
- Shows example: "67a1b2c3d4e5f6g7h8i9j0k1"
- Shows expected response format
- Click "Try it out", enter booking ID, click "Execute" to test

---

### Example 2: Authenticated Endpoint with JSON Body

**Your route in `bookingRoutes.js`:**
```javascript
/**
 * @swagger
 * /api/bookings/create:
 *   post:
 *     summary: Create new booking
 *     description: Client books a consultation with a dietitian. Validates subscription limits before creation.
 *     tags:
 *       - Bookings
 *     security:
 *       - BearerAuth: []  # Requires JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - dietitianId
 *               - date
 *               - time
 *             properties:
 *               clientId:
 *                 type: string
 *                 example: "6981ac1ca08b578ae3a029b8"
 *               dietitianId:
 *                 type: string
 *                 example: "691f30c66e1c4fe67755361c"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-04-15"
 *               time:
 *                 type: string
 *                 example: "14:30"
 *               notes:
 *                 type: string
 *                 example: "Discuss weight loss goals"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Subscription limit exceeded or invalid data
 *       401:
 *         description: Unauthorized - JWT token required
 */
app.post('/create', authenticateJWT, checkBookingLimit, createBooking);
```

**Key parts:**
- `security: - BearerAuth: []` - Tells Swagger this endpoint requires login
- `requestBody` - Defines what JSON data endpoint accepts
- `required` array - Marks which fields must be provided
- `example` - Shows sample values in Swagger UI

---

### Example 3: File Upload Endpoint

**Your route in `healthReportRoutes.js`:**
```javascript
/**
 * @swagger
 * /api/health-reports/create:
 *   post:
 *     summary: Create health report (Dietitian → Client)
 *     description: Dietitian creates and sends health assessment reports to clients. Supports uploading medical documents and test results.
 *     tags:
 *       - Health Reports
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:  # File upload format
 *           schema:
 *             type: object
 *             required:
 *               - dietitianId
 *               - clientId
 *               - title
 *               - document
 *             properties:
 *               dietitianId:
 *                 type: string
 *                 example: "691f30c66e1c4fe67755361c"
 *               clientId:
 *                 type: string
 *                 example: "6981ac1ca08b578ae3a029b8"
 *               title:
 *                 type: string
 *                 example: "Full Body Health Assessment"
 *               description:
 *                 type: string
 *                 example: "Comprehensive health analysis including BMI, metabolic rate calculations"
 *               document:
 *                 type: string
 *                 format: binary  # Tells Swagger this is a file upload
 *               testResults:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Health report created and sent to client
 *       400:
 *         description: Missing required fields or invalid file
 */
app.post('/create', authenticateJWT, healthReportUploadFields, createHealthReport);
```

**Key differences:**
- `content: multipart/form-data` - Instead of application/json
- `format: binary` - Tells Swagger this is a file field
- File fields appear as "Choose File" buttons in Swagger UI

---

### Example 4: Endpoint with Query Parameters

**Your route in `bookingRoutes.js`:**
```javascript
/**
 * @swagger
 * /api/bookings/user/{userId}/booked-slots:
 *   get:
 *     summary: Get booked slots on specific date
 *     description: Retrieve all consultation slots already booked for a user on a particular date. Useful for calendar display.
 *     tags:
 *       - Bookings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         example: "6981ac1ca08b578ae3a029b8"
 *       - in: query  # Query parameter (goes in URL as ?date=2024-04-15)
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         example: "2024-04-15"
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *         required: false
 *         example: "Asia/Kolkata"
 *     responses:
 *       200:
 *         description: List of booked time slots
 */
app.get('/user/:userId/booked-slots', authenticateJWT, getBookedSlots);
```

**What happens in browser:**
- URL becomes: `/api/bookings/user/6981ac1ca08b578ae3a029b8/booked-slots?date=2024-04-15&timezone=Asia/Kolkata`
- `userId` goes in the path
- `date` and `timezone` go in the query string

---

### Example 5: PUT/PATCH - Status Update Endpoint

**Your route in `labReportRoutes.js`:**
```javascript
/**
 * @swagger
 * /api/lab-reports/lab/{reportId}/status:
 *   put:
 *     summary: Update lab report status
 *     description: Dietitian reviews lab report and updates status with feedback. Status flow: submitted → pending_review → reviewed.
 *     tags:
 *       - Lab Reports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         schema:
 *           type: string
 *         required: true
 *         example: "67a1b2c3d4e5f6g7h8i9j0k1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending_review, reviewed, needs_retesting]
 *                 example: "reviewed"
 *               feedback:
 *                 type: string
 *                 example: "Results show vitamin D deficiency. Please supplement as discussed."
 *               recommendations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Take vitamin D3 2000IU daily", "Increase calcium intake"]
 *     responses:
 *       200:
 *         description: Lab report status updated successfully
 *       404:
 *         description: Lab report not found
 */
app.put('/lab/:reportId/status', authenticateJWT, updateLabReportStatus);
```

**Key features:**
- `enum` - Shows users the exact accepted values in a dropdown
- Path parameter (`reportId`) identifies which report to update
- Body contains the new values to set

---

## Step-by-Step Usage Guide

### Testing a Simple GET Endpoint

1. **Start your server:**
   ```bash
   cd backend
   npm start
   ```

2. **Open Swagger UI:**
   - Go to: `http://localhost:5000/api-docs`
   - You should see the interactive interface

3. **Find Bookings section** (scroll down or use Ctrl+F)

4. **Click on GET `/api/bookings/user/{userId}`**
   - The section expands showing all details

5. **Click the "Try it out" button** (blue button on the right)
   - Fields become editable

6. **Enter a booking ID:**
   - Use test ID: `6981ac1ca08b578ae3a029b8`
   - Or use any real booking ID from your database

7. **Click "Execute"**
   - Scroll down to see the response
   - Should show: status 200 with booking data
   - Or status 404 if booking doesn't exist

### Testing a Protected (Authenticated) Endpoint

**For endpoints requiring JWT token:**

#### Step 1: Get a JWT Token

1. **Find Auth section** in Swagger UI
2. **Click on POST `/api/signin/user`**
3. **Click "Try it out"**
4. **Enter credentials:**
   ```json
   {
     "email": "user2@gmail.com",
     "password": "password123"
   }
   ```
5. **Click "Execute"**
6. **Copy the token** from the response:
   - Look for `"token": "eyJhbGc..."`
   - Copy everything between the quotes

#### Step 2: Authorize Swagger

1. **Click blue "Authorize" button** at the very top of page
2. **Paste your token** in the format:
   ```
   Bearer eyJhbGc...
   ```
   (The word "Bearer" + space + your token from step 1)
3. **Click "Authorize"** button in the modal
4. **Click "Close"**

#### Step 3: Test Protected Endpoint

1. **Find Bookings → POST `/api/bookings/create`**
2. **Click "Try it out"**
3. **Enter request body:**
   ```json
   {
     "clientId": "6981ac1ca08b578ae3a029b8",
     "dietitianId": "691f30c66e1c4fe67755361c",
     "date": "2024-04-20",
     "time": "14:30",
     "notes": "Discuss weight management"
   }
   ```
4. **Click "Execute"**
5. **See response** - Should show 201 (created) or error details

---

## JWT Authentication

### Understanding JWT in Swagger

**JWT (JSON Web Token)** is a security system. Here's the process:

```
1. User signs in with email + password
                    ↓
2. Server creates a secure token (JWT)
                    ↓
3. User stores this token
                    ↓
4. For protected endpoints, user sends token with request
                    ↓
5. Server verifies token and processes request
```

### How Swagger Uses JWT

Your `server.js` defines JWT security:
```javascript
components: {
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
}
```

In route files, endpoints using `authenticateJWT` middleware add:
```javascript
security:
  - BearerAuth: []  // This endpoint requires JWT
```

### Test Credentials (Already Exist in Database)

**Client Login:**
```
Email: user2@gmail.com
Password: password123
```

**Dietitian Login:**
```
Email: dietitian1@gmail.com
Password: password123
```

**Admin Login:**
```
Email: admin1@gmail.com
Password: password123
```

**How to use:**
1. Go to Swagger UI → Auth → POST `/api/signin/user`
2. Enter email and password from above
3. Copy returned token
4. Click "Authorize" button, paste token
5. Now all protected endpoints work

---

## File Upload Testing

### Testing Health Report Upload

**In Swagger UI:**

1. Find **Health Reports → POST `/api/health-reports/create`**
2. Click **"Try it out"**
3. Fill in form fields:
   - **dietitianId:** `691f30c66e1c4fe67755361c`
   - **clientId:** `6981ac1ca08b578ae3a029b8`
   - **title:** `Full Health Assessment`
   - **description:** `Initial consultation results`
4. **For document upload:**
   - Click **"Choose File"** button
   - Select any PDF, image, or document from your computer
5. **Click "Execute"**
6. **Check response:**
   - Status 201 = success, file uploaded
   - Status 400 = something missing
   - Response shows file path where document was stored

### Important Notes for File Uploads

- **Supported formats:** PDF, JPG, PNG, DOC, DOCX
- **File size limit:** 10MB per file
- **Multipart vs JSON:** File endpoints use `multipart/form-data`, NOT `application/json`
- **In Swagger UI:** You see "Choose File" buttons instead of text fields
- **Storage location:** Files saved to `backend/uploads/` directory

---

## HTTP Response Codes

**What different numbers mean:**

| Code | Meaning | Example |
|------|---------|---------|
| **200** | OK - Request succeeded | GET booking returns data |
| **201** | Created - New resource created | POST creates booking |
| **204** | No Content - Success but no data to return | DELETE successful |
| **400** | Bad Request - Invalid data sent | Missing required field |
| **401** | Unauthorized - JWT token missing/invalid | Forgot to add authorization |
| **403** | Forbidden - Authenticated but not allowed | User can't access this resource |
| **404** | Not Found - Resource doesn't exist | Booking ID doesn't exist |
| **409** | Conflict - Request contradicts existing data | Trying to book slot already taken |
| **422** | Unprocessable Entity - Validation failed | Email already registered |
| **429** | Too Many Requests - Rate limited | Too many rapid requests |
| **500** | Internal Server Error - Server problem | Database error |
| **503** | Service Unavailable - Server down | Server restarting |

**In Swagger UI:**
- If you see green status code = success
- If you see red status code = error
- Response shows exact error message explaining the problem

---

## Common Patterns

### Pattern 1: GET All Items
```javascript
/**
 * @swagger
 * /api/meal-plans/user/{userId}:
 *   get:
 *     summary: Get user's meal plans
 *     tags:
 *       - Meal Plans
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
 *         description: Array of meal plans
 */
```

### Pattern 2: POST with Complex Nested Data
```javascript
/**
 * @swagger
 * /api/meal-plans/{planId}/assign:
 *   post:
 *     summary: Assign plan to dates
 *     tags:
 *       - Meal Plans
 *     security:
 *       - BearerAuth: []
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
 *                 example: ["2024-04-15", "2024-04-16"]
 */
```

### Pattern 3: DELETE with Soft Delete
```javascript
/**
 * @swagger
 * /api/meal-plans/{planId}:
 *   delete:
 *     summary: Soft delete meal plan
 *     description: Marks plan as inactive without removing data. Client can no longer see plan.
 *     tags:
 *       - Meal Plans
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Plan deleted successfully
 */
```

### Pattern 4: PATCH for Partial Update
```javascript
/**
 * @swagger
 * /api/bookings/{bookingId}/status:
 *   patch:
 *     summary: Update booking status
 *     tags:
 *       - Bookings
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
 *                 enum: [confirmed, completed, cancelled]
 *     responses:
 *       200:
 *         description: Status updated
 */
```

---

## Adding Swagger to New Routes

### Complete Template for New Route File

**File: `backend/src/routes/newFeatureRoutes.js`**

```javascript
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { createFeature, getFeature } = require('../controllers/newFeatureController');

/**
 * @swagger
 * /api/new-feature:
 *   post:
 *     summary: Create new feature
 *     description: Brief description of what this endpoint does and why it's useful
 *     tags:
 *       - New Feature
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Example Name"
 *               description:
 *                 type: string
 *                 example: "Example description"
 *     responses:
 *       201:
 *         description: Feature created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateJWT, createFeature);

/**
 * @swagger
 * /api/new-feature/{id}:
 *   get:
 *     summary: Get feature by ID
 *     description: Retrieve detailed information about a specific feature
 *     tags:
 *       - New Feature
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *     responses:
 *       200:
 *         description: Feature found
 *       404:
 *         description: Feature not found
 */
router.get('/:id', authenticateJWT, getFeature);

module.exports = router;
```

### Add to server.js

In `backend/src/server.js`, add:

1. **Import the route:**
   ```javascript
   const newFeatureRoutes = require('./routes/newFeatureRoutes');
   ```

2. **Add to `swaggerOptions.apis` array:**
   ```javascript
   apis: [
     // ... existing routes ...
     './src/routes/newFeatureRoutes.js',  // Add this line
   ]
   ```

3. **Mount the route:**
   ```javascript
   app.use('/api/new-feature', newFeatureRoutes);
   ```

4. **Add tag to `swaggerOptions.tags`:**
   ```javascript
   tags: [
     // ... existing tags ...
     { name: 'New Feature', description: 'New feature operations' },
   ]
   ```

5. **Restart server:**
   ```bash
   npm start
   ```

6. **View in Swagger UI:**
   - Go to http://localhost:5000/api-docs
   - Your new endpoints appear automatically!

---

## Summary

You now have:
✅ Swagger automatically generating docs from your code
✅ Interactive UI to test all endpoints
✅ JWT authentication integrated
✅ File upload support
✅ Clear error messages and response codes
✅ Template for adding new endpoints

**Key commands:**
```bash
# Start server
npm start

# Access Swagger UI
http://localhost:5000/api-docs

# Test credentials
Email: user2@gmail.com
Password: password123
```

---

**Questions?**
- Check the endpoint tags to find what you're looking for
- Use "Try it out" to test before using in frontend
- Swagger comments stay updated with code - no manual sync needed
- Status codes in responses help debugging

---

## Complete JSDoc Comments Guide

### What is JSDoc?

**JSDoc** is a way to write special comments in JavaScript that:
- Describe what your code does
- Document parameters and return values
- Generate Swagger documentation automatically
- Help other developers understand your code

**Format:** Comments start with `/**` and end with `*/`

```javascript
/**
 * This is a JSDoc comment
 * Multiple lines use asterisks
 */
```

---

## JSDoc for Swagger Routes

Your route files use `@swagger` JSDoc comments. Here's how to write them:

### Basic Structure

Every endpoint has this structure:

```javascript
/**
 * @swagger
 * /api/path:
 *   methodname:
 *     summary: One line description
 *     description: Longer description
 *     tags: [Tag Name]
 *     security: Security requirements
 *     parameters: Request parameters
 *     requestBody: Request data format
 *     responses: What you get back
 */
router.method('/path', handler);
```

---

## Real Examples from NutriConnect

### Example 1: Simple GET Endpoint (No Authentication Needed)

**From your `bookingRoutes.js`:**

```javascript
/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     tags: ['Bookings']                              // Category in Swagger UI
 *     summary: Get booking details                    // Appears in endpoint list
 *     description: Retrieve detailed information about a single booking by its ID
 *     parameters:                                      // What user provides
 *       - in: path                                     // Goes in URL path
 *         name: bookingId                              // Variable name in URL
 *         required: true                               // Must be provided
 *         schema:
 *           type: string                               // Data type
 *         example: "67a1b2c3d4e5f6g7h8i9j0k1"        // Sample value shown in UI
 *         description: MongoDB booking ID
 *     responses:                                       // What comes back
 *       200:                                           // Success status code
 *         description: Booking found and returned
 *       404:                                           // Error status code
 *         description: Booking not found
 */
router.get('/:bookingId', getBookingById);
```

**Breakdown:**
- `tags` - Groups endpoints (users see "Bookings" section)
- `summary` - Short title
- `description` - Longer explanation
- `parameters` - What data the endpoint needs
- `responses` - What different status codes mean

---

### Example 2: POST Request with JSON Body (With Authentication)

**From your `bookingRoutes.js`:**

```javascript
/**
 * @swagger
 * /api/bookings/check-limits:
 *   post:
 *     tags: ['Bookings']
 *     summary: Check booking limits (before booking)
 *     description: Verifies if user has available bookings within their subscription plan and checks advance booking day restrictions
 *     security:                                        // Requires authentication
 *       - BearerAuth: []
 *     requestBody:                                     // User sends this data
 *       required: true                                 // Must include body
 *       content:
 *         application/json:                            // Format: JSON (not file upload)
 *           schema:
 *             type: object                             // Body is an object
 *             properties:                              // Available fields
 *               userId:
 *                 type: string                         // String type
 *                 example: "6981ac1ca08b578ae3a029b8"
 *               date:
 *                 type: string
 *                 format: date                         // Specifically a date (YYYY-MM-DD)
 *                 example: "2024-04-15"
 *     responses:
 *       200:
 *         description: Booking limit check result
 *       403:
 *         description: Booking limit reached or subscription required
 */
router.post("/check-limits", authenticateJWT, checkBookingLimit, async (req, res) => {
  // Route handler code here
});
```

**Key points:**
- `security: - BearerAuth: []` means endpoint requires JWT token
- `requestBody` tells what data the endpoint accepts
- `properties` lists all fields the endpoint can receive
- `example` shows sample value in Swagger UI

---

### Example 3: File Upload Endpoint (Multipart Form-Data)

**From your `healthReportRoutes.js`:**

```javascript
/**
 * @swagger
 * /api/health-reports/create:
 *   post:
 *     tags: ['Health Reports']
 *     summary: Submit health report (dietitian to client)
 *     description: Dietitian creates and sends a health report to a client with findings, recommendations, and attached files
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:                         // File upload format (NOT JSON!)
 *           schema:
 *             type: object
 *             required:                                // These fields MUST be provided
 *               - dietitianId
 *               - clientId
 *               - title
 *             properties:
 *               dietitianId:
 *                 type: string
 *                 example: "691f30c66e1c4fe67755361c"
 *               clientId:
 *                 type: string
 *                 example: "6981ac1ca08b578ae3a029b8"
 *               title:
 *                 type: string
 *                 example: "Full Health Assessment"
 *               diagnosis:
 *                 type: string
 *                 example: "Vitamin D deficiency"
 *               findings:
 *                 type: string
 *                 example: "Blood test shows low levels"
 *               dietaryRecommendations:
 *                 type: string
 *                 example: "Increase dairy intake"
 *               healthReportFile1:
 *                 type: string
 *                 format: binary                        // Tells Swagger this is a FILE (not text)
 *               healthReportFile2:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Health report created successfully
 *       400:
 *         description: Missing required fields or invalid file
 */
router.post('/create', authenticateJWT, healthReportUploadFields, createHealthReport);
```

**Important differences:**
- `multipart/form-data` - Used ONLY for file uploads
- `format: binary` - Marks fields as file uploads (shows "Choose File" button)
- Regular text fields don't use `binary`
- Can mix file and text fields in same endpoint

---

### Example 4: GET with Multiple Path Parameters

**From your `healthReportRoutes.js`:**

```javascript
/**
 * @swagger
 * /api/health-reports/client/{clientId}/dietitian/{dietitianId}:
 *   get:
 *     tags: ['Health Reports']
 *     summary: Retrieve health reports (dietitian view)
 *     description: Dietitian retrieves all health reports sent to a specific client
 *     security:
 *       - BearerAuth: []
 *     parameters:                                      // Multiple parameters
 *       - in: path
 *         name: clientId                               // First ID in path
 *         required: true
 *         schema:
 *           type: string
 *           example: "6981ac1ca08b578ae3a029b8"
 *       - in: path
 *         name: dietitianId                            // Second ID in path
 *         required: true
 *         schema:
 *           type: string
 *           example: "691f30c66e1c4fe67755361c"
 *     responses:
 *       200:
 *         description: Array of health reports
 *       404:
 *         description: Reports not found
 */
router.get('/client/:clientId/dietitian/:dietitianId', authenticateJWT, getHealthReports);
```

**Note:**
- Each parameter needs separate entry in `parameters` array
- Path parameters go in URL: `/api/health-reports/client/[clientId]/dietitian/[dietitianId]`
- Parameter names must match the ones in the route (`:clientId`, `:dietitianId`)

---

### Example 5: PUT Request with Status Update

**From your `labReportRoutes.js`:**

```javascript
/**
 * @swagger
 * /api/lab-reports/lab/{reportId}/status:
 *   put:
 *     tags: ['Lab Reports']
 *     summary: Update lab report status
 *     description: Dietitian reviews lab report and updates status with feedback. Status flow: submitted → pending_review → reviewed.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67a1b2c3d4e5f6g7h8i9j0k1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:                                // These fields are mandatory
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending_review, reviewed, needs_retesting]  // Only these values allowed
 *                 example: "reviewed"
 *               feedback:
 *                 type: string
 *                 example: "Results show vitamin D deficiency. Please supplement."
 *               recommendations:
 *                 type: array                          // This is a list
 *                 items:
 *                   type: string                       // Each item is a string
 *                 example: ["Take vitamin D3 2000IU daily", "Increase calcium intake"]
 *     responses:
 *       200:
 *         description: Lab report status updated successfully
 *       404:
 *         description: Lab report not found
 */
router.put('/lab/:reportId/status', authenticateJWT, updateLabReportStatus);
```

**New concepts:**
- `enum` - List of ONLY allowed values (shows as dropdown in Swagger UI)
- `array` - The field contains a list
- `items: type: string` - Each item in array is a string
- `required` array - Fields that MUST be provided

---

### Example 6: POST with Array Parameter (Meal Plan Dates)

**From your `mealPlanRoutes.js`:**

```javascript
/**
 * @swagger
 * /api/meal-plans/{planId}/assign:
 *   post:
 *     tags: ['Meal Plans']
 *     summary: Assign meal plan to dates
 *     description: Assign an existing meal plan to specific calendar dates. Multiple dates can be assigned in one request.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67a1b2c3d4e5f6g7h8i9j0k1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dates
 *             properties:
 *               dates:
 *                 type: array                          // Array of dates
 *                 items:
 *                   type: string
 *                   format: date                       // Each date is YYYY-MM-DD format
 *                 example: ["2024-04-15", "2024-04-16", "2024-04-17"]
 *     responses:
 *       200:
 *         description: Meal plan assigned to dates successfully
 *       400:
 *         description: Invalid dates or plan not found
 */
router.post('/:planId/assign', authenticateJWT, assignMealPlanDates);
```

**Array handling:**
- `type: array` - Field is a list
- `items: type: string` - Each item is a string
- `format: date` - Each string is a date (YYYY-MM-DD)
- `example: [...]` - Shows sample array in Swagger UI

---

### Example 7: DELETE Endpoint (Soft Delete)

**From your `mealPlanRoutes.js`:**

```javascript
/**
 * @swagger
 * /api/meal-plans/{planId}:
 *   delete:
 *     tags: ['Meal Plans']
 *     summary: Delete meal plan
 *     description: Marks meal plan as inactive (soft delete). Does not remove data from database. Client can no longer see or access the plan.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           example: "67a1b2c3d4e5f6g7h8i9j0k1"
 *     responses:
 *       204:
 *         description: Meal plan deleted successfully (no content returned)
 *       404:
 *         description: Meal plan not found
 */
router.delete('/:planId', authenticateJWT, deleteMealPlan);
```

**Status codes:**
- `200` - Success with response data
- `201` - Created (new resource made)
- `204` - Success with NO data returned (DELETE often uses this)
- `400` - Bad request (user error)
- `404` - Not found

---

## JSDoc Comments for Controllers & Functions

While your routes use `@swagger` comments, you can also add regular JSDoc to functions:

### Function Documentation Pattern

```javascript
/**
 * Creates a new booking for a client with a dietitian
 * @param {Object} req - Express request object
 * @param {string} req.body.clientId - The client's MongoDB ID
 * @param {string} req.body.dietitianId - The dietitian's MongoDB ID
 * @param {string} req.body.date - Booking date (YYYY-MM-DD)
 * @param {string} req.body.time - Booking time (HH:MM)
 * @param {Object} res - Express response object
 * @returns {Object} Response with booking details or error
 */
exports.createBooking = async (req, res) => {
  // ... function code ...
};
```

**Components:**
- First line - What function does
- `@param` - Document each parameter
- `@returns` - What function returns/sends back

---

### Model Comments Pattern

**From your `bookingModel.js`:**

```javascript
// Booking Schema
const BookingSchema = new Schema({
  // User Information
  userId: { 
    type: Schema.Types.ObjectId,    // Reference to other collection
    ref: 'User',
    required: true                   // Must provide this
  },
  username: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true,                  // Must provide
    lowercase: true,                 // Auto-convert to lowercase
    trim: true                       // Remove whitespace
  },
  
  // Consultation Details
  date: { 
    type: Date, 
    required: true 
  },
  consultationType: { 
    type: String, 
    enum: ['Online', 'In-person'],  // Only these values allowed
    required: true 
  },
  
  // Booking Status
  status: { 
    type: String, 
    enum: ['confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'confirmed'             // Default value if not provided
  }
});
```

---

## Complete Swagger Comment Checklist

When writing a Swagger comment, include:

```javascript
/**
 * @swagger
 * /api/path/to/endpoint:
 *   post:                           // ✅ HTTP method (get, post, put, delete, patch)
 *     tags: ['Feature']             // ✅ Category name (must exist in server.js tags)
 *     summary: One line summary     // ✅ Short description
 *     description: Longer info      // ✅ What does it actually do?
 *     security:                     // ✅ If endpoint needs login
 *       - BearerAuth: []
 *     parameters:                   // ✅ If endpoint needs path/query params
 *       - in: path                  // ✅ 'path' or 'query'
 *         name: paramName           // ✅ Must match route parameter
 *         required: true            // ✅ true or false
 *         schema:
 *           type: string            // ✅ 'string', 'number', 'boolean', 'array'
 *         example: "sample value"   // ✅ Sample shown in UI
 *     requestBody:                  // ✅ If endpoint needs data in body (POST, PUT, PATCH)
 *       required: true              // ✅ Body required?
 *       content:
 *         application/json:         // ✅ Use for: JSON data
 *         multipart/form-data:      // ✅ Use for: File uploads
 *           schema:
 *             type: object
 *             required:             // ✅ Mandatory fields list
 *               - field1
 *               - field2
 *             properties:            // ✅ All available fields
 *               fieldName:
 *                 type: string
 *                 example: "value"
 *     responses:                    // ✅ All possible outcomes
 *       200:                        // ✅ Status code
 *         description: Success      // ✅ What this response means
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Not found
 */
```

---

## Data Types Reference

| Type | Example | Use Case |
|------|---------|----------|
| `string` | `"John"`, `"2024-04-15"` | Names, IDs, text |
| `number` | `100`, `99.99` | Age, price, count |
| `boolean` | `true`, `false` | Yes/no, active/inactive |
| `array` | `["item1", "item2"]` | Lists, multiple values |
| `object` | `{name: "John", age: 30}` | Complex data |

---

## Common Mistakes to Avoid

❌ **Wrong - Tag doesn't exist in server.js:**
```javascript
tags: ['Random Tag']  // Will cause warning
```

✅ **Right - Use existing tags:**
```javascript
tags: ['Bookings']  // Already defined in server.js
```

---

❌ **Wrong - JSON body for file upload:**
```javascript
content:
  application/json:  // Wrong for files!
    document:
      type: string
```

✅ **Right - Multipart for files:**
```javascript
content:
  multipart/form-data:  // Correct for files
    schema:
      properties:
        document:
          type: string
          format: binary  // Tells it's a file
```

---

❌ **Wrong - Parameter name doesn't match route:**
```javascript
// Route is: router.get('/:bookingId', handler)
parameters:
  - name: Id  // Should be 'bookingId'
```

✅ **Right - Names match exactly:**
```javascript
// Route is: router.get('/:bookingId', handler)
parameters:
  - name: bookingId  // Matches route
```

---

## Step-by-Step: Adding Swagger to Your Existing Route

### Step 1: Write the Swagger Comment

Before your route handler, add this:

```javascript
/**
 * @swagger
 * /api/bookings/create:
 *   post:
 *     tags: ['Bookings']
 *     summary: Create a new booking
 *     description: Allows clients to book consultations with dietitians
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - dietitianId
 *               - date
 *             properties:
 *               clientId:
 *                 type: string
 *               dietitianId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Invalid data
 */
router.post('/create', authenticateJWT, createBooking);
```

### Step 2: Edit server.js (One time only)

Check if your route file is already in the `apis` array in `swaggerOptions`:

```javascript
apis: [
  // ... other routes ...
  './src/routes/bookingRoutes.js'  // Already included? Good!
]
```

If not, add it.

### Step 3: Restart Server

```bash
npm start
```

### Step 4: Check Swagger UI

Go to `http://localhost:5000/api-docs` and your endpoint appears automatically!

---

## Quick Reference: All Tags in Your Project

These are tags already defined in your `server.js`. Use EXACTLY these names:

```
Auth
Profile
Bookings
Payments
Chatbot
Blog
Meal Plans
Health Reports
Lab Reports
Progress
Analytics
Settings
Notifications
Employee
TeamBoard
ActivityLog
Chat
ContactUs
Status
Verify
Crud
Dietitian
```

**Always match the exact case!** `Bookings` works, `bookings` does not.

---

## Summary: JSDoc Comments

✅ **Swagger comments go ABOVE routes**
- Use `/**` to start and `*/` to end
- Add `@swagger` as first line
- Match endpoint path exactly
- Use existing tags from server.js
- Include parameters, body, and responses
- Add examples for everything
- Use correct `content-type` (json vs multipart)

✅ **Files you edit:**
- `backend/src/routes/*.js` - Add `@swagger` comments here
- `backend/src/server.js` - Routes already added to `apis` array

✅ **Restart server after adding comments**
- `npm start`
- Go to http://localhost:5000/api-docs
- Your endpoints auto-appear!

✅ **Test in Swagger UI:**
- Click "Try it out"
- Fill fields with sample data
- Click "Execute"
- See response and status code
