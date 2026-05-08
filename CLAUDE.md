# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

n8n Whitelabel Frontend (branded as **AutoExec**, see `APP_NAME` in `/src/lib/constants.ts`) — a Next.js 16 full-stack open-source app that wraps n8n workflows behind a branded portal with Supabase auth, role-based access, document processing, and i18n (English/Greek). Released under the MIT License (see `LICENCE.md`).

## Key Commands

- `npm run dev` — dev server with Turbopack
- `npm run build` — production build (requires `.env.local`)
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier (single quotes, 2 spaces, trailing commas)
- `npm run db:seed` — seed demo users into the dev DB (uses `tsx --env-file=.env.local`)
- `npm run db:seed:test` — seed demo users into the **test** DB (no `--env-file`; inherits env from caller, used by `globalSetup`)
- `npm run test:e2e` — Playwright E2E suite (loads `.env.test.local`, re-seeds the test DB on every run)
- `npm run test:e2e:ui` / `:headed` / `:report` — Playwright UI mode / headed run / open last HTML report

## Testing (Playwright E2E)

- Tests live in `/tests/e2e`; helpers in `/tests/helpers`; entry point `tests/global-setup.ts`.
- **Always run against a dedicated Supabase project**, not the dev DB. The global setup re-seeds and resets demo passwords on every run, which would clobber dev data.
- Bootstrap the test project once with `supabase/schema.sql` (consolidated equivalent of all migrations); apply newly added files in `supabase/migrations/` to it as they land. CI does not auto-apply schema changes.
- Local credentials go in `.env.test.local` (gitignored). `.env.test` is a committed template (`!.env.test` in `.gitignore`) — never put real secrets there.
- `playwright.config.ts` and `tests/global-setup.ts` both load `.env.test.local` via `dotenv`. In CI, skip the file and inject the same env vars from GitHub Actions secrets — `dotenv` won't override values already in `process.env`, and a missing `.env.test.local` is silently ignored.
- The seed script (`supabase/seed.ts`) is shared between dev and test; the difference is only which env file is loaded.

## Tech Stack

Next.js 16 App Router, React 19, TypeScript strict, Supabase (Postgres + Auth + Storage), Tailwind CSS 4, shadcn/ui, next-intl, Zod v4, Winston logger, OpenAI (embeddings)

## Architecture

### Three-Tier Role System

Roles: `ADMIN`, `MANAGER`, `CLIENT` (defined in `/src/lib/constants.ts`).

- **ADMIN** — unrestricted access. Owns all provisioning: companies, users (incl. clients), templates. Accesses `/admin/*` and all `/manage/*` routes.
- **MANAGER** — operational access only, scoped to companies assigned via `user_companies`. Can CRUD workflows in those companies, view templates, and see scoped chat/trigger history + dashboard. Cannot create/edit/delete companies, users, or templates.
- **CLIENT** — can only see and interact with resources (workflows, documents, chat/trigger history) that belong to their own company; accesses `/workflow`, `/chat-history`, `/trigger-history`, `/dashboard`, `/profile`, `/settings`

`/manage/*` is mixed: **`/manage/workflows`** is shared (admin + manager, manager scoped via `user_companies`); **`/manage/templates`** is shared but read-only for managers (only admins can CRUD); **`/manage/companies`** and **`/manage/clients/create`** are admin-only despite the path. Server actions enforce per-action: `checkAdminAuth()` for provisioning, `checkAdminOrManagerAuth()` + `getManagerCompanyIds()` / `checkManagerCompanyAccess()` for workflow ops. `/admin/*` is admin-only and scoped to `user` management.

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

Supabase PostgreSQL with RLS. Key tables: `profiles`, `companies`, `user_companies`, `workflows`, `user_workflows`, `documents`, `knowledge_base`, `template_library`, `chat_logs`, `trigger_logs`.

- User IDs are UUID strings
- `is_admin()`, `is_manager()`, `is_admin_or_manager()` are SECURITY DEFINER functions (prevent RLS recursion)
- pgvector extension required for `knowledge_base` (IVFFlat index)
- Migrations in `/supabase/migrations/`. Notable: `005_template_library`, `006_no_kb_on_trigger`, `008_add_company_logo`, `009_add_n8n_credentials`, `014_remove_subscriptions` (drops legacy Stripe/subscription state)
- `companies` carries optional logo (Storage) and **encrypted** n8n credentials (see `/src/lib/encryption.ts`, `ENCRYPTION_KEY` env var)
- Use `revalidatePath()` after mutations that affect UI

### Workflows & Document Processing

- Workflow types: `CHAT` and `TRIGGER` (constants in `/src/lib/constants.ts`)
- Webhook proxy routes: `/api/workflows/trigger` and chat via n8n
- Document pipeline: upload → parse (pdf-parse/mammoth) → chunk (1000 chars) → embed (OpenAI `text-embedding-3-small`) → upsert to `knowledge_base`
- `knowledge_base` schema is n8n Supabase Vector Store compatible: `{id, content, metadata, embedding, doc_id, workflow_id}`
- Document processing runs in-process via `triggerDocumentProcessingAction` (no separate API route)
- Supabase Storage bucket `workflow-documents` must be created manually
- Trigger workflows: knowledge base is **optional** (toggleable per workflow, see migration 006). JSON params input is built via `trigger-params-builder.tsx`, and the n8n response is rendered through `dynamic-response.tsx`

