# 🛣️ NutriConnect API Master Routes Reference

> Complete technical reference for all backend REST endpoints in NutriConnect. Includes HTTP methods, route paths, authentication requirements, roles, and response formats.

---

## ⚡ Global Standards

### 1. Base URLs
* **Local Backend Direct**: `http://localhost:5000`
* **Docker / Nginx Reverse Proxy**: `http://localhost/api`
* **Interactive Swagger Documentation**: `http://localhost:5000/api-docs`

### 2. Authorization Header
Protected routes require a valid JSON Web Token (JWT) passed in the HTTP request headers:
```http
Authorization: Bearer <your_jwt_access_token>
```

### 3. Unified Response Envelope
All API endpoints return JSON conforming to the standardized response envelope:
```json
{
  "isError": false,
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "status": 200,
  "statusCode": 200
}
```

---

## 1. Authentication & Accounts (`/api`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/signup/user` | Public | Register standard client user account |
| `POST` | `/api/signup/user/google` | Public | Client registration via Google OAuth |
| `POST` | `/api/signup/admin` | Public / Key | Register platform admin account |
| `POST` | `/api/signup/dietitian` | Public | Register dietitian professional account |
| `POST` | `/api/signup/organization` | Public | Register corporate organization account |
| `POST` | `/api/signin/user` | Public | Authenticate user with email and password |
| `POST` | `/api/signin/user/google` | Public | Sign in user via Google credential token |
| `POST` | `/api/signin/admin` | Public | Authenticate platform administrator |
| `POST` | `/api/signin/dietitian` | Public | Authenticate dietitian account |
| `POST` | `/api/signin/organization` | Public | Authenticate corporate organization account |
| `POST` | `/api/verify-login-otp/:role`| Public | Verify 2FA OTP for account login |
| `POST` | `/api/resend-login-otp` | Public | Request a fresh 2FA OTP |
| `POST` | `/api/forgot-password/:role` | Public | Send password reset OTP to registered email |
| `POST` | `/api/reset-password/:role`  | Public | Submit new password with verified OTP |
| `POST` | `/api/refresh-token` | JWT Bearer | Issue fresh access token using valid refresh token |
| `GET`  | `/api/verify-token` | Public / Token | Validate current JWT session token validity |
| `POST` | `/api/change-password` | JWT Bearer | Update account password for authenticated session |
| `POST` | `/api/documents/upload/dietitian` | Dietitian | Upload verification credentials (licenses, degrees) |
| `POST` | `/api/documents/upload/organization` | Organization | Upload corporate verification documents |

---

## 2. User Profile & Avatars (`/api`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/getuserdetails` | User | Retrieve current user profile details |
| `GET` | `/api/getdietitiandetails` | Dietitian | Retrieve dietitian professional profile details |
| `GET` | `/api/getadmindetails` | Admin | Retrieve administrator profile details |
| `GET` | `/api/getorganizationdetails` | Organization | Retrieve corporate organization profile details |
| `PUT` | `/api/update-profile` | JWT Bearer | Update user/dietitian name, bio, phone, and metadata |
| `GET` | `/api/subscription-status` | JWT Bearer | Retrieve active subscription tier and limits |
| `POST` | `/api/uploaduser` | User | Upload client profile picture |
| `POST` | `/api/uploaddietitian` | Dietitian | Upload dietitian profile avatar |
| `POST` | `/api/uploadadmin` | Admin | Upload admin avatar |
| `POST` | `/api/uploadorganization` | Organization | Upload organization corporate logo |
| `DELETE` | `/api/deleteuser` | User | Remove client profile picture |
| `DELETE` | `/api/deletedietitian` | Dietitian | Remove dietitian profile picture |
| `DELETE` | `/api/deleteadmin` | Admin | Remove admin profile picture |
| `DELETE` | `/api/deleteorganization` | Organization | Remove corporate logo |

---

