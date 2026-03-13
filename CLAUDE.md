# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

n8n Whitelabel Frontend — a Next.js 16 full-stack app that wraps n8n workflows behind a branded portal with Supabase auth, role-based access, document processing, and i18n (English/Greek).

## Key Commands

- `npm run dev` — dev server with Turbopack
- `npm run build` — production build (requires `.env.local`)
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier (single quotes, 2 spaces, trailing commas)
- `npm run db:seed` — seed demo users (uses `tsx --env-file=.env.local`)

No test suite exists.

## Tech Stack

Next.js 16 App Router, React 19, TypeScript strict, Supabase (Postgres + Auth + Storage), Tailwind CSS 4, shadcn/ui, next-intl, Zod v4, Winston logger, OpenAI (embeddings)

## Architecture

### Three-Tier Role System

Roles: `ADMIN`, `MANAGER`, `CLIENT` (defined in `/src/lib/constants.ts`).

- **ADMIN** — unrestricted access to all companies, all users, and all routes (including `/admin/*`)
- **MANAGER** — can only see and manage the companies they are assigned to (via `user_companies` table) and the clients that belong to those companies; accesses `/manage/*` routes
- **CLIENT** — can only see and interact with resources (workflows, documents, chat/trigger history) that belong to their own company; accesses `/workflow`, `/chat-history`, `/trigger-history`, `/dashboard`, `/profile`, `/settings`

Auth helpers in `/src/lib/auth-helpers.ts`:
- `checkAdminAuth()` — admin-only server actions
- `checkAdminOrManagerAuth()` — admin + manager server actions
- `getManagerCompanyIds(managerId)` — returns company IDs a manager is assigned to
- `checkManagerCompanyAccess(managerId, companyId)` — verifies manager→company access

Session helper in `/src/lib/auth-session.ts`: `getSession()` returns `AuthSession` with user profile data (role, status, name).

### Middleware (`/src/proxy.ts`)

Protects routes by role, refreshes Supabase sessions. Route access:
- `/admin/*` — ADMIN only
- `/manage/*` — ADMIN + MANAGER
- `/api/users*` — ADMIN only (defense in depth)
- `/api/logs/*`, `/api/knowledge-search` — allow Bearer token auth (used by n8n)
- All other protected routes — any authenticated ACTIVE user

### Supabase Clients

- **Browser** (`/src/lib/supabase/client.ts`) — `'use client'` components
- **Server** (`/src/lib/supabase/server.ts`) — Server Components + Server Actions (respects RLS)
- **Admin** (`/src/lib/supabase/admin.ts`) — service role key, bypasses RLS

### Database

Supabase PostgreSQL with RLS. Key tables: `profiles`, `companies`, `user_companies`, `workflows`, `user_workflows`, `documents`, `knowledge_base`.

- User IDs are UUID strings
- `is_admin()` and `is_admin_or_manager()` are SECURITY DEFINER functions (prevent RLS recursion)
- pgvector extension required for `knowledge_base` (IVFFlat index)
- Migrations in `/supabase/migrations/` (001–004)
- Use `revalidatePath()` after mutations that affect UI

### Workflows & Document Processing

- Workflow types: `CHAT` and `TRIGGER` (constants in `/src/lib/constants.ts`)
- Webhook proxy routes: `/api/workflows/trigger` and chat via n8n
- Document pipeline: upload → parse (pdf-parse/mammoth) → chunk (1000 chars) → embed (OpenAI `text-embedding-3-small`) → upsert to `knowledge_base`
- `knowledge_base` schema is n8n Supabase Vector Store compatible: `{id, content, metadata, embedding, doc_id, workflow_id}`
- Document processing API: `/api/documents/process`
- Supabase Storage bucket `workflow-documents` must be created manually

### API Routes

- `/api/workflows/trigger` — webhook proxy for n8n trigger workflows
- `/api/documents/process` — document processing pipeline
- `/api/documents/status` — document status polling
- `/api/logs/chat` — chat logging (Bearer auth, called by n8n)
- `/api/knowledge-search` — vector search (Bearer auth, called by n8n)
- `/api/users-export` — admin user export

## Code Patterns

### Server Components by Default

Add `'use client'` only when necessary (hooks, event handlers, browser APIs).

### Forms

All forms use `useActionState` hook with server actions returning `FormState`:
```typescript
type FormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: { /* fields */ };
  globalError: string | null;
};
```

### Server Actions (`/src/server-actions/`)

- Validate with Zod schemas (`/src/lib/validation-schemas.ts`)
- Return `FormState` for forms, use `redirect()` for successful mutations
- Auth: `checkAdminAuth()` for admin-only, `checkAdminOrManagerAuth()` for shared
- Admin client for privileged ops, server client for user-scoped queries

### Translations

- Files: `/messages/en.json`, `/messages/el.json`
- Server: `getTranslations('namespace')` from `next-intl/server`
- Client: `useTranslations('namespace')` from `next-intl`
- All user-facing strings must be translation keys (error messages included)

### Components

- shadcn/ui in `/src/components/ui` — use existing components, don't create custom ones
- `InfoAlert` for success/error/warning messages
- `SortableTableHeader` for admin/manage tables — extend its `SortField` type when adding new sortable columns
- Admin/manage tables use sortable headers, pagination, and filters

## File Conventions

- kebab-case for filenames
- Server actions in `/src/server-actions/`
- Types in `/src/types/`
- Supabase query builder only (no raw SQL)

## Gotchas

- `pdf-parse` requires `require()` + unwrap default; also stub `DOMMatrix`, `ImageData`, `Path2D` before require (pdfjs-dist accesses them at load time)
- Supabase FK joins with multiple FKs to same table: use separate queries, not `.select('table:fk_col(...)')`
- Build fails without `.env.local` (env vars required at build time)
- Demo users: admin@nextlaunchkit.com / user@nextlaunchkit.com

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY` (for document embedding)
