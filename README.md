# WBD - BackendDev

This project consists of a backend and frontend setup. The backend is a Node.js-based server, while the frontend is a React application.

##  How to Run the Application

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (running locally or MongoDB Atlas connection)

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - **Backend**: Copy `backend/.env.sample` to `backend/.env` and fill in your MongoDB URI, JWT secret, email credentials, Cloudinary keys, and Google AI API key
   - **Frontend**: Copy `frontend/.env.example` to `frontend/.env` and configure any required API endpoints

4. **Run the backend server:**
   ```bash
   nodemon src/server.js
   ```

   The backend server will start on `http://localhost:5000`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 🎨 FRONTEND ARCHITECTURE & STYLING

### Frontend Stack
- **Framework**: React 19.1.0 (with React Router 7.9.4)  
- **Styling**: Tailwind CSS 4.1.13 + Custom CSS Modules
- **State Management**: Redux Toolkit (@reduxjs/toolkit 2.9.1)
- **Form Handling**: React Hook Form + Formik + Yup validation
- **UI Components**: Lucide React, FontAwesome, React Icons
- **Charts/Graphs**: Chart.js, Recharts 3.3.0
- **Real-time**: Socket.IO Client 4.8.3
- **Rich Text Editor**: TinyMCE React
- **Build Tool**: Vite (with Tailwind plugin)

---

## 👥 USER ROLES

**USER** (Client/Patient)  
Clients who can book dietitian consultations, subscribe to meal plans, submit lab reports, track health progress, and chat with dietitians for personalized nutrition guidance.

**DIETITIAN** (Nutrition Professional)  
Licensed professionals who create meal plans, assess client health, review lab reports, manage consultation bookings, and earn revenue from providing nutrition services to clients.

**ADMIN** (Platform Administrator)  
Global admin with full platform access including user verification, complete analytics dashboard, revenue tracking, user account management, and content moderation across the entire platform.

**ORGANIZATION** (External Organization Admin - Private/Public/NGO/Government)  
Organization administrators from external organizations who manage staff employees, moderate blog content, handle employee queries, conduct team activities, and maintain organization verification status.

**EMPLOYEE** (Organization Staff Member)  
Staff members of an organization who can submit queries to org admins, post on team boards, log work activities, and access organization announcements and communications.

---

## 🎨 CSS STYLING PALETTE

### Color Scheme

**Primary Green (Brand Colors):**
```css
--primary-dark: #1E6F5C      /* Dark forest green */
--primary-base: #28B463      /* Vibrant green (accent) */
--primary-light: #2E8B57     /* Medium green */
```

**Secondary Colors (Light Greens):**
```css
--light-green-1: #E8F5E9     /* Very light green (background) */
--light-green-2: #D4EFDF     /* Light green (splash screen) */
--light-green-3: #C8E6C9     /* Lighter green (border) */
```

**Neutral Colors:**
```css
--white: #FFFFFF
--black: #000000
--gray-dark: #2C3E50         /* Dark text */
--gray-text: #666666
--gray-light: #F5F5F5        /* Light backgrounds */
--gray-border: #DDDDDD       /* Border color */
```

**Status Colors:**
```css
--success: #28B463           /* Bookings confirmed, tasks done */
--pending: #FFC107           /* Booking pending, verification waiting */
--warning: #FF9800           /* Caution, needs attention */
--error: #F44336             /* Error, rejected, failed */
--info: #2196F3              /* Information, notes */
```

### Typography

**Font Family**: 'Poppins', sans-serif (throughout frontend)

**Font Sizes:**
```
--text-xs: 12px
--text-sm: 14px
--text-base: 16px
--text-lg: 18px
--text-xl: 20px
--text-2xl: 24px
--text-3xl: 32px
--text-4xl: 48px (Splash screen logo)
```

**Font Weights:**
```
--fw-light: 300              /* Taglines */
--fw-regular: 400            /* Body text */
--fw-medium: 500             /* Subheadings */
--fw-semibold: 600           /* Card titles */
--fw-bold: 700               /* Headers */
--fw-extrabold: 800          /* Logo, prominent titles */
```

### Component Styling Examples

**Dashboard Cards:**
- Background: #FFFFFF with subtle shadow
- Border: 1px solid #C8E6C9
- Header Text Color: #1E6F5C
- Accent Elements: #28B463
- Hover State: Shadow increases, slight scale

**Buttons:**
- Primary: Background #28B463, Text white, hover #1E6F5C
- Secondary: Background #E8F5E9, Text #1E6F5C, border #28B463
- Danger: Background #F44336, Text white
- Disabled: Background #CCCCCC, Text #999999

**Forms:**
- Input Border: #C8E6C9 on focus → #28B463
- Label Color: #2C3E50
- Error Text: #F44336
- Helper Text: #666666

---

## 🔗 SWAGGER/OPENAPI CONFIGURATION

