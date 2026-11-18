# Product Requirements Document (PRD) — Klyro Backend API

## 1. Overview

`klyro-backend` is a RESTful API powering a multi-platform **Personal Life OS** (Web via React TS, Mobile via Flutter). It handles user authentication, personal task management, daily habit tracking with streak calculations, money management (income/expense with monthly summaries), and quick notes.

## 2. Base URL & Global Rules

- **Base Prefix:** `/api/v1`
- **Health Check:** `GET /api/v1/health` (Public — returns server & database connection status).
- **Authentication:** All `/tasks`, `/habits`, `/transactions`, and `/notes` routes require `Authorization: Bearer <token>` header.
- **Response Format:** Must strictly follow the JSON envelope defined in `AGENTS.md`.

---

## 3. API Specifications

### A. Auth Module (`/api/v1/auth`)

1. **`POST /register`** (Public)
   - **Body:** `{ "name": "string (min 2 chars)", "email": "string (valid email)", "password": "string (min 8 chars)" }`
   - **Logic:** Check if email exists (`409 Conflict` if taken). Hash password with `bcryptjs` (salt rounds: 10). Create user and return JWT token + user profile `{ id, email, name, created_at }` (exclude `password_hash`).
2. **`POST /login`** (Public)
   - **Body:** `{ "email": "string", "password": "string" }`
   - **Logic:** Verify user and password (`401 Unauthorized` if invalid). Return JWT token (`expiresIn: '7d'`) + user profile (includes `name`).
3. **`GET /me`** (Protected)
   - **Logic:** Return current authenticated user's `id`, `email`, `name`, and `created_at`.

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

### D. Transactions Module (`/api/v1/transactions`) — All Protected

Money management. `Transaction` stores `amount` as an integer in whole rupiah (no decimals) and `date` as a `DATE` column (midnight UTC).

1. **`GET /`**
   - **Query Params (Optional):** `type` (`INCOME` | `EXPENSE`), `category` (string), `month` (`YYYY-MM`, e.g. `2026-11`).
   - **Logic:** Return all transactions belonging to `req.user.id` matching the filters, ordered by `date` descending then `created_at` descending.
2. **`GET /summary`**
   - **Query Params (Optional):** `month` (`YYYY-MM`, defaults to the current month).
   - **Logic:** Aggregate the user's transactions for that month and return `{ month, total_income, total_expense, balance }`, where `balance = total_income - total_expense`. Months without data return zeros.
3. **`POST /`**
   - **Body:** `{ "type": "INCOME | EXPENSE", "amount": "integer > 0", "category": "string (min 1 char)", "note": "string (optional)", "date": "YYYY-MM-DD (optional, defaults to today UTC)" }`
   - **Logic:** Create the transaction linked to `req.user.id`. Return `201 Created`.
4. **`PATCH /:id`**
   - **Params:** `id` (UUID)
   - **Body:** Any of `type`, `amount`, `category`, `note`, `date` (at least one field).
   - **Logic:** Verify ownership (`404 Not Found` otherwise), update, return the updated transaction.
5. **`DELETE /:id`**
   - **Params:** `id` (UUID)
   - **Logic:** Verify ownership, delete, return `200 OK` with `{ id }`.

---

### E. Notes Module (`/api/v1/notes`) — All Protected

Quick notes with pinning.

1. **`GET /`**
   - **Query Params (Optional):** `search` (matched against `title` OR `content`, case-insensitive), `is_pinned` (`true` | `false`).
   - **Logic:** Return all notes belonging to `req.user.id`, ordered by `is_pinned` descending then `updated_at` descending (pinned notes always first).
2. **`POST /`**
   - **Body:** `{ "title": "string (min 1 char)", "content": "string (min 1 char)", "is_pinned": "boolean (optional, default false)" }`
   - **Logic:** Create the note linked to `req.user.id`. Return `201 Created`.
3. **`PATCH /:id`**
   - **Params:** `id` (UUID)
   - **Body:** Any of `title`, `content`, `is_pinned` (at least one field).
   - **Logic:** Verify ownership (`404 Not Found` otherwise), update, return the updated note; `updated_at` is bumped automatically.
4. **`DELETE /:id`**
   - **Params:** `id` (UUID)
   - **Logic:** Verify ownership, delete, return `200 OK` with `{ id }`.

---

## 4. Implementation Milestones (Execution Order)

Execute strictly in phases—do not jump ahead until the current phase compiles cleanly (`npx tsc --noEmit`):

- **Phase 1 (Foundation):** `package.json` scripts (`dev`, `build`, `start`), `src/config/env.ts`, `src/config/prisma.ts`, `src/utils/*`, `src/middlewares/*`, `src/app.ts`, `src/index.ts`, and `GET /api/v1/health`.
- **Phase 2 (Auth):** `src/modules/auth/*` + mount to `app.ts`.
- **Phase 3 (Tasks):** `src/modules/tasks/*` + mount to `app.ts`.
- **Phase 4 (Habits):** `src/modules/habits/*` + mount to `app.ts`.
- **Phase 5 (Money Management):** `Transaction` model (`TransactionType` enum, integer rupiah `amount`, `date @db.Date`) + `src/modules/transactions/*` with CRUD, `month` filters, and `GET /summary`.
- **Phase 6 (Quick Notes):** `Note` model + `src/modules/notes/*` with CRUD, case-insensitive `search`, and pinned-first ordering.
- **Phase 7 (Docs & Smoke):** `API.md`, this PRD, and `scripts/smoke.ts` cover every endpoint; `npx tsc --noEmit` and `npm run smoke` must both pass.
