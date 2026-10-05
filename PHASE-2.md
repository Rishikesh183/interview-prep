# SysDesign Arena — Phase 2 Spec (v2)

This extends `SPEC.md`. **Where the two conflict, this file wins.**
It replaces: SPEC §7 (AI review → now the 4-layer judging system), §8 persistence (→ Supabase + local-first sync), and §10 (→ 30 problems).
Build order: finish SPEC Phase 0–1 (setup + canvas), then do the steps in §10 below.

---

## 1. Data & storage

### Principle: local-first, small footprint
- **Static content lives in the repo**, not the DB: problems, tests, solutions, concept cards. It's served as static files, which is fast and free.
- **The DB holds user data only:** attempts, progress, reviews, own solutions.
- **The canvas never waits on the network.**
  - Edits go to IndexedDB (Dexie) immediately.
  - A sync worker pushes to Supabase with a 5s debounce, on submit, and on tab hide.
  - Conflicts: last-write-wins on `updated_at`.

### Supabase setup
- Region **ap-south-1 (Mumbai)**. Vercel functions run in **bom1**.
- Auth: Supabase Auth (GitHub OAuth + email magic link).
- **RLS on every table**: `user_id = auth.uid()`.
- Client: `@supabase/ssr`. Drizzle for migrations and typed queries.

### Compact graph format (what gets stored)
```ts
// stored shape — NOT React Flow's internal shape
type StoredGraph = {
  v: 1;
  n: { i: string; t: string; x: number; y: number; l?: string; c?: Record<string, unknown>; no?: string }[];
  //  id, type, pos, label (only if ≠ default), config (only keys ≠ default), note
  e: { i: string; s: string; d: string; p?: string; m?: 'a'; o?: 'r'|'w'|'rw'; a?: string; l?: string; no?: string }[];
  //  id, source, dest, protocol, mode ('a' = async; sync omitted), op, apiId, label, note
};
```
- `lib/graph/codec.ts` handles `toStored(rfGraph)` / `fromStored(stored)`. Defaults come from the catalog.
- Never persist `selected`, `measured`, `width`, `height`, `dragging`, or style fields.
- **`graph_hash`** = sha256 of the stored graph **with x/y removed** plus the APIs. Moving boxes around doesn't count as a change.

### Tables
```sql
create table attempts (
  id uuid primary key,
  user_id uuid not null references auth.users,
  problem_id text not null,
  status text not null check (status in ('in_progress','submitted')),
  started_at timestamptz not null, submitted_at timestamptz, duration_sec int,
  requirements jsonb, estimation jsonb, entities jsonb, apis jsonb, graph jsonb,
  graph_hash text,
  tests_passed int, tests_total int, hints_used int default 0,
  solution_viewed_before_submit boolean default false,
  points int,
  updated_at timestamptz not null default now()
);

create table reviews (               -- AI review cache
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  attempt_id uuid references attempts on delete cascade,
  graph_hash text not null,
  model text not null,
  overall int, level text,
  scores jsonb, issues jsonb, follow_ups jsonb,   -- no raw prompts/responses
  created_at timestamptz default now(),
  unique (user_id, graph_hash, model)
);

create table progress (              -- best result per problem (drives points/mastery)
  user_id uuid references auth.users,
  problem_id text,
  best_points int default 0,
  best_ratio real default 0,         -- tests_passed / tests_total
  solved_at timestamptz,
  primary key (user_id, problem_id)
);

create table my_solutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  problem_id text not null, title text,
  graph jsonb, apis jsonb, notes text,
  created_at timestamptz default now()
);

create table ai_usage (              -- daily budget
  user_id uuid references auth.users, day date,
  calls int default 0, input_tokens int default 0, output_tokens int default 0,
  primary key (user_id, day)
);
```
Expected size: about 5–10 KB per attempt, so 1,000 attempts is about 10 MB.

---

## 2. Judging — 4 layers

| Layer | What | Cost | Trigger |
|---|---|---|---|
| 1. Linter | Generic best-practice rules (SPEC §6) | Free | Live |
| 2. **Test cases** | Per-problem checks of what the design achieves | Free | "Run tests" button + on submit |
| 3. Self-review | Rubric checklist + compare with reference approaches | Free | After submit |
| 4. AI judge | Reasoning, trade-offs, follow-up questions | Paid | "Get AI review" only |

### Layer 2 — test-case engine (`lib/tests/`)
Tests check **properties**, so any valid architecture passes. Each problem has 6–10 tests in `content/problems/<id>/tests.json`.

