# SysDesign Arena

Personal system-design practice app. Specs: `SPEC.md` (base) and `PHASE-2.md` (extends it and wins on conflicts). Read both before any work. Build order: SPEC Phase 0–1, then PHASE-2 §10 steps.

- Stack: Next.js 15 (App Router), TypeScript strict, @xyflow/react, Zustand (+zundo), Tailwind + shadcn/ui, zod, Dexie, @anthropic-ai/sdk, vitest.
- Package manager: pnpm. DB: Supabase (Mumbai) + Drizzle; local-first via Dexie sync.
- Static content (problems, tests, solutions, concepts) lives in `content/`, never in the DB. Concept cards are written in our own words; don't copy official docs.
- Build **one phase at a time** (SPEC §11). Meet that phase's acceptance criteria, run `pnpm typecheck && pnpm lint && pnpm test`, then stop and summarise.
- Types come only from zod schemas in `lib/schema`.
- The component catalog is data-driven (`lib/catalog/components.ts`).
- AI calls are server-side only, via route handlers. Never expose `ANTHROPIC_API_KEY`.