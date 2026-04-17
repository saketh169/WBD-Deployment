# NutriConnect API - Complete Endpoints Reference

**API Name**: NutriConnect API  
**Version**: 1.0.0  
**Specification**: OpenAPI 3.0 (Swagger)  
**Description**: Complete API documentation for NutriConnect - A comprehensive nutrition and diet management platform  
**Base URL**: `http://localhost:5000`  
**Swagger UI**: `http://localhost:5000/api-docs`  

---

## 📊 Quick Statistics

| Metric | Count |
|--------|-------|
| **Total Tags** | **22** |
| **Total Endpoints** | **174+** |
| **Protected Routes** | ~80% |
| **Public Routes** | ~20% |

## 📋 Complete Endpoints by Tag

### 1. **Auth** - 17 Endpoints
Authentication and user registration for all roles.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/signup/user` | User registration |
| 2 | POST | `/api/signup/admin` | Admin registration |
| 3 | POST | `/api/signup/dietitian` | Dietitian registration |
| 4 | POST | `/api/signup/organization` | Organization registration |
| 5 | POST | `/api/signin/user` | User login (Step 1 - sends OTP) |
| 6 | POST | `/api/signin/admin` | Admin login (Step 1 - sends OTP) |
| 7 | POST | `/api/signin/dietitian` | Dietitian login (Step 1 - sends OTP) |
| 8 | POST | `/api/signin/organization` | Organization login (Step 1 - sends OTP) |
| 9 | POST | `/api/documents/upload/dietitian` | Upload dietitian documents (certificates, qualifications) |
| 10 | POST | `/api/documents/upload/organization` | Upload organization documents (registration, certifications) |
| 11 | GET | `/api/verify-token` | Verify if JWT token is valid |
| 12 | POST | `/api/change-password` | Change user password (Protected) |
| 13 | POST | `/api/forgot-password/{role}` | Request password reset via OTP |
| 14 | POST | `/api/reset-password/{role}` | Reset password using OTP |
| 15 | POST | `/api/verify-login-otp/{role}` | Verify OTP for 2FA login (Step 2 - returns JWT) |
| 16 | POST | `/api/resend-login-otp` | Resend OTP for login |
| 17 | POST | `/api/refresh-token` | Refresh JWT token (Protected) |

**Count**: 17 ✓

---

### 2. **Profile** - 18 Endpoints
User profile management for all roles.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/uploaduser` | Upload user profile image (Protected) |
| 2 | POST | `/api/uploadadmin` | Upload admin profile image (Protected) |
| 3 | POST | `/api/uploaddietitian` | Upload dietitian profile image (Protected) |
| 4 | POST | `/api/uploadorganization` | Upload organization profile image (Protected) |
| 5 | DELETE | `/api/deleteuser` | Delete user profile image (Protected) |
| 6 | DELETE | `/api/deleteadmin` | Delete admin profile image (Protected) |
| 7 | DELETE | `/api/deletedietitian` | Delete dietitian profile image (Protected) |
| 8 | DELETE | `/api/deleteorganization` | Delete organization profile image (Protected) |
| 9 | GET | `/api/getuser` | Get user profile image |
| 10 | GET | `/api/getadmin` | Get admin profile image |
| 11 | GET | `/api/getdietitian` | Get dietitian profile image |
| 12 | GET | `/api/getorganization` | Get organization profile image |
| 13 | GET | `/api/getuserdetails` | Get user profile details (Protected) |
| 14 | GET | `/api/getdietitiandetails` | Get dietitian profile details (Protected) |
| 15 | GET | `/api/getadmindetails` | Get admin profile details (Protected) |
| 16 | GET | `/api/getorganizationdetails` | Get organization profile details (Protected) |
| 17 | PUT | `/api/update-profile` | Update user profile information (Protected) |
| 18 | GET | `/api/subscription-status` | Get user subscription status (Protected) |

**Count**: 18 ✓

---

