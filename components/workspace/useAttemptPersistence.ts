"use client";

import { getAttempt, latestInProgress, newAttempt, saveAttempt } from "@/lib/db/attempts";
import { forfeitsPoints } from "@/lib/db/mySolutions";
import type { LintProblem } from "@/lib/lint/context";
import type { SaveStatus } from "@/lib/persistence/autosaver";
import { usePersistence } from "@/lib/persistence/usePersistence";
import { waitForInitialSync } from "@/lib/sync/worker";
import { snapshotAttempt, useAttemptStore } from "@/store/attempt";
import { useWorkspaceStore } from "@/store/workspace";

/** `?attempt=` value that forces a fresh attempt. */
export const NEW_ATTEMPT = "new";

async function resolveAttempt(problemId: string, requested: string | null) {
  if (requested && requested !== NEW_ATTEMPT) {
    const a = await getAttempt(requested).catch(() => null);
    if (a && a.problemId === problemId) return { attempt: a, fresh: false };
  }
  if (requested !== NEW_ATTEMPT) {
    const latest = await latestInProgress(problemId).catch(() => null);
    if (latest) return { attempt: latest, fresh: false };
  }
  const attempt = newAttempt(problemId);
  // Solutions peeked at before this problem was ever submitted: a new attempt scores 0 too.
  attempt.solutionViewedBeforeSubmit = await forfeitsPoints(attempt).catch(() => false);
  return { attempt, fresh: true };
}

/**
 * `requested` must be read once (not from a live search-params hook): this hook rewrites the
 * URL itself. Loads (or creates) the attempt and autosaves it. A brand-new attempt is only written
 * once the user changes something, so merely opening a problem doesn't create history.
 */
export function useAttemptPersistence(
  problem: LintProblem & { id: string },
  requested: string | null,
): SaveStatus {
  const problemId = problem.id;
  return usePersistence({
    key: `${problemId}:${requested ?? ""}`,
    load: async () => {
      // Signed in on a fresh device: let the first pull land so we open the synced attempt.
      await waitForInitialSync();
      const { attempt, fresh } = await resolveAttempt(problemId, requested);
      useAttemptStore.getState().load(attempt, { pristine: fresh, problem });
      // Pin the URL to a saved attempt so a reload reopens it. A fresh one isn't in the DB
      // yet, so the URL just drops the param and a reload resumes the latest in-progress one.
      const url = new URL(window.location.href);
      if (fresh) url.searchParams.delete("attempt");
      else url.searchParams.set("attempt", attempt.id);
      window.history.replaceState(window.history.state, "", url);
    },
    snapshot: snapshotAttempt,
    save: saveAttempt,
    // Timer ticks alone don't trigger saves; elapsed time rides along with the next save/flush.
    changeKey: ({ elapsedMs: _elapsed, ...rest }) => rest,
    subscribe: [useAttemptStore.subscribe, useWorkspaceStore.subscribe],
  });
}
