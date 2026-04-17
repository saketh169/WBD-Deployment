# 🧪 API TESTING GUIDE - REQUEST/RESPONSE EXAMPLES

**For Swagger setup and documentation patterns, see [swagger.md](swagger.md)**

## 📌 QUICK START

**Testing URL:** `http://localhost:5000/api-docs`

### Authentication Setup:
1. Click **"Authorize"** button (top-right in Swagger UI)
2. Select **"BearerAuth"** 
3. Paste your JWT token as: `Bearer <your_token_here>`

---

## ✅ TEST CREDENTIALS

### 👤 TEST USERS
```
User 1 (Saketh P):
  ID: 6981ac1ca08b578ae3a029b8
  Email: user2@gmail.com
  Phone: 1234567890
  Address: Chennai, India

User 2 (SRIRAM):
  ID: 69a421a33085903f405782a7
  Email: user3@example.com
  Phone: 7075783112
  Address: Hyderabad, India

User 3 (TestUser):
  ID: 69c184a315361b568b7d7f55
  Email: test1774290083016@test.com
  Phone: 9999999999
  Address: 123 Test St
```

### 👨‍⚕️ TEST DIETITIANS
```
Dietitian 1 (Dr. Srimathi):
  ID: 691f30c66e1c4fe67755361c
  Email: dietitian1@gmail.com
  Phone: 7075783111
  License: DLN111111
  Status: Verified ✓

Dietitian 2 (Dr. Aravind Nair):
  ID: 69b995aab6067b17db5df40b
  Email: draravindnair@dietitian.com
  Phone: 9948719705
  License: DLN430847
  Status: Verified ✓
  Fees: ₹470/consultation
  Rating: 4.6/5

Dietitian 3 (Test Dietitian):
  ID: 69c900f06b3e0840cfc5a7a7
  Email: sarah@clinic.com
  Phone: 9876543212
  License: DLN123456
  Status: Pending Verification
```

### 🏥 TEST ORGANIZATIONS
```
Organization 1 (WES.CO):
  ID: 69a3d940529c0745eb63ba12
  Email: organization1@gmail.com
  Phone: 7075711111
  License: OLN111111
  Address: Hyderabad, Telangana
  Type: Private
  Status: Verified ✓

Organization 2 (Org Test):
  ID: 69c17da9ca43d8389dac4f50
  Email: org1774288297298@test.com
  Phone: 1234567893
  License: OLN123456
  Address: 123 St
  Type: Private
  Status: Pending Verification
```

### 🔐 TEST ADMINS
```
Admin 1 (Super Admin):
  ID: 691f3738307c08fbc4bbcec9
  Email: admin1@gmail.com
  Phone: 7075783146
  
Admin 2 (Sriram Nerella):
  ID: 6969c433c137cd7275961663
  Email: admin2@gmail.com
  Phone: 9876543211
```

### 👔 TEST EMPLOYEES (WES.CO Organization)
```
Employee 1 (Employee Four):
  ID: 69a3d992529c0745eb63ba31
  Email: employee4@gmail.com
  Phone: 9844444444
  Status: Inactive

Employee 2 (Employee Five):
  ID: 69a3d992529c0745eb63ba35
  Email: employee5@gmail.com
  Phone: 9855555555
  Status: Active

Employee 3 (Employee Eleven):
  ID: 69a3d992529c0745eb63ba39
  Email: employee6@gmail.com
  Phone: 1111111111
  Status: Active
```

---

## 📋 API ENDPOINTS - QUICK REFERENCE

For complete endpoint documentation, see [swagger.md](swagger.md)

**All endpoints below:** Use JWT token in Authorization header for protected routes

### Core Features
- **Authentication** - signup, signin, password reset
- **Health Reports** - Dietitian → Client communication
- **Lab Reports** - Client uploads, Dietitian reviews
- **Bookings** - Schedule consultations
- **Meal Plans** - Nutrition guidance
- **Progress Tracking** - User logs progress
- **Chat/Messaging** - Real-time communication
- **Blogs** - Health articles
- **Payments** - Subscriptions and billing
- **Analytics** - Admin dashboards
- **Employee Management** - Organization staff
- **Activity Logs** - Audit trails

---

## 🧪 ERROR CODES & RESPONSES

| Code | Meaning |
|------|---------|
| 200 | ✅ Success - Request successful |
| 201 | ✅ Created - New resource created |
| 400 | ❌ Bad Request - Invalid data or missing fields |
| 401 | ❌ Unauthorized - JWT token invalid/missing |
| 403 | ❌ Forbidden - Not allowed to perform action |
| 404 | ❌ Not Found - Resource doesn't exist |
| 409 | ❌ Conflict - Resource already exists |
| 500 | ❌ Server Error - Internal error |

