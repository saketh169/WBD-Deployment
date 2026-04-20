# Database Schemas Documentation

This document provides a comprehensive overview of all MongoDB schemas used in the Nutri Connect application.

## Table of Contents

1. User Management Schemas (Authentication & Profiles)
2. Booking & Consultation Schemas
3. Health & Progress Schemas
4. Content Schemas (Blogs, Chatbot)
5. Communication Schemas
6. Administrative Schemas

---

## 1. User Management Schemas

### UserAuth Schema

**Purpose:** Central authentication record storing login credentials and role associations. This is a globally unique authentication table.

**Fields:**
- `email` (String, required, unique) - User's email address (globally unique across all roles)
- `passwordHash` (String, required) - Bcrypt hashed password
- `role` (String, enum: 'user', 'admin', 'dietitian', 'organization', required) - User's role type
- `roleId` (ObjectId, required) - Reference to the role-specific profile document (_id from User/Admin/Dietitian/Organization collection)
- `timestamps` - Creation and update timestamps

**Usage:** Used during login/signup to verify credentials and retrieve JWT token. Each role has exactly one UserAuth record.

---

### User Schema

**Purpose:** Standard user profile for regular clients of the platform.

**Fields:**
- `name` (String, required, unique, minlength: 5) - User's full name (unique per role)
- `email` (String, required, lowercase, trim) - User's email from UserAuth
- `phone` (String, required, minlength: 10, maxlength: 10) - Phone number (10 digits)
- `dob` (Date, required) - Date of birth for age calculation
- `gender` (String, enum: 'male', 'female', 'other', required) - Gender
- `address` (String, required, maxlength: 200) - Residential address
- `profileImage` (Buffer) - Profile image stored as binary data
- `timestamps` - Creation and update timestamps

**Usage:** Stores personal information for regular users. Used in booking systems, meal plans, progress tracking, and dietitian consultations.

---

### Admin Schema

**Purpose:** Administrative user profile for platform administrators.

**Fields:**
- `name` (String, required, unique, minlength: 5) - Admin's full name (unique per role)
- `email` (String, required, lowercase, trim) - Admin's email from UserAuth
- `phone` (String, required, minlength: 10, maxlength: 10) - Phone number
- `dob` (Date, required) - Date of birth
- `gender` (String, enum: 'male', 'female', 'other', required) - Gender
- `address` (String, required, maxlength: 200) - Address
- `profileImage` (Buffer) - Profile image
- `timestamps` - Creation and update timestamps

**Usage:** Stores information for platform administrators who manage the overall system, users, and content moderation.

---

### Dietitian Schema

**Purpose:** Professional profile for registered dietitian nutritionists with verification documents.

**Fields:**

**Basic Information:**
- `name` (String, required, unique, minlength: 5) - Dietitian's full name
- `email` (String, required, lowercase, trim) - Email address
- `age` (Number, required, min: 18) - Dietitian's age
- `phone` (String, minlength: 10, maxlength: 10) - Phone number (optional)
- `licenseNumber` (String, required, unique, regex: DLN[0-9]{6}) - License number in format DLN123456

**Professional Details:**
- `specialization` (Array of Strings) - Areas of specialization
- `experience` (Number) - Years of experience
- `fees` (Number) - Consultation fees
- `languages` (Array of Strings) - Languages spoken
- `location` (String) - Practice location
- `title` (String) - Professional title
- `description` (String) - Professional description
- `expertise` (Array of Strings) - Area of expertise

**Documents & Verification:**
- `files` (Object) - Embedded files (buffers):
  - `resume`, `degreeCertificate`, `licenseDocument`, `idProof`
  - `experienceCertificates`, `specializationCertifications`, `internshipCertificate`
  - `researchPapers`, `finalReport`

- `verificationStatus` (Object) - Status of each document:
  - Each field has enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected']
  - Default: 'Not Uploaded' for documents, 'Not Received' for finalReport

- `documentUploadStatus` (String, enum: 'pending', 'verified', 'rejected', default: 'pending')
- `lastDocumentUpdate` (Date)
- `documents` (Mixed) - Metadata about uploaded documents

**Consulting Details:**
- `consultationTypes` (Array of Objects):
  - `type` (String) - Type of consultation
  - `duration` (Number) - Duration in minutes
  - `fee` (Number) - Fee for this type
- `availability` (Object):
  - `workingDays` (Array of Strings) - Days available
  - `workingHours` (Object) - Start and end times
