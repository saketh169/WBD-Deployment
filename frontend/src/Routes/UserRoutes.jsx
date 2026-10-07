import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import ScrollToTop from '../components/ScrollToTop';
import NotFoundPage from '../pages/Error/NotFoundPage';

import UserHome from '../pages/HomePages/UserHome';
import UserSchedule from '../pages/Schedules/UserSchedule';

import UserDashboard from '../pages/Dashboards/User';
import UserProgress from '../pages/UserProgress'; 

import ChangePassword from '../pages/ChangePassword';
import EditProfile from '../pages/EditProfile';
import UserGetPlanForm from '../pages/MealPlans/UserGetPlanForm'; 


import NutriAgentPage from '../agent/NutriAgentPage';
import Blog from '../pages/Blog';
import Contact from '../pages/Contactus';
import CreateBlog from '../pages/Blog/CreateBlog';
import BlogPost from '../pages/Blog/BlogPost';

import AllDietitiansPage from '../pages/AllDietitiansPage';
import DietitianProfilesPage from '../pages/DietitianProfilesPage';
import DietitianProfile from '../pages/Consultations/DietitianProfile';
import DietitiansList from '../pages/Appointments/DietitiansList';
import ChatPage from '../pages/Chat/ChatPage';

// Payment pages
import Pricing from '../pages/Payments/Pricing';
import PricingPlan from '../pages/Payments/PricingPlan';
import Payment from '../pages/Payments/Payment';
import PaymentSuccess from '../pages/Payments/PaymentSuccess';
import SubscriptionDashboard from '../pages/Payments/SubscriptionDashboard';

import ClientLabReportViewer from '../pages/LabReports/ClientLabReportViewer';
import ClientHealthReportViewer from '../pages/LabReports/ClientHealthReportViewer';
import LabReportUploader from '../pages/LabReports/LabReportUploader';
import UserActivities from '../pages/Activities/UserActivities';




export default function UserRoutes() {
  const location = useLocation();
  const isAgent = location.pathname.includes('nutriagent') || location.pathname.includes('chatbot');

  return (
    <AuthProvider currentRole="user">
      <ScrollToTop />
      <div className={isAgent ? "w-full h-[calc(100dvh-72px)] overflow-hidden" : "p-6"}>
        <Routes>
          <Route index element={<Navigate to="home" replace />} />

        {/* All routes are automatically protected by ProtectedProvider in Layout.jsx */}
        <Route path="home" element={<UserHome />} />
        <Route path="profile" element={<UserDashboard />} />
        <Route path="activities" element={<UserActivities />} />
        <Route path="schedule" element={<UserSchedule />} />
        <Route path="consultations" element={<Navigate to="/user/schedule" replace />} />
        <Route path="progress" element={<UserProgress />} />  
        <Route path="get-plans" element={<UserGetPlanForm />} />   

        <Route path="change-pass" element={<ChangePassword />} />
        <Route path="edit-profile" element={<EditProfile />} />
        
        {/* Blog Routes */}
        <Route path="blogs" element={<Blog/>} />
        <Route path="blog/:id" element={<BlogPost />} />
        <Route path="create-blog" element={<CreateBlog />} />
        <Route path="edit-blog/:id" element={<CreateBlog />} />
        
        {/* NutriAgent, Blog, Contact */}
        <Route path="blog" element={<Blog/>} />
        <Route path="contact-us" element={<Contact/>} />
        <Route path="nutriagent" element={<NutriAgentPage />} />
        <Route path="chatbot" element={<Navigate to="/user/nutriagent" replace />} />
        
        {/* Chat Route */}
        <Route path="chat/:conversationId" element={<ChatPage />} />
        
        {/* Medical & Lab Reports Routes */}
        <Route path="lab-reports/:dietitianId" element={<ClientLabReportViewer />} />
        <Route path="submit-lab-report/:dietitianId" element={<LabReportUploader />} />
        <Route path="medical-reports/:dietitianId" element={<ClientLabReportViewer />} />
        <Route path="submit-medical-report/:dietitianId" element={<LabReportUploader />} />

        {/* Health Reports Route */}
        <Route path="health-reports/:dietitianId" element={<ClientHealthReportViewer />} />
         
         {/* Payment Routes */}
        <Route path="pricing" element={<Pricing />} />
        <Route path="pricing-plan" element={<PricingPlan />} />
        <Route path="payment" element={<Payment />} />
        <Route path="payment-success" element={<PaymentSuccess />} />
        <Route path="subscription" element={<SubscriptionDashboard />} />
       
        {/* Dietitian Routes */}
        <Route path="dietitian-profiles" element={<AllDietitiansPage />} />
        <Route
          path="dietitian-profiles/skin-hair"
          element={<DietitianProfilesPage specializationType="skin-hair" />}
        />
        <Route
          path="dietitian-profiles/womens-health"
          element={<DietitianProfilesPage specializationType="womens-health" />}
        />
        <Route
          path="dietitian-profiles/weight-management"
          element={
            <DietitianProfilesPage specializationType="weight-management" />
          }
        />
        <Route
          path="dietitian-profiles/gut-health"
          element={<DietitianProfilesPage specializationType="gut-health" />}
        />
        <Route
          path="dietitian-profiles/diabetes-thyroid"
          element={
            <DietitianProfilesPage specializationType="diabetes-thyroid" />
          }
        />
        <Route
          path="dietitian-profiles/cardiac-health"
          element={
            <DietitianProfilesPage specializationType="cardiac-health" />
          }
        />
        <Route path="dietitian-profiles/:id" element={<DietitianProfile />} />
        <Route path="my-dietitians" element={<DietitiansList />} />

        {/* Specialization Routes */}
        <Route
          path="weight-management"
          element={<DietitianProfilesPage specializationType="weight-management" />}
        />
        <Route
          path="diabetes-thyroid"
          element={<DietitianProfilesPage specializationType="diabetes-thyroid" />}
        />
        <Route
          path="cardiac-health"
          element={<DietitianProfilesPage specializationType="cardiac-health" />}
        />
        <Route
          path="womens-health"
          element={<DietitianProfilesPage specializationType="womens-health" />}
        />
        <Route
          path="skin-hair"
          element={<DietitianProfilesPage specializationType="skin-hair" />}
        />
        <Route
          path="gut-health"
          element={<DietitianProfilesPage specializationType="gut-health" />}
        />
        
        {/* Fallback Route */}
        <Route path="*" element={<NotFoundPage role="user" />} />
      </Routes>
    </div>
    </AuthProvider>
  );
}