## 3. Consultations & Bookings (`/api/bookings`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings/hold` | JWT Bearer | Acquire Redis lock (`SET NX EX 600`) to hold a slot |
| `POST` | `/api/bookings/release` | JWT Bearer | Release held slot if user abandons checkout |
| `GET` | `/api/bookings/holds/:dietitianId` | Public | Fetch currently held temporary slots for calendar |
| `POST` | `/api/bookings/payment/order` | User | Create Razorpay payment order for consultation |
| `POST` | `/api/bookings/check-limits` | User | Check if user has available consultation quota |
| `POST` | `/api/bookings/create` | User | Confirm booked consultation upon payment success |
| `GET` | `/api/bookings/user/:userId` | User | List all past & upcoming user appointments |
| `GET` | `/api/bookings/user/:userId/booked-slots` | User | Get dates/times of user's active bookings |
| `GET` | `/api/bookings/dietitian/:dietitianId` | Dietitian | Retrieve dietitian's schedule and appointments |
| `GET` | `/api/bookings/:bookingId` | JWT Bearer | Get full details of a specific consultation booking |
| `PATCH` | `/api/bookings/:bookingId/status` | JWT Bearer | Update booking status (`confirmed`, `completed`, `cancelled`) |
| `PATCH` | `/api/bookings/:bookingId/reschedule` | JWT Bearer | Reschedule consultation date and time slot |
| `DELETE` | `/api/bookings/:bookingId` | JWT Bearer | Cancel appointment and free up time slot |

---

## 4. Meal Plans (`/api/meal-plans`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/meal-plans` | Dietitian | Create a customized dietary meal plan |
| `GET` | `/api/meal-plans/user/:userId` | User | Retrieve all active & archived meal plans for client |
| `GET` | `/api/meal-plans/dietitian/:dietitianId/client/:userId` | Dietitian | Fetch client's meal plans authored by dietitian |
| `GET` | `/api/meal-plans/:planId` | JWT Bearer | Get full nutritional & daily breakdown of a plan |
| `PUT` | `/api/meal-plans/:planId` | Dietitian | Update recipes, macros, or schedule of a meal plan |
| `POST` | `/api/meal-plans/:planId/assign` | Dietitian | Assign meal plan to specific calendar date range |
| `DELETE` | `/api/meal-plans/:planId/dates` | Dietitian | Remove meal plan assignment from specified dates |
| `DELETE` | `/api/meal-plans/:planId` | Dietitian / Admin | Delete meal plan permanently |

---

## 5. AI Chatbot & Nutrition Intelligence (`/api/chatbot`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chatbot/message` | Optional JWT | Send message to AI assistant (Gemini 2.5 + USDA + multi-turn history) |
| `GET` | `/api/chatbot/top-faqs` | Public | Retrieve top 4 most frequently accessed FAQs |
| `POST` | `/api/chatbot/quick-question` | Public | Handle quick-question chip clicks with guaranteed FAQ resolution |
| `GET` | `/api/chatbot/history/:sessionId` | Public / User | Fetch multi-turn conversation dialogue history for session |

---

## 6. Real-Time Chat & Direct Messaging (`/api/chat`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat/conversation` | JWT Bearer | Create or open existing 1-on-1 direct conversation |
| `GET` | `/api/chat/conversations/:userId/:userType` | JWT Bearer | List all conversations for user or dietitian |
| `GET` | `/api/chat/messages/:conversationId` | JWT Bearer | Retrieve message history for a conversation |
| `POST` | `/api/chat/message` | JWT Bearer | Send text message or attachment in conversation |
| `PUT` | `/api/chat/message/:messageId` | JWT Bearer | Edit previously sent message |
| `DELETE` | `/api/chat/message/:messageId` | JWT Bearer | Soft delete message |
| `POST` | `/api/chat/read/:conversationId` | JWT Bearer | Mark incoming messages in conversation as read |

---

## 7. Community Blogs & Moderation (`/api/blogs`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/blogs` | Public | List published articles with category filtering & pagination |
| `GET` | `/api/blogs/categories` | Public | List all available blog topic categories |
| `GET` | `/api/blogs/:id` | Public | Read full blog post content and community comments |
| `GET` | `/api/blogs/my/blogs` | JWT Bearer | List blogs created by authenticated author |
| `POST` | `/api/blogs` | Dietitian / Admin | Create and publish a new nutrition article |
| `PUT` | `/api/blogs/:id` | Author / Admin | Update title, tags, content, or cover image |
| `DELETE` | `/api/blogs/:id` | Author / Admin | Delete article |
| `POST` | `/api/blogs/:id/like` | User | Toggle like on blog post |
| `POST` | `/api/blogs/:id/comments` | User | Post a comment on article |
| `DELETE` | `/api/blogs/:id/comments/:commentId` | Commenter / Admin | Delete comment |
| `POST` | `/api/blogs/:id/report` | User | Report blog post for policy review |
| `GET` | `/api/blogs/moderation/reported` | Organization | List flagged articles awaiting moderation |
| `PUT` | `/api/blogs/:id/moderation/dismiss`| Organization | Dismiss flagged reports against an article |

