# Project Code Audit: `hold` Var, `model` Var, and `Socket.IO`

This document details all occurrences, line numbers, and exact code snippets across **Backend** and **Frontend** for:
1. **The `hold` Variable** (Slot hold & payment lock duration)
2. **The `model` / `gemini` Variable** (Google Gemini AI Model integration)
3. **Socket.IO Integration** (WebSockets for real-time messaging, bookings, and activities)

---

## 1. Files Using the `hold` Variable

The `hold` variable defines the lock window (in seconds) for preventing concurrent double-booking of consultation slots and payment initialization locks in Redis and React state.

### Backend

#### 1. `backend/src/controllers/bookingController.js`
* **Definition (Line 12)**:
  ```javascript
  const hold = 30; // Hold duration in seconds
  ```
* **Usages**:
  * **Line 87** (Payment lock initialization):
    ```javascript
    await acquireLock(paymentLockKey, String(userId), hold);
    ```
  * **Line 406** (Calculating lockedUntil timestamp in holdSlot):
    ```javascript
    const lockedUntil = Date.now() + hold * 1000;
    ```
  * **Line 427** (Acquiring slot lock in Redis):
    ```javascript
    const acquired = await acquireLock(lockKey, userId.toString(), hold);
    ```
  * **Line 442** (User alert response on lock collision):
    ```javascript
    message: `This slot is currently being held by another user. Try again in ${hold} seconds.`,
    ```
  * **Line 449** (Success response on acquiring slot hold):
    ```javascript
    message: `Slot held successfully for ${hold} seconds`,
    ```

#### 2. `backend/src/controllers/paymentController.js`
* **Definition (Line 6)**:
  ```javascript
  const hold = 30; // Hold duration in seconds
  ```
* **Usage**:
  * **Line 157** (Payment lock acquisition):
    ```javascript
    await acquireLock(paymentLockKey, String(userId), hold);
    ```

---

### Frontend

#### 3. `frontend/src/pages/Consultations/BookingSidebar.jsx`
* **Definition (Line 27)**:
  ```javascript
  const hold = 30; // Hold duration in seconds — change once here to update entire page
  ```
* **Usages**:
  * **Line 75** (State initialization):
    ```javascript
    const [holdTimeLeft, setHoldTimeLeft] = useState(hold);
    ```
  * **Line 99** (Countdown timer reset):
    ```javascript
    setHoldTimeLeft(hold);
    ```
  * **Line 147** (Slot selection timer reset):
    ```javascript
    setHoldTimeLeft(hold);
    ```
  * **Line 178** (Retry reset):
    ```javascript
    setHoldTimeLeft(hold);
    ```
  * **Line 221** (Slot change timer reset):
    ```javascript
    setHoldTimeLeft(hold);
    ```

#### 4. `frontend/src/pages/Consultations/PaymentModal.jsx`
* **Definition (Line 21)**:
  ```javascript
  const hold = 30;
  ```
* **Usage**:
  * **Line 98** (Razorpay modal timeout setting):
    ```javascript
    timeout: hold,
    ```

#### 5. `frontend/src/pages/Payments/Payment.jsx`
* **Definition (Line 21)**:
  ```javascript
  const hold = 30;
  ```
* **Usage**:
  * **Line 93** (Razorpay subscription checkout timeout setting):
    ```javascript
    timeout: hold,
    ```

---

## 2. Files Using the `model` / `gemini` Variable

The Google Gemini model name is declared as a lowercase variable `gemini` and supplied to `getGenerativeModel({ model: gemini, ... })`.

### 1. `backend/src/agent/orchestrator.js`
* **Definition (Line 10)**:
  ```javascript
  // Verified working models: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash']
const gemini = 'gemini-3.5-flash';
  ```
* **Passing to Model (Lines 12–18)**:
  ```javascript
  async function runAgent(userMessage, history = []) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: gemini,
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: allToolDeclarations }]
    });
  ```
* **Model Invocation (Line 29)**:
  ```javascript
  const chat = model.startChat({ history: chatHistory });
  ```

### 2. `backend/src/controllers/chatbotController.js`
* **Definition (Line 431)**:
  ```javascript
  // Verified working models: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash']
const gemini = 'gemini-3.5-flash';
  ```
* **Passing to Model (Lines 432–436)**:
  ```javascript
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
      model: gemini,
      systemInstruction: SYSTEM_INSTRUCTION
  });
  ```
* **Model Invocations (Lines 482 & 487)**:
  ```javascript
  // With conversation history:
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(message);

  // Without conversation history:
  const result = await model.generateContent(message);
  ```

---

## 3. Files Using Socket.IO

Socket.IO provides real-time WebSockets for dietitian booking notifications, chat room messages, and dashboard activity streams.

### Backend

#### 1. `backend/src/server.js`
* **Initialization (Line 278)**:
  ```javascript
  require('./utils/socket').init(server, ALLOWED_ORIGINS);
  ```

#### 2. `backend/src/utils/socket.js`
* **Server Setup (Lines 6–10)**:
  ```javascript
  const { Server } = require('socket.io');
  io = new Server(server, { cors: { origin: allowedOrigins } });
  ```
