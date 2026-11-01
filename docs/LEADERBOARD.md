# All-time leaderboard

`/leaderboard` ranks signed-in users by the sum of their synced best points per question across both tracks. A retake improves the existing best-progress row; it never adds the same question twice. Equal point totals share a competition rank (1, 1, 3). Solved count, display name and user ID make ordering deterministic within a tie without breaking that tie.

The board includes accounts with synced submissions, including zero-point submissions. It returns the top 100 and the signed-in user's own rank even when they are outside that window. Maximum available points and eligible question IDs come from the current repository catalog; unknown problem IDs are ignored and each contribution is clamped to its difficulty's point cap. There are no daily/monthly resets or separate backend/frontend rankings.

## Storage and access

No new leaderboard, history or profile table is stored. `public.all_time_leaderboard(jsonb, uuid)` aggregates existing `public.progress` rows. Display names come from account metadata, with a neutral alias when no name is present or a name looks like an email address. Auth email addresses, attempt contents and per-question scores are not returned.

The SQL function uses a fixed query and empty search path. Execute is revoked from PUBLIC, anon and authenticated; only service_role can invoke it. Its definer privilege is needed to read the selected display-name metadata in auth.users. Existing own-row policies on progress stay intact. `/api/leaderboard` verifies the session with Supabase before calling the function with the server's catalog and verified viewer ID. Its aggregate response is private and never cached across users. No service credential reaches the browser.

Scores use the app's existing practice progress/scoring model. The leaderboard does not introduce a separate score-submission endpoint or an anti-cheat system. History remains local in IndexedDB. Refresh is manual and also follows completed progress syncs; there is no polling timer.

Migration: `db/migrations/0005_all_time_leaderboard.sql`, registered in the Drizzle migration journal. Apply through the existing database migration workflow with DATABASE_URL configured. The new function does not change the Drizzle table schema.

## Verification

- `pnpm test`: API authentication, trusted catalog/viewer selection, no-store responses, empty results and error handling.
- `node --env-file=.env scripts/check-leaderboard-db.mjs`: executes the migration's actual SQL against temporary tables/functions only. Checks best-retake preservation, caps, unknown questions, ties, safe aliases, an empty board and the current rank outside the top 100. It creates no public/auth fixtures.
- Verify installed RPC access using a server credential, and verify direct anonymous calls are rejected. Never print credentials or actual participant identities in check output.

## Scrollbar policy

Global CSS hides native scrollbars and custom ScrollArea thumbs. It does not change overflow behavior: wheel, trackpad, touch and keyboard scrolling remain available. Main navigation wraps into a separate row on mobile so the added leaderboard link remains reachable without squeezing the navigation between account controls.