---

## 8. Diagnostic Lab & Health Reports (`/api`)

### Lab Reports (`/api/lab-reports`)
| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/lab-reports/lab/submit` | JWT Bearer | Upload blood work / diagnostic lab PDF document |
| `GET` | `/api/lab-reports/lab/client/:clientId` | JWT Bearer | Retrieve uploaded lab reports for a client |
| `GET` | `/api/lab-reports/client/:clientId/dietitian/:dietitianId` | Dietitian | Access shared client lab reports for clinical review |
| `PUT` | `/api/lab-reports/lab/:reportId/status` | Dietitian | Update review status of lab findings |

### Clinical Health Reports (`/api/health-reports`)
| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/health-reports/create` | Dietitian | Generate and upload clinical health assessment |
| `GET` | `/api/health-reports/client/:clientId` | User | Fetch clinical health reports issued to client |
| `GET` | `/api/health-reports/dietitian/:dietitianId/client/:clientId` | Dietitian | Retrieve dietitian's issued reports for client |
| `PUT` | `/api/health-reports/:reportId/viewed` | User | Acknowledge receipt and viewing of health report |

---

## 9. Payments & Subscriptions (`/api/payments`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/initialize` | User | Initialize Razorpay subscription order |
| `POST` | `/api/payments/process/:paymentId` | User | Process payment verification with gateway signature |
| `GET` | `/api/payments/verify/:transactionId` | User | Query transaction status and activate plan |
| `GET` | `/api/payments/subscription/active` | User | Retrieve active membership tier details |
| `POST` | `/api/payments/subscription/cancel` | User | Cancel recurring membership renewal |
| `GET` | `/api/payments/history` | User | Fetch complete invoice and billing history |
| `GET` | `/api/payments/analytics` | Admin | Retrieve subscription revenue metrics |

---

## 10. Client Progress Tracking (`/api/progress`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/progress/user-progress` | User | Log daily weight, body fat %, water intake, calories |
| `GET` | `/api/progress/user-progress` | User | Retrieve historical progress tracking entries |
| `GET` | `/api/progress/user-progress/filter` | User | Filter progress timeline by meal plan |
| `GET` | `/api/progress/user-progress/stats` | User | Calculate net weight change, BMI trends, goal delta |
| `GET` | `/api/progress/user-progress/subscription-info` | User | Check progress tracking allowance under current tier |
| `DELETE` | `/api/progress/user-progress/:id` | User | Delete incorrect progress log entry |

---

## 11. Dietitian Management & Schedule Controls (`/api`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dietitians` | Public | List all approved dietitians with ratings & specializations |
| `GET` | `/api/dietitians/:id` | Public | Get public dietitian profile, reviews, and fee schedule |
| `POST` | `/api/dietitians/:id/reviews` | User | Submit client rating and review for dietitian |
| `GET` | `/api/dietitians/:id/can-review` | User | Check if user completed consultation to enable review |
| `POST` | `/api/dietitians/:id/block-slot` | Dietitian | Mark specific time slot as unavailable / blocked |
| `POST` | `/api/dietitians/:id/unblock-slot` | Dietitian | Re-open previously blocked time slot |
| `POST` | `/api/dietitians/:id/block-day` | Dietitian | Block entire calendar day (vacation, illness) |
| `POST` | `/api/dietitians/:id/unblock-day` | Dietitian | Unblock previously marked day off |
| `POST` | `/api/dietitians/:id/notify-leave` | Dietitian | Alert clients with upcoming bookings about leave |

---

## 12. Verification & Document Auditing (`/api/verify`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/verify/dietitians` | Organization | List dietitian applications awaiting credential review |
| `GET` | `/api/verify/files/:dietitianId/:field` | Organization | Download/inspect dietitian license document |
| `POST` | `/api/verify/:dietitianId/approve` | Organization | Approve specific credential document |
| `POST` | `/api/verify/:dietitianId/disapprove` | Organization | Flag/reject specific credential with feedback |
| `POST` | `/api/verify/:dietitianId/final-approve` | Organization | Grant final clinical approval to dietitian |
| `POST` | `/api/verify/:dietitianId/final-disapprove` | Organization | Reject dietitian onboarding application |
| `POST` | `/api/verify/:dietitianId/upload-report` | Organization | Upload audit report PDF for dietitian file |
| `GET` | `/api/verify/organizations` | Admin | List corporate organizations awaiting platform approval |
| `GET` | `/api/verify/org/files/:orgId/:field` | Admin | Download corporate business registration filings |
| `POST` | `/api/verify/org/:orgId/final-approve` | Admin | Approve organization for corporate wellness operations |
| `POST` | `/api/verify/org/:orgId/final-disapprove` | Admin | Reject corporate organization registration |

