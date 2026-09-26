# 🎨 Frontend Third-Party Libraries & Client-Side Integrations Guide

> Complete technical breakdown of every third-party library, client-side SDK, UI component library, and state management tool used across the NutriConnect React frontend. Includes purpose, file location, and runnable code examples directly from the codebase.

---

## 📋 Quick Dependency Matrix

| Package | Category | Primary Location | Purpose |
| :--- | :--- | :--- | :--- |
| **`@react-oauth/google`** | Google OAuth SDK | `frontend/src/pages/Auth/Signin.jsx` | Google One-Tap & standard Sign-In button integration |
| **`Razorpay Checkout SDK`** | Payment Gateway Modal | `frontend/src/utils/razorpayCheckout.js` | Browser checkout modal for consultation bookings & plans |
| **`axios`** | HTTP Client | `frontend/src/utils/axiosInstance.js` | Centralized API client with JWT bearer & refresh interceptors |
| **`@reduxjs/toolkit`** | State Management | `frontend/src/redux/store.js` | Centralized slices for bookings, payments, and admin analytics |
| **`recharts`** | Data Visualization | `frontend/src/pages/Admin/Analytics.jsx` | Dynamic SVG charts for revenue, growth, and client progress |
| **`lucide-react`** | Iconography | Entire frontend component tree | Clean, tree-shakeable SVG icons for navigation and dashboards |
| **`@tinymce/tinymce-react`**| Rich Text Editor | `frontend/src/pages/Blog/BlogPost.jsx` | WYSIWYG editor for drafting and formatting nutrition articles |
| **`dompurify`** | Security Sanitization | `frontend/src/pages/Blog/BlogPost.jsx` | Sanitizes rich HTML blog content to prevent XSS attacks |
| **`socket.io-client`** | Real-Time Chat | `frontend/src/pages/Chat/ChatPage.jsx` | WebSocket client for live messaging between client and dietitian |
| **`react-toastify`** | Notifications | `frontend/src/App.jsx` | Non-blocking animated toast alerts for API success/error feedback |
| **`react-hook-form` & `yup`**| Form Validation | `frontend/src/pages/Auth/Signup.jsx` | High-performance schema-based client-side form validation |
| **`jwt-decode`** | Token Parsing | `frontend/src/contexts/AuthContext.jsx` | Client-side JWT payload decoder to read user role and expiry |

---

## 1. Google OAuth (`@react-oauth/google`)

