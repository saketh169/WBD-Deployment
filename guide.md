# NutriConnect Comprehensive Guide

Welcome to the **NutriConnect** platform guide. This document provides an exhaustive overview of the platform architecture, user roles, core workflows, and the flagship clinical AI feature: **NutriAgent**.

---

## 1. Platform Overview

NutriConnect is an end-to-end nutrition, dietary care, and health optimization platform connecting patients with certified clinical dietitians and nutritionists. The platform provides:
- Secure role-based authentication and profile management (User, Dietitian, Admin, Organization, Organization Employee).
- Video and in-person consultation booking with real-time slot scheduling.
- Clinical meal planning, diet prescriptions, and medical health report tracking.
- Lab report and health document uploads with clinical parameter extraction.
- **NutriAgent**: An autonomous, clinical RAG-powered nutrition assistant integrating LangGraph state orchestration and Model Context Protocol (MCP) tool standards.

---

## 2. Platform Roles & Features

### 👤 User (Client / Patient)
- **Profile & Health Goals**: Track health goals, dietary preferences, allergies, and medical history.
- **Dietitian Discovery**: Filter certified nutritionists by specialty, consultation fees, and ratings.
- **Consultation Scheduling**: Book time slots, process secure payments, and join consultations.
- **Personalized Meal Plans**: Access custom meal plans crafted by licensed dietitians.
- **Lab & Health Reports**: Securely upload diagnostic lab tests (HbA1c, lipid profiles, blood work) and track metric trends.
- **NutriAgent Assistance**: Engage with NutriAgent for instant nutrition inquiries, automated dietitian discovery, slot booking, and personalized schedule lookups.

### 🩺 Dietitian (Nutrition Professional)
- **Practice Management**: Set up clinical bio, credentials, registration licenses, and consultation fees.
- **Availability & Slot Management**: Define weekly consultation hours and block individual dates or time slots.
- **Client Consultations**: Conduct online and in-person sessions, review patient lab reports, and log health metrics.
- **Meal Plan Builder**: Build structured, calorie- and macronutrient-balanced meal plans for clients.
- **Professional Credential Verification**: Submit official license documents to certifying organizations and platform administrators.

### 🏢 Organization (Certifying Authority / Corporate Partner)
- **Dietitian Verification**: Validate qualifications, licenses, and credentials of practicing dietitians.
- **Employee Governance**: Manage team members, bulk onboard employees via CSV, and oversee quality workflows.
- **Blog & Content Moderation**: Enforce platform standards on public wellness articles and educational posts.
- **Team Board & Operations**: Post announcements and track employee work activities.

### 👔 Organization Employee (Verification & Moderation Staff)
- **Document Verification**: Review uploaded dietitian licenses, degrees, and identification.
- **Query Resolution**: Resolve support queries submitted by dietitians and clients.
- **Blog Moderation**: Review flagged articles and uphold clinical guidelines.

### 👑 Admin (Platform Administrator)
- **System Administration**: Oversee platform users, verify organizations, and audit operational activity.
- **Financial & Subscription Management**: Manage platform commissions, revenue share, and subscription tiers.
- **Legal Content Management**: Live editing and publication of Terms of Use and Privacy Policy documents.
- **Comprehensive Analytics**: Track platform revenue, user acquisition, and operational health.

---

## 3. NutriAgent: Dedicated Clinical AI Architecture

NutriConnect replaces legacy chatbot interfaces with **NutriAgent**—an autonomous clinical AI agent powered by **Google Gemini 2.5 Flash Lite**, **LangGraph** state machine orchestration, **Retrieval-Augmented Generation (RAG)**, and the **Model Context Protocol (MCP)**.

### Architecture Overview

```mermaid
flowchart TD
    User([User / Patient]) -->|Chat Query + File Upload| UI[NutriAgentPage.jsx]
    UI -->|POST /api/agent/chat| Route[agentRoutes (index.js)]
    Route --> LangGraph[runLangGraphAgent State Machine]

    subgraph LangGraph_Pipeline["LangGraph 4-Stage State Machine"]
        GNode[1. Grounding Node] -->|RAG Lab & Profile Retrieval| RNode[2. Reasoning Node]
        RNode -->|Intent Routing & Scoped Tools| TNode[3. Tool Node]
        TNode -->|Promise.all Execution + UI Cards| SNode[4. Synthesis Node]
        SNode -->|Clinical Empathy + Anti-Hallucination Guardrails| Reply[Final Reply + Interactive Cards]
    end

    LangGraph --> Response[API Response Envelope]
    Response --> UI
    UI --> Render[Interactive Dynamic Cards: Specialists, Slots, Nutrition, Schedule]
```

### The 4-Stage State Machine Pipeline

