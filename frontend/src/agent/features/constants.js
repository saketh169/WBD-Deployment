import { Stethoscope, Utensils, Calendar, ShieldCheck } from "lucide-react";

export const SPECIALIST_AGENTS = [
  {
    id: "matcher",
    name: "Dietitian Matching",
    icon: Stethoscope,
    status: "Verified Atlas",
    desc: "Matches certified dietitians by clinical specialty, rating & fees",
  },
  {
    id: "nutrition",
    name: "Nutritional Analysis",
    icon: Utensils,
    status: "USDA FoodData",
    desc: "Provides exact verified calories, protein, carbs and healthy fats",
  },
  {
    id: "booking",
    name: "Slot Coordination",
    icon: Calendar,
    status: "Live Calendar",
    desc: "Inspects real-time dietitian availability and manages slot holds",
  },
  {
    id: "lab",
    name: "Clinical Safety",
    icon: ShieldCheck,
    status: "Safety Guard",
    desc: "Evaluates blood biomarkers & health metrics against medical norms",
  },
];

export const STARTER_PROMPTS = [
  {
    label: "Find PCOS Dietitians under ₹800",
    prompt:
      "Can you recommend verified dietitians for PCOS or hormonal balance under 800 rupees?",
    badge: "Specialist Search",
    icon: Stethoscope,
  },
  {
    label: "Nutrition Breakdown of 100g Paneer",
    prompt: "How much protein, carbs, fat, and calories are in 100g of paneer?",
    badge: "Food Nutrition",
    icon: Utensils,
  },
  {
    label: "Top Diabetes & Sugar Control Specialists",
    prompt:
      "Show me verified dietitians who specialize in Diabetes management and blood sugar control.",
    badge: "Dietitian Match",
    icon: Stethoscope,
  },
  {
    label: "Generate Precision Meal Plan",
    prompt:
      "Generate an interactive meal plan based on my health reports and dietitian assessment.",
    badge: "AI Meal Plan",
    icon: Calendar,
  },
  {
    label: "High-Protein Weight Loss Plan",
    prompt:
      "Can you suggest a healthy high-protein clinical meal plan for weight loss?",
    badge: "Dietary Guidance",
    icon: Calendar,
  },
];

export const DEFAULT_WELCOME_MESSAGE = {
  type: "bot",
  content:
    "Hello! Welcome to **NutriConnect Clinical Desk**.\n\nI can assist you directly with:\n• **Verified Dietitian Matching**: Find certified specialists for PCOS, Diabetes, Thyroid, or Weight Management\n• **USDA Nutritional Facts**: Retrieve verified calories, protein, carbs, and fat per 100g serving\n• **Consultation Scheduling**: Inspect real-time dietitian availability and book sessions\n• **Clinical Diet Planning**: Evidence-based meal guidance backed by certified nutrition standards\n\nHow can I help you today? Choose a suggested consultation topic on the left or type your query below.",
  timestamp: new Date(),
};
