import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import ScrollToTop from '../components/ScrollToTop';
import Sidebar from '../components/Sidebar/Sidebar';
import EmployeeHome from '../pages/HomePages/EmployeeHome';
import BlogModeration from '../pages/Blog/BlogModeration';
import DietitianVerify from '../pages/Verify/DietitianVerify';
import Blog from '../pages/Blog';
import BlogPost from '../pages/Blog/BlogPost';
import Contact from '../pages/Contactus';
import EmployeeSupport from '../pages/Organization/EmployeeSupport';
import { VerifyProvider } from '../contexts/VerifyContext';

// Inline layout: reuses existing Sidebar, no separate layout file needed
const EmployeeLayout = () => (
  <div className="flex min-h-screen">
    <Sidebar />
    <div className="flex-1 overflow-y-auto">
      <Outlet />
    </div>
  </div>
);

export default function EmployeeRoutes() {
  return (
    <AuthProvider currentRole="employee">
      <ScrollToTop />
      <Routes>
        <Route element={<EmployeeLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<EmployeeHome />} />
          <Route
            path="verify-dietitian"
            element={
              <VerifyProvider requiredRole="employee" redirectTo="/employee/home">
                <DietitianVerify />
              </VerifyProvider>
            }
          />
          <Route
            path="blog-moderation"
            element={
              <VerifyProvider requiredRole="employee" redirectTo="/employee/home">
                <BlogModeration />
              </VerifyProvider>
            }
          />
          <Route path="blogs" element={<Blog />} />
          <Route path="blog/:id" element={<BlogPost />} />
          <Route path="contact-us" element={<Contact />} />
          <Route path="support" element={<EmployeeSupport />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