```ts
type Check =
  | { hasNode: string | string[]; min?: number }                      // any of these types present (count ≥ min)
  | { nodeConfig: { type: string | '*'; where: Record<string, string | number | boolean> } } // string values = regex
  | { pathExists: { from: string[]; to: string[]; via?: string[]; mode?: 'sync' | 'async' } } // BFS over edges, via = must pass ≥1 of these types
  | { edgeExists: { from: string[]; to: string[]; mode?: 'sync' | 'async' } } // direct edge
  | { upstreamOf: { target: string; anyType: string[] } }             // every target node has a direct inbound edge from one of anyType
  | { apiMatch: { method?: string; path: string } }                   // path = regex
  | { textMentions: { pattern: string; in?: ('notes' | 'labels' | 'requirements' | 'apis')[] } } // regex, case-insensitive
  | { estimation: { field: string; min?: number; max?: number } }
  | { anyOf: Check[] } | { allOf: Check[] } | { not: Check };

type TestCase = {
  id: string;
  title: string;          // shown to user: "Short codes are unique"
  kind: 'core' | 'bonus'; // bonus doesn't affect pass/fail of "solved"
  weight: number;         // default 1
  check: Check;
  failHint: string;       // nudge, never the answer: "How do two servers avoid generating the same code?"
};
```
- **"Solved"** means all `core` tests pass.
- **Node type matching** uses catalog groups too: `"@database"` matches sql_db, nosql_kv, nosql_document and wide_column; `"@queue"` matches message_queue, event_stream and pub_sub. Define the groups in `lib/catalog/groups.ts`.
- `textMentions` lets you pass with a valid alternative that's explained in notes instead of drawn.
- Each check type gets vitest coverage. Every problem's reference solutions **must pass all of its core tests**, enforced by `scripts/validate-content.ts` in CI.

Example (`url-shortener/tests.json`, excerpt):
```json
[
  { "id": "unique-codes", "title": "Short codes are unique", "kind": "core", "weight": 2,
    "check": { "anyOf": [
      { "hasNode": "id_generator" },
      { "textMentions": { "pattern": "base62|counter|snowflake|hash.*collision", "in": ["notes","labels"] } } ] },
    "failHint": "How do two app servers avoid generating the same short code?" },
  { "id": "cached-redirects", "title": "Redirects are served from cache", "kind": "core", "weight": 2,
    "check": { "pathExists": { "from": ["web_client","mobile_client"], "via": ["cache","cdn"], "to": ["@database"] } },
    "failHint": "Reads outnumber writes 100:1. What absorbs that read traffic?" },
  { "id": "lb", "title": "App tier scales horizontally", "kind": "core", "weight": 1,
    "check": { "upstreamOf": { "target": "service", "anyType": ["load_balancer","api_gateway"] } },
    "failHint": "What spreads traffic across multiple service instances?" },
  { "id": "redirect-api", "title": "Redirect API defined", "kind": "core", "weight": 1,
    "check": { "apiMatch": { "method": "GET", "path": "\\{?(code|short|id)" } },
    "failHint": "What endpoint does the browser hit when someone opens a short link?" },
  { "id": "analytics-async", "title": "Click analytics don't slow redirects", "kind": "bonus", "weight": 1,
    "check": { "edgeExists": { "from": ["service"], "to": ["@queue"], "mode": "async" } },
    "failHint": "Should counting clicks block the redirect?" }
]
```

### Layer 3 — self-review
After submit, show the rubric (SPEC §7 dimensions) as a checklist the user ticks, plus side-by-side **Reference approaches** next to their design.