---

## 📋 APPENDIX A: COMPLETE REQUEST BODIES

### 1️⃣ BOOKINGS - Complete Request Bodies

#### Create Booking - Full Request
```json
{
  "username": "Saketh P",
  "email": "user2@gmail.com",
  "userPhone": "1234567890",
  "userAddress": "Chennai, India",
  "dietitianId": "691f30c66e1c4fe67755361c",
  "dietitianName": "Dr. Srimathi",
  "dietitianEmail": "dietitian1@gmail.com",
  "dietitianPhone": "7075783111",
  "dietitianSpecialization": "Weight Management",
  "date": "2026-04-15",
  "time": "10:30 AM",
  "consultationType": "Online",
  "amount": 470,
  "paymentMethod": "card",
  "paymentId": "PAY_123456789abc"
}
```

**Field Descriptions:**
- `username`: Client's full name
- `email`: Client's email address
- `userPhone`: Client's phone number
- `userAddress`: Client's residential address
- `dietitianId`: Unique MongoDB ID of dietitian (e.g., `691f30c66e1c4fe67755361c`)
- `date`: Date of appointment in `YYYY-MM-DD` format
- `time`: Appointment time (must match available slots, e.g., "10:30 AM", "2:00 PM")
- `consultationType`: "Online" or "In-Person"
- `amount`: Consultation fee (numeric, e.g., 470)
- `paymentMethod`: "card", "upi", "netbanking" (must match payment processor)
- `paymentId`: Payment transaction ID from payment gateway

#### Check Booking Limits - Request
```json
{
  "userId": "6981ac1ca08b578ae3a029b8",
  "date": "2026-04-15"
}
```

#### Reschedule Booking - Request
```json
{
  "newDate": "2026-04-20",
  "newTimeSlot": "3:00 PM"
}
```

#### Update Booking Status - Request
```json
{
  "status": "confirmed"
}
```
**Valid Values:** `pending`, `confirmed`, `completed`, `cancelled`, `no_show`

---

### 2️⃣ MEAL PLANS - Complete Request Bodies

#### Create Meal Plan - Full Request
```json
{
  "planName": "High Protein Weight Loss Plan",
  "dietType": "High-Protein",
  "calories": 2000,
  "userId": "6981ac1ca08b578ae3a029b8",
  "notes": "Avoid dairy, high in vegetables. 5 meals per day",
  "imageUrl": "https://example.com/meal-plan-image.jpg",
  "meals": [
    {
      "mealName": "Breakfast",
      "time": "7:00 AM",
      "items": [
        {
          "itemName": "Oatmeal",
          "quantity": "1 cup",
          "calories": 150
        },
        {
          "itemName": "Almonds",
          "quantity": "20g",
          "calories": 110
        }
      ],
      "totalCalories": 260
    }
  ]
}
```

#### Update Meal Plan - Request
```json
{
  "planName": "High Protein Weight Loss (Revised)",
  "dietType": "High-Protein",
  "calories": 2100,
  "notes": "Added nuts for satiety. 5 meals per day"
}
```

#### Assign Meal Plan to Calendar - Request
```json
{
  "dates": [
    "2026-04-01",
    "2026-04-02",
    "2026-04-03",
    "2026-04-04",
    "2026-04-05"
  ]
}
```

---

### 3️⃣ HEALTH REPORTS - Complete Request Body

#### Create Health Report - Multipart Form
```
Form Fields (multipart/form-data):

dietitianId: 691f30c66e1c4fe67755361c
clientId: 6981ac1ca08b578ae3a029b8
title: March Health Assessment Report
diagnosis: Vitamin D Deficiency, Borderline High Cholesterol
dietaryRecommendations: 
  1. Increase intake of egg yolks, fortified dairy, fatty fish
  2. Reduce saturated fat intake
  3. Add 30 mins outdoor activity daily
supplementations:
  - Vitamin D3: 2000 IU daily
  - Fish Oil: 1000mg daily
lifestyleChanges: Increase daily walking, reduce sedentary hours
followUpDate: 2026-04-15
healthReportFile1: [Binary File Upload - PDF or Image]
```

#### Mark Health Report as Viewed - Request
```json
{}
```

---

### 4️⃣ LAB REPORTS - Complete Request Bodies