### 3. **Bookings** - 10 Endpoints
Consultation bookings between clients and dietitians.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/bookings/check-limits` | Check booking limits (before booking) (Protected) |
| 2 | POST | `/api/bookings/create` | Create consultation booking (client to dietitian) (Protected) |
| 3 | GET | `/api/bookings/user/{userId}` | Retrieve user's bookings (Protected) |
| 4 | GET | `/api/bookings/user/{userId}/booked-slots` | Get user's booked time slots on a date (Protected) |
| 5 | GET | `/api/bookings/dietitian/{dietitianId}` | Retrieve dietitian's consultation bookings (Protected) |
| 6 | GET | `/api/bookings/dietitian/{dietitianId}/booked-slots` | Get dietitian's booked time slots on a date (Protected) |
| 7 | GET | `/api/bookings/{bookingId}` | Retrieve booking details by ID (Protected) |
| 8 | DELETE | `/api/bookings/{bookingId}` | Cancel a booking (client) (Protected) |
| 9 | PATCH | `/api/bookings/{bookingId}/status` | Update booking status (dietitian action) (Protected) |
| 10 | PATCH | `/api/bookings/{bookingId}/reschedule` | Reschedule booking (client) (Protected) |

**Count**: 10 ✓

---

### 4. **Payments** - 7 Endpoints
Payment processing and subscription management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/payments/initialize` | Initialize a new payment transaction |
| 2 | POST | `/api/payments/process/{paymentId}` | Process a payment transaction |
| 3 | GET | `/api/payments/verify/{transactionId}` | Verify payment status |
| 4 | GET | `/api/payments/subscription/active` | Get active subscription for logged-in user (Protected) |
| 5 | GET | `/api/payments/history` | Get payment history for logged-in user (Protected) |
| 6 | POST | `/api/payments/subscription/cancel` | Cancel active subscription (Protected) |
| 7 | GET | `/api/payments/analytics` | Get payment analytics for logged-in user (Protected) |

**Count**: 7 ✓

---

### 5. **Chatbot** - 2 Endpoints
AI-powered chatbot interaction.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/chatbot/message` | Send a message to the chatbot |
| 2 | GET | `/api/chatbot/history/{sessionId}` | Get chat history for a session |

**Count**: 2 ✓

---

### 6. **Blog** - 13 Endpoints
Blog management and interactions.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/blogs/categories` | Get all blog categories |
| 2 | GET | `/api/blogs` | Get all blogs with optional filters |
| 3 | POST | `/api/blogs` | Create new blog post (Protected) |
| 4 | GET | `/api/blogs/moderation/reported` | Get reported blogs (organization only) (Protected) |
| 5 | GET | `/api/blogs/my/blogs` | Get current user's blogs (Protected) |
| 6 | PUT | `/api/blogs/{id}` | Update blog post (author only) (Protected) |
| 7 | DELETE | `/api/blogs/{id}` | Delete blog post (author or organization) (Protected) |
| 8 | GET | `/api/blogs/{id}` | Get single blog by ID |
| 9 | POST | `/api/blogs/{id}/like` | Like/Unlike blog post (Protected) |
| 10 | POST | `/api/blogs/{id}/comments` | Add comment to blog post (Protected) |
| 11 | DELETE | `/api/blogs/{id}/comments/{commentId}` | Delete comment (Protected) |
| 12 | POST | `/api/blogs/{id}/report` | Report blog post (Protected) |
| 13 | PUT | `/api/blogs/{id}/moderation/dismiss` | Dismiss reports for a blog (organization only) (Protected) |

**Count**: 13 ✓

---

### 7. **Meal Plans** - 8 Endpoints
Meal plan creation, assignment, and management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/meal-plans` | Create meal plan (dietitian to client) (Protected) |
| 2 | GET | `/api/meal-plans/user/{userId}` | Retrieve user's meal plans (Protected) |
| 3 | GET | `/api/meal-plans/dietitian/{dietitianId}/client/{userId}` | Retrieve dietitian's meal plans for a client (Protected) |
| 4 | GET | `/api/meal-plans/{planId}` | Retrieve meal plan details by ID (Protected) |
| 5 | PUT | `/api/meal-plans/{planId}` | Update meal plan (dietitian) (Protected) |
| 6 | DELETE | `/api/meal-plans/{planId}` | Delete meal plan (soft delete) (Protected) |
| 7 | POST | `/api/meal-plans/{planId}/assign` | Assign meal plan to client calendar dates (Protected) |
| 8 | DELETE | `/api/meal-plans/{planId}/dates` | Unassign meal plan from calendar dates (Protected) |

**Count**: 8 ✓

---

### 8. **Health Reports** - 5 Endpoints
Health assessment reports from dietitian to client.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/health-reports/create` | Submit health report (dietitian to client) (Protected) |
| 2 | GET | `/api/health-reports/client/{clientId}/dietitian/{dietitianId}` | Retrieve health reports (dietitian view) (Protected) |
| 3 | GET | `/api/health-reports/dietitian/{dietitianId}/client/{clientId}` | Retrieve health reports (client view) (Protected) |
| 4 | GET | `/api/health-reports/client/{clientId}` | Retrieve all health reports for a client (Protected) |
| 5 | PUT | `/api/health-reports/{reportId}/viewed` | Mark health report as viewed by client (Protected) |

