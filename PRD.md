# Product Requirements Document (PRD) — Klyro Backend API

## 1. Overview

`klyro-backend` is a RESTful API powering a multi-platform **Task & Habit Tracker** (Web via React TS, Mobile via Flutter). It handles user authentication, personal task management, and daily habit tracking with streak calculations.

## 2. Base URL & Global Rules

- **Base Prefix:** `/api/v1`
- **Health Check:** `GET /api/v1/health` (Public — returns server & database connection status).
- **Authentication:** All `/tasks` and `/habits` routes require `Authorization: Bearer <token>` header.
- **Response Format:** Must strictly follow the JSON envelope defined in `AGENTS.md`.

---

## 3. API Specifications

### A. Auth Module (`/api/v1/auth`)

1. **`POST /register`** (Public)
   - **Body:** `{ "email": "string (valid email)", "password": "string (min 8 chars)" }`
   - **Logic:** Check if email exists (`409 Conflict` if taken). Hash password with `bcryptjs` (salt rounds: 10). Create user and return JWT token + user profile (exclude `password_hash`).
2. **`POST /login`** (Public)
   - **Body:** `{ "email": "string", "password": "string" }`
   - **Logic:** Verify user and password (`401 Unauthorized` if invalid). Return JWT token (`expiresIn: '7d'`) + user profile.
3. **`GET /me`** (Protected)
   - **Logic:** Return current authenticated user's `id`, `email`, and `created_at`.

---

### B. Tasks Module (`/api/v1/tasks`) — All Protected

1. **`GET /`**
   - **Query Params (Optional):** `status` (`PENDING` | `IN_PROGRESS` | `COMPLETED`), `priority` (`LOW` | `MEDIUM` | `HIGH`), `due_date` (`YYYY-MM-DD`).
   - **Logic:** Return all tasks belonging to `req.user.id` matching the filters, ordered by `due_date` ascending (nulls last) then `created_at` descending.
2. **`POST /`**
   - **Body:** `{ "title": "string (min 1 char)", "description": "string (optional)", "due_date": "ISO date string (optional)", "status": "TaskStatus (optional)", "priority": "TaskPriority (optional)" }`
   - **Logic:** Create a new task linked to `req.user.id`. Return `201 Created`.
3. **`PATCH /:id`**
   - **Params:** `id` (UUID)
   - **Body:** Partial fields of `title`, `description`, `due_date`, `status`, `priority`.
   - **Logic:** Verify task exists and belongs to `req.user.id` (`404 Not Found` otherwise). Update and return updated task.
4. **`DELETE /:id`**
   - **Params:** `id` (UUID)
   - **Logic:** Verify ownership, delete task, return `200 OK`.

---

### C. Habits Module (`/api/v1/habits`) — All Protected

1. **`GET /`**
   - **Query Params (Optional):** `date` (`YYYY-MM-DD`, defaults to today UTC).
   - **Logic:** Return all habits belonging to `req.user.id`, including whether each habit has a `completed: true` entry in `HabitLog` for the requested `date`.
2. **`POST /`**
   - **Body:** `{ "title": "string (min 1 char)", "target_days": "string[] (subset of ['MON','TUE','WED','THU','FRI','SAT','SUN'], min 1 item)" }`
   - **Logic:** Create habit with `streak_count: 0`. Return `201 Created`.
3. **`PATCH /:id`**
   - **Params:** `id` (UUID)
   - **Body:** `{ "title": "string (optional)", "target_days": "string[] (optional)" }`
   - **Logic:** Verify ownership, update habit, return updated habit.
4. **`DELETE /:id`**
   - **Params:** `id` (UUID)
   - **Logic:** Verify ownership, delete habit (cascades logs), return `200 OK`.
5. **`POST /:id/check-in`**
   - **Params:** `id` (UUID)
   - **Body:** `{ "date": "YYYY-MM-DD" }`
   - **Logic:**
     - Verify habit ownership.
     - Upsert `HabitLog` for `(habit_id, date)`: toggle `completed` boolean (if not exists -> `true`; if `true` -> `false`; if `false` -> `true`).
     - Recalculate `streak_count` based on consecutive completed logs up to the check-in date and update `Habit.streak_count`.
     - Return updated habit along with the toggled log.

---

## 4. Implementation Milestones (Execution Order)

Execute strictly in phases—do not jump ahead until the current phase compiles cleanly (`npx tsc --noEmit`):

- **Phase 1 (Foundation):** `package.json` scripts (`dev`, `build`, `start`), `src/config/env.ts`, `src/config/prisma.ts`, `src/utils/*`, `src/middlewares/*`, `src/app.ts`, `src/index.ts`, and `GET /api/v1/health`.
- **Phase 2 (Auth):** `src/modules/auth/*` + mount to `app.ts`.
- **Phase 3 (Tasks):** `src/modules/tasks/*` + mount to `app.ts`.
- **Phase 4 (Habits):** `src/modules/habits/*` + mount to `app.ts`.