#### Submit Lab Report - Multipart Form (Thyroid + Fitness Combined)
```
Form Fields (multipart/form-data):

clientId: 6981ac1ca08b578ae3a029b8
submittedCategories: ["Thyroid", "Fitness_Metrics", "Cardiovascular"]

// Thyroid Fields
tsh: 4.5
freeT4: 16.2
reverseT3: 22.5

// Fitness Fields
heightCm: 175
currentWeight: 75
bodyFatPercentage: 22
activityLevel: moderate

// Cardiovascular Fields
systolicBP: 120
diastolicBP: 80
spo2: 98
heartRate: 72

// Upload Files
labReport: [Binary File]
testDate: 2026-03-25
```

#### Update Lab Report Status (Dietitian Review) - Request
```json
{
  "status": "reviewed",
  "feedback": "All thyroid levels are within normal range. TSH at 4.5 is perfect.",
  "recommendations": [
    "Continue current diet",
    "Maintain 3x weekly exercise",
    "Repeat thyroid panel in 3 months"
  ]
}
```

**Valid Status Values:** `submitted`, `pending_review`, `reviewed`

---

### 5️⃣ PAYMENTS - Complete Request Bodies

#### Initialize Payment - Request
```json
{
  "planType": "premium",
  "billingCycle": "monthly",
  "amount": 499,
  "paymentMethod": "card",
  "paymentDetails": {
    "cardType": "visa",
    "cardLast4": "4242"
  }
}
```

**Alternative - UPI:**
```json
{
  "planType": "premium",
  "billingCycle": "monthly",
  "amount": 499,
  "paymentMethod": "upi",
  "paymentDetails": {
    "upiId": "user@okhdfcbank",
    "upiApp": "Google Pay"
  }
}
```

**Alternative - EMI:**
```json
{
  "planType": "ultimate",
  "billingCycle": "yearly",
  "amount": 12000,
  "paymentMethod": "emi",
  "paymentDetails": {
    "emiBank": "ICICI Bank",
    "emiTenure": 12
  }
}
```

#### Cancel Subscription - Request
```json
{
  "reason": "No longer need premium features"
}
```

---

### 6️⃣ ACTIVITY LOGS - Complete Request Bodies

#### Log Blog Approval - Request
```json
{
  "activityType": "blog_approved",
  "targetId": "60d5ec49c1234567890abcde",
  "targetType": "blog",
  "targetName": "Healthy Eating Habits",
  "status": "approved",
  "notes": "Approved blog post and dismissed abuse reports"
}
```

#### Log Dietitian Verification - Request
```json
{
  "activityType": "verification_approved",
  "targetId": "691f30c66e1c4fe67755361c",
  "targetType": "dietitian",
  "targetName": "Dr. Srimathi - License Certificate",
  "status": "verified",
  "notes": "Approved License Certificate and marked verified"
}
```

---

## 📋 APPENDIX B: EMPLOYEE BULK UPLOAD CSV

### CSV Format for Bulk Employee Import

```csv
name,email,password,age,address,contact
"John Doe","john@hospital.com","password123",30,"123 Main St","+1234567890"
"Jane Smith","jane@hospital.com","password456",25,"456 Oak Ave","+1987654321"
"Mike Johnson","mike@hospital.com","password789",35,"789 Pine Rd","+1555666777"
"Sarah Wilson","sarah@hospital.com","password012",28,"321 Elm St","+1888999000"
```

**Required Fields:** name, email, password
**Optional Fields:** age, address, contact

---

## ✅ TESTING BEST PRACTICES

1. **Always include JWT token** in "Authorize" for protected routes
2. **Use provided test IDs** from credentials section above
3. **Follow date format** - Use YYYY-MM-DD for all dates
4. **Select multipart/form-data** in Swagger for file uploads
5. **Check response status codes** - 200/201 = success, 4xx/5xx = error
6. **Test in sequence** - Auth first, then use token for other endpoints
7. **Review request bodies** - Each section shows realistic examples
8. **Parameter types matter** - Numbers, strings, dates formatted correctly
9. **Response includes helpful data** - Check for created IDs and timestamps
10. **Validate errors** - Intentionally test with invalid data to see error messages

---

## ✅ QUICK TESTING CHECKLIST

- [ ] Can signup and login
- [ ] Can create health reports
- [ ] Can submit lab reports
- [ ] Can update lab report status
- [ ] Can create bookings
- [ ] Can manage bookings
- [ ] Can process payments
- [ ] Can chat with dietitian
- [ ] Can manage blogs
- [ ] Admin can view analytics
- [ ] Employees can submit queries
- [ ] Org admin can view activities
- [ ] Can cancel subscriptions
- [ ] File uploads work properly

---

**Last Updated:** March 30, 2026
**Version:** 3.0 - Cleaned, deduplicated with practical examples
**Status:** ✅ Production Ready
