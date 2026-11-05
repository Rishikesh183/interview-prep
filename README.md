# SysDesign Arena

A practice app for system design interviews with 30 backend problems and a focused supplement
of 15 frontend problems. Work through a question stage by stage, draw the architecture, and get
instant feedback from built-in tests, lint rules and an optional AI reviewer.

Practice and history run locally in the browser. Sign-in is required to submit and enables
cross-device sync of your latest HLD per question; full history stays on the device.

## Features

- **Guided workspace** — each problem walks through six stages: Requirements → Estimation → Data
  Model → APIs → Design → Review, with a timer and optional hints. Frontend adapts these to
  Requirements & UX → Performance → State Model → Contracts → Architecture → Review.
- **Frontend supplement** — 15 original exercises covering autocomplete, feeds, search, checkout,
  chat, uploads and deeper browser topics. Six recommended starting points keep preparation
  focused. See [selection, sources and study order](docs/FRONTEND-TRACK.md).
- **Architecture canvas** — drag components (clients, gateways, services, caches, databases,
  queues, ...) onto a [React Flow](https://reactflow.dev) canvas, connect them with protocol edges,
  configure each one, undo/redo, and export as PNG or JSON.
- **Canvas starters and replacement** — explicit Microservice and combined gateway/load-balancer
  components, three-client and distributed-rate-limiter starters, and connection-preserving
  component replacement with protocol/ownership previews and complete undo.
- **Configurable microservice groups** — choose 1–20 services in a starter, or change a gateway,
  limiter or service's connected service count later. New services get editable nodes, routes
  and API scaffolds; shrinking previews removals and supports complete undo.
- **Live lint** — rules flag common design smells as you draw: a client talking to a database,
  a single DB with no HA, a read-heavy path with no cache, a queue with no consumer, and more
  (`lib/lint/rules.ts`).
- **Problem tests and points** — each problem ships declarative checks (`tests.json`). Submitting
  scores `base × pass ratio × hint penalty`; viewing a reference solution before submitting
  forfeits the points.
- **Reference solutions** — 76 guided approaches with state ownership, contracts, incremental
  HLD construction, highlighted flows and final diagrams you can inspect and compare.
  Viewing or unlocking references requires sign-in; answer content is served through a verified,
  private endpoint rather than embedded in public practice pages.
- **AI review (optional)** — a rubric-based review of your design plus a few follow-up questions,
  via any [OpenRouter](https://openrouter.ai) model (free models work).
- **Learn** — 37 concept pages covering backend foundations, interview patterns and frontend
  state, performance and recovery, linked from the problems and palette.
- **Sandbox** — a free-form canvas with up to 5 named tabs for practice outside a problem.
- **History and progress** — attempts stay in local IndexedDB; the progress page summarises
  points and solved problems. Cloud sync stores one latest editable HLD per question, compact best
  progress and explicitly saved solutions. Concurrent draft edits require a choice, keeping both
  versions recoverable. See [cloud draft setup and migration](docs/CLOUD-DRAFTS-AND-CANVAS.md).
- **All-time leaderboard** — signed-in users compare total best points across both tracks.
  Ties share a rank; retakes count once. Rankings reuse synced progress, while history stays local.
  See [leaderboard storage and access](docs/LEADERBOARD.md).

## Quick start

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Without environment variables you can practise locally and run
design checks. Submission requires configured sign-in; AI review requires its configuration.

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. Every group is optional.

| Variable                                                    | Purpose                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `OPENROUTER_API_KEY`                                        | Enables AI review. Get one at https://openrouter.ai/keys.         |
| `REVIEW_MODEL`                                              | Model for standard reviews (default is a free model).             |
| `REVIEW_FALLBACK_MODELS`                                    | Comma-separated models tried if the main one is rate-limited.     |
| `DEEP_REVIEW_MODEL`                                         | Optional stronger model for the "Deep review" button.             |
| `REVIEW_REASONING_EFFORT`                                   | `low` (default), `medium`, `high` or `none`.                      |
| `DAILY_AI_CALLS`                                            | AI calls per user per day (default 10).                           |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enables sign-in and sync.                                         |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Server-only; needed to enforce the AI budget when Supabase is on. |
| `DATABASE_URL`                                              | Only for `pnpm db:migrate`.                                       |

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
- When signed in, a background worker (`lib/sync/`) pushes and pulls current HLD drafts, progress and saved
  solutions to Supabase so they follow you across devices. Sandboxes stay local to the browser.

## Scripts

| Command                                | What it does                                                     |
| -------------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                             | Dev server (Turbopack).                                          |
| `pnpm build` / `pnpm start`            | Production build (validates content first) and serve.            |
| `pnpm test`                            | Unit tests (Vitest).                                             |
| `pnpm lint` / `pnpm typecheck`         | ESLint / `tsc --noEmit`.                                         |
| `pnpm format` / `pnpm format:check`    | Prettier.                                                        |
| `pnpm validate:content`                | Checks every problem, test and solution file against its schema. |
| `pnpm db:generate` / `pnpm db:migrate` | Generate / apply Drizzle migrations.                             |

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
