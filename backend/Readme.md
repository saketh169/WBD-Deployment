# Backend

This is the backend server for the WBD project, built with Node.js and Express. It provides RESTful API endpoints for the frontend application, with MongoDB for data persistence and various integrations for enhanced functionality.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (running locally or MongoDB Atlas connection)
- Cloudinary account (for file uploads)
- Google Generative AI API key (for AI features)
- Nodemailer configuration (for email sending)

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.sample` to `.env`
   - Fill in the required environment variables:
     - `PORT`: Server port (default: 8200)
     - `MONGODB_URI` or `MONGODB_URL`: MongoDB connection string
     - `JWT_SECRET`: Secret key for JWT tokens
     - `EMAIL_USER` & `EMAIL_PASS`: Email service credentials
     - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary credentials
     - `GOOGLE_AI_API_KEY`: Google Generative AI API key
     - `SMTP_USER` & `SMTP_PASS`: Alternative SMTP credentials
    - `JITSI_DOMAIN` (optional): Override default `https://meet.jit.si` for auto-generated video links

## Running the Backend

Start the development server with hot reload:
```bash
npm start
```

The backend server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## Database Seeding

Seed the database with initial data:
```bash
npm run seed:dietitians      # Seed with dietitian data
npm run seed:settings        # Seed with settings data
```

## 3rd Party Libraries

### Server & API
- **express** - Fast and minimal web framework for Node.js
- **cors** - Cross-Origin Resource Sharing middleware
- **helmet** - Security headers middleware
- **express-rate-limit** - Rate limiting middleware to prevent abuse

### Authentication & Security
- **jsonwebtoken** - JWT token generation and verification
- **bcryptjs** - Password hashing for secure credential management

### Database
- **mongoose** - MongoDB object modeling and validation

### File & Cloud Storage
- **multer** - Middleware for file uploads
- **cloudinary** - Cloud storage and image optimization service

### Email
- **nodemailer** - Email sending library

### AI & APIs
- **@google/generative-ai** - Google's generative AI library
- **axios** - Promise-based HTTP client for API calls

### Utilities
- **dotenv** - Environment variable loader
- **nodemon** - Auto-restart Node.js during development
- **rotating-file-stream** - Log file rotation utility

## Folder Structure

This project backend consists of the following structure:

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