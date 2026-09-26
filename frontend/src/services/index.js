// Auth Services
export * from './auth/authService';
export * as authService from './auth/authService';

// Booking Services
export * from './booking/bookingService';
export * as bookingService from './booking/bookingService';

// Dietitian Services
export * from './dietitian/dietitianService';
export * as dietitianService from './dietitian/dietitianService';

// Organization Services
export * from './organization/organizationService';
export * as organizationService from './organization/organizationService';

// Verification Services
export * from './verification/verifyService';
export * as verifyService from './verification/verifyService';

// Meal Plan Services
export * from './mealplan/mealPlanService';
export * as mealPlanService from './mealplan/mealPlanService';

// Chat Services
export * from './chat/chatService';
export * as chatService from './chat/chatService';

// Profile Services
export * from './profile/profileService';
export * as profileService from './profile/profileService';

// Blog Services
export * from './blog/blogService';
export * as blogService from './blog/blogService';

// Payment Services
export * from './payment/paymentService';
export * as paymentService from './payment/paymentService';

// Admin Services
export * from './admin/adminService';
export * as adminService from './admin/adminService';

// Lab Report Services
export * from './labreport/labReportService';
export * as labReportService from './labreport/labReportService';

// Misc Services
export * from './misc/miscService';
export * as miscService from './misc/miscService';

export { default as axiosInstance, makeRequest, getActiveToken, getActiveRoleFromPath } from '../utils/axiosInstance';