* **Category**: Social Authentication SDK
* **Files Where Used**:
  * [`frontend/src/main.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/main.jsx)
  * [`frontend/src/pages/Auth/Signin.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Auth/Signin.jsx)
  * [`frontend/src/pages/Auth/Signup.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Auth/Signup.jsx)
* **Why It Is Used**: Eliminates registration friction by allowing users to authenticate securely with their existing Google credentials.
* **How It Works**: 
  1. The app is wrapped in `<GoogleOAuthProvider clientId="...">`.
  2. Renders `<GoogleLogin>` component.
  3. Receives Google JWT credential token on success and forwards it to `POST /api/signin/user/google`.

### Code Example:
```jsx
// frontend/src/pages/Auth/Signin.jsx
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { googleSigninService } from '../../services/auth/authService';

export const GoogleLoginButton = ({ onLoginSuccess }) => {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Send the Google credential token to Express backend for verification
      const result = await googleSigninService(credentialResponse.credential);
      if (result.success) {
        toast.success('Signed in with Google!');
        onLoginSuccess(result.data);
      }
    } catch (err) {
      toast.error('Google authentication failed. Please try again.');
    }
  };

  return (
    <div className="w-full flex justify-center my-4">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => toast.error('Google Sign-In was cancelled')}
        useOneTap
        shape="pill"
      />
    </div>
  );
};
```

---

## 2. Razorpay Checkout SDK

* **Category**: Client Payment Modal
* **Files Where Used**:
  * [`frontend/src/utils/razorpayCheckout.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/utils/razorpayCheckout.js)
  * [`frontend/src/pages/Payments/Payment.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Payments/Payment.jsx)
* **Why It Is Used**: Securely collects card, UPI, net banking, and wallet payments inside an inline browser modal without navigating away from the page.
* **How It Works**: Dynamically loads `checkout.razorpay.com/v1/checkout.js` into DOM, initializes `new window.Razorpay(options)`, and captures the gateway signature upon payment completion.

### Code Example:
```javascript
// frontend/src/utils/razorpayCheckout.js
export const openRazorpayModal = ({ orderId, amount, userDetails, onPaymentSuccess, onPaymentFailure }) => {
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: amount, // in paise
    currency: 'INR',
    name: 'NutriConnect Health',
    description: 'Consultation & Dietary Subscription',
    order_id: orderId,
    prefill: {
      name: userDetails.name,
      email: userDetails.email,
      contact: userDetails.phone
    },
    theme: { color: '#10b981' }, // NutriConnect emerald green
    handler: function (response) {
      // Forward payment ID and cryptographic signature to backend
      onPaymentSuccess({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
    },
    modal: {
      ondismiss: function () {
        if (onPaymentFailure) onPaymentFailure('Payment window dismissed');
      }
    }
  };

  const razorpayInstance = new window.Razorpay(options);
  razorpayInstance.open();
};
```

---

## 3. Centralized Axios Client & Interceptors (`axios`)

* **Category**: HTTP Client & Interceptor Middleware
* **Files Where Used**:
  * [`frontend/src/utils/axiosInstance.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/utils/axiosInstance.js)
  * All services under `frontend/src/services/`
* **Why It Is Used**: Centralizes HTTP requests with automatic `Authorization: Bearer <token>` injection, unified error formatting, and automatic session recovery.
* **How It Works**:
  * **Request Interceptor**: Reads token from `localStorage` and injects `Authorization` header.
  * **Response Interceptor**: Automatically unpacks standardized response envelope `{ data, message, success }` and handles session expiration (`401 Unauthorized`).

### Code Example:
```javascript
// frontend/src/utils/axiosInstance.js
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
});

// Request Interceptor: Automatically attach JWT Bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize API responses & handle 401s
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/signin';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default axiosInstance;
```

---

## 4. Redux Toolkit (`@reduxjs/toolkit` & `react-redux`)

* **Category**: Global Application State Store
* **Files Where Used**:
  * [`frontend/src/redux/store.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/redux/store.js)
  * `frontend/src/redux/slices/bookingSlice.js`
  * `frontend/src/redux/slices/paymentSlice.js`
  * `frontend/src/redux/slices/analyticsSlice.js`
* **Why It Is Used**: Eliminates prop-drilling across multi-step booking flows, payment modals, and complex analytics filters using immutable Immer updates.

### Code Example:
```javascript
// frontend/src/redux/slices/bookingSlice.js
import { createSlice } from '@reduxjs/toolkit';

const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    selectedDietitian: null,
    selectedDate: null,
    selectedTimeSlot: null,
    holdStatus: 'idle', // 'idle' | 'holding' | 'locked'
  },
  reducers: {
    selectSlot: (state, action) => {
      state.selectedDate = action.payload.date;
      state.selectedTimeSlot = action.payload.timeSlot;
      state.holdStatus = 'holding';
    },
    clearBookingState: (state) => {
      state.selectedDietitian = null;
      state.selectedTimeSlot = null;
      state.holdStatus = 'idle';
    }
  }
});