### Swagger UI Setup

**URL**: `http://localhost:5000/api-docs`

**Configuration in server.js:**
```javascript
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NutriConnect API',
      version: '1.0.0',
      description: 'Complete API documentation for NutriConnect...',
      contact: {
        name: 'NutriConnect Support',
        email: 'support@nutriconnect.com'
      }
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: process.env.PRODUCTION_URL, description: 'Production' }
    ]
  }
}
```

### Swagger Tags (22 Total)

| Tag | Description | Endpoints |
|-----|-------------|-----------|
| Auth | Authentication & user registration | 17 |
| Profile | User profile management | 18 |
| Bookings | Consultation bookings | 10 |
| Payments | Payment processing | 7 |
| Chatbot | AI chatbot interaction | 2 |
| Blog | Blog management | 13 |
| Meal Plans | Meal plan operations | 8 |
| Health Reports | Health report management | 5 |
| Lab Reports | Lab report management | 4 |
| Progress | User progress tracking | 6 |
| Analytics | Platform analytics (Admin) | 11 |
| Settings | Platform settings | 3 |
| Notifications | Notification management | 4 |
| Employee | Employee management (Org) | 9 |
| TeamBoard | Team board operations | 3 |
| ActivityLog | Activity logging | 3 |
| Chat | Real-time messaging | 7 |
| ContactUs | Contact us & support | 8 |
| Status | Status checking | 3 |
| Verify | Verification operations (Admin) | 18 |
| Crud | General CRUD operations (Admin) | 8 |
| Dietitian | Dietitian management | 15 |

**Total**: 174+ Endpoints

### Security Scheme

**Bearer Token (JWT):**
```yaml
BearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
  description: 'JWT Authorization header using Bearer scheme'
```

**Header Format:**
```
Authorization: Bearer <your_jwt_token_here>
```

### Response Code Standards

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (new resource) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Invalid/missing JWT token |
| 403 | Forbidden | Insufficient permissions for role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, booking slot taken |
| 422 | Unprocessable | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Unavailable | Service down, maintenance |

### Accessing Swagger UI

1. Start backend: `npm run dev` (from backend folder)
2. Open browser: `http://localhost:5000/api-docs`
3. Click "Authorize" (top right) to add JWT token
4. Select "BearerAuth"
5. Paste token: `Bearer <your_token>`
6. Click "Try it out" to test endpoints
7. See response in JSON format

### Example Swagger Endpoint Documentation

```javascript
/**
 * @swagger
 * /api/bookings/create:
 *   post:
 *     tags: ['Bookings']
 *     summary: Create consultation booking
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - dietitianId
 *               - date
 *               - time
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               dietitianId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       403:
 *         description: Booking limit reached
 */
```

---

## 🔄 FRONTEND AUTHENTICATION FLOW

### Login Flow

```
User Visit → Role Selection → Signin Form
                ↓
        API: /api/signin/{role}
                ↓
        Server validates credentials
                ↓
        Returns JWT Token + User Data
                ↓
        Stored in localStorage with roleKey
                ↓
        AuthContext updates
                ↓
        Redirect to Role-Specific Dashboard
```

### Token Storage

```javascript
// Role-specific localStorage keys:
localStorage.setItem('authToken_user', jwt)      // User tokens
localStorage.setItem('authToken_dietitian', jwt) // Dietitian tokens
localStorage.setItem('authToken_organization', jwt) // Org/Employee
localStorage.setItem('authToken_admin', jwt)    // Admin tokens
localStorage.setItem('authUser_<role>', userData) // User data (no image)
```

### Protected Routes

**Layout.jsx handles role-based routing:**
```
Route: /user/* → Only accessible if role === 'user'
Route: /dietitian/* → Only accessible if role === 'dietitian'
Route: /admin/* → Only accessible if role === 'admin'
Route: /organization/* → Only for organization admins
```

---

## 📦 TECH STACK SUMMARY

| Layer | Technology |
|-------|-----------|
| **UI Framework** | React 19.1.0 |
| **Routing** | React Router 7.9.4 |
| **Styling** | Tailwind CSS 4.1.13 |
| **State Management** | Redux Toolkit 2.9.1 |
| **Form Handling** | React Hook Form + Formik + Yup |
| **HTTP Client** | Axios 1.12.2 |
| **Icons** | FontAwesome, React Icons, Lucide React |
| **Charts** | Chart.js, Recharts |
| **Real-time** | Socket.IO Client 4.8.3 |
| **JWT Handling** | jwt-decode 4.0.0 |
| **Rich Text** | TinyMCE React 6.3.0 |
| **Build Tool** | Vite 4.x |

---

**Last Updated**: March 30, 2026  
**Frontend Version**: Vite + React + Tailwind CSS  
**API Documentation**: http://localhost:5000/api-docs  
**Auth Tokens**: JWT Bearer tokens (role-specific storage)

   The frontend will start on `http://localhost:5173`