---

## 13. Corporate Organization & Employees (`/api`)

### Employee Management (`/api/employees`)
| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Organization | List corporate employees with department & health status |
| `GET` | `/api/employees/stats` | Organization | Aggregate wellness participation statistics |
| `GET` | `/api/employees/:id` | Organization | Retrieve individual employee profile |
| `POST` | `/api/employees/add` | Organization | Enroll new corporate employee |
| `POST` | `/api/employees/bulk-upload` | Organization | Bulk upload employees via CSV file |
| `PUT` | `/api/employees/:id` | Organization | Update employee role or department |
| `PATCH`| `/api/employees/:id/active` | Organization | Mark employee membership status as active |
| `PATCH`| `/api/employees/:id/inactive` | Organization | Deactivate employee corporate wellness benefits |
| `DELETE`| `/api/employees/:id` | Organization | Remove employee from organization roster |

### Activity Logging (`/api/organization`)
| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/organization/log-activity` | JWT Bearer | Record audit trail activity for compliance |
| `GET` | `/api/organization/employee-work-summary`| Organization | View executive overview of employee participation |
| `GET` | `/api/organization/employee/:employeeId/activities` | Organization | View audit trail of specific employee activities |

---

## 14. Admin CRUD & User Operations (`/api/crud`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/crud/:role-list` | Admin | List users filtered by role (`user`, `dietitian`, `org`) |
| `GET` | `/api/crud/:role-list/search` | Admin | Search accounts by keyword, name, email, or date |
| `GET` | `/api/crud/:role-list/:id` | Admin | Fetch full administrative account dossier |
| `DELETE` | `/api/crud/:role-list/:id` | Admin | Soft-delete / suspend user account |
| `GET` | `/api/crud/removed-accounts` | Admin | List suspended/deleted accounts in recycle bin |
| `POST` | `/api/crud/removed-accounts/:id/restore` | Admin | Restore suspended account |
| `DELETE` | `/api/crud/removed-accounts/:id` | Admin | Permanently purge account and related data |

---

## 15. Analytics & Financial Reporting (`/api`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users-list` | Admin | Aggregate registered user metrics |
| `GET` | `/api/user-growth` | Admin | Platform registration growth over time |
| `GET` | `/api/dietitian-list` | Admin | Active vs pending dietitian count |
| `GET` | `/api/verifying-organizations` | Admin | Status of active verification partner organizations |
| `GET` | `/api/active-diet-plans` | Admin | Number of diet plans currently active |
| `GET` | `/api/subscriptions` | Admin | Active subscription tier distribution |
| `GET` | `/api/membership-revenue` | Admin | Breakdown of monthly/annual subscription earnings |
| `GET` | `/api/consultation-revenue` | Admin | Total gross consultation booking revenue |
| `GET` | `/api/revenue-analytics` | Admin | Comprehensive gross vs net financial analysis |
| `GET` | `/api/dietitian-revenue` | Admin | Payout totals earned by dietitians |

---

## 16. Support Queries & Contact Us (`/api/contact`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/contact/submit` | Public | Submit public contact/support inquiry |
| `POST` | `/api/contact/employee/submit` | Employee | Submit internal corporate support query |
| `GET` | `/api/contact/queries-list` | Admin | List all incoming client support tickets |
| `GET` | `/api/contact/my-queries` | User | View status of user's submitted support requests |
| `POST` | `/api/contact/reply` | Admin | Send official administrative resolution email |
| `GET` | `/api/contact/employee-queries` | Organization | View corporate wellness inquiries from staff |
| `POST` | `/api/contact/employee-reply` | Organization | Reply to corporate employee question |

---

## 17. System Settings & Health (`/api`)

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server liveness & health check (`status: ok`) |
| `GET` | `/api/settings` | JWT Bearer | Fetch platform maintenance & feature flag config |
| `PUT` | `/api/settings` | Admin | Update system configuration or operational policies |
| `POST` | `/api/settings/send-email` | Admin | Broadcast platform policy change announcements |

---

*NutriConnect Architecture & Engineering Documentation — Verified for Production Deployment.*