- `bookedslots` (Array) - Blocked/booked time slots with dates and times
- `online` (Boolean) - Offers online consultations
- `offline` (Boolean) - Offers in-person consultations

**Credentials:**
- `certifications` (Array of Objects):
  - `name`, `year`, `issuer`
- `awards` (Array of Objects):
  - `name`, `year`, `description`
- `education` (Array of Strings) - Educational qualifications
- `publications` (Array of Objects):
  - `title`, `year`, `link`

**Social & Reviews:**
- `testimonials` (Array of Objects):
  - `text`, `author`, `rating`, `authorId` (reference to User)
  - `createdAt` - When testimonial was added
- `rating` (Number) - Overall rating
- `socialMedia` (Object):
  - `linkedin`, `twitter` - Social media profiles
- `profileImage` (Buffer) - Profile photo

**Status:**
- `isDeleted` (Boolean, default: false) - Soft delete flag
- `timestamps` - Creation and update timestamps

**Usage:** Stores comprehensive professional information for dietitians. Used for displaying dietitian profiles, booking consultations, verification process, and meal plan creation.

---

### Organization Schema

**Purpose:** Profile for organizations (gyms, wellness centers, hospitals) that employ employees.

**Fields:**

**Basic Information:**
- `name` (String, required, unique, minlength: 5) - Organization name
- `email` (String, required, lowercase, trim) - Organization email
- `phone` (String, required, minlength: 10, maxlength: 10) - Phone number
- `address` (String, required, maxlength: 200) - Business address
- `licenseNumber` (String, required, unique, regex: OLN[0-9]{6}) - License in format OLN123456

**Organization Details:**
- `organizationType` (String, enum: 'private', 'ppo', 'freelancing', 'ngo', 'government', 'other', required) - Type of organization

**Document Types:**
- `legalDocumentType` (String) - Type of legal document
- `taxDocumentType` (String) - Type of tax document
- `businessLicenseType` (String) - Business license type
- `authorizedRepIdType` (String) - Representative ID type
- `addressProofType` (String) - Address proof type
- `bankDocumentType` (String) - Bank document type

**Documents & Files:**
- `files` (Object) - Embedded files (buffers):
  - `orgLogo`, `orgBrochure`, `legalDocument`, `taxDocument`
  - `addressProof`, `businessLicense`, `authorizedRepId`, `bankDocument`, `finalReport`

- `verificationStatus` (Object) - Status of each document:
  - Each field enum: ['Not Uploaded', 'Pending', 'Verified', 'Rejected']
  - Default: 'Not Uploaded'

- `documentUploadStatus` (String, enum: 'pending', 'verified', 'rejected', default: 'pending')
- `lastDocumentUpdate` (Date)
- `documents` (Mixed) - Document metadata
- `profileImage` (Buffer) - Organization logo/profile image
- `timestamps` - Creation and update timestamps

**Usage:** Stores information for organizations using the platform to manage employees and participate in verification processes.

---

### Employee Schema

**Purpose:** Profile for employees working in organizations. Employees have limited access compared to organization admins.

**Fields:**
- `name` (String, required, minlength: 3, trim) - Employee's full name
- `email` (String, required, lowercase, trim) - Work email
- `passwordHash` (String, required) - Direct password for employee login
- `licenseNumber` (String, required, unique, regex: [A-Z]{3}[0-9]{6}) - License number (org code + 6 digits, e.g., APO123456)
- `organizationId` (ObjectId, ref: 'Organization', required) - Reference to parent organization
- `status` (String, enum: 'active', 'inactive', 'pending-activation', default: 'pending-activation')

**Personal Information:**
- `age` (Number) - Employee age
- `address` (String, trim) - Residential address
- `contact` (String, trim) - Contact information
- `isDeleted` (Boolean, default: false) - Soft delete flag

**Activation Tracking:**
- `inviteSentAt` (Date) - When invitation email was sent
- `activatedAt` (Date) - When employee first logged in
- `lastLogin` (Date) - Last login timestamp
- `timestamps` - Creation and update timestamps

**Indexes:**
- Composite unique index on (organizationId, email) for faster lookups

**Usage:** Stores employee records for organizations. Employees log in with their email and password, can moderate content, verify documents, and view organization-specific analytics.

---

## 2. Booking & Consultation Schemas

### Booking Schema

**Purpose:** Records consultation bookings between users and dietitians.