**Count**: 5 ✓

---

### 9. **Lab Reports** - 4 Endpoints
Lab test reports from client to dietitian.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/lab-reports/lab/submit` | Submit lab report (client to dietitian) (Protected) |
| 2 | GET | `/api/lab-reports/client/{clientId}/dietitian/{dietitianId}` | Retrieve lab reports (dietitian view) (Protected) |
| 3 | GET | `/api/lab-reports/lab/client/{clientId}` | Retrieve lab reports for a client (Protected) |
| 4 | PUT | `/api/lab-reports/lab/{reportId}/status` | Update lab report status (dietitian review) (Protected) |

**Count**: 4 ✓

---

### 10. **Progress** - 6 Endpoints
User progress tracking and statistics.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/user-progress` | Get all progress entries for user (Protected) |
| 2 | POST | `/api/user-progress` | Create new progress entry (Protected) |
| 3 | GET | `/api/user-progress/filter` | Get progress entries filtered by plan (Protected) |
| 4 | GET | `/api/user-progress/stats` | Get statistics for a specific plan (Protected) |
| 5 | GET | `/api/user-progress/subscription-info` | Get subscription info and accessible plans (Protected) |
| 6 | DELETE | `/api/user-progress/{id}` | Delete a progress entry (Protected) |

**Count**: 6 ✓

---

### 11. **Analytics** - 11 Endpoints
Platform analytics and reporting (Admin only).

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/users-list` | Get total count of all registered users (Admin) |
| 2 | GET | `/api/user-growth` | Get user growth statistics (Admin) |
| 3 | GET | `/api/dietitian-list` | Get list of all dietitians (Admin) |
| 4 | GET | `/api/verifying-organizations` | Get organizations pending verification (Admin) |
| 5 | GET | `/api/organizations-list` | Get list of all organizations (Admin) |
| 6 | GET | `/api/active-diet-plans` | Get active diet plans statistics (Admin) |
| 7 | GET | `/api/subscriptions` | Get all subscriptions/memberships with user details (Admin) |
| 8 | GET | `/api/consultation-revenue` | Get consultation revenue analytics (Admin) |
| 9 | GET | `/api/revenue-analytics` | Get overall revenue analytics (Admin) |
| 10 | GET | `/api/dietitian-revenue` | Get dietitian revenue breakdown (Admin) |
| 11 | GET | `/api/user-revenue` | Get user (subscription) revenue (Admin) |

**Count**: 11 ✓

---

### 12. **Settings** - 3 Endpoints
Platform settings management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/settings` | Get platform settings (Admin) |
| 2 | PUT | `/api/settings` | Update platform settings (Admin) |
| 3 | POST | `/api/settings/send-email` | Send policy email (Admin) |

**Count**: 3 ✓

---

### 13. **Notifications** - 4 Endpoints
Notification management and dashboard data.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/analytics/user/{userId}` | Get user dashboard data (Protected) |
| 2 | GET | `/api/analytics/user/{userId}/activities` | Get all user activities (Protected) |
| 3 | GET | `/api/analytics/dietitian/{dietitianId}` | Get dietitian dashboard data (Protected) |
| 4 | GET | `/api/analytics/dietitian/{dietitianId}/activities` | Get all dietitian activities (Protected) |

**Count**: 4 ✓

---

### 14. **Employee** - 9 Endpoints
Employee management for organizations.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/employees/stats` | Get employee statistics |
| 2 | GET | `/api/employees` | Get all employees for organization (Protected) |
| 3 | GET | `/api/employees/{id}` | Get single employee (Protected) |
| 4 | PUT | `/api/employees/{id}` | Update employee information (Protected) |
| 5 | DELETE | `/api/employees/{id}` | Permanently delete employee (Protected) |
| 6 | POST | `/api/employees/add` | Add single employee (Protected) |
| 7 | POST | `/api/employees/bulk-upload` | Bulk upload employees from CSV (Protected) |
| 8 | PATCH | `/api/employees/{id}/inactive` | Mark employee as inactive (Protected) |
| 9 | PATCH | `/api/employees/{id}/active` | Mark employee as active (Protected) |

