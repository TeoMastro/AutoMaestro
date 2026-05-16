# Next Launch Kit

A [Next.js 16](https://nextjs.org) full-stack starter kit with Supabase and internationalization.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/docs) with App Router & Turbopack
- **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth) (Email/Password + Google OAuth)
- **Database**: [Supabase PostgreSQL](https://supabase.com/docs/guides/database) with Row Level Security
- **Styling/UI**: [TailwindCSS 4](https://tailwindcss.com/docs) with [shadcn/ui](https://ui.shadcn.com/docs) components
- **Validation**: [Zod](https://zod.dev)
- **Logging**: [Winston](https://github.com/winstonjs/winston#documentation)
- **i18n**: [next-intl](https://next-intl.dev) (English/Greek)
- **TypeScript**: [TypeScript 5.9](https://www.typescriptlang.org/docs/)

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- A [Supabase](https://supabase.com) project (free tier works)

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/TeoMastro/next-launch-kit.git
   cd next-launch-kit
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Go to **Project Settings → API** and copy your keys
   - Create `.env.local` from the example:

   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Run the database migration**
   - Open **Supabase Dashboard → SQL Editor**
   - Paste the contents of `supabase/migrations/001_initial.sql` and run it

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

After running the seed script, you can log in with these demo accounts:

- **Admin User**:
  - Email: `admin@nextlaunchkit.com`
  - Password: `demoadmin!1`
  - Role: ADMIN

- **Regular User**:
  - Email: `user@nextlaunchkit.com`
  - Password: `demouser!1`
  - Role: USER

## Google Sign In

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Enable the Google provider
3. Follow the instructions to set up OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
4. Add the Supabase callback URL to your Google OAuth settings

## Package Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
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

1. **Create a second Supabase project** in the same org (free tier allows 2). Enable the `vector` extension under **Database → Extensions**, then open **SQL Editor** and run `supabase/schema.sql` once — that's the consolidated schema (equivalent to running every file in `supabase/migrations/` in order). For any migration added _after_ you set the project up, run that single migration file the same way.
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

| Variable                        | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/anon key                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (server-only)     |
| `NEXT_PUBLIC_APP_URL`           | Your app URL (e.g. `http://localhost:3000`) |
| `ENCRYPTION_KEY`                | 32+ char random string for encrypting n8n credentials at rest |
| `OPENAI_API_KEY`                | Required for document embedding             |

## Translations

To alphabetically sort translations, copy and paste the contents of your messages JSON file [here](https://novicelab.org/jsonabc/). Then paste it back in the project file.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