**Fields:**

**User Information:**
- `userId` (ObjectId, ref: 'User', required) - Reference to the user
- `username` (String, required) - User's name
- `email` (String, required, lowercase, trim) - User's email
- `userPhone` (String) - User's phone number
- `userAddress` (String) - User's address

**Dietitian Information:**
- `dietitianId` (ObjectId, ref: 'Dietitian', required) - Reference to dietitian
- `dietitianName` (String, required) - Dietitian's name
- `dietitianEmail` (String, required, lowercase, trim) - Dietitian's email
- `dietitianPhone` (String) - Dietitian's phone
- `dietitianSpecialization` (String) - Dietitian's specialization

**Consultation Details:**
- `date` (Date, required) - Consultation date
- `time` (String, required, format: HH:MM) - Consultation time
- `consultationType` (String, enum: 'Online', 'In-person', required) - Type of consultation

**Payment Information:**
- `amount` (Number, required, min: 0) - Consultation fee
- `paymentMethod` (String, enum: 'card', 'netbanking', 'upi', 'emi', 'UPI', 'Credit Card', 'PayPal', required)
- `paymentId` (String, required, unique) - Payment transaction ID
- `paymentStatus` (String, enum: 'completed', 'pending', 'failed', default: 'completed')

**Booking Status:**
- `status` (String, enum: 'confirmed', 'cancelled', 'completed', 'no-show', default: 'confirmed')
- `createdAt` (Date, default: now) - When booking was created
- `updatedAt` (Date, default: now) - Last update timestamp

**Indexes:**
- (userId, createdAt DESC)
- (dietitianId, createdAt DESC)
- email
- date

**Usage:** Records all consultation appointments between users and dietitians. Used for calendar management, payment processing, and consultation history.

---

### BlockedSlot Schema

**Purpose:** Records time slots blocked by dietitians.

**Fields:**
- `dietitianId` (ObjectId, ref: 'Dietitian', required) - Dietitian who blocked the slot
- `date` (String, required) - Date of the blocked slot
- `time` (String, required) - Time of the blocked slot
- `reason` (String, default: 'Manually blocked') - Reason for blocking
- `timestamps` - Creation and update timestamps

**Indexes:**
- Composite unique index on (dietitianId, date, time)

**Usage:** Prevents users from booking specific time slots. Dietitians can block slots for breaks, meetings, or unavailability.

---

## 3. Health & Progress Schemas

### Progress Schema

**Purpose:** Tracks user progress towards health goals.

**Fields:**
- `userId` (ObjectId, ref: 'User', required) - User tracking progress
- `plan` (String, enum: 'weight-loss', 'muscle-gain', 'cardio', 'hydration', 'balanced-diet', 'energy', 'detox', 'stamina', 'maintenance', 'flexibility', 'recovery', 'diabetes', 'stress', 'athletic', 'general', required)

**Metrics:**
- `weight` (Number, min: 20, max: 300) - Current weight
- `waterIntake` (Number, min: 0, max: 10) - Water intake in liters
- `calories` (Number, min: 0, max: 5000) - Daily calorie intake
- `steps` (Number, min: 0) - Daily step count

**Goal Information:**
- `goal` (String, maxlength: 100, required) - Goal description
- `days` (Number, min: 1, max: 365, required) - Duration in days
- `notes` (String, maxlength: 250) - Additional notes
- `createdAt` (Date, default: now)
- `updatedAt` (Date, default: now)

**Usage:** Records daily or periodic health metrics and progress. Used for tracking fitness goals, weight loss, dietary compliance, and health improvements.

---

### LabReport Schema

**Purpose:** Stores lab test reports submitted by users with multiple health categories.

**Fields:**

**User & Dietitian Info:**
- `userId` (ObjectId, ref: 'User', required) - User who submitted report
- `dietitianId` (ObjectId, ref: 'Dietitian') - Assigned dietitian
- `clientName` (String, required)
- `clientAge` (Number, required)
- `clientPhone` (String, required)
- `clientAddress` (String, required)

**Report Categories:**
- `submittedCategories` (Array, enum: 'Hormonal_Issues', 'Fitness_Metrics', 'General_Reports', 'Blood_Sugar_Focus', 'Thyroid', 'Cardiovascular') - Categories included in report

**Category Data:**

**Hormonal Issues:**
- `hormonalIssues.testosteroneTotal` (Number)
- `hormonalIssues.dheaS` (Number)
- `hormonalIssues.cortisol` (Number)
- `hormonalIssues.vitaminD` (Number)