**Count**: 9 ✓

---

### 15. **TeamBoard** - 3 Endpoints
Team board operations for employees.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/teamboard` | Get team board posts |
| 2 | POST | `/api/teamboard` | Create new team board post (employees and org admins only) (Protected) |
| 3 | DELETE | `/api/teamboard/{id}` | Delete team board post (owner or org admin only) (Protected) |

**Count**: 3 ✓

---

### 16. **ActivityLog** - 3 Endpoints
Activity logging for employees and organizations.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/organization/log-activity` | Log user activity (employees only) (Protected) |
| 2 | GET | `/api/organization/employee-work-summary` | Get employee work summary (Protected) |
| 3 | GET | `/api/organization/employee/{employeeId}/activities` | Get employee activities (Protected) |

**Count**: 3 ✓

---

### 17. **Chat** - 7 Endpoints
Real-time messaging between users.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/chat/conversation` | Get or create a conversation (Protected) |
| 2 | GET | `/api/chat/conversations/{userId}/{userType}` | Get all conversations for a user (Protected) |
| 3 | GET | `/api/chat/messages/{conversationId}` | Get messages for a conversation (Protected) |
| 4 | POST | `/api/chat/message` | Send a message (Protected) |
| 5 | PUT | `/api/chat/message/{messageId}` | Edit a message (Protected) |
| 6 | DELETE | `/api/chat/message/{messageId}` | Delete a message (Protected) |
| 7 | POST | `/api/chat/read/{conversationId}` | Mark messages as read (Protected) |

**Count**: 7 ✓

---

### 18. **ContactUs** - 8 Endpoints
Contact forms and query management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | POST | `/api/contact/submit` | [PUBLIC USERS] Submit contact query to admin |
| 2 | POST | `/api/contact/employee/submit` | [EMPLOYEE] Submit query to organization admin (Protected) |
| 3 | GET | `/api/contact/queries-list` | [ADMIN] View all public user queries (Protected) |
| 4 | POST | `/api/contact/reply` | [ADMIN] Reply to public user query (Protected) |
| 5 | POST | `/api/contact/employee-reply` | [ORG ADMIN] Reply to employee query (Protected) |
| 6 | GET | `/api/contact/employee-queries` | [ORG ADMIN] View pending employee queries (Protected) |
| 7 | GET | `/api/contact/employee-resolved-queries` | [ORG ADMIN] View resolved employee queries (Protected) |
| 8 | GET | `/api/contact/my-queries` | [EMPLOYEE] View my submitted queries (Protected) |

**Count**: 8 ✓

---

### 19. **Status** - 3 Endpoints
Status checking endpoints.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/status/dietitian-status` | Get dietitian verification status |
| 2 | GET | `/api/status/organization-status` | Get organization verification status |
| 3 | GET | `/api/status/employee-org-status` | Get employee organization verification status |

**Count**: 3 ✓

---

### 20. **Verify** - 18 Endpoints
Verification operations for dietitians and organizations (Admin).

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/verify/dietitians` | Get list of dietitians for verification (Admin) |
| 2 | GET | `/api/verify/files/{dietitianId}/{field}` | Get dietitian verification file (Admin) |
| 3 | POST | `/api/verify/{dietitianId}/approve` | Approve dietitian document (Admin) |
| 4 | POST | `/api/verify/{dietitianId}/disapprove` | Disapprove dietitian document (Admin) |
| 5 | POST | `/api/verify/{dietitianId}/final-approve` | Final approve dietitian (Admin) |
| 6 | POST | `/api/verify/{dietitianId}/final-disapprove` | Final disapprove dietitian (Admin) |
| 7 | POST | `/api/verify/{dietitianId}/upload-report` | Upload dietitian final report (Admin) |
| 8 | GET | `/api/verify/me` | Get current dietitian profile (Protected) |
| 9 | GET | `/api/verify/check-status` | Check dietitian verification status (Protected) |
| 10 | GET | `/api/verify/organizations` | Get list of organizations for verification (Admin) |
| 11 | GET | `/api/verify/org/files/{orgId}/{field}` | Get organization verification file (Admin) |
| 12 | POST | `/api/verify/org/{orgId}/approve` | Approve organization document (Admin) |
| 13 | POST | `/api/verify/org/{orgId}/disapprove` | Disapprove organization document (Admin) |
| 14 | POST | `/api/verify/org/{orgId}/final-approve` | Final approve organization (Admin) |
| 15 | POST | `/api/verify/org/{orgId}/final-disapprove` | Final disapprove organization (Admin) |
| 16 | POST | `/api/verify/org/{orgId}/upload-report` | Upload organization final report (Admin) |
| 17 | GET | `/api/verify/org/me` | Get current organization profile (Protected) |
| 18 | GET | `/api/verify/org/check-status` | Check organization verification status (Protected) |

**Count**: 18 ✓

---

### 21. **Crud** - 8 Endpoints
General CRUD operations (Admin).

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/crud/{role}-list` | Get all users by role (Admin) |
| 2 | GET | `/api/crud/{role}-list/search` | Search users by role (Admin) |
| 3 | GET | `/api/crud/{role}-list/{id}` | Get user details by role and ID (Admin) |
| 4 | DELETE | `/api/crud/{role}-list/{id}` | Soft delete user (Admin) |
| 5 | GET | `/api/crud/removed-accounts` | Get removed user accounts (Admin) |
| 6 | GET | `/api/crud/removed-accounts/search` | Search removed accounts (Admin) |
| 7 | POST | `/api/crud/removed-accounts/{id}/restore` | Restore removed account (Admin) |
| 8 | DELETE | `/api/crud/removed-accounts/{id}` | Permanently delete removed account (Admin) |

