# NutriConnect Global Search Documentation

Complete guide explaining how Global Search works across the NutriConnect platform, how permissions and role scoping are enforced, and how multi-session role priority is resolved.

---

## 1. Overview & Core Purpose

Global Search provides two primary capabilities from a unified search modal:

1. **Live Database Discovery**: Real-time matching across verified Dietitians, Community Blogs, Clients, Meal Plans, and Organizations.
2. **Instant Navigation Shortcuts (Quick Actions)**: Direct routing to role-specific dashboard views, clinical tools, universal public pages, and security settings.

The search modal is accessible globally from the top header on both desktop and mobile, with instant keyboard accessibility (`Escape` to close, outside click dismiss, and 300ms debounced queries).

---

## 2. How Global Search Works in Simple Terms

```
User types query (min 2 characters)
          │
          ├──> 1. Frontend evaluates active role & authentication status
          │
          ├──> 2. Filters static Quick Actions matching keywords / title
          │
          └──> 3. Sends debounced HTTP GET /api/search?q={query}&limit=3
                     │
                     └──> Backend checks JWT (optionalAuthenticateJWT)
                            │
                            ├──> Unauthenticated: Queries ONLY public Blogs
                            │
                            └──> Authenticated: Queries ONLY entities allowed for user's role
```

1. **Input Detection**: Once the user types at least 2 characters, the search engine starts processing.
2. **Debounce (300ms)**: Waits for 300ms of user typing inactivity before dispatching the network request to reduce server load.
3. **Dual Results Display**:
   - **Quick Actions**: Local instant shortcuts that match page titles or common keywords (e.g. searching "rules" suggests "Terms of Use").
   - **Database Records**: Asynchronous records returned from MongoDB, grouped by category cards.

---

## 3. Multi-Role Priority: When Multiple Accounts Are Signed In

NutriConnect supports multi-role sessions within the same browser by saving role-keyed tokens in `localStorage`:
- `authToken_user`
- `authToken_dietitian`
- `authToken_admin`
- `authToken_organization`
- `authToken_employee`

If an administrator or user logs into multiple accounts simultaneously, the active role for Global Search and "My Profile" is resolved using strict priority rules:

### Priority Rule 1: The Active Page URL (Top Precedence)

If the user is currently browsing inside a role-specific route, the URL prefix **always wins**:

| Current Page URL | Active Role Detected | Search & Profile Scope |
| :--- | :--- | :--- |
| `/user/...` | `user` | Client tools & dietitians |
| `/dietitian/...` | `dietitian` | Dietitian schedule & clients |
| `/admin/...` | `admin` | Full admin management & analytics |
| `/organization/...` | `organization` | Staff overview & dietitian verification |
| `/employee/...` | `employee` | Blog moderation & employee support |

### Priority Rule 2: Neutral / Public Pages (Fallback Order)

When browsing a neutral or public page (such as `/privacy-policy`, `/terms-of-use`, `/about-us`, `/blog`, or `/`), the URL has no role prefix. 

In this case, the system checks `localStorage` in this exact order:

1. **`user` (Client)** $\to$ **1st Priority**
2. **`dietitian`** $\to$ 2nd Priority
3. **`admin`** $\to$ 3rd Priority
4. **`organization`** $\to$ 4th Priority
5. **`employee`** $\to$ 5th Priority

**Example**: If both a Client (`user`) and a Dietitian are logged in, and Global Search is opened on `/privacy-policy`, the search operates in **Client mode** (displaying Find Dietitians and Client Meal Plans).

---

## 4. Role-Scoped Access Matrix: Who Sees What

To protect patient confidentiality and prevent unauthorized access, search results are strictly partitioned:

| Role / State | Dietitians | Blogs | Clients / Users | Meal Plans | Organizations | Quick Actions Available |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Logged Out (Guest)** | No | **Yes** | No | No | No | Universal Public Pages, Sign In, Sign Up |
| **Client / User (`user`)** | **Yes** | **Yes** | No | **Yes** | No | Find Dietitians, Appointments, Meal Plans, Health Progress, NutriAgent AI, Profile, Settings + Public Pages |
| **Dietitian (`dietitian`)** | No | **Yes** | **Yes** | **Yes** | No | My Schedule, My Clients, Meal Plans, Lab Reports, Profile, Settings + Public Pages |
| **Organization (`organization`)** | **Yes** | **Yes** | No | No | No | Verify Dietitians, Employee Management, Staff Overview, Blog Moderation, Profile + Public Pages |
| **Employee (`employee`)** | **Yes** | **Yes** | No | No | No | Verify Dietitians, Blog Moderation, Employee Support, Profile + Public Pages |
| **Admin (`admin`)** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | Admin Analytics, User Management, Verify Organizations, Admin Queries, System Settings, Profile + Public Pages |

---

## 5. Public / Logged-Out Safeguards

When an unauthenticated visitor uses Global Search:

1. **Database Privacy**: The backend never queries `User`, `Dietitian`, `MealPlan`, or `Organization` collections for guest sessions. Private user names, addresses, and medical meal plan notes are never exposed over the wire.
2. **Universal Accessibility**: Public blog articles and general information pages remain searchable without requiring authentication:
   - Home (`/`)
   - About Us (`/about-us`)
   - Community Blogs (`/blog` and `/blog/:id`)
   - Contact Us (`/contact-us`)
   - User Guide (`/guide`)
   - Terms of Use (`/terms-of-use`)
   - Privacy Policy (`/privacy-policy`)
3. **Sign-In Call-to-Action**: If an unauthenticated user searches for clinical features (e.g. searching "dietitian", "appointment", or "meal plan"), a helpful prompt appears directing them to sign in to access full clinical features.

---

## 6. Architecture & File Reference

| Layer | File Path | Responsibility |
| :--- | :--- | :--- |
| **Frontend UI** | `frontend/src/components/Search/GlobalSearch.jsx` | Modal rendering, keyboard handlers, debouncing, role detection, and display partitioning |
| **Frontend Service** | `frontend/src/services/misc/miscService.js` | Dispatches `GET /api/search?q={query}&limit={limit}` via Axios |
| **Frontend Header** | `frontend/src/components/Header/Header.jsx` | Mounts search button and passes active role state |
| **Backend Route** | `backend/src/routes/searchRoutes.js` | Endpoint handler with `optionalAuthenticateJWT`, role authorization, and regex queries |
| **Routing Layout** | `frontend/src/App.jsx` | Declares public and protected routes including `/blog/:id` |