**Fitness Metrics:**
- `fitnessMetrics.heightCm` (Number)
- `fitnessMetrics.currentWeight` (Number)
- `fitnessMetrics.bodyFatPercentage` (Number)
- `fitnessMetrics.activityLevel` (enum: 'sedentary', 'light', 'moderate', 'very', 'extra')
- `fitnessMetrics.additionalInfo` (String)

**General Reports:**
- `generalReports.dateOfReport` (Date)
- `generalReports.bmiValue` (Number)
- `generalReports.currentWeight` (Number)
- `generalReports.heightCm` (Number)

**Blood Sugar Focus:**
- `bloodSugarFocus.fastingGlucose` (Number)
- `bloodSugarFocus.hba1c` (Number)
- `bloodSugarFocus.cholesterolTotal` (Number)
- `bloodSugarFocus.triglycerides` (Number)

**Thyroid:**
- `thyroid.tsh` (Number)
- `thyroid.freeT4` (Number)
- `thyroid.reverseT3` (Number)
- `thyroid.thyroidAntibodies` (String)

**Cardiovascular:**
- `cardiovascular.systolicBP` (Number)
- `cardiovascular.diastolicBP` (Number)
- `cardiovascular.spO2` (Number)
- `cardiovascular.restingHeartRate` (Number)

**Files & Review:**
- `uploadedFiles` (Array) - Embedded file objects:
  - `fieldName`, `originalName`, `filename`, `data` (Buffer), `size`, `mimetype`, `uploadedAt`

- `status` (String, enum: 'submitted', 'reviewed', 'pending_review', default: 'submitted')
- `reviewedBy` (Object):
  - `dietitianId` (ObjectId, ref: 'Dietitian')
  - `dietitianName` (String)
  - `reviewedAt` (Date)
- `notes` (String) - Dietitian's notes
- `timestamps` - Created and updated at

**Indexes:**
- userId
- createdAt DESC
- status
- dietitianId

**Usage:** Records comprehensive health test results from laboratory tests. Used by dietitians to create personalized meal plans and health recommendations.

---

### HealthReport Schema

**Purpose:** Health reports prepared by dietitians for clients.

**Fields:**

**Identifiers:**
- `dietitianId` (ObjectId, ref: 'Dietitian', required)
- `dietitianName` (String, required)
- `clientId` (ObjectId, ref: 'User', required)
- `clientName` (String, required)

**Report Content:**
- `title` (String, required, trim)
- `diagnosis` (String, trim) - Chief complaint/diagnosis
- `findings` (String, trim) - Assessment findings
- `dietaryRecommendations` (String, trim) - Dietary advice
- `lifestyleRecommendations` (String, trim) - Lifestyle suggestions
- `supplements` (String, trim) - Supplements/medications recommended
- `followUpInstructions` (String, trim) - Follow-up guidelines
- `additionalNotes` (String, trim) - Extra notes

**Files:**
- `uploadedFiles` (Array) - Embedded files:
  - `fieldName`, `originalName`, `filename`, `data` (Buffer), `size`, `mimetype`, `uploadedAt`

**Status:**
- `status` (String, enum: 'draft', 'sent', 'viewed', default: 'sent')
- `timestamps` - Created and updated at

**Indexes:**
- dietitianId
- clientId
- (clientId, dietitianId)
- createdAt DESC

**Usage:** Detailed health evaluation reports created by dietitians for clients. Contains personalized health assessment and recommendations.

---

## 4. Content Schemas

### Blog Schema

**Purpose:** Blog posts written by users and dietitians.

**Fields:**

**Content:**
- `title` (String, required, trim, minlength: 5, maxlength: 200)
- `content` (String, required, minlength: 50) - Full blog content
- `excerpt` (String, maxlength: 300) - Short summary
- `category` (String, enum: 'Nutrition Tips', 'Weight Management', 'Healthy Recipes', 'Fitness & Exercise', 'Mental Health & Wellness', 'Disease Management', required)
- `tags` (Array of Strings, maxlength: 30 per tag) - Blog tags for categorization

**Author Information:**
- `author` (Object):
  - `userId` (ObjectId, required)
  - `name` (String, required)
  - `role` (enum: 'user', 'dietitian', required)

**Media:**
- `featuredImage` (Object):
  - `url` (String)
  - `publicId` (String) - Cloudinary ID for deletion
