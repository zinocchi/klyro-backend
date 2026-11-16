# Project Rules & Architecture Guidelines (`klyro-backend`)

## 1. Tech Stack & Environment
- **Runtime:** Node.js + Express.js + TypeScript (`NodeNext` module resolution).
- **Database & ORM:** PostgreSQL (Supabase) + **Prisma v7** (`@prisma/client` + `@prisma/adapter-pg` + `pg`).
- **Validation:** `zod` for all incoming request payloads (`body`, `query`, `params`).
- **Auth:** `jsonwebtoken` (JWT Bearer Token) + `bcryptjs`.
- **Security & Logging:** `helmet`, `cors`, `morgan`, `dotenv`.

## 2. Strict Folder Structure
Follow a clean **Layered Architecture** (Routes -> Controllers -> Services -> Database). Never put business logic or Prisma queries directly inside routes or controllers.

```text
src/
├── config/
│   ├── env.ts          # Validated environment variables (using Zod)
│   └── prisma.ts       # Singleton PrismaClient instance with @prisma/adapter-pg
├── middlewares/
│   ├── auth.middleware.ts    # JWT verification & attach user to req.user
│   ├── error.middleware.ts   # Global centralized error handler
│   └── validate.middleware.ts # Zod schema validation middleware
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.schema.ts    # Zod schemas & inferred TS types
│   ├── tasks/
│   │   ├── task.routes.ts
│   │   ├── task.controller.ts
│   │   ├── task.service.ts
│   │   └── task.schema.ts
│   └── habits/
│       ├── habit.routes.ts
│       ├── habit.controller.ts
│       ├── habit.service.ts
│       └── habit.schema.ts
├── utils/
│   ├── apiResponse.ts  # Standardized JSON response helper
│   └── appError.ts     # Custom operational error class
├── app.ts              # Express app setup (middlewares, routes, error handler)
└── index.ts            # Server entry point (app.listen)