1. **Grounding Node (`groundingNode`)**:
   - Queries MongoDB via `ragRetriever.js` using the authenticated patient ID.
   - Retrieves confirmed health history, latest lab test panels (HbA1c, fasting glucose, lipid profiles), and active dietitian care recommendations.
   - Injects grounding context into state channels before reasoning commences.

2. **Reasoning Node (`reasoningNode`)**:
   - Analyzes user prompt intent via `analyzeQueryAttention`.
   - Distinguishes between pure conversational health queries, clinical document evaluations, specialist discovery, availability checks, and appointment scheduling.
   - Scopes tool declarations strictly to relevant actions, eliminating arbitrary tool hallucinations.
   - Dispatches function calls to Gemini with real-time Indian Standard Time (IST) clock awareness.

3. **Tool Node (`toolNode`)**:
   - Executes all emitted tool calls in parallel using `Promise.all`.
   - Attaches corresponding rich interactive UI cards to `state.cards`.

4. **Synthesis Node (`synthesisNode`)**:
   - Combines retrieved medical data, tool execution results, and conversation context into an empathetic, jargon-free summary.
   - Applies safety guardrails: zero doctor fabrication, strict boundaries against unauthorized prescription drug dosing, and zero emoji output.

### Production Clinical Tools Registry

| Tool Name | Scope & Purpose | Generated UI Card |
|---|---|---|
| `search_dietitians` | Searches verified dietitians filtered by specialty, location, and fees. | `dietitian_cards` |
| `check_dietitian_availability` | Queries active scheduling slots and returns available consultation times. | `slot_booking_card` |
| `book_dietitian_appointment` | Books an appointment slot directly through the agent interface. | `booking_confirmation_card` |
| `get_user_schedule` | Retrieves patient's active consultations and scheduled appointments. | `user_schedule_card` |
| `lookup_nutrition` | Performs nutritional analysis (calories, proteins, fats, carbs) for foods. | `nutrition_card` |
| `generate_meal_plan` | Computes personalized diet and meal plans grounded in dietitian targets. | `meal_plan_card` |

### Model Context Protocol (MCP) Integration

NutriAgent implements standard Model Context Protocol (MCP) servers (`backend/src/agent/mcp/`):
- Supports **Stdio** and **Server-Sent Events (SSE)** transports.
- Exposes NutriConnect's clinical tools and patient context resources to external agent environments (such as Claude Desktop and Cursor IDE).
- Reuses unified tool definitions from `langgraph/tools.js` to guarantee consistency across internal web chats and external MCP hosts.

### NutriAgent Frontend Experience

Located at `/user/nutriagent` (`NutriAgentPage.jsx`):
- **Dynamic Multi-Session Sidebar**: Create, switch, rename, and delete conversation threads with full database persistence.
- **Rich Interactive Cards**:
  - `DietitianCard`: Specialist profiles with ratings, specialties, and one-click booking triggers.
  - `SlotBookingCard`: Interactive calendar date and time-slot selectors.
  - `BookingConfirmationCard`: Instant booking verification with consultation details.
  - `NutritionCard`: Macronutrient charts and nutritional breakdowns.
  - `MealPlanCard`: Interactive daily meal plan schedules.
  - `UserScheduleCard`: Patient's upcoming consultations and diet schedules.
  - `UploadedDocumentCard`: Medical report attachment preview and extraction status.

---

## 4. Key Workflows

### How to Use NutriAgent
1. Log in to your NutriConnect user account.
2. Navigate to **NutriAgent** from the top header navigation bar.
3. Type any nutritional question, upload a recent lab report, or ask to book an appointment (e.g., *"Find me a diabetes specialist available this week"*).
4. Review the returned specialist or nutrition cards directly in the chat and interact with the cards to complete bookings seamlessly.

### How to Consult with a Dietitian
1. Browse dietitians from the **Dietitians** navigation menu or through NutriAgent.
2. Select a convenient time slot and book the consultation.
3. Upload any recent medical or lab reports under **Lab Reports** for your dietitian to review prior to the appointment.
4. Join the session via the provided video consultation link at the scheduled time.
5. Receive your customized meal plan directly in your dashboard.

---

## 5. Security, Guardrails & Quality Standards

- **Strict Medical Grounding**: The agent does not fabricate physicians or specialists. If no matches are found, it transparently prompts the user with available alternatives.
- **Zero Medication Prescriptions**: The agent never prescribes regulated pharmaceutical drugs (e.g., insulin doses, statins); it directs patients to consult licensed physicians for medical prescriptions.
- **Authentication Scoping (JWT)**: Patient records, appointments, and chat histories are strictly scoped to the authenticated user ID.
- **Zero Emojis**: System communications, logs, and outputs maintain professional clinical formatting without emojis.