- `images` (Array) - Additional images:
  - `url`, `publicId`

**Engagement:**
- `likes` (Array of Objects):
  - `userId`, `likedAt` (Date)
- `likesCount` (Number, default: 0) - Denormalized like count
- `comments` (Array) - Embedded comment subdocuments
- `commentsCount` (Number, default: 0) - Denormalized comment count
- `views` (Number, default: 0) - View counter

**Status & Moderation:**
- `isPublished` (Boolean, default: true)
- `status` (String, enum: 'active', 'flagged', 'removed', default: 'active')
- `reports` (Array) - Embedded report subdocuments
- `isReported` (Boolean, default: false)
- `timestamps` - Created and updated at

**Indexes:**
- author.userId
- category
- (isPublished, status)
- createdAt DESC
- isReported

**Usage:** Platform for sharing health and nutrition content. Users and dietitians can create blog posts, which are moderated for quality and appropriateness.

---

### Comment Sub-Schema (embedded in Blog)

**Purpose:** Comments on blog posts.

**Fields:**
- `userId` (ObjectId, required) - Who commented
- `userName` (String, required)
- `userRole` (String, enum: 'user', 'dietitian', 'admin', 'organization', required)
- `content` (String, required, maxlength: 1000)
- `createdAt` (Date, default: now)

---

### Report Sub-Schema (embedded in Blog)

**Purpose:** Reports of inappropriate blog content.

**Fields:**
- `reportedBy` (ObjectId, required) - Who reported
- `reporterName` (String, required)
- `reason` (String, required, maxlength: 500) - Report reason
- `reportedAt` (Date, default: now)

---

### MealPlan Schema

**Purpose:** Personalized meal plans created by dietitians for users.

**Fields:**

**Plan Details:**
- `planName` (String, required, trim) - Name of the plan
- `dietType` (String, enum: 'Vegan', 'Vegetarian', 'Keto', 'Mediterranean', 'High-Protein', 'Low-Carb', 'Anything', default: 'Anything')
- `calories` (Number, required, min: 0) - Daily calorie target
- `notes` (String, trim, default: '') - Additional notes
- `imageUrl` (String, trim, default: '') - Image of the plan

**Meals:**
- `meals` (Array of nested objects):
  - `name` (String, required, trim)
  - `calories` (Number, required, min: 0)
  - `details` (String, trim) - Meal description

**Assignment:**
- `assignedDates` (Array of Strings) - Dates plan is active (YYYY-MM-DD format)

**References:**
- `dietitianId` (ObjectId, ref: 'Dietitian', required)
- `userId` (ObjectId, ref: 'User', required)

**Status:**
- `isActive` (Boolean, default: true)
- `createdAt` (Date, default: now)
- `updatedAt` (Date, default: now)

**Indexes:**
- (dietitianId, userId, createdAt DESC)

**Usage:** Meal plans created by dietitians and assigned to users. Plans can be assigned to specific dates and contain detailed meal information.

---

### FAQ Schema (from chatbotModels)

**Purpose:** Frequently asked questions for the chatbot system.

**Fields:**
- `question` (String, required, trim)
- `answer` (String, required) - Full answer text
- `category` (String, enum: 'general', 'nutrition', 'weight-loss', 'diet-plan', 'health', 'platform', default: 'general')
- `keywords` (Array of Strings) - Keywords for matching user queries
- `clickCount` (Number, default: 0) - Tracks popularity
- `isActive` (Boolean, default: true)
- `timestamps` - Created and updated at

**Indexes:**
- Text index on question and keywords for search

**Usage:** FAQs matched to user queries in the chatbot. System returns top 4 FAQs based on click count.

---

### ChatHistory Schema (from chatbotModels)

**Purpose:** Chat message history for analytics and context.

**Fields:**
- `userId` (ObjectId, ref: 'UserAuth') - User (null for anonymous)
- `sessionId` (String, required, indexed) - Groups messages by session
- `messages` (Array of Objects):
  - `type` (enum: 'user', 'bot', required)
  - `content` (String, required)
  - `timestamp` (Date, default: now)
  - `nutritionData` (Mixed) - Flexible nutrition info structure
  - `source` (enum: 'gemini', 'usda', 'hardcoded', 'faq', default: 'gemini')
- `timestamps` - Created and updated at

**Indexes:**
- (sessionId, createdAt DESC)

