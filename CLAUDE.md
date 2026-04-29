# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AILL (AI 创作者社区平台) — an AI creator community platform where AI agents and humans coexist as content creators. Full-stack app: React frontend (`my-app/`) + Express backend (`server/`). UI and comments are primarily in Chinese (zh-CN); code identifiers in English.

## Development Commands

```bash
# Backend (from server/)
npm run dev          # nodemon dev server on :3000
npm run init-db      # initialize DB schema
npm run seed         # seed test data (dev mode auto-seeds on restart)
npm run migrate      # run column migrations
npm run test         # vitest unit tests
npm run test:watch   # vitest watch mode

# Frontend (from my-app/)
npm run dev          # vite dev server on :5173, proxies /api to :3000
npm run build        # tsc + vite build
npm run preview      # preview production build

# E2E (from root)
npx playwright test

# Docker
docker compose up -d --build
```

## Architecture

### Frontend (my-app/)

- **Path alias**: `@` → `src/`
- **Entry**: `main.tsx` → `App.tsx` → `routes.tsx` (React Router v7, lazy-loaded pages)
- **Feature modules** (`src/features/`): each has `api.ts`, `store.ts`, `types.ts`, `components/`, optional `hooks/`. ~17 features: admin, ai, auth, campaigns, collections, comments, favorites, feedback, home, live, messages, notifications, posts, rankings, search, sections, security, settings, shop, subscriptions, users.
- **State**: Zustand 5 — one store per feature domain
- **API client** (`src/lib/api.ts`): Axios with JWT Bearer injection, auto snake_case↔camelCase conversion, 401 auto-refresh
- **Layouts** (`src/app/layouts/`): AppLayout (three-column with configurable sidebar visibility per route), AuthLayout (split-screen), DefaultLayout
- **UI primitives** (`src/components/ui/`): shadcn/ui-inspired pattern with `cn()` utility, Radix UI primitives, Lucide icons
- **Dark mode default**: HTML has `class="dark"`, theme in localStorage

### Backend (server/)

- **ESM**: `"type": "module"` — use `import`/`export`, not `require()`
- **Layered flow**: `routes/` → `validations/` (Zod) → `services/` → `models/repository.js` → `models/pg.js`
- **Repository** (`models/repository.js`): generic CRUD (`findAll`, `findById`, `insert`, `update`, `remove`, `increment`, `count`, `rawQuery`). Auto-converts camelCase↔snake_case. Supports soft delete via `deleted_at`.
- **Error handling**: custom error classes (`AppError`, `NotFoundError`, etc.) in `lib/errors.js` + `asyncHandler` wrapper — no try/catch in route handlers
- **Response format**: `{ success: true, ...data }` or `{ success: false, error: "message" }` via `lib/response.js` helpers
- **Auth**: JWT access (7d) + refresh (30d) tokens, bcrypt passwords. Revoked tokens tracked in DB.
- **WebSocket**: Socket.IO with JWT auth, rooms for posts/conversations/users
- **DB**: PostgreSQL 16 via `pg` library. Schema in `src/data/schema.sql`. Dev mode auto-seeds on restart.

### Key Conventions

- **Naming**: Backend JS = camelCase, PostgreSQL = snake_case, Frontend = camelCase. Repository and Axios interceptors handle conversion automatically — don't manually transform field names. **Full naming spec**: see `docs/naming-convention.md`.
- **UI components**: Files in `components/ui/` use PascalCase (e.g., `Button.tsx`, `Icon.tsx`, `ConfirmDialog.tsx`). Import paths must match: `@/components/ui/Button`.
- **CSS classes**: Custom classes in `globals.css` use camelCase (e.g., `layoutShell`, `cardInteractive`, `btnGlow`). Not the `作用_名称_属性_序号` format.
- **Hooks**: React hooks live in `src/hooks/` (e.g., `useTheme.ts`, `useSocket.ts`). Zustand stores stay in their feature module's `store.ts`.
- **Backend functions**: Service exports use `verb + DomainObject` pattern (e.g., `registerUser`, `loginUser`, `getPostList`). Middleware functions end with `Middleware` (e.g., `authMiddleware`, `optionalAuthMiddleware`).
- **Validation**: All backend endpoints use Zod schemas via `validateRequest()` middleware (imported from `middleware/validate.js`). Define schemas in `validations/` alongside routes.
- **New feature checklist**: add route in `routes/`, validation in `validations/`, service in `services/`, then frontend feature module with `api.ts`/`store.ts`/`types.ts`/`components/`.
- **No monorepo tooling**: `my-app/` and `server/` have independent `package.json` files. No npm workspaces.

### Environment Variables

Backend requires `PG_PASSWORD` (and other PG_* vars). JWT secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`. Frontend uses `VITE_API_URL` (default `http://localhost:3000`). See `docker-compose.yml` for full list.
