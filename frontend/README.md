# Frontend

This is the frontend application for the WBD project, built with React and Vite. It provides the user interface for the web application with a modern, responsive design using TailwindCSS.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running on `http://localhost:5000`

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update any required environment variables (e.g., API endpoints)

## Running the Frontend

Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173` and proxy API requests to the backend at `http://localhost:5000`.

## Build for Production

Build the application:
```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Additional Scripts

- `npm run dev`: Start the development server with hot reload
- `npm run build`: Build the application for production
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint for code linting

## 3rd Party Libraries

### UI & Styling
- **TailwindCSS** - Utility-first CSS framework for rapid UI development
- **react-icons** - Popular icon library for React
- **lucide-react** - Clean, minimal icon set for React
- **@tinymce/tinymce-react** - Rich text editor component

### State Management & Forms
- **@reduxjs/toolkit** - Redux state management library
- **react-redux** - React bindings for Redux
- **react-hook-form** - Performant form validation library
- **formik** - Form management library
- **@hookform/resolvers** - Validation resolvers for react-hook-form
- **yup** - Schema validation library

### Routing
- **react-router** - Declarative routing for React
- **react-router-dom** - DOM bindings for React Router

### Data & API
- **axios** - Promise-based HTTP client
- **jwt-decode** - JWT decoding utility

### Data Visualization & UI Components
- **recharts** - Composable charting library for React
- **chart.js** - JavaScript charting library
- **moment** - Date and time library
- **react-toastify** - Notification toasts for React
- **react-textarea-autosize** - Auto-resizing textarea component

### Build & Development
- **vite** - Next generation frontend build tool
- **@vitejs/plugin-react** - React plugin for Vite
- **eslint** - JavaScript linting utility
- **prettier** - Code formatter

## Folder Structure

This project frontend consists of the following structure:

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
    - **`main.jsx`**: React application entry point.
    - **`App.jsx`**: Main App component.
    - **`Layout.jsx`**: Layout wrapper component.
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
    
  - **`vite.config.js`**: Vite build configuration.