### Template Library

Admin/manager-curated workflow templates surfaced under `/manage/templates`. Schema: `template_library` (migration 005) with a separate setup-guide field added in migration 007. Components: `template-library-{form,table,view}.tsx`. Server actions in `/src/server-actions/template-library.ts`.

### Dashboard

Role-aware dashboard at `/dashboard`. Stats and recent activity tables (`dashboard-stats.tsx`, `recent-chat-table.tsx`, `recent-trigger-table.tsx`) are powered by `/src/server-actions/dashboard.ts`. Types in `/src/types/dashboard.d.ts`.

### Breadcrumbs

Dynamic breadcrumbs use a context (`breadcrumb-context.tsx`) + per-page setter (`breadcrumb-setter.tsx`) so detail pages can show meaningful titles instead of UUIDs. When adding a new `[id]` route, render `<BreadcrumbSetter>` from the page so the resolved label flows into `dynamic-breadcrumb.tsx`.

### API Routes

- `/api/workflows/trigger` — webhook proxy for n8n trigger workflows
- `/api/documents/status` — document status polling
- `/api/logs/chat` — chat logging (Bearer auth, called by n8n)
- `/api/knowledge-search` — vector search (Bearer auth, called by n8n)
- `/api/users-export` — admin user export
- Workflow Bearer-token validation lives in `/src/lib/api/validate-workflow-token.ts`

## Code Patterns

### Server Components by Default

Add `'use client'` only when necessary (hooks, event handlers, browser APIs).

### Forms

All forms use `useActionState` hook with server actions returning `FormState`:

```typescript
type FormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    /* fields */
  };
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

## Design System

### Theme

Indigo-based palette via CSS custom properties in `globals.css`. Dark mode supported via `next-themes` (`ThemeProvider` wraps the app in `layout.tsx`). Theme toggle lives on the `/settings` page next to the language switcher.

- `--primary`: Indigo 600 (light) / Indigo 400 (dark)
- `--background`: Subtle off-white tint `oklch(0.985 0.004 265)` — not pure white, gives depth between page and cards

### Button Hierarchy

| Action                 | Variant                  | Examples                       |
| ---------------------- | ------------------------ | ------------------------------ |
| Create / Submit / Save | `default` (indigo fill)  | "Create", form submit buttons  |
| Delete                 | `destructive` (red fill) | All Trash2 icon buttons        |
| View / Edit / Navigate | `outline`                | Eye, Pencil, ArrowLeft buttons |
| Cancel / Back          | `outline`                | Cancel buttons in forms        |
| Toggle / Dismiss       | `ghost`                  | Theme toggle, close alert      |

### Badge Color System (`/src/lib/badge-styles.ts`)

5 semantic colors applied via `variant="outline"` + `className={badgeStyles.X}`:

| Color               | Style                | Usage                                |
| ------------------- | -------------------- | ------------------------------------ |
| **Green** (emerald) | `badgeStyles.green`  | ACTIVE, active workflow, CHAT, ready |
| **Indigo**          | `badgeStyles.indigo` | ADMIN, MANAGER                       |
| **Amber**           | `badgeStyles.amber`  | UNVERIFIED, pending, processing      |
| **Red**             | `badgeStyles.red`    | INACTIVE, inactive workflow, error   |
| **Slate** (zinc)    | `badgeStyles.slate`  | CLIENT, TRIGGER                      |

Each style includes light + dark mode classes. Always use `variant="outline"` as the base — the className colors override via `tw-merge` in `cn()`.

Helper exports in `user-table.tsx`: `getStatusBadge(status, t)` and `getRoleBadgeClass(role)` — reuse these instead of duplicating logic.

## File Conventions

- kebab-case for filenames
- Server actions in `/src/server-actions/`
- Types in `/src/types/`
- Supabase query builder only (no raw SQL)

## Gotchas

- `pdf-parse` requires `require()` + unwrap default; also stub `DOMMatrix`, `ImageData`, `Path2D` before require (pdfjs-dist accesses them at load time)
- Supabase FK joins with multiple FKs to same table: use separate queries, not `.select('table:fk_col(...)')`
- Build fails without `.env.local` (env vars required at build time)
- Demo users (seed): `admin@nextlaunchkit.com`, `manager@nextlaunchkit.com`, `user@nextlaunchkit.com`
- n8n credentials on `companies` are encrypted with `ENCRYPTION_KEY` — rotating the key invalidates existing rows; decrypt + re-encrypt before changing it
- App display name comes from `APP_NAME` in `/src/lib/constants.ts` (currently "AutoExec") — never hardcode the brand string
- Self-signup is disabled. Admins create users (managers + clients) from `/admin/user`. Only login (`/auth/signin`), forgot/reset password, and email verification are exposed under `/auth/*`.

## Environment Variables

Required in `.env.local` (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY` (for document embedding)
- `ENCRYPTION_KEY` (for encrypting per-company n8n credentials)
