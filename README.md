# SysDesign Arena

A practice app for system design interviews. Pick one of 30 problems (URL shortener, chat app,
payment system, ...), work through it stage by stage, draw the architecture on a canvas, and get
instant feedback from built-in tests, lint rules and an optional AI reviewer.

Everything works offline in the browser. Accounts, cross-device sync and AI review are opt-in.

## Features

- **Guided workspace** — each problem walks through six stages: Requirements → Estimation → Data
  Model → APIs → Design → Review, with a timer and optional hints.
- **Architecture canvas** — drag components (clients, gateways, services, caches, databases,
  queues, ...) onto a [React Flow](https://reactflow.dev) canvas, connect them with protocol edges,
  configure each one, undo/redo, and export as PNG or JSON.
- **Live lint** — rules flag common design smells as you draw: a client talking to a database,
  a single DB with no HA, a read-heavy path with no cache, a queue with no consumer, and more
  (`lib/lint/rules.ts`).
- **Problem tests and points** — each problem ships declarative checks (`tests.json`). Submitting
  scores `base × pass ratio × hint penalty`; viewing a reference solution before submitting
  forfeits the points.
- **Reference solutions** — 1–3 annotated approaches per problem, with graphs you can compare
  side-by-side against your own submitted designs.
- **AI review (optional)** — a rubric-based review of your design plus a few follow-up questions,
  via any [OpenRouter](https://openrouter.ai) model (free models work).
- **Learn** — 25 concept pages (caching, sharding, consistent hashing, CAP, queues vs streams, ...)
  linked from the problems.
- **Sandbox** — a free-form canvas with up to 5 named tabs for practice outside a problem.
- **History and progress** — every attempt is kept; the progress page summarises points and
  solved problems.

## Quick start

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. No environment variables are needed: the app runs local-only, with
no sign-in and no AI review.

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. Every group is optional.

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Enables AI review. Get one at https://openrouter.ai/keys. |
| `REVIEW_MODEL` | Model for standard reviews (default is a free model). |
| `REVIEW_FALLBACK_MODELS` | Comma-separated models tried if the main one is rate-limited. |
| `DEEP_REVIEW_MODEL` | Optional stronger model for the "Deep review" button. |
| `REVIEW_REASONING_EFFORT` | `low` (default), `medium`, `high` or `none`. |
| `DAILY_AI_CALLS` | AI calls per user per day (default 10). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enables sign-in and sync. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; needed to enforce the AI budget when Supabase is on. |
| `DATABASE_URL` | Only for `pnpm db:migrate`. |

Without Supabase, AI review (if a key is set) runs with no account and no daily limit. With
Supabase, AI review requires sign-in and the daily budget applies.

### Supabase (accounts and sync)

1. Create a Supabase project and copy the URL, anon key and service role key into `.env.local`.
2. Set `DATABASE_URL` to the **Session pooler** connection string
   (Project Settings → Database) and run `pnpm db:migrate`.
3. Under Authentication, enable email (magic link) and, if you want them, the Google and GitHub
   providers. Add `<your-origin>/auth/callback` to the allowed redirect URLs.

## How data is stored

The browser is the source of truth. Attempts, progress, saved solutions and sandboxes live in
IndexedDB (via [Dexie](https://dexie.org), `lib/db/dexie.ts`); a few UI preferences live in
localStorage.

- Edits autosave after 1s of quiet (at least every 5s while you keep working). Closing the tab
  with unsaved changes shows a confirmation prompt.
- When signed in, a background worker (`lib/sync/`) pushes and pulls attempts, progress and saved
  solutions to Supabase so they follow you across devices. Sandboxes stay local to the browser.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack). |
| `pnpm build` / `pnpm start` | Production build (validates content first) and serve. |
| `pnpm test` | Unit tests (Vitest). |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit`. |
| `pnpm format` / `pnpm format:check` | Prettier. |
| `pnpm validate:content` | Checks every problem, test and solution file against its schema. |
| `pnpm db:generate` / `pnpm db:migrate` | Generate / apply Drizzle migrations. |

## Project layout

```
app/          Next.js routes: problems, sandbox, learn, history, progress, settings, API
components/   UI: canvas, workspace stages, review, solutions, sandbox, ...
content/
  problems/   <id>/problem.json, hints.json, tests.json, solutions/*.md (+ .graph.json)
  concepts/   Learn pages (*.md, optional *.graph.json)
lib/          Catalog, lint, test engine, points, AI, persistence, sync, schemas (Zod)
store/        Zustand stores (attempt, workspace canvas, preferences)
db/           Drizzle schema and SQL migrations for Supabase
```

## Adding a problem

1. Create `content/problems/<id>/` with `problem.json`, `hints.json` and `tests.json`
   (copy an existing problem as a template).
2. Add one or more reference solutions in `solutions/` as Markdown, optionally with a
   `<name>.graph.json` exported from the canvas (Export JSON).
3. Run `pnpm validate:content`, then open the problem locally to check the tests pass
   against your reference graph.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui · React Flow ·
Zustand · Dexie · Zod · Supabase · Drizzle · Vitest