* **Connection & Event Listeners**:
  * **Line 15**: `io.on('connection', (socket) => {`
  * **Line 18**: `socket.on('register_dietitian', (dietitianId) => {`
  * **Line 29**: `socket.join(\`dietitian_\${dietitianId}\`);`
  * **Line 33**: `socket.on('join_conversation', (conversationId) => {`
  * **Line 35**: `socket.join(\`conversation_\${conversationId}\`);`
  * **Line 39**: `socket.on('disconnect', () => {`
* **Emitters**:
  * **Line 56**: `const notifyDietitianBooking = (dietitianId, bookingData) => {`
  * **Line 70**: `const notifyBookingUpdated = (dietitianId, bookingData) => {`
  * **Line 83**: `const notifyNewMessage = (conversationId, messageData) => {`

#### 3. `backend/src/controllers/chatController.js`
* **Emit on New Message (Lines 176–177)**:
  ```javascript
  const { notifyNewMessage } = require('../utils/socket');
  notifyNewMessage(conversationId, populatedMessage);
  ```

#### 4. `backend/src/controllers/bookingController.js`
* **Emit on New Booking (Lines 327–331)**:
  ```javascript
  try {
    notifyDietitianNewBooking(dietitianId, savedBooking);
  } catch (socketErr) {
    console.error("Socket error (non-fatal):", socketErr);
  }
  ```

---

### Frontend

#### 5. `frontend/src/pages/Chat/ChatPage.jsx`
* **Import (Line 5)**:
  ```javascript
  import { io } from 'socket.io-client';
  ```
* **Connection & Room Join (Lines 90–95)**:
  ```javascript
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { ... });
  socket.on('connect', () => {
    socket.emit('join_conversation', conversationId);
  });
  ```
* **Event Listener (Line 98)**:
  ```javascript
  socket.on('new_message', (newMsg) => { ... });
  ```
* **Cleanup (Line 109)**:
  ```javascript
  socket.disconnect();
  ```

#### 6. `frontend/src/pages/Activities/DietitianActivities.jsx`
* **Import (Line 3)**:
  ```javascript
  import { io } from 'socket.io-client';
  ```
* **Connection & Registration (Lines 55–60)**:
  ```javascript
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { ... });
  socket.on('connect', () => {
    socket.emit('register_dietitian', user.id);
  });
  ```
* **Event Listeners (Lines 71–72)**:
  ```javascript
  socket.on('new_booking', refreshData);
  socket.on('booking_updated', refreshData);
  ```
* **Cleanup (Line 74)**:
  ```javascript
  return () => socket.disconnect();
  ```

#### 7. `frontend/src/pages/Activities/UserActivities.jsx`
* **Import (Line 3)**:
  ```javascript
  import { io } from 'socket.io-client';
  ```
* **Connection & Registration (Lines 55–61)**:
  ```javascript
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { ... });
  socket.on('connect', () => {
    socket.emit('register_dietitian', user.id);
  });
  ```
* **Event Listeners (Lines 71–72)**:
  ```javascript
  socket.on('booking_updated', refreshData);
  socket.on('new_booking', refreshData);
  ```
* **Cleanup (Line 74)**:
  ```javascript
  return () => socket.disconnect();
  ```

#### 8. `frontend/src/pages/Dashboards/Dietitian.jsx`
* **Import (Line 5)**:
  ```javascript
  import { io } from 'socket.io-client';
  ```
* **Connection & Registration (Lines 75–80)**:
  ```javascript
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { ... });
  socket.on('connect', () => {
    socket.emit('register_dietitian', user.id);
  });
  ```
* **Event Listeners (Lines 83–87)**:
  ```javascript
  socket.on('new_booking', () => { ... });
  socket.on('booking_updated', () => { ... });
  ```
* **Cleanup (Line 92)**:
  ```javascript
  socket.disconnect();
  ```

#### 9. `frontend/src/pages/Dashboards/User.jsx`
* **Import (Line 8)**:
  ```javascript
  import { io } from 'socket.io-client';
  ```
* **Connection & Registration (Lines 142–148)**:
  ```javascript
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { ... });
  socket.on('connect', () => {
    socket.emit('register_dietitian', user.id);
    socket.join?.(`user_${user.id}`);
  });
  ```
* **Event Listeners (Lines 151–155)**:
  ```javascript
  socket.on('booking_updated', () => { ... });
  socket.on('new_booking', () => { ... });
  ```
* **Cleanup (Line 159)**:
  ```javascript
  return () => socket.disconnect();
  ```

---

### Files Where Socket.IO Was Removed (HTTP Polling / Pure State)
The following files were cleaned to eliminate redundant socket overhead and prevent unauthenticated slot fetches:
1. `frontend/src/pages/Schedules/DietitianSchedule.jsx` (Pure HTTP / Redux slot management)
2. `frontend/src/pages/Appointments/ClientsList.jsx` (Direct API client fetching)
3. `frontend/src/pages/Consultations/BookingSidebar.jsx` (HTTP slot hold API)
4. `frontend/src/pages/HomePages/DietitianHome.jsx` (Dashboard metrics via REST)

---