**Usage:** Records chatbot conversations for analytics, debugging, and context preservation across chat sessions.

---

### NutritionCache Schema (from chatbotModels)

**Purpose:** Cache USDA nutrition data to reduce API calls.

**Fields:**
- `foodName` (String, required, trim, lowercase) - Food item
- `usdaFdcId` (String) - USDA FoodData Central ID

**Nutrients (per serving):**
- `nutrients.calories` (Number, required)
- `nutrients.protein` (Number, required)
- `nutrients.carbs` (Number, required)
- `nutrients.fat` (Number, default: 0)
- `nutrients.fiber` (Number, default: 0)
- `nutrients.sugar` (Number, default: 0)

**Serving Information:**
- `servingSize.amount` (Number, default: 100)
- `servingSize.unit` (String, default: 'g')

**Metadata:**
- `lastUpdated` (Date, default: now)
- `source` (enum: 'usda', 'manual', default: 'usda')
- `timestamps` - Created and updated at

**Indexes:**
- foodName

**Usage:** Caches nutrition data from USDA and manual entries to improve chatbot response speed for food queries.

---

### HardcodedResponse Schema (from chatbotModels)

**Purpose:** Predefined responses for common chatbot queries.

**Fields:**
- `trigger` (String, required, lowercase, trim) - Keyword to activate response
- `response` (String, required) - The response to send
- `category` (String, enum: 'greeting', 'farewell', 'platform-info', 'nutrition-tip', 'motivation', default: 'platform-info')
- `isActive` (Boolean, default: true)
- `timestamps` - Created and updated at

**Indexes:**
- trigger

**Usage:** Quick responses for common user interactions like greetings, platform questions, and motivational messages.

---

## 5. Communication Schemas

### Message Schema

**Purpose:** Individual chat messages between users and dietitians.

**Fields:**

**Message Content:**
- `conversationId` (ObjectId, ref: 'Conversation', required, indexed)
- `senderId` (ObjectId, required, indexed) - Who sent the message
- `senderType` (String, enum: 'client', 'dietitian', required)
- `content` (String, required, trim) - Message text
- `messageType` (String, enum: 'text', 'video-link', 'lab-report', default: 'text')

**Special Content:**
- `videoLink` (Object):
  - `url` (String)
  - `scheduledDate` (Date)
  - `scheduledTime` (String)
- `labReport` (Object):
  - `fileName` (String)
  - `fileUrl` (String)
  - `uploadedAt` (Date)

**Message Status:**
- `isEdited` (Boolean, default: false)
- `isDeleted` (Boolean, default: false)
- `deletedAt` (Date) - When message was deleted
- `readBy` (Array of Objects):
  - `userId` (ObjectId)
  - `readAt` (Date)
- `timestamps` - Created and updated at

**Indexes:**
- conversationId
- senderId
- (conversationId, createdAt DESC)

**Usage:** Individual messages in conversations between users and dietitians. Supports text, video links, and lab report sharing.

---

### Conversation Schema

**Purpose:** Chat conversations between a user and dietitian.

**Fields:**

**Participants:**
- `clientId` (ObjectId, ref: 'User', required, indexed)
- `clientName` (String, required)
- `dietitianId` (ObjectId, ref: 'Dietitian', required, indexed)
- `dietitianName` (String, required)

**Last Message:**
- `lastMessage` (Object):
  - `content` (String) - Last message preview
  - `senderId` (ObjectId)
  - `timestamp` (Date)

**Status:**
- `isActive` (Boolean, default: true)
- `timestamps` - Created and updated at

**Indexes:**
- (clientId, dietitianId) - Unique compound index

**Usage:** Represents a conversation thread between a specific user and dietitian. Tracks the last message for UI display.

---

## 6. Administrative Schemas

### ActivityLog Schema

**Purpose:** Tracks actions performed by employees (verification, moderation).

**Fields:**

**Actor Information:**
- `organizationId` (ObjectId, ref: 'Organization', required, indexed)
- `employeeId` (ObjectId, ref: 'Employee', required, indexed)
- `employeeName` (String, required)
- `employeeEmail` (String, required)

**Activity Details:**
- `activityType` (String, enum: 'verification_approved', 'verification_rejected', 'blog_approved', 'blog_rejected', 'blog_flagged', required) - Type of action
- `targetId` (ObjectId, required) - ID of the item being acted upon
- `targetType` (String, enum: 'dietitian', 'organization', 'blog', required) - Type of target
- `targetName` (String) - Name of dietitian/org or blog title
- `status` (String, enum: 'verified', 'rejected', 'flagged', 'approved', 'pending', default: 'pending')
- `notes` (String, default: '') - Additional notes from employee