### Running Both Servers

Open two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
nodemon src/server.js
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Once both servers are running, open your browser and navigate to `http://localhost:5173` to access the application.

## 🚀 Quick Start

For experienced developers:

```bash
# Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment files
cp backend/.env.sample backend/.env
cp frontend/.env.example frontend/.env

# Start both servers (in separate terminals)
cd backend && npm start
cd frontend && npm run dev
```

---

## � Project Structure

This project consists of a backend and frontend setup:

- **`backend/`**: Root directory for the backend.
  - **`.env`**: Environment variables file.
  - **`.env.sample`**: Sample environment variables file.
  - **`.gitignore`**: Files/folders to exclude from version control.
  - **`.prettierignore`**: Files to ignore for Prettier formatting.
  - **`.prettierrc`**: Prettier configuration for code formatting.
  - **`logs/`**: Directory for log files (auto-created).
  - **`node_modules/`**: Contains backend dependencies.
  - **`package-lock.json`**: Locks dependency versions.
  - **`package.json`**: Manages dependencies and scripts.
  - **`public/`**: Holds static files served by the backend.
    - **`temp/`**: Temporary file storage.
  - **`Readme.md`**: Backend documentation.
  - **`scripts/`**: Utility and seeding scripts.
    - **`seedChatbot.js`**: Chatbot data seeding script.
    - **`seedDietitians.js`**: Dietitian data seeding script.
    - **`seedSettings.js`**: Settings data seeding script.
  - **`src/`**: Contains backend source code.
    - **`controllers/`**: Request handlers and business logic.
    - **`middlewares/`**: Express middleware functions.
    - **`models/`**: MongoDB data models/schemas.
    - **`routes/`**: API route definitions.
    - **`services/`**: Business logic services.
    - **`utils/`**: Utility functions and helpers.
      - **`db.js`**: Database connection utility.
      - **`.env`**: Environment variables file.
    - **`server.js`**: Main server entry point.

- **`frontend/`**: Root directory for the frontend.
  - **`.env`**: Environment variables file.
  - **`.env.example`**: Example environment variables file.
  - **`.gitignore`**: Files/folders to exclude from version control.
  - **`eslint.config.js`**: ESLint configuration for linting.
  - **`index.css`**: Main CSS file.
  - **`index.html`**: Main HTML file.
  - **`node_modules/`**: Contains frontend dependencies.
  - **`package-lock.json`**: Locks dependency versions.
  - **`package.json`**: Manages dependencies and scripts.
  - **`public/`**: Holds static files.
  - **`README.md`**: Frontend documentation.
  - **`src/`**: Contains React source code.
    - **`App.jsx`**: Main App component.
    - **`Layout.jsx`**: Layout wrapper component.
    - **`main.jsx`**: React entry point.
    - **`components/`**: Reusable React components.
      - **`extras/`**: Extra utility components.
      - **`Footer/`**: Footer component.
      - **`Header/`**: Header component.
      - **`Navbar/`**: Navigation bar component.
      - **`Sidebar/`**: Sidebar navigation component.
    - **`contexts/`**: React context providers for state management.
    - **`hooks/`**: Custom React hooks.
    - **`middleware/`**: Middleware functions.
    - **`pages/`**: Page components.
      - **`Activities/`**: Activities page.
      - **`Admin/`**: Admin dashboard pages.
      - **`Appointments/`**: Appointments management.
      - **`Auth/`**: Authentication pages (Login, Register).
      - **`Blog/`**: Blog pages.
      - **`Chat/`**: Chat interface pages.
      - **`ChatBot/`**: AI ChatBot page.
      - **`Consultations/`**: Consultation booking pages.
      - **`Corporate/`**: Corporate/Organization pages.
      - **`Dashboards/`**: User and admin dashboards.
      - **`Error/`**: Error pages (404, 500, etc.).
      - **`HomePages/`**: Home landing pages.
      - **`LabReports/`**: Lab reports page.
      - **`MealPlans/`**: Meal plans and diet pages.
      - **`Payments/`**: Payment processing pages.
      - **`Schedules/`**: Scheduling pages.
      - **`Status/`**: Status/Progress pages.
      - **`Verify/`**: Email/Account verification pages.
    - **`redux/`**: Redux store setup.
      - **`slices/`**: Redux slice definitions.
      - **`store.js`**: Redux store configuration.
    - **`Routes/`**: Routing configuration.
      - **`Routes.jsx`**: Route definitions.
    - **`styles/`**: CSS and styling files.
    - **`utils/`**: Utility functions and helpers.
      - **`axiosInterceptor.js`**: Axios request/response interceptors.
      - **`toastNotifications.js`**: Toast notification utilities.
  - **`vite.config.js`**: Vite build configuration.

---