### Layer 4 — AI judge (budgeted)
- **Default model:** Haiku (`REVIEW_MODEL`). An optional "Deep review" button uses Sonnet (`DEEP_REVIEW_MODEL`).
- **Input:** compact text serialization (SPEC §7) + **Layer 1 and 2 results**. The prompt tells the AI to skip structural checks already covered there and focus on reasoning, trade-offs, bottlenecks under the problem's scale, and missed deep dives.
- **Prompt caching:** the system prompt + rubric + problem content form the cached prefix; the user's design comes after.
- **Cache hit:** if `reviews` has a row for `(user_id, graph_hash, model)`, return it without calling the API.
- **Limits:** 3 follow-up questions per attempt. The `DAILY_AI_CALLS` env (default 10) is enforced through `ai_usage`, and the UI shows calls remaining.
- Log token counts to `ai_usage`.
- **The AI score is a quality badge only**; it never feeds into points (it's non-deterministic and costs money).

---

## 3. Points, hints & solution gating

```
base       = { easy: 10, medium: 20, hard: 40 }
ratio      = weighted core+bonus tests passed / total weight
points     = round(base × ratio × max(0, 1 − 0.25 × hints_used))
if solution_viewed_before_submit → points = 0
progress.best_points = max(existing, points)   // only the best attempt counts; no farming
```
- **Hints:** each problem has 3–4, revealed one at a time with a confirm dialog ("−25% points").
- **Solutions:** locked until the first submit. An "Unlock anyway" option sets `solution_viewed_before_submit = true` for that attempt. The problem stays fully practicable for 0 points.

### Progress page (`/progress`)
- Total points, and solved count by difficulty.
- **Streak:** consecutive days with ≥1 submit (Asia/Kolkata day boundary).
- **Topic mastery:** for each tag, the average `best_ratio` across problems with that tag, shown as bars.
- **"Next up":** an unsolved problem from your weakest tag at the lowest difficulty.

**Leaderboard:** not in this phase. The `progress` table already supports it; add a `leaderboard` view and a public profile toggle if the app ever goes multi-user.

---

## 4. Learn — concept cards

- Location: `content/concepts/<slug>.md` with frontmatter `{ title, tags, components: [catalog types], related: [slugs] }`.
- **Each card has the same template:**
  1. What it is
  2. When to use it
  3. How it works (short, with a diagram via a static graph JSON rendered read-only)
  4. Trade-offs
  5. Interview one-liners
  6. Common follow-up questions
  7. Further reading (official doc links)
- **Written in our own words. Never paste text from official docs or blogs.**
- **Entry points:**
  - the `/learn` index
  - a "Learn" icon on each palette item → the card for that component
  - a "Prerequisites" line on each problem page

### 25 cards
| Slug | Slug | Slug |
|---|---|---|
| scalability-basics | load-balancing | caching-strategies |
| cdn | database-choice-sql-vs-nosql | indexing |
| replication | sharding-partitioning | consistent-hashing |
| cap-pacelc | consistency-models | message-queues-vs-streams |
| pub-sub | idempotency | rate-limiting-algorithms |
| id-generation | api-design-rest-grpc | websockets-realtime |
| object-storage-blobs | search-indexes | geo-indexing |
| distributed-locks-consensus | back-of-envelope-estimation | fault-tolerance-retries |
| observability | | |

---

## 5. Solutions page

- Route: `/problems/[id]/solutions`, locked per §3.
- Location: `content/problems/<id>/solutions/<slug>.md` + `<slug>.graph.json`.
- **2–3 approaches per problem** where real alternatives exist (e.g. news feed: fan-out-on-write vs fan-out-on-read vs hybrid).
- **Each approach includes:**
  - read-only canvas
  - walkthrough (requirements → estimation → data model → APIs → design)
  - trade-offs
  - what interviewers probe next
  - the tests it passes
- **"My solutions" tab:** the user can save any submitted design as a named solution and compare any two side by side.

---

## 6. Content layout
```
content/
  problems/<id>/
    problem.json        # SPEC §5 Problem minus `reference` (+ prerequisites: concept slugs)
    tests.json
    hints.json          # string[] in reveal order
    solutions/<slug>.md
    solutions/<slug>.graph.json
  concepts/<slug>.md
scripts/validate-content.ts   # zod-validates all content + runs every reference solution against its tests
```

---

## 7. The 30 problems

**Priority 1 (author fully first):** 1, 3, 7, 8, 10, 13, 15, 21, 22, 23.
The rest can ship as problem + tests + hints, with solutions added later.

| # | id | Title | Diff | Tags |
|---|---|---|---|---|
| 1 | url-shortener | URL Shortener | easy | id-generation, caching, read-heavy |
| 2 | pastebin | Pastebin | easy | object-storage, ttl, caching |
| 3 | rate-limiter | Rate Limiter | easy | rate-limiting, redis, distributed-counters |
| 4 | unique-id-generator | Unique ID Generator | easy | id-generation, clocks |
| 5 | distributed-cache | Distributed Cache | easy | consistent-hashing, eviction, replication |
| 6 | leaderboard | Gaming Leaderboard | easy | redis-sorted-sets, sharding |
| 7 | chat-app | Chat App (WhatsApp) | medium | websockets, pub-sub, ordering, offline-delivery |
| 8 | news-feed | News Feed (Twitter) | medium | fan-out, caching, celebrity-problem |
| 9 | instagram | Photo Sharing (Instagram) | medium | object-storage, cdn, feed |
| 10 | notification-system | Notification System | medium | queues, retries, dlq, idempotency |
| 11 | typeahead | Typeahead / Autocomplete | medium | trie, top-k, caching |
| 12 | web-crawler | Web Crawler | medium | url-frontier, dedup, politeness |
| 13 | file-storage | Dropbox / Google Drive | medium | chunking, presigned-urls, sync |
| 14 | proximity-service | Proximity Service (Yelp) | medium | geo-indexing, read-heavy |
| 15 | ticket-booking | Ticket Booking (BookMyShow) | medium | locking, concurrency, idempotency |
| 16 | hotel-booking | Hotel Booking (Airbnb) | medium | inventory, reservations, search |
| 17 | online-judge | Online Judge (LeetCode) | medium | sandboxing, queues, workers |
| 18 | job-scheduler | Distributed Job Scheduler | medium | leader-election, retries, cron |
| 19 | flash-sale | E-commerce Flash Sale | medium | inventory-contention, queue-buffering |
| 20 | metrics-monitoring | Metrics & Monitoring | medium | time-series, aggregation, alerting |
| 21 | video-streaming | YouTube / Netflix | hard | transcoding, cdn, adaptive-bitrate |
| 22 | ride-sharing | Uber / Ola | hard | geo-indexing, high-write, matching |
| 23 | payment-system | Payment System / Wallet | hard | idempotency, ledger, reconciliation |
| 24 | collaborative-editor | Google Docs | hard | ot-crdt, websockets, consistency |
| 25 | distributed-kv-store | Distributed KV Store | hard | quorum, replication, gossip |
| 26 | distributed-message-queue | Message Queue (Kafka) | hard | partitions, offsets, replication |
| 27 | ad-click-aggregator | Ad Click Aggregator | hard | stream-processing, exactly-once |
| 28 | top-k-trending | Top-K Trending | hard | heavy-hitters, count-min-sketch |
| 29 | video-conferencing | Video Conferencing (Zoom) | hard | webrtc, sfu, realtime |
| 30 | llm-chat-service | LLM Chat Service (ChatGPT) | hard | token-streaming, gpu-queueing, rate-limiting |

**Each problem needs:**
- realistic `scale` numbers
- 3–4 hints
- 6–10 tests (≥4 core)
- `prerequisites` (concept slugs)
- `deepDives`

---

## 8. New / changed routes
```
/                              problem list (+ solved/points/status columns, tag filter)
/problems/[id]                 workspace (+ Run tests, Hints, Submit, AI review)
/problems/[id]/solutions       reference approaches + my solutions (gated)
/learn, /learn/[slug]          concept cards
/progress                      points, streak, mastery, next-up
/settings                      AI model, daily budget display, account
/api/review, /api/followup     server-only; enforce budget + cache
```

---

## 9. Env
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only (budget writes)
ANTHROPIC_API_KEY=
REVIEW_MODEL=                   # Haiku-class
DEEP_REVIEW_MODEL=              # Sonnet-class
DAILY_AI_CALLS=10
```

---

## 10. Build steps (after SPEC Phase 0–1)

| Step | Scope | Done when |
|---|---|---|
| **2.1 Codec + Supabase** | Compact codec + graph_hash, Supabase project/migrations/RLS, auth, Dexie↔Supabase sync worker | Edit on laptop → refresh on phone after login → same design. Moving nodes doesn't change graph_hash. |
| **2.2 Content pipeline** | Content folder, zod schemas, `validate-content.ts`, problem list + workspace stages (SPEC Phase 2) using content files | `pnpm validate:content` passes; the 10 priority problems load. |
| **2.3 Test engine** | All `Check` types + catalog groups + vitest; Run tests UI (pass/fail list, failHints, highlight related nodes) | Every check type has passing and failing tests; every reference solution passes its own core tests. |
| **2.4 Linter** | SPEC §6 rules (SPEC Phase 3) | As in SPEC. |
| **2.5 Points & gating** | Hints with penalty, submit flow, points formula, solution lock/unlock, `progress` updates | Viewing a solution before submit → 0 points; a resubmit with a lower score never reduces best_points. |
| **2.6 Solutions + Learn** | Solutions page (read-only canvas, approaches, my solutions, compare), `/learn` + 25 cards, palette "Learn" links, problem prerequisites | Every palette item links to a card. |
| **2.7 AI judge** | Serializer, cached-prefix prompt, `/api/review` + `/api/followup`, review cache by hash, daily budget, Deep review | A second review of an unchanged design makes 0 API calls; the 11th call of the day is refused with a clear message. |
| **2.8 Progress** | `/progress`: points, streak (IST), mastery bars, next-up | Shows correct numbers for seeded test data. |
| **2.9 Content fill** | Remaining 20 problems (problem + tests + hints) | `validate:content` passes for all 30. |