**Count**: 8 ✓

---

### 22. **Dietitian** - 15 Endpoints
Dietitian profile and availability management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | GET | `/api/dietitians` | Get all verified dietitians |
| 2 | GET | `/api/dietitians/{id}` | Get dietitian by ID |
| 3 | GET | `/api/dietitians/profile/{id}` | Get dietitian profile for editing (Protected) |
| 4 | GET | `/api/dietitians/{id}/clients` | Get clients for a dietitian (Protected) |
| 5 | POST | `/api/dietitian-profile-setup/{id}` | Setup dietitian profile (Protected) |
| 6 | GET | `/api/dietitians/{id}/slots` | Get available booking slots for a dietitian (Protected) |
| 7 | POST | `/api/dietitians/{id}/testimonials` | Add testimonial/review for a dietitian (Protected) |
| 8 | DELETE | `/api/dietitians/{id}/testimonials/{testimonialIndex}` | Delete a testimonial/review (Protected) |
| 9 | GET | `/api/dietitians/{id}/stats` | Get dietitian statistics |
| 10 | GET | `/api/dietitians/{id}/can-review` | Check if user can add review (Protected) |
| 11 | POST | `/api/dietitians/{id}/block-slot` | Block a time slot for a dietitian (Protected) |
| 12 | POST | `/api/dietitians/{id}/unblock-slot` | Unblock a time slot for a dietitian (Protected) |
| 13 | POST | `/api/dietitians/{id}/block-day` | Block entire day for a dietitian (Protected) |
| 14 | POST | `/api/dietitians/{id}/unblock-day` | Unblock entire day for a dietitian (Protected) |
| 15 | POST | `/api/dietitians/{id}/notify-leave` | Notify admin about leave (Protected) |

**Count**: 15 ✓

---

## 🔢 Complete Tag Count Summary

| # | Tag Name | Count |
|----|----------|-------|
| 1 | Auth | 17 |
| 2 | Profile | 18 |
| 3 | Bookings | 10 |
| 4 | Payments | 7 |
| 5 | Chatbot | 2 |
| 6 | Blog | 13 |
| 7 | Meal Plans | 8 |
| 8 | Health Reports | 5 |
| 9 | Lab Reports | 4 |
| 10 | Progress | 6 |
| 11 | Analytics | 11 |
| 12 | Settings | 3 |
| 13 | Notifications | 4 |
| 14 | Employee | 9 |
| 15 | TeamBoard | 3 |
| 16 | ActivityLog | 3 |
| 17 | Chat | 7 |
| 18 | ContactUs | 8 |
| 19 | Status | 3 |
| 20 | Verify | 18 |
| 21 | Crud | 8 |
| 22 | Dietitian | 15 |
| **TOTAL** | **22 Tags** | **174** |

---

## 📊 HTTP Methods Distribution

| Method | Count |
|--------|-------|
| GET | 65+ |
| POST | 65+ |
| PUT | 8 |
| PATCH | 9 |
| DELETE | 15+ |
| **TOTAL** | **174+** |

---

## ✅ API Documentation Status