export const { selectSlot, clearBookingState } = bookingSlice.actions;
export default bookingSlice.reducer;
```

---

## 5. Recharts Data Visualization (`recharts`)

* **Category**: Declarative SVG Charting Library
* **Files Where Used**:
  * [`frontend/src/pages/Admin/Analytics.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Admin/Analytics.jsx)
  * [`frontend/src/pages/UserProgress.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/UserProgress.jsx)
* **Why It Is Used**: Renders mobile-responsive, hardware-accelerated interactive line graphs, area charts, and bar charts for client weight tracking and administrative revenue trends.

### Code Example:
```jsx
// frontend/src/pages/UserProgress.jsx
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const WeightProgressChart = ({ data }) => {
  return (
    <div className="w-full h-72 bg-white rounded-xl p-4 shadow">
      <h3 className="font-semibold text-gray-800 mb-2">Weight Loss Progress (kg)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis domain={['auto', 'auto']} stroke="#9ca3af" />
          <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
          <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

---

## 6. Real-Time Chat WebSocket (`socket.io-client`)

* **Category**: Client WebSocket Engine
* **Files Where Used**:
  * [`frontend/src/pages/Chat/ChatPage.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Chat/ChatPage.jsx)
  * [`frontend/src/services/chat/chatService.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/services/chat/chatService.js)
* **Why It Is Used**: Connects browser client directly to backend Socket.IO cluster for instantaneous message reception, typing indicators, and read receipts.

### Code Example:
```javascript
// frontend/src/pages/Chat/ChatPage.jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  autoConnect: false
});

export const useChatSocket = (conversationId, onMessageReceived) => {
  useEffect(() => {
    socket.connect();
    socket.emit('join_room', conversationId);

    socket.on('receive_message', (message) => {
      onMessageReceived(message);
    });

    return () => {
      socket.off('receive_message');
      socket.disconnect();
    };
  }, [conversationId]);

  const sendMessage = (content) => {
    socket.emit('send_message', { conversationId, content, timestamp: new Date() });
  };

  return { sendMessage };
};
```

---

## 7. DOMPurify XSS Protection (`dompurify`)

* **Category**: HTML Sanitization Security
* **Files Where Used**:
  * [`frontend/src/pages/Blog/BlogPost.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Blog/BlogPost.jsx)
  * [`frontend/src/pages/Blog.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Blog.jsx)
* **Why It Is Used**: Renders rich formatted HTML from blog authors using `dangerouslySetInnerHTML` while aggressively stripping dangerous `<script>`, `onerror=`, and malicious JavaScript payloads.

### Code Example:
```jsx
// frontend/src/pages/Blog/BlogPost.jsx
import React from 'react';
import DOMPurify from 'dompurify';

export const BlogArticleViewer = ({ blogContent }) => {
  // Sanitize raw HTML string before injection
  const cleanHTML = DOMPurify.sanitize(blogContent, {
    ALLOWED_TAGS: ['h1', 'h2', 'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'li', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'class']
  });

  return (
    <article 
      className="prose prose-emerald max-w-none"
      dangerouslySetInnerHTML={{ __html: cleanHTML }} 
    />
  );
};
```

---

## 8. Client-Side JWT Decoder (`jwt-decode`)

* **Category**: Client Authentication Utility
* **Files Where Used**:
  * [`frontend/src/contexts/AuthContext.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/contexts/AuthContext.jsx)
  * [`frontend/src/hooks/useAuthContext.js`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/hooks/useAuthContext.js)
* **Why It Is Used**: Synchronously reads the authenticated user's ID, role (`user`, `dietitian`, `admin`, `org`), and token expiry timestamp (`exp`) directly in React state without having to fire an extra HTTP request on page load.

### Code Example:
```javascript
// frontend/src/contexts/AuthContext.jsx
import { jwtDecode } from 'jwt-decode';

export const getUserFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    // Check if token has expired
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }
    return {
      userId: decoded.id || decoded.userId,
      role: decoded.role,
      email: decoded.email
    };
  } catch (err) {
    localStorage.removeItem('token');
    return null;
  }
};
```

---

## 9. Formik, React Hook Form & Yup Validation (`react-hook-form`, `yup`)

* **Category**: Client Form Validation
* **Files Where Used**:
  * [`frontend/src/pages/Auth/Signup.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Auth/Signup.jsx)
  * [`frontend/src/pages/Consultations/BookingSidebar.jsx`](file:///c:/Users/saket/Web%20Projects/WBD-Deployment/frontend/src/pages/Consultations/BookingSidebar.jsx)
* **Why It Is Used**: Validates email format, password complexity, phone numbers, and required fields before sending data to the server, preventing unnecessary network roundtrips.

### Code Example:
```javascript
// frontend/src/pages/Auth/Signup.jsx
import * as Yup from 'yup';

export const signupValidationSchema = Yup.object().shape({
  name: Yup.string().min(2, 'Name is too short').required('Full name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
  phone: Yup.string()
    .matches(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .required('Phone number is required')
});
```

---

*NutriConnect Architecture Reference — Verified and Documented for Production Frontend.*