**Timestamps:**
- `createdAt` (Date, default: now, indexed)
- `updatedAt` (Date, default: now)

**Indexes:**
- (organizationId, employeeId, createdAt DESC)
- (organizationId, activityType)

**Usage:** Records all verification and moderation actions performed by organization employees. Used to create work summaries and activity reports.

---

### ContactQuery Schema

**Purpose:** Contact form submissions from website visitors.

**Fields:**

**Submitter Information:**
- `name` (String, required, trim)
- `email` (String, required, trim, lowercase) - Validated email
- `role` (String, enum: 'User', 'Dietitian', 'Certifying Organization', 'Others', default: 'Others', required)

**Query Details:**
- `query` (String, required, trim, minlength: 10) - The question/message
- `status` (String, enum: 'pending', 'replied', default: 'pending')

**Replies:**
- `admin_reply` (String, trim) - Response from admin
- `replied_at` (Date) - When admin replied
- `emp_reply` (String, trim) - Response from employee
- `emp_replied_at` (Date) - When employee replied

**Timestamps:**
- `created_at` (Date, default: now)
- Custom timestamps config

**Usage:** Stores support inquiries from users. Admins and employees can reply to queries.

---

### TeamBoard Schema

**Purpose:** Organization team communication board.

**Fields:**

**Organization Info:**
- `orgName` (String, required, trim, indexed)
- `isOrg` (Boolean, default: false) - If posted by org itself

**Post Content:**
- `author` (String, required, trim) - Who posted
- `email` (String, required, trim, lowercase) - Author's email
- `message` (String, required, trim, minlength: 1, maxlength: 1000) - Message content
- `postedAt` (Date, default: now)
- `timestamps` - Created and updated at

**Indexes:**
- (orgName, postedAt DESC) - For fetching latest posts per org

**Usage:** Communication board for organization employees and admins to share messages and announcements.

---

### Settings Schema

**Purpose:** Global platform settings and pricing configuration.

**Fields:**

**Platform Settings:**
- `termsOfService` (String, default: '') - T&C document
- `privacyPolicy` (String, default: '') - Privacy policy document

**Commission Settings:**
- `consultationCommission` (Number, default: 15, min: 0, max: 100) - Platform commission percentage
- `platformShare` (Number, default: 20, min: 0, max: 100) - Platform share percentage

**Monthly Subscription Tiers:**
- `monthlyTiers` (Array of Objects):
  - `name` (String, required) - Tier name
  - `price` (Number, required) - Monthly price
  - `desc1` (String) - Short description
  - `desc2` (String) - Detailed description
  - `features` (Array of Strings) - Feature list

**Yearly Subscription Tiers:**
- `yearlyTiers` (Array of Objects):
  - Same structure as monthlyTiers
  - Contains 3 default tiers: Basic, Premium, Ultimate

**Default Tier Structure:**

Basic Plan:
- 2 Consultations per month
- Book 3 days in advance
- 4 Personalized progress plans/month
- 20 AI Chatbot queries per day
- Create 2 Blog posts per month
- Unlimited Chat & Video Calls
- Email Support

Premium Plan:
- 8 Consultations per month
- Book 7 days in advance
- 15 Personalized progress plans/month
- 50 AI Chatbot queries per day
- Create 8 Blog posts per month
- Priority Support

Ultimate Plan:
- 20 Consultations per month
- Book 21 days in advance
- Unlimited everything
- 24/7 Priority Support

**Timestamps:**
- Created and updated at

**Usage:** Centralized configuration for pricing, plans, and platform-wide policies. Updated by administrators.

---

## Summary

The database schema structure is organized into logical categories:

1. **User Management** - Authentication and role-specific profiles
2. **Bookings** - Consultation scheduling and slot management
3. **Health Records** - Lab reports, health assessments, progress tracking
4. **Content** - Blogs, meal plans, chatbot knowledge base
5. **Communication** - Messages and conversations
6. **Administration** - Activity logs, contact queries, team boards, platform settings

All schemas include proper indexes for commonly queried fields, use references (ObjectId) for relationships, and include timestamps for audit trails. The system supports multiple user roles with appropriate access controls and data validation.
