# 🚀 Chrona — The Adaptive AI Priority Engine

Chrona is a smart, adaptive planning system and "second brain" that helps users stay productive even when plans break. Unlike traditional calendars that assume perfect execution, Chrona dynamically repairs schedules, resolves conflicts, and personalizes suggestions based on user behavior and current motivation levels.

---

## 🧠 System Architecture

The project follows a decoupled, headless architecture:

*   **Frontend (`/frontend/chrona`):** React + Next.js (App Router), styled with Tailwind CSS v4. Features a custom paper-themed design system, floating modal manager, and interactive D3/SVG-inspired Mind Map canvas.
*   **Backend (`/backend`):** FastAPI (Python). Handles authentication, AI prompt engineering, AI response parsing, and calendar logic.
*   **AI Engine:** Google Gemini. Powers the `PriorityEngine` for smart task categorization, event generation, and conflict resolution suggestions.
*   **Database:** Supabase (PostgreSQL). Stores users, active sessions, behavior profiles, onboarding configurations, and individual schedule items.

---

## ✨ Core Features & Workflows

### 1. **AI Personality Onboarding**
New users are redirected to `/onboarding`, where they complete a 4-question behavioral quiz. This captures:
*   **Primary Focus** (e.g., Exams, Work)
*   **Motivation Type** (e.g., Code, Chill)
*   **Productive Slot** (e.g., Evening, Morning)
*   **Missed Task Recovery** (e.g., Break smaller, postpone)
These weights are saved to Supabase and dynamically adjust the "priority score" logic across the app.

### 2. **AI Event Parsing & Idea Generation**
When a user types raw text into the "Quick Add" box, it hits the `/api/process-event-json` FastAPI endpoint.
*   **Gemini** interprets the text and structures it into JSON.
*   The AI auto-generates `key_topics` and `action_items` as "suggestion tags" for every task.
*   It automatically estimates duration and suggests an optimal timeslot if none was provided.

### 3. **The Mind Map & Priority Hub**
*   **Priority Hub:** Events are sorted interactively using a custom algorithm (`getPriorityScore`) that combines deadline urgency, AI priority flag, and the user's specific Onboarding weights.
*   **Mind Map:** Tasks orbit their respective categories visually. Users can drag categories around the map as a spatial memory aid.

### 4. **Conflict Detection & Auto-Resolution**
*   If a new AI-generated event overlaps with an existing task, the frontend triggers a floating `ConflictNotification`.
*   Clicking "Reschedule" opens the `RescheduleModal`, which scans the user's schedule to find the next available free block and securely updates Supabase.

---

## 🛠️ Local Development Setup

To run a full contribution environment, you need two terminal windows.

### 1. Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt

# Create .env based on the variables listed below
# Start the server:
python -m uvicorn server:app --port 8000 --reload
```
The API runs at `http://localhost:8000`. Swagger docs are at `http://localhost:8000/docs`.

### 2. Frontend (Next.js)
```bash
cd frontend/chrona
npm install

# Start the frontend:
npm run dev
```
The app runs at `http://localhost:3000`.

---

## 🔐 Environment Variables

You need these keys in both `.env` (Backend) and `frontend/chrona/.env.local` (Frontend):

**Backend (`backend/.env`):**
```ini
GEMINI_API_KEY=your_google_gemini_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # Optional but recommended for overriding RLS
```

**Frontend (`frontend/chrona/.env.local`):**
```ini
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_BASE=http://localhost:8000  # Change to prod URL when deployed
```

---

## 🚀 Deployment Guide

### Deploying the Frontend (Vercel)

The Next.js frontend is specifically configured to be 1-click deployable to Vercel via the `vercel.json` and `next.config.ts` configuration.

1. Push your repository to GitHub.
2. Log into [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. **CRITICAL STEP:** In the project configuration, open the **"Root Directory"** setting and set it to:
   `frontend/chrona`
5. Open **Environment Variables** and add:
    *   `NEXT_PUBLIC_SUPABASE_URL` (Your Supabase URL)
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Your Supabase Anon Key)
    *   `NEXT_PUBLIC_API_BASE` (The URL where your Python backend is hosted, e.g., `https://chrona-api.onrender.com`. Leave as `http://localhost:8000` ONLY if you aren't deploying the backend yet).
6. Click **Deploy**. Vercel will automatically run `npm run build` from the nested directory and serve the Next.js app.

### Deploying the Backend (Render / Railway)

Because the backend is Python/FastAPI, it is best suited for hosting platforms like Render or Railway.

**Example for Render:**
1. Create a new **Web Service** tied to your repository.
2. **Root Directory:** `backend`
3. **Runtime:** `Python 3`
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn server:app --host 0.0.0.0 --port 10000`
6. Add the backend Environment Variables (Gemini + Supabase keys) to the Render dashboard.

*(Once the backend is deployed, don't forget to update the `NEXT_PUBLIC_API_BASE` environment variable in Vercel to point to your new Render URL!)*