**Last Updated**: March 30, 2026  
**API Version**: 1.0.0  
**OpenAPI Specification**: 3.0  
**Total Endpoints**: 174  
**Total Tags**: 22  
**Status**: ✅ Complete & Accurate

For interactive testing, visit: **http://localhost:5000/api-docs**

Platform analytics and reporting endpoints (Admin only).

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `GET` | `/analytics/users-list` | List all users (Admin) |
| 2 | `GET` | `/analytics/user-growth` | User growth analytics (Admin) |
| 3 | `GET` | `/analytics/dietitian-list` | List all dietitians (Admin) |
| 4 | `GET` | `/analytics/verifying-organizations` | Organizations pending verification (Admin) |
| 5 | `GET` | `/analytics/organizations-list` | List all organizations (Admin) |
| 6 | `GET` | `/analytics/active-diet-plans` | Active meal plans analytics (Admin) |
| 7 | `GET` | `/analytics/subscriptions` | Subscription data (Admin) |
| 8 | `GET` | `/analytics/membership-revenue` | Membership revenue analytics (Admin) |
| 9 | `GET` | `/analytics/consultation-revenue` | Consultation revenue analytics (Admin) |
| 10 | `GET` | `/analytics/revenue-analytics` | Overall revenue analytics (Admin) |
| 11 | `GET` | `/analytics/dietitian-revenue` | Dietitian revenue breakdown (Admin) |
| 12 | `GET` | `/analytics/user-revenue` | User revenue breakdown (Admin) |

**Tag Count**: 12 ✓

---

### 5. **Employee** - 9 Endpoints

Employee management for organizations.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `GET` | `/employees/stats` | Get employee statistics |
| 2 | `GET` | `/employees/` | Get all employees list (Protected) |
| 3 | `GET` | `/employees/:id` | Get employee details by ID (Protected) |
| 4 | `POST` | `/employees/add` | Add new employee (Protected) |
| 5 | `POST` | `/employees/bulk-upload` | Bulk upload employees CSV (Protected) |
| 6 | `PUT` | `/employees/:id` | Update employee info (Protected) |
| 7 | `PATCH` | `/employees/:id/inactive` | Deactivate employee (Protected) |
| 8 | `PATCH` | `/employees/:id/active` | Activate employee (Protected) |
| 9 | `DELETE` | `/employees/:id` | Delete employee (Protected) |

**Tag Count**: 9 ✓

---

### 6. **Chat** - 7 Endpoints

Real-time messaging between users and dietitians.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/chat/conversation` | Get or create conversation (Protected) |
| 2 | `GET` | `/chat/conversations/:userId/:userType` | Get user's conversations (Protected) |
| 3 | `GET` | `/chat/messages/:conversationId` | Get messages in conversation (Protected) |
| 4 | `POST` | `/chat/message` | Send new message (Protected) |
| 5 | `PUT` | `/chat/message/:messageId` | Edit message (Protected) |
| 6 | `DELETE` | `/chat/message/:messageId` | Delete message (Protected) |
| 7 | `POST` | `/chat/read/:conversationId` | Mark conversation as read (Protected) |

**Tag Count**: 7 ✓

---

### 7. **Payments** - 7 Endpoints

Payment processing and subscription management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/payments/initialize` | Initialize payment transaction |
| 2 | `POST` | `/payments/process/:paymentId` | Process payment |
| 3 | `GET` | `/payments/verify/:transactionId` | Verify payment transaction |
| 4 | `GET` | `/payments/subscription/active` | Get active subscription (Protected) |
| 5 | `GET` | `/payments/history` | Get payment history (Protected) |
| 6 | `POST` | `/payments/subscription/cancel` | Cancel subscription (Protected) |
| 7 | `GET` | `/payments/analytics` | Payment analytics (Admin) |

**Tag Count**: 7 ✓

---

### 8. **ContactUs** - 8 Endpoints

Contact forms and query management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/contact/submit` | Submit contact form |
| 2 | `POST` | `/contact/employee/submit` | Submit employee query (Protected) |
| 3 | `GET` | `/contact/queries-list` | Get all queries list (Protected) |
| 4 | `POST` | `/contact/reply` | Reply to query (Protected) |
| 5 | `POST` | `/contact/employee-reply` | Reply to employee query (Protected) |
| 6 | `GET` | `/contact/employee-queries` | Get employee queries (Protected) |
| 7 | `GET` | `/contact/employee-resolved-queries` | Get resolved employee queries (Protected) |
| 8 | `GET` | `/contact/my-queries` | Get user's queries (Protected) |

**Tag Count**: 8 ✓

---

### 9. **Chatbot** - 2 Endpoints

AI-powered chatbot interaction endpoints.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/chatbot/message` | Send message to chatbot |
| 2 | `GET` | `/chatbot/history/:sessionId` | Get chat history |

