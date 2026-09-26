import axiosInstance, { makeRequest } from '../../utils/axiosInstance';

export const getUserMealPlans = (userId) =>
  makeRequest(() => axiosInstance.get(`/api/meal-plans/user/${userId}`));

export const getDietitianClientMealPlans = (dietitianId, userId) =>
  makeRequest(() => axiosInstance.get(`/api/meal-plans/dietitian/${dietitianId}/client/${userId}`));

export const createMealPlan = (mealPlanData) =>
  makeRequest(() => axiosInstance.post('/api/meal-plans', mealPlanData));

export const deleteMealPlan = (planId) =>
  makeRequest(() => axiosInstance.delete(`/api/meal-plans/${planId}`));

export const assignMealPlanDates = (planId, payload) =>
  makeRequest(() => axiosInstance.post(`/api/meal-plans/${planId}/assign`, payload));

export const removeMealPlanDates = (planId, payload) =>
  makeRequest(() => axiosInstance.delete(`/api/meal-plans/${planId}/dates`, { data: payload }));
