# 🧠 Chrona — Complete API & Integration Reference

> **For:** Frontend Developer building the Next.js UI  
> **Backend:** FastAPI (Python 3.11+) running on `http://localhost:8000`  
> **Database:** Supabase (PostgreSQL) — accessed both via REST API (backend) and `@supabase/supabase-js` (frontend)  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication System](#2-authentication-system)
3. [API Client Setup](#3-api-client-setup)
4. [API Endpoints — Full Reference](#4-api-endpoints--full-reference)
   - [Health](#41-health-check)
   - [Auth](#42-authentication)
   - [Onboarding](#43-onboarding)
   - [Event Processing (Gemini AI)](#44-event-processing-gemini-ai)
   - [Schedule Changes](#45-schedule-changes)
5. [Direct Supabase Queries (Frontend)](#5-direct-supabase-queries-frontend)
6. [Database Schema](#6-database-schema)
7. [Priority Engine (Client-Side Module)](#7-priority-engine-client-side-module)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Error Handling Patterns](#9-error-handling-patterns)
10. [LocalStorage Keys](#10-localstorage-keys)
11. [Important Caveats & Gotchas](#11-important-caveats--gotchas)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Auth Pages   │  │ Upload Page │  │ Dashboard / Calendar    │  │
│  │ (login/      │  │ (file/text  │  │ (events, schedule,      │  │
│  │  signup)     │  │  processing)│  │  mindmap, priorities)   │  │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬──────────────┘  │
│         │                 │                     │                 │
│  ┌──────▼─────────────────▼─────────────────────▼──────────────┐ │
│  │              API Client (api.js wrapper)                     │ │
│  │  • Auto-injects Bearer token from localStorage              │ │
│  │  • Auto-redirects to /auth on 401                           │ │
│  └──────┬──────────────────────────────────────────────────────┘ │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────────┐ │
│  │         Direct Supabase Client (@supabase/supabase-js)      │ │
│  │  • Events CRUD (read, update, delete)                       │ │
│  │  • Drafts CRUD                                              │ │
│  │  • Uses anon key — queries scoped by user_id                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────┬────────────────────────────┬─────────────────────────┘
            │  HTTP REST                 │  Supabase PostgREST
            ▼                            ▼
┌───────────────────────┐    ┌──────────────────────────┐
│  FastAPI Backend       │    │  Supabase (PostgreSQL)   │
│  Port: 8000            │    │                          │
│                        │    │  Tables:                 │
│  Routes:               │    │  • app_users             │
│  • /api/auth/*         │───▶│  • events                │
│  • /api/onboarding/*   │    │  • drafts                │
│  • /api/process-event* │    │  • schedule_items        │
│  • /api/schedule/*     │    │  • schedule_changes      │
│                        │    │  • behavior_profiles     │
│  Middleware:           │    │  • onboarding_responses  │
│  • AuthMiddleware      │    │  • capacity_profiles     │
│  • CORS (allow all)   │    └──────────────────────────┘
│                        │
│  External:             │
│  • Google Gemini API   │
└────────────────────────┘
```

### Key Architectural Decisions

| Decision | Detail |
|----------|--------|
| **Dual data access** | Some data flows through the FastAPI backend (auth, event processing, schedule changes), while some is queried directly from Supabase by the frontend (events listing, drafts, event updates/deletes). |
| **Auth tokens** | Custom scheme — NOT Supabase Auth. Tokens are opaque random strings stored in an in-memory Python dict. They are NOT JWTs. |
| **Supabase key used by frontend** | `anon` key. RLS policies are currently set to `USING (true)` (wide open). **The frontend must always filter by `user_id` manually.** |
| **Supabase key used by backend** | Also uses the `anon` key via the REST API. |

---

## 2. Authentication System

### How It Works

1. User signs up or logs in via the `/api/auth/*` endpoints.
2. The backend generates a cryptographically random token (`secrets.token_urlsafe(48)`) and stores it in an in-memory dict `active_sessions`.
3. The token is returned to the frontend along with `user_id` and `username`.
4. The frontend stores these in `localStorage` and attaches the token as a `Bearer` header on every subsequent request.
5. The `AuthMiddleware` on the backend intercepts every request, validates the token, and injects `user_id` + `username` into `request.state`.

### Token Lifecycle

```
Signup/Login ──▶ Backend generates token ──▶ Frontend stores in localStorage
                                                      │
Every request ──▶ api.js adds "Authorization: Bearer <token>" ──▶ AuthMiddleware validates
                                                                           │
                                                            401 ──▶ Frontend clears localStorage
                                                                   & redirects to /auth
```

> **⚠️ IMPORTANT:** Tokens are stored in-memory on the backend. If the server restarts, ALL sessions are invalidated and users must log in again.

### Public Paths (No Auth Required)

These paths bypass the `AuthMiddleware`:

```python
PUBLIC_PATHS = [
    "/api/health",
    "/api/auth/signup",
    "/api/auth/login",
    "/docs",
    "/openapi.json",
]
```

---

## 3. API Client Setup

The current React frontend uses a centralized API client at `src/lib/api.js`. **Replicate this pattern in Next.js.**

### Client Interface

```typescript
// Recommended Next.js equivalent
const api = {
  get(path: string): Promise<any>,        // GET with auth headers
  post(path: string, body: object): Promise<any>,   // POST JSON with auth headers
  postFormData(path: string, formData: FormData): Promise<any>,  // POST multipart (no Content-Type header)
}
```

### Implementation Requirements

1. **Read token** from `localStorage.getItem('chrona_token')`
2. **Attach header:** `Authorization: Bearer <token>`
3. **On 401 response:** Clear all `chrona_*` keys from localStorage and redirect to `/auth`
4. **For `postFormData`:** Do NOT set `Content-Type` header — let the browser set it with the boundary automatically
5. **Error handling:** Parse the error body as JSON and throw `data.detail || data.error || fallback`

### Token + User Storage Keys

```typescript
// Set after successful login/signup
localStorage.setItem('chrona_token', data.access_token)
localStorage.setItem('chrona_user_id', data.user_id)
localStorage.setItem('chrona_username', data.username)
```

---

## 4. API Endpoints — Full Reference

### Base URL

```
Development: http://localhost:8000
Production:  (configured in vercel.json proxy or env var)
```

All endpoints are prefixed with `/api/`.

---

### 4.1 Health Check

#### `GET /api/health`

**Auth Required:** ❌ No

**Description:** Simple health check to verify the backend is running.

**Response:**
```json
{
  "status": "ok",
  "service": "chrona-backend"
}
```

**Use Case:** Call this on app load or in a status indicator to show backend connectivity.

---

### 4.2 Authentication

#### `POST /api/auth/signup`

**Auth Required:** ❌ No

**Description:** Register a new user. Creates an entry in `app_users` and auto-initializes `behavior_profiles`, `onboarding_responses`, and `capacity_profiles` with default values.

**Request Body:**
```json
{
  "username": "string (required, unique)",
  "password": "string (required, min 4 chars)",
  "name": "string (optional, display name)"
}
```

**Success Response (200):**
```json
{
  "access_token": "base64url-encoded-random-string",
  "user_id": "uuid-string",
  "username": "string",
  "message": "Signup successful"
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "detail": "Username already taken" }` | Duplicate username |
| 500 | `{ "detail": "Failed to create user: ..." }` | Database error |

**Side Effects on Signup:**
- Creates row in `behavior_profiles` with `archetype: "student_balanced"`
- Creates row in `onboarding_responses` with defaults: `productive_time: "morning"`, `work_type: "mixed"`, `task_preference: "balanced"`, `study_hours: 4`
- Creates row in `capacity_profiles` with `weekly_capacity: 40`, `deep_work_hours: 20`, `efficiency_factor: 0.8`, `stress_tolerance: 5`

**Frontend After Signup:**
```javascript
localStorage.setItem('chrona_token', data.access_token)
localStorage.setItem('chrona_user_id', data.user_id)
localStorage.setItem('chrona_username', data.username || username)
navigate('/')  // redirect to dashboard
```

---

#### `POST /api/auth/login`

**Auth Required:** ❌ No

**Description:** Authenticate an existing user. Returns a session token.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "access_token": "base64url-encoded-random-string",
  "user_id": "uuid-string",
  "username": "string"
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{ "detail": "Invalid username or password" }` | Wrong credentials |

**Frontend After Login:**
```javascript
localStorage.setItem('chrona_token', data.access_token)
localStorage.setItem('chrona_user_id', data.user_id)
localStorage.setItem('chrona_username', data.username)
navigate('/')  // redirect to dashboard
```

---

#### `GET /api/auth/me`

**Auth Required:** ✅ Yes

**Description:** Fetch the current authenticated user's profile, including their behavior archetype and slot weights.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "user_id": "uuid-string",
  "username": "string",
  "profile": {
    "archetype": "student_balanced",
    "slot_weights": {}
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{ "detail": "Missing authorization header" }` | No token |
| 401 | `{ "detail": "Invalid or expired token" }` | Bad token |

**Use Case:** Call on app init to verify the stored token is still valid and to display the user's profile info.

---

### 4.3 Onboarding

#### `GET /api/onboarding/status`

**Auth Required:** ✅ Yes

**Description:** Check whether the current user has completed the onboarding wizard. Also returns their behavior profile if onboarding is complete.

**Success Response (200) — Completed:**
```json
{
  "completed": true,
  "profile": {
    "primary_focus": "exams",
    "motivation_type": "study",
    "preferred_slot": "morning",
    "recovery_style": "same_day",
    "priority_boost": 0.3,
    "motivation_weight": 0.2,
    "slot_weight": 0.5,
    "archetype": "exam_focused"
  }
}
```

**Success Response (200) — Not Completed:**
```json
{
  "completed": false,
  "profile": null,
  "message": "Onboarding not yet completed"
}
```

**Use Case:** 
- Call on app load
- If `completed === false`, redirect user to the onboarding wizard
- If `completed === true`, use the `profile` object to boost priority scores via the `enrichAndSortWithProfile()` function

**Profile Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `primary_focus` | `"exams" \| "projects" \| "work" \| "personal"` | What matters most to the user right now |
| `motivation_type` | `"study" \| "build" \| "exercise" \| "chill"` | What the user feels like doing |
| `preferred_slot` | `"morning" \| "afternoon" \| "evening" \| "night"` | When the user is most productive |
| `recovery_style` | `"postpone" \| "same_day" \| "break_smaller"` | How the user handles missed tasks |
| `priority_boost` | `float (0-1)` | Multiplier for focus-aligned events |
| `motivation_weight` | `float (0-1)` | Multiplier for motivation-aligned events |
| `slot_weight` | `float (0-1)` | Multiplier for preferred-slot events |
| `archetype` | `string` | Computed behavior archetype |

---

#### `POST /api/onboarding/save`

**Auth Required:** ✅ Yes

**Description:** Save the user's onboarding responses. Updates both the `onboarding_responses` table and the `behavior_profiles` table with computed weights and archetype.

**Request Body:**
```json
{
  "primary_focus": "exams | projects | work | personal",
  "motivation_type": "study | build | exercise | chill",
  "preferred_slot": "morning | afternoon | evening | night",
  "recovery_style": "postpone | same_day | break_smaller"
}
```

All fields have defaults if omitted:
- `primary_focus` → `"personal"`
- `motivation_type` → `"study"`
- `preferred_slot` → `"evening"`
- `recovery_style` → `"same_day"`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Onboarding saved successfully",
  "profile": {
    "primary_focus": "exams",
    "motivation_type": "study",
    "preferred_slot": "morning",
    "recovery_style": "same_day",
    "priority_boost": 0.3,
    "motivation_weight": 0.2,
    "slot_weight": 0.5,
    "archetype": "exam_focused"
  }
}
```

**Frontend After Save:**
```javascript
localStorage.setItem('chrona_onboarded', 'true')
navigate('/')  // redirect to dashboard
```

**Backend Processing:**
1. Saves responses to `onboarding_responses` (upsert)
2. Computes priority weights based on answers
3. Determines archetype based on `primary_focus`
4. Updates `behavior_profiles` with computed weights + archetype
5. Returns the computed profile

**Archetype Mapping:**

| primary_focus | archetype |
|---------------|-----------|
| `exams` | `exam_focused` |
| `projects` | `project_driven` |
| `work` | `work_professional` |
| `personal` | `balanced_lifestyle` |

---

### 4.4 Event Processing (Gemini AI)

#### `POST /api/process-event`

**Auth Required:** ✅ Yes

**Content-Type:** `multipart/form-data`

**Description:** Process an event from either a file upload (PDF, image) or text input. The backend sends the input to Google Gemini AI, which extracts structured event data. The extracted event is then inserted into the Supabase `events` table.

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | No* | PDF, image, or document to analyze |
| `text` | `string` | No* | Plain text description of the event |

> *At least one of `file` or `text` must be provided.

**Frontend Call Pattern:**
```javascript
// File upload
const formData = new FormData()
formData.append('file', selectedFile)
if (textInput.trim()) formData.append('text', textInput.trim())
const result = await api.postFormData('/api/process-event', formData)

// Text-only (use the JSON endpoint instead)
const result = await api.post('/api/process-event-json', { text: inputText })
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event processed successfully",
  "event": {
    "title": "Data Structures Final Exam",
    "category": "exam",
    "venue": "Room 301, CS Building",
    "event_datetime": "2026-04-15T09:00:00",
    "severity_level": "critical",
    "complexity_score": 8,
    "estimated_prep_hours": 6,
    "key_topics": [
      "Binary Trees",
      "Graph Algorithms",
      "Dynamic Programming"
    ],
    "action_items": [
      "Review Chapter 5-8 slides",
      "Complete practice problems set",
      "Review old exam papers"
    ],
    "user_id": "uuid-string"
  }
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "detail": "No text or file provided" }` | Empty submission |
| 422 | `{ "detail": "Extracted event has no title" }` | Gemini couldn't extract a title |
| 500 | `{ "detail": "..." }` | Gemini API or Supabase error |

**What Gets Stored in Database:**

Only these columns are written to the `events` table:
```
title, category, venue, event_datetime, user_id, source_hash, key_topics, action_items
```

These fields are returned in the response but **NOT stored** in the `events` table:
```
severity_level, complexity_score, estimated_prep_hours
```

> **⚠️ CRITICAL:** `severity_level`, `complexity_score`, and `estimated_prep_hours` are Gemini analytics fields. They are returned in the API response so the frontend can display them, but they are NOT persisted in the database. The frontend priority engine uses defaults for these fields if they're missing from the stored event.

**Gemini Extraction Schema:**

| Field | Type | Values |
|-------|------|--------|
| `title` | `string` | Free text |
| `category` | `enum` | `exam`, `hackathon`, `assignment`, `meeting`, `personal`, `reminder` |
| `venue` | `string \| null` | Location or null |
| `event_datetime` | `ISO 8601` | e.g. `2026-04-15T09:00:00` |
| `severity_level` | `enum` | `low`, `medium`, `high`, `critical` |
| `complexity_score` | `integer` | `1-10` |
| `estimated_prep_hours` | `number` | Hours needed to prepare |
| `key_topics` | `string[]` | 3-5 study topics |
| `action_items` | `string[]` | 3-5 actionable steps |

---

#### `POST /api/process-event-json`

**Auth Required:** ✅ Yes

**Content-Type:** `application/json`

**Description:** Alternative endpoint for text-only event submissions. Identical behavior to `/api/process-event` but accepts a JSON body instead of FormData.

**Request Body:**
```json
{
  "text": "I have a machine learning exam next Tuesday at 2pm in Room 205"
}
```

**Success Response (200):** Same as `/api/process-event`

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "detail": "No text provided" }` | Empty or whitespace-only text |
| 500 | `{ "detail": "..." }` | Gemini API or Supabase error |

**When to Use Which Endpoint:**
- **`/api/process-event`** → When the user uploads a file (with optional text)
- **`/api/process-event-json`** → When the user types/pastes text only

---

### 4.5 Schedule Changes

#### `GET /api/schedule/changes`

**Auth Required:** ✅ Yes

**Description:** Fetch the log of all schedule changes for the current user. Returns changes sorted by most recent first (max 50).

**Success Response (200):**
```json
{
  "changes": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "event_id": "uuid | null",
      "change_type": "rescheduled",
      "reason": "Auto-rescheduled +2 hours to allow completion",
      "old_datetime": "2026-04-10T09:00:00+00:00",
      "new_datetime": "2026-04-10T11:00:00+00:00",
      "metadata": {
        "event_title": "Data Structures Exam",
        "original_time": "2026-04-10T09:00:00"
      },
      "created_at": "2026-04-10T08:30:00+00:00"
    }
  ]
}
```

**Change Type Values:**

| change_type | Icon | Color | Description |
|-------------|------|-------|-------------|
| `conflict_resolved` | ⚠️ | `#ff4757` | Two events overlapped; one was moved |
| `rescheduled` | 🔄 | `#ffa502` | Event time was changed |
| `auto_moved` | 🤖 | `#4da3ff` | AI automatically moved the event |
| `user_moved` | 👤 | `#3ddc97` | User manually moved the event |
| `completed` | ✅ | `#3ddc97` | Event marked as completed |
| `skipped` | ⏭️ | `#94a3b8` | Event was skipped |
| `cancelled` | — | — | Event was cancelled/deleted |

**Use Case:** Display a timeline/log of recent schedule modifications in the UI.

---

#### `POST /api/schedule/changes`

**Auth Required:** ✅ Yes

**Description:** Log a new schedule change. Called when events are rescheduled, completed, cancelled, or when conflicts are resolved.

**Request Body:**
```json
{
  "event_id": "uuid | null",
  "change_type": "rescheduled | completed | cancelled | conflict_resolved | auto_moved | user_moved | skipped",
  "reason": "string (human-readable explanation)",
  "old_datetime": "ISO 8601 (optional)",
  "new_datetime": "ISO 8601 (optional)",
  "metadata": {
    "event_title": "string",
    "original_time": "ISO 8601",
    "conflicting_title": "string (for conflict_resolved)",
    "cancellation_reason": "string (for cancelled)",
    "original_event_id": "uuid (for cancelled, since event_id is set to null)"
  }
}
```

**Required Fields:** `change_type`, `reason`  
**Optional Fields:** `event_id`, `old_datetime`, `new_datetime`, `metadata`

**Success Response (200):**
```json
{
  "success": true,
  "change_id": "uuid"
}
```

**When to Call This Endpoint:**

| User Action | change_type | event_id | Notes |
|-------------|-------------|----------|-------|
| Reschedule event | `rescheduled` | event UUID | Include old/new datetime |
| Complete event | `completed` | event UUID | |
| Cancel/delete event | `cancelled` | `null` | Use `metadata.original_event_id` |
| Auto-archive expired | `skipped` | event UUID | |
| Resolve conflict | `conflict_resolved` | winner UUID | Include loser in metadata |

---

## 5. Direct Supabase Queries (Frontend)

The frontend also queries Supabase directly using the `@supabase/supabase-js` client. These are NOT routed through the FastAPI backend.

### Supabase Client Configuration

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tvzenknzcxuegkzujihu.supabase.co'
const supabaseAnonKey = '<anon-key-from-env>'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Helper Functions

```typescript
// Get the current user's ID from localStorage
export function getCurrentUserId(): string | null {
  return localStorage.getItem('chrona_user_id')
}
```

> **⚠️ CRITICAL:** Always filter queries by `user_id` since RLS policies are currently wide open (`USING (true)`).

---

### 5.1 Fetch User Events

**Table:** `events`  
**Used By:** Priority page, Mindmap page, Calendar

```typescript
const userId = getCurrentUserId()
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('user_id', userId)
  .order('event_datetime', { ascending: true })
```

**Returns:** Array of event objects:
```json
{
  "id": "uuid",
  "title": "Data Structures Exam",
  "category": "exam",
  "venue": "Room 301",
  "event_datetime": "2026-04-15T09:00:00+00:00",
  "user_id": "uuid",
  "source_hash": "string | null",
  "key_topics": ["Binary Trees", "Graphs"],
  "action_items": ["Review slides", "Practice problems"],
  "status": "pending | completed",
  "created_at": "2026-04-10T08:00:00+00:00"
}
```

---

### 5.2 Update Event (Reschedule)

**Table:** `events`  
**Used By:** RescheduleModal, Priority page

```typescript
const { data, error } = await supabase
  .from('events')
  .update({ event_datetime: newDateTimeISO })
  .eq('id', eventId)
  .select()

// data[0] is the updated event
```

---

### 5.3 Complete Event

**Table:** `events`  
**Used By:** Priority page, Mindmap page

```typescript
const { error } = await supabase
  .from('events')
  .update({ status: 'completed' })
  .eq('id', eventId)
```

---

### 5.4 Delete Event (with FK Cleanup)

**Tables:** `schedule_changes`, `schedule_items`, `events`  
**Used By:** Priority page, Mindmap page

> **⚠️ CRITICAL ORDER OF OPERATIONS:** You MUST nullify/delete dependent rows BEFORE deleting the event to avoid FK constraint violations.

```typescript
// Step 1: Nullify FK references in schedule_changes
await supabase
  .from('schedule_changes')
  .update({ event_id: null })
  .eq('event_id', eventId)

// Step 2: Delete associated schedule_items
await supabase
  .from('schedule_items')
  .delete()
  .eq('event_id', eventId)

// Step 3: Now safe to delete the event
const { error } = await supabase
  .from('events')
  .delete()
  .eq('id', eventId)

// Step 4 (optional): Log the cancellation via API
await api.post('/api/schedule/changes', {
  event_id: null,
  change_type: 'cancelled',
  reason: cancellationReason,
  metadata: {
    original_event_id: eventId,
    event_title: eventTitle,
    cancellation_reason: cancellationReason
  }
})
```

---

### 5.5 Fetch User Drafts

**Table:** `drafts`  
**Used By:** Drafts page

```typescript
const userId = getCurrentUserId()
const { data, error } = await supabase
  .from('drafts')
  .select('*')
  .eq('user_id', userId)
  .order('archived_at', { ascending: false })
```

**Returns:** Array of draft objects (same shape as events, plus `archived_at`, `status`, `notes`).

---

### 5.6 Restore Draft → Event

**Tables:** `drafts`, `events`  
**Used By:** Drafts page

```typescript
// 1. Get the draft
const { data: draft } = await supabase
  .from('drafts')
  .select('*')
  .eq('id', draftId)
  .single()

// 2. Insert back into events
const userId = getCurrentUserId()
await supabase.from('events').insert([{
  title: draft.title,
  category: draft.category,
  venue: draft.venue,
  event_datetime: draft.event_datetime,
  severity_level: draft.severity_level,
  complexity_score: draft.complexity_score,
  estimated_prep_hours: draft.estimated_prep_hours,
  status: 'pending',
  user_id: userId,
}])

// 3. Delete from drafts
await supabase.from('drafts').delete().eq('id', draftId)
```

---

### 5.7 Delete Draft Permanently

**Table:** `drafts`  
**Used By:** Drafts page

```typescript
await supabase.from('drafts').delete().eq('id', draftId)
```

### 5.8 Auto-Archive Expired Events

**Table:** `events`, `drafts`  
**Used By:** Background or Dashboard on load

```typescript
// Move past events to drafts with a 'skipped' status or just delete them
// (Depends on specific implementation logic)
```

---

### 5.9 Log Tracking Message (Drafts)

**Table:** `drafts`
**Used By:** RescheduleModal (When user provides a reason for being late)

```typescript
const userId = getCurrentUserId()
await supabase.from('drafts').insert({
  user_id: userId,
  raw_text: `[TRACKING MSG - ${event.title}] Late reason: ${reason}`,
  processed: false,
  priority: 'low',
  category: 'other'
})

// Ensures that the reschedule tracking reason appears in the Drafts/Archive logs
```

---

### 5.10 Auto-Archive Expired Events

**Tables:** `events`, `drafts`, `schedule_changes`  
**Used By:** Priority page (runs every 60 seconds)

Events that are past their `event_datetime` by 1+ hour are automatically moved to `drafts`:

```typescript
const now = dayjs()
const expiredEvents = events.filter(e => 
  now.diff(dayjs(e.event_datetime), 'hour', true) >= 1
)

if (expiredEvents.length > 0) {
  // Archive to drafts
  const archived = expiredEvents.map(e => ({
    ...e,
    status: 'expired',
    archived_at: new Date().toISOString(),
    notes: 'Automatically archived - event expired'
  }))
  await supabase.from('drafts').insert(archived)

  // Clean up FK refs and delete from events
  const ids = expiredEvents.map(e => e.id)
  await supabase.from('schedule_changes').update({ event_id: null }).in('event_id', ids)
  await supabase.from('events').delete().in('id', ids)
}
```

---

## 6. Database Schema

### `app_users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, auto-generated | User's unique ID |
| `username` | `text` | UNIQUE, NOT NULL | Login username |
| `password_hash` | `text` | NOT NULL | SHA-256 hash of password |
| `display_name` | `text` | | User's display name |
| `created_at` | `timestamptz` | DEFAULT now() | Registration timestamp |

---

### `events`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, auto-generated | Event unique ID |
| `title` | `text` | NOT NULL | Event title |
| `category` | `text` | | One of: `exam`, `hackathon`, `assignment`, `meeting`, `personal`, `reminder` |
| `venue` | `text` | | Location/room |
| `event_datetime` | `timestamptz` | | When the event occurs |
| `user_id` | `uuid` | FK → `app_users.id` | Owner of the event |
| `source_hash` | `text` | | Hash of source input (deduplication) |
| `key_topics` | `jsonb` | | Array of topic strings |
| `action_items` | `jsonb` | | Array of action item strings |
| `status` | `text` | DEFAULT `'pending'` | `pending`, `completed` |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |

> **Note:** `severity_level`, `complexity_score`, and `estimated_prep_hours` are NOT columns in this table — they come from Gemini at extraction time and are only in the API response.

---

### `drafts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, auto-generated | Draft unique ID |
| `title` | `text` | | Event title |
| `category` | `text` | | Category |
| `venue` | `text` | | Location |
| `event_datetime` | `timestamptz` | | Original event time |
| `severity_level` | `text` | | Severity at time of archiving |
| `complexity_score` | `integer` | | Complexity at time of archiving |
| `estimated_prep_hours` | `numeric` | | Prep hours at time of archiving |
| `user_id` | `uuid` | FK → `app_users.id` | Owner |
| `status` | `text` | | `expired`, `cancelled`, `skipped` |
| `archived_at` | `timestamptz` | | When it was archived |
| `notes` | `text` | | Reason for archiving |
| `created_at` | `timestamptz` | DEFAULT now() | |

---

### `schedule_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Schedule block ID |
| `event_id` | `uuid` | FK → `events.id` | Related event |
| `user_id` | `uuid` | FK → `app_users.id` | Owner |
| `start_time` | `timestamptz` | | Block start |
| `end_time` | `timestamptz` | | Block end |
| `type` | `text` | | `study`, `event`, `break` |
| `created_at` | `timestamptz` | DEFAULT now() | |

> **Important:** Must be deleted before deleting the parent event.

---

### `schedule_changes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Change log ID |
| `user_id` | `uuid` | FK → `app_users.id` | Who made the change |
| `event_id` | `uuid` | FK → `events.id`, NULLABLE | Related event (null if deleted) |
| `change_type` | `text` | NOT NULL | Type of change |
| `reason` | `text` | | Human-readable explanation |
| `old_datetime` | `timestamptz` | | Previous event time |
| `new_datetime` | `timestamptz` | | New event time |
| `metadata` | `jsonb` | | Additional context (titles, reasons) |
| `created_at` | `timestamptz` | DEFAULT now() | |

> **Important:** `event_id` must be set to `null` before deleting the parent event.

---

### `behavior_profiles`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Profile ID |
| `user_id` | `uuid` | FK → `app_users.id` | Owner |
| `archetype` | `text` | | User's behavior archetype |
| `slot_weights` | `jsonb` | | Time-of-day preference weights |
| `primary_focus` | `text` | | From onboarding Q1 |
| `motivation_type` | `text` | | From onboarding Q2 |
| `preferred_slot` | `text` | | From onboarding Q3 |
| `recovery_style` | `text` | | From onboarding Q4 |
| `priority_boost` | `numeric` | | Computed focus boost (0-1) |
| `motivation_weight` | `numeric` | | Computed motivation weight (0-1) |
| `slot_weight` | `numeric` | | Computed slot weight (0-1) |

---

### `onboarding_responses`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Response ID |
| `user_id` | `uuid` | FK → `app_users.id` | Owner |
| `productive_time` | `text` | | When most productive |
| `work_type` | `text` | | Type of work preference |
| `task_preference` | `text` | | Task handling preference |
| `study_hours` | `integer` | | Preferred daily study hours |

---

### `capacity_profiles`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK | Profile ID |
| `user_id` | `uuid` | FK → `app_users.id` | Owner |
| `weekly_capacity` | `integer` | DEFAULT 40 | Available hours/week |
| `deep_work_hours` | `integer` | DEFAULT 20 | Focused hours/week |
| `efficiency_factor` | `numeric` | DEFAULT 0.8 | Work efficiency (0-1) |
| `stress_tolerance` | `integer` | DEFAULT 5 | Stress threshold (1-10) |

---

### Foreign Key Dependency Map

```
app_users
  ├── events.user_id
  │     ├── schedule_items.event_id
  │     └── schedule_changes.event_id (NULLABLE)
  ├── drafts.user_id
  ├── schedule_changes.user_id
  ├── behavior_profiles.user_id
  ├── onboarding_responses.user_id
  └── capacity_profiles.user_id
```

**Deletion Order (for events):**
1. `schedule_changes` → SET `event_id = null`
2. `schedule_items` → DELETE rows
3. `events` → DELETE row

---

## 7. Priority Engine (Client-Side Module)

The priority engine is a **pure JavaScript module** (`src/lib/priorityEngine.js`) that runs entirely on the frontend. It computes priority scores, generates action recommendations, builds schedules, and detects conflicts — all without any backend calls.

### Key Exported Functions

| Function | Purpose | Input → Output |
|----------|---------|----------------|
| `getPriorityScore(event, profile?)` | Calculate priority score | Event + optional onboarding profile → `number` |
| `getPriorityColor(score)` | Map score to visual color | `number` → `{ bg, border, text, label }` |
| `getSeverityColor(severity)` | Map severity to color | `string` → `{ bg, border, text }` |
| `enrichEvent(event)` | Add all computed fields | Event → enriched event with score, colors, actions |
| `enrichAndSort(events)` | Enrich + sort by priority | Event[] → enriched + sorted Event[] |
| `enrichAndSortWithProfile(events, profile)` | Same with onboarding boosts | Event[] + profile → enriched + sorted Event[] |
| `generateSchedule(events)` | Build time-block schedule | Event[] → ScheduleBlock[] |
| `generateAction(event)` | Generate action + recommendation | Event → `{ action, recommendation, studyHours, icon }` |
| `getNotificationAlert(event)` | Check if event needs alert | Event → alert object or `null` |
| `detectConflicts(events, threshold?)` | Find overlapping events | Event[] → `{ eventA, eventB, overlapMinutes }[]` |
| `identifyReschedulingOpportunities(events)` | Smart reschedule suggestions | Event[] → opportunities[] |
| `rescheduleEvent(id, newDateTime, supabase)` | Update event time in DB | ID + datetime + client → updated event |
| `findNextFreeSlot(events, eventId, duration, endHour)` | Intelligent free slot finding | Event[] + ID + duration + hour → ISO `string` |
| `generateRescheduleMessage(event, type, conflict?)` | Human-readable change msg | Event + type → `string` |
| `sortByPriority(events)` | Sort events by priority desc | Event[] → sorted Event[] |
| `getNodeDistance(score)` | Mindmap node distance | `number` → `number` |

### Priority Score Formula

```
score = (category_weight + urgency_score + complexity_bonus + onboarding_bonus) × severity_multiplier
```

**Category Weights:**
| Category | Weight |
|----------|--------|
| exam | 10 |
| hackathon | 9 |
| assignment | 8 |
| meeting | 6 |
| personal | 4 |
| reminder | 2 |

**Urgency Score (by hours remaining):**
| Hours | Score |
|-------|-------|
| ≤ 0 (past) | 0 |
| < 1 | 12 |
| < 3 | 10 |
| < 6 | 8 |
| < 12 | 6 |
| < 24 | 4 |
| < 48 | 3 |
| ≥ 48 | 2 |

**Severity Multipliers:** low=1.0, medium=1.2, high=1.5, critical=2.0

**Priority Color Thresholds:**
| Score | Color | Label |
|-------|-------|-------|
| > 15 | `#ff4757` (Red) | Critical |
| > 10 | `#ffa502` (Orange) | High |
| > 5 | `#3498db` (Blue) | Medium |
| ≤ 5 | `#2ecc71` (Green) | Low |

---

## 8. Data Flow Diagrams

### Flow 1: User Adds Event (Text)

```
User types "CS exam friday 10am room 301"
  │
  ▼
Frontend calls POST /api/process-event-json { text: "..." }
  │
  ▼
AuthMiddleware validates token → injects user_id
  │
  ▼
Gemini API extracts structured event data
  │
  ▼
Backend inserts into Supabase `events` table (title, category, venue, event_datetime, user_id, key_topics, action_items)
  │
  ▼
Backend returns full extracted data (including severity_level, complexity_score, estimated_prep_hours)
  │
  ▼
Frontend receives response → navigates to dashboard
  │
  ▼
Dashboard queries Supabase directly for updated events list
  │
  ▼
priorityEngine.enrichAndSortWithProfile(events, profile) computes scores
  │
  ▼
UI renders prioritized cards, schedule blocks, mindmap nodes
```

### Flow 2: User Deletes Event

```
User clicks delete on event card
  │
  ▼
CancelModal opens → user enters reason → confirms
  │
  ▼
Frontend optimistically removes event from state
  │
  ▼
Step 1: supabase.from('schedule_changes').update({ event_id: null }).eq('event_id', id)
Step 2: supabase.from('schedule_items').delete().eq('event_id', id)
Step 3: supabase.from('events').delete().eq('id', id)
Step 4: api.post('/api/schedule/changes', { change_type: 'cancelled', ... })
  │
  ▼
On error → refetch events from Supabase to restore state
```

### Flow 3: Auto-Archive Expired Events

```
Every 60 seconds (TICK_INTERVAL):
  │
  ▼
Filter events where now() - event_datetime >= 1 hour
  │
  ▼
Insert expired events into `drafts` table with status='expired'
  │
  ▼
Nullify event_id in `schedule_changes` for those events
  │
  ▼
Delete events from `events` table
  │
  ▼
Remove from UI state
```

---

## 9. Error Handling Patterns

### Backend Error Format

All backend errors follow this shape:
```json
{
  "detail": "Human-readable error message"
}
```

### Frontend Error Handling

```typescript
try {
  const data = await api.post('/api/some-endpoint', body)
  // success
} catch (err) {
  // err.message contains the detail from the backend
  setError(err.message)
}
```

### 401 Auto-Redirect

The API client automatically handles 401s:
```typescript
function handleUnauthorized(res) {
  if (res.status === 401) {
    localStorage.removeItem('chrona_token')
    localStorage.removeItem('chrona_user_id')
    localStorage.removeItem('chrona_username')
    window.location.href = '/auth'
    return true
  }
  return false
}
```

---

## 10. LocalStorage Keys

| Key | Type | Set By | Description |
|-----|------|--------|-------------|
| `chrona_token` | `string` | Login/Signup | Auth bearer token |
| `chrona_user_id` | `string` | Login/Signup | UUID of current user |
| `chrona_username` | `string` | Login/Signup | Username |
| `chrona_onboarded` | `"true"` | Onboarding Save | Whether onboarding is complete |
| `chrona_mindmap_positions` | `JSON string` | Mindmap drag | Saved node positions |

---

## 11. Important Caveats & Gotchas

### 🔴 Critical

1. **Tokens are in-memory.** Server restart = all users logged out. There is no token persistence. Plan for this in UX (graceful re-login flow).

2. **FK constraints on delete.** You MUST nullify `schedule_changes.event_id` and delete `schedule_items` rows BEFORE deleting an event. Skipping this causes a 409 FK violation error from Supabase.

3. **Gemini fields not stored.** `severity_level`, `complexity_score`, `estimated_prep_hours` are returned by the event processing API but NOT stored in the `events` table. The priority engine uses defaults when these are missing (severity=medium, complexity=5, prep_hours=2).

4. **RLS is wide open.** The Supabase database has `USING (true)` RLS policies. The frontend MUST always filter by `user_id` to prevent data leakage between users. If you switch to using Supabase Auth, update RLS to `USING (user_id = auth.uid())`.

### 🟡 Important

5. **Passwords are SHA-256 hashed.** No salt. This is a hackathon prototype — do NOT use this auth system in production.

6. **Dual data access pattern.** Some operations go through the FastAPI backend (auth, event processing, schedule changes), while others go directly to Supabase (event listing, updating, deleting, drafts). Be mindful of which path each operation uses.

7. **Auto-archive runs client-side.** The 60-second timer that archives expired events runs in the browser. If the user closes the tab, expired events won't be archived until they reopen the app.

8. **CORS is fully open.** The backend allows all origins (`*`). Fine for development, but must be restricted in production.

### 🟢 Good to Know

9. **Category values must match exactly.** The Gemini prompt constrains categories to: `exam`, `hackathon`, `assignment`, `meeting`, `personal`, `reminder`. The priority engine uses these same values (case-insensitive) for scoring. Using any other value is safe but defaults to a weight of 3.

10. **The schedule is computed client-side.** `generateSchedule()` builds study blocks, break blocks, and event blocks entirely in the browser using the time-block algorithm in `priorityEngine.js`. No backend endpoint generates the schedule.

11. **Onboarding profile boosts are additive.** When the user completes onboarding, their profile's `priority_boost`, `motivation_weight`, and `slot_weight` are used as multipliers that add bonus points to matching events' priority scores.

---

## Quick Reference Card

### All API Endpoints

| Method | Path | Auth | Content-Type | Purpose |
|--------|------|------|--------------|---------|
| `GET` | `/api/health` | ❌ | — | Health check |
| `POST` | `/api/auth/signup` | ❌ | `application/json` | Register user |
| `POST` | `/api/auth/login` | ❌ | `application/json` | Login user |
| `GET` | `/api/auth/me` | ✅ | — | Get current user |
| `GET` | `/api/onboarding/status` | ✅ | — | Check onboarding status |
| `POST` | `/api/onboarding/save` | ✅ | `application/json` | Save onboarding answers |
| `POST` | `/api/process-event` | ✅ | `multipart/form-data` | Process file/text → event |
| `POST` | `/api/process-event-json` | ✅ | `application/json` | Process text → event |
| `GET` | `/api/schedule/changes` | ✅ | — | Get change log |
| `POST` | `/api/schedule/changes` | ✅ | `application/json` | Log a schedule change |

### All Direct Supabase Operations

| Table | Operation | What It Does |
|-------|-----------|--------------|
| `events` | SELECT * WHERE user_id = X | Fetch user's events |
| `events` | UPDATE SET event_datetime = X WHERE id = Y | Reschedule |
| `events` | UPDATE SET status = 'completed' WHERE id = Y | Complete |
| `events` | DELETE WHERE id = Y | Delete (after FK cleanup!) |
| `drafts` | SELECT * WHERE user_id = X | Fetch archived events |
| `drafts` | INSERT | Archive expired event |
| `drafts` | DELETE WHERE id = Y | Permanently delete draft |
| `schedule_changes` | UPDATE SET event_id = null WHERE event_id = X | FK cleanup before event delete |
| `schedule_items` | DELETE WHERE event_id = X | FK cleanup before event delete |