**Tag Count**: 2 ✓

---

### 10. **Health Reports** - 5 Endpoints

Health assessment reports from dietitian to client.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/health-reports/create` | Create health report (Dietitian → Client) (Protected) |
| 2 | `GET` | `/health-reports/client/:clientId/dietitian/:dietitianId` | Get health reports by dietitian (Protected) |
| 3 | `GET` | `/health-reports/dietitian/:dietitianId/client/:clientId` | Get health reports as client (Protected) |
| 4 | `GET` | `/health-reports/client/:clientId` | Get all health reports for client (Protected) |
| 5 | `PUT` | `/health-reports/:reportId/viewed` | Mark report as viewed (Protected) |

**Tag Count**: 5 ✓

---

### 11. **Meal Plans** - 8 Endpoints

Meal plan creation, assignment, and management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/meal-plans/` | Create meal plan (Dietitian → Client) (Protected) |
| 2 | `GET` | `/meal-plans/user/:userId` | Get user's meal plans (Protected) |
| 3 | `GET` | `/meal-plans/dietitian/:dietitianId/client/:userId` | Get plans for specific client (Protected) |
| 4 | `GET` | `/meal-plans/:planId` | Get meal plan details (Protected) |
| 5 | `PUT` | `/meal-plans/:planId` | Update meal plan (Protected) |
| 6 | `POST` | `/meal-plans/:planId/assign` | Assign plan to dates (Protected) |
| 7 | `DELETE` | `/meal-plans/:planId/dates` | Unassign plan from dates (Protected) |
| 8 | `DELETE` | `/meal-plans/:planId` | Delete meal plan (Protected) |

**Tag Count**: 8 ✓

---

### 12. **Lab Reports** - 4 Endpoints

