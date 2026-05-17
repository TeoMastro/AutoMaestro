# AutoMaestro

An open-source whitelabel frontend for [n8n](https://n8n.io) — wraps your n8n workflows behind a branded portal with multi-tenant company management, role-based access, document-grounded chat (RAG), and i18n (English/Greek).

Built so an operator can stand up a polished client-facing surface in front of their n8n instance: provision companies, assign workflows, gate access with three roles (admin/manager/client), upload documents that get embedded into a per-workflow knowledge base, and run chat or trigger workflows directly from the UI.

## Features

- **Three-tier roles** — `ADMIN` (full provisioning), `MANAGER` (operational, scoped to assigned companies), `CLIENT` (own company only)
- **Per-company branding** — logo upload, encrypted n8n credentials stored per company
- **Workflow types** — `CHAT` (conversational, optionally grounded in uploaded documents) and `TRIGGER` (parameterized webhook invocation with dynamic response rendering)
- **Document pipeline** — upload PDF/DOCX/TXT/MD → chunk → OpenAI embeddings → pgvector knowledge base (n8n Supabase Vector Store compatible)
- **Template library** — curated workflow templates admins can publish; managers view read-only
- **Dashboard** — role-aware stats and recent chat/trigger activity
- **Logging** — n8n posts chat/trigger logs back via Bearer-auth API routes
- **i18n** — English + Greek, all user-facing strings translated
- **Dark mode** — indigo palette, next-themes

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/docs) App Router + Turbopack, React 19
- **Auth & DB**: [Supabase](https://supabase.com) (Postgres with RLS, Auth, Storage)
- **Embeddings**: [OpenAI](https://platform.openai.com) `text-embedding-3-small` + [pgvector](https://github.com/pgvector/pgvector) (IVFFlat)
- **Styling/UI**: [TailwindCSS 4](https://tailwindcss.com/docs) + [shadcn/ui](https://ui.shadcn.com/docs)
- **Validation**: [Zod v4](https://zod.dev)
- **Logging**: [Winston](https://github.com/winstonjs/winston#documentation)
- **i18n**: [next-intl](https://next-intl.dev)
- **TypeScript**: [TypeScript 5.9](https://www.typescriptlang.org/docs/) strict mode

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- A [Supabase](https://supabase.com) project (free tier works) with the `vector` extension enabled
- An [OpenAI API key](https://platform.openai.com/api-keys) (for document embedding)
- An n8n instance to point workflows at

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/TeoMastro/n8n-whitelabel-frontend.git
   cd n8n-whitelabel-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Enable the `vector` extension under **Database → Extensions**
   - Open **SQL Editor** and run `supabase/schema.sql` (consolidated equivalent of every file in `supabase/migrations/`)
   - Create a Storage bucket named `workflow-documents` (used for document uploads)
   - Copy keys from **Project Settings → API**

4. **Create `.env.local`** from the example:

   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   OPENAI_API_KEY=your-openai-key
   ENCRYPTION_KEY=your-32-char-random-string
   ```

   Generate `ENCRYPTION_KEY` with `openssl rand -base64 32`. It encrypts per-company n8n credentials at rest — rotating it invalidates existing rows.

5. **Seed the database**

   ```bash
   npm run db:seed
   ```

6. **Start the dev server**

   ```bash
   npm run dev
   ```

   Navigate to [http://localhost:3000](http://localhost:3000) and sign in with a demo account.

## Demo Accounts

After running the seed script, log in with one of:

- **Admin** — `admin@nextlaunchkit.com` / `demoadmin!1`
- **Manager** — `manager@nextlaunchkit.com` / `demoadmin!1`
- **Client** — `user@nextlaunchkit.com` / `demouser!1`

> Self-signup is disabled. Admins create managers and clients from `/admin/user`. Only login, forgot/reset password, and email verification are exposed under `/auth/*`.

## Branding

The display name comes from `APP_NAME` in `/src/lib/constants.ts` (currently `AutoMaestro`). Change it there — never hardcode the brand string in components.

## Package Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production (requires .env.local)
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:seed          # Seed dev database with demo users (uses .env.local)
npm run db:seed:test     # Seed test database (inherits env; called by Playwright globalSetup)

# Testing (Playwright E2E)
npm run test:e2e         # Run end-to-end tests (uses .env.test.local)
npm run test:e2e:ui      # Run tests in Playwright UI mode
npm run test:e2e:headed  # Run tests with a visible browser
npm run test:e2e:report  # Open the last HTML report

# Formatting
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without changes
```

## End-to-End Tests

The Playwright suite re-seeds the database and resets demo passwords on every run, so it **must** point at a Supabase project dedicated to testing — never your dev project.

1. **Create a second Supabase project** in the same org (free tier allows 2). Enable the `vector` extension under **Database → Extensions**, then open **SQL Editor** and run `supabase/schema.sql` once. For any migration added _after_ you set the project up, run that single migration file the same way.
2. **Create `.env.test.local`** at the repo root (gitignored). Use `.env.test` as the template:

   ```bash
   cp .env.test .env.test.local
   ```

   Fill in the test project's URL, anon key, service role key, and a 32+ character `ENCRYPTION_KEY` (`openssl rand -base64 32`). Leave `OPENAI_API_KEY` blank unless your tests exercise document embedding.

3. **Run the tests:**

   ```bash
   npm run test:e2e
   ```

   Both `playwright.config.ts` and `tests/global-setup.ts` load `.env.test.local` via `dotenv` before anything touches the database.

> ⚠️ Do not put real credentials in `.env.test` — that file is committed (opted in via `!.env.test` in `.gitignore`) and is just a template.

### Running in CI

The repo ships a GitHub Actions workflow at `.github/workflows/e2e.yml` that runs Playwright on every push and PR to `main`. It boots `npm run dev` against the test Supabase project, re-seeds, and uploads the HTML report (and traces/videos on failure) as workflow artifacts.

Add these **repository secrets** under **Settings → Secrets and variables → Actions** (values from your test Supabase project):

| Secret                              | Source                                           |
| ----------------------------------- | ------------------------------------------------ |
| `TEST_SUPABASE_URL`                 | Test project → Settings → API → Project URL      |
| `TEST_SUPABASE_ANON_KEY`            | Test project → Settings → API → `anon public`    |
| `TEST_SUPABASE_SERVICE_ROLE_KEY`    | Test project → Settings → API → `service_role`   |
| `TEST_ENCRYPTION_KEY`               | `openssl rand -base64 32`                        |
| `TEST_OPENAI_API_KEY`               | OpenAI API key (only if tests hit embeddings)    |

`NEXT_PUBLIC_APP_URL` is hardcoded to `http://localhost:3000` in the workflow since Playwright runs against the dev server it spawns.

The workflow does **not** apply schema changes to the test project. After you bootstrap the project once with `supabase/schema.sql`, run any newly added file in `supabase/migrations/` against it manually — otherwise tests will fail with schema errors.

## Environment Variables

Required in `.env.local` for development (see `.env.example`). The same variables are required in `.env.test.local` for E2E tests, pointing at the dedicated test Supabase project (see `.env.test`).

| Variable                        | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/anon key                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (server-only)                           |
| `NEXT_PUBLIC_APP_URL`           | Your app URL (e.g. `http://localhost:3000`)                       |
| `ENCRYPTION_KEY`                | 32+ char random string for encrypting n8n credentials at rest     |
| `OPENAI_API_KEY`                | OpenAI key used to embed uploaded documents into the knowledge base |

## Companion Workflows Repo

Reference n8n workflows that pair with this frontend live at [TeoMastro/n8n-whitelabel-workflows](https://github.com/TeoMastro/n8n-whitelabel-workflows). They show how to call `/api/logs/chat` (chat logging) and `/api/knowledge-search` (vector search) from n8n with the per-workflow Bearer token.

## Translations

To alphabetically sort translations, copy and paste the contents of your messages JSON file [here](https://novicelab.org/jsonabc/), then paste it back in the project file.

## License

This project is licensed under the **GNU General Public License v3.0** — see [LICENCE.md](LICENCE.md) for the full text.