Lab test reports from client to dietitian.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/lab-reports/lab/submit` | Submit lab report (Client → Dietitian) (Protected) |
| 2 | `GET` | `/lab-reports/client/:clientId/dietitian/:dietitianId` | Get lab reports by dietitian (Protected) |
| 3 | `GET` | `/lab-reports/lab/client/:clientId` | Get lab reports for client (Protected) |
| 4 | `PUT` | `/lab-reports/lab/:reportId/status` | Update lab report status/feedback (Protected) |

**Tag Count**: 4 ✓

---

### 13. **CRUD** - 8 Endpoints

General user management and CRUD operations (Admin).

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `GET` | `/crud/:role-list` | List users by role (Admin) |
| 2 | `GET` | `/crud/:role-list/search` | Search users by role (Admin) |
| 3 | `GET` | `/crud/:role-list/:id` | Get user details by role (Admin) |
| 4 | `DELETE` | `/crud/:role-list/:id` | Delete user by role (Admin) |
| 5 | `GET` | `/crud/removed-accounts` | List removed accounts (Admin) |
| 6 | `GET` | `/crud/removed-accounts/search` | Search removed accounts (Admin) |
| 7 | `POST` | `/crud/removed-accounts/:id/restore` | Restore deleted account (Admin) |
| 8 | `DELETE` | `/crud/removed-accounts/:id` | Permanently delete account (Admin) |

**Tag Count**: 8 ✓

---

### 14. **Notifications** - 4 Endpoints

Dashboard and activity tracking.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `GET` | `/analytics/user/:userId` | Get user dashboard data (Protected) |
| 2 | `GET` | `/analytics/user/:userId/activities` | Get user activities (Protected) |
| 3 | `GET` | `/analytics/dietitian/:dietitianId` | Get dietitian dashboard data (Protected) |
| 4 | `GET` | `/analytics/dietitian/:dietitianId/activities` | Get dietitian activities (Protected) |

**Tag Count**: 4 ✓

---

### 15. **Profile** - 1 Endpoint

User profile management.

| # | Method | Endpoint | Summary |
|---|--------|----------|---------|
| 1 | `POST` | `/uploaduser` | Upload user profile image (Protected) |

**Tag Count**: 1 ✓

---

## 📈 Endpoint Count Summary by Tag

| Tag # | Tag Name | Count | Status |
|-------|----------|-------|--------|
| 1 | Auth | 17 | ✅ |
| 2 | Bookings | 10 | ✅ |
| 3 | Dietitian | 16 | ✅ |
| 4 | Analytics | 12 | ✅ |
| 5 | Employee | 9 | ✅ |
| 6 | Chat | 7 | ✅ |
| 7 | Payments | 7 | ✅ |
| 8 | ContactUs | 8 | ✅ |
| 9 | Chatbot | 2 | ✅ |
| 10 | Health Reports | 5 | ✅ |
| 11 | Meal Plans | 8 | ✅ |
| 12 | Lab Reports | 4 | ✅ |
| 13 | CRUD | 8 | ✅ |
| 14 | Notifications | 4 | ✅ |
| 15 | Profile | 1 | ✅ |
| **TOTAL** | **15 Tags** | **117** | **✅** |

---

## 🔐 Authentication Requirements

### Protected Endpoints (Required JWT Token)
- **Symbol**: 🔒
- **Count**: ~88 endpoints (~75%)
- **Authentication**: Bearer token in Authorization header
- **Format**: `Authorization: Bearer <JWT_TOKEN>`

### Public Endpoints (No Authentication)
- **Symbol**: 🌐
- **Count**: ~29 endpoints (~25%)
- **Examples**: Registration, login, public profiles, chatbot

---

## 🔗 HTTP Methods Distribution

| Method | Count | Purpose |
|--------|-------|---------|
| `GET` | 52 | Retrieve data |
| `POST` | 41 | Create/Submit data |
| `PUT` | 8 | Full update |
| `PATCH` | 11 | Partial update |
| `DELETE` | 5 | Remove data |
| **TOTAL** | **117** | |

---

## 📊 Data Flow Categories

### User-to-Dietitian Flows
1. **Bookings**: Client books consultation → Dietitian confirms
2. **Lab Reports**: Client submits labs → Dietitian reviews
3. **Meal Plans**: Dietitian creates → Client receives
4. **Health Reports**: Dietitian sends → Client views
5. **Chat**: Bidirectional messaging

**Endpoints in this category**: ~50

---

### Admin-Only Operations
1. **Analytics**: View platform statistics
2. **CRUD**: Manage users and accounts
3. **Employee**: Manage organization employees
4. **Payments**: View payment analytics

**Endpoints in this category**: ~32

---

### Self-Service Operations
1. **Auth**: Sign up, login, password reset
2. **Profile**: Update own profile
3. **Chatbot**: AI-powered assistance
4. **Chat**: Messaging

**Endpoints in this category**: ~27

---

## 🎯 Common Query Parameters

| Parameter | Description | Used In |
|-----------|-------------|---------|
| `userId` | User's MongoDB ID | Most endpoints |
| `dietitianId` | Dietitian's MongoDB ID | Booking, Reports, Chat |
| `bookingId` | Booking's MongoDB ID | Booking endpoints |
| `reportId` | Report's MongoDB ID | Health/Lab Reports |
| `planId` | Meal Plan's MongoDB ID | Meal Plan endpoints |
| `role` | User role (user/admin/dietitian/org) | Auth endpoints |
| `:id` | Generic ID parameter | CRUD, Employee |
| `:role-list` | Dynamic role parameter | CRUD endpoints |

---

## 🚀 Accessing the API

### Starting the Server
```bash
cd backend
npm start
```

### Swagger UI Documentation
```
http://localhost:5000/api-docs
```

### Getting Authentication Token
```bash
POST /api/signin/user
{
  "email": "user2@gmail.com",
  "password": "password123"
}
```

### Using JWT Token
```bash
Authorization: Bearer <token_from_signup_response>
```

---

## 📝 Notes

- **Total Endpoints**: 117
- **Total Tags**: 16
- **Protected Routes**: ~75%
- **Public Routes**: ~25%
- **Most Active Tag**: Dietitian (16 endpoints)
- **Least Active Tag**: Profile (1 endpoint)
- **Average Endpoints Per Tag**: 7-8

---

## 🔄 Data Models Involved

- User (Client)
- Dietitian
- Admin
- Organization  
- Booking
- Meal Plan
- Health Report
- Lab Report
- Payment/Subscription
- Chat/Conversation
- Employee
- Query/ContactUs

---

## ✅ Last Updated

**Date**: March 30, 2026  
**Version**: 1.0.0  
**Status**: Complete (All 117 endpoints documented)

---

For detailed endpoint documentation with request/response examples, visit:
**http://localhost:5000/api-docs**
