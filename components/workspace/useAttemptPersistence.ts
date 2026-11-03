"use client";

import { getAttempt, listAttempts, newAttempt, saveAttempt } from "@/lib/db/attempts";
import { useAuth } from "@/components/auth/useAuth";
import { db } from "@/lib/db/dexie";
import { acceptCloudDraft, attemptFromDraft, draftKey } from "@/lib/db/drafts";
import { forfeitsPoints } from "@/lib/db/mySolutions";
import type { LintProblem } from "@/lib/lint/context";
import type { SaveStatus } from "@/lib/persistence/autosaver";
import { usePersistence } from "@/lib/persistence/usePersistence";
import { waitForInitialSync } from "@/lib/sync/worker";
import { snapshotAttempt, useAttemptStore } from "@/store/attempt";
import { useWorkspaceStore } from "@/store/workspace";

/** `?attempt=` value that forces a fresh attempt. */
export const NEW_ATTEMPT = "new";

async function resolveAttempt(problemId: string, requested: string | null, userId?: string) {
  if (requested && requested !== NEW_ATTEMPT) {
    const a = await getAttempt(requested).catch(() => null);
    if (a && a.problemId === problemId) return { attempt: a, fresh: false };
  }
  if (requested !== NEW_ATTEMPT) {
    if (userId) {
      let row = await db().drafts.get(draftKey(userId, problemId));
      if (row?.remote && !row.dirty) row = await acceptCloudDraft(userId, problemId);
      if (row) {
        const linked = row.linkedAttemptId ? await getAttempt(row.linkedAttemptId) : null;
        const attempt = attemptFromDraft(row, linked);
        await db().transaction("rw", db().attempts, db().drafts, async () => {
          await db().attempts.put(attempt);
          await db().drafts.update(row!.id, { linkedAttemptId: attempt.id });
        });
        return { attempt, fresh: false };
      }
    }
    const latest = (await listAttempts(problemId)).find(
      (a) => a.status === "in_progress" && (!a.ownerUserId || a.ownerUserId === userId),
    );
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
  const auth = useAuth();
  const userId = auth.status === "signed-in" ? auth.user?.id : undefined;
  let loadedId: string | undefined;
  return usePersistence({
    key: `${problemId}:${requested ?? ""}:${auth.status === "loading" ? "loading" : (userId ?? "guest")}`,
    load: async (signal) => {
      if (auth.status === "loading") return;
      // Wait briefly for best progress before evaluating solution-peek penalties. History stays local.
      await waitForInitialSync();
      const { attempt, fresh } = await resolveAttempt(problemId, requested, userId);
      if (
        signal.aborted ||
        (useAuth.getState().status === "signed-in" ? useAuth.getState().user?.id : undefined) !==
          userId
      )
        return;
      attempt.ownerUserId ??= userId;
      loadedId = attempt.id;
      useAttemptStore.getState().load(attempt, { pristine: fresh, problem });
      if (!fresh && userId)
        await saveAttempt(
          attempt,
          userId,
          () =>
            !signal.aborted &&
            useAuth.getState().user?.id === userId &&
            useAttemptStore.getState().meta?.id === attempt.id,
        );
      if (signal.aborted) return;
      // Pin the URL to a saved attempt so a reload reopens it. A fresh one isn't in the DB
      // yet, so the URL just drops the param and a reload resumes the latest in-progress one.
      const url = new URL(window.location.href);
      if (fresh) url.searchParams.delete("attempt");
      else url.searchParams.set("attempt", attempt.id);
      window.history.replaceState(window.history.state, "", url);
    },
    snapshot: () => {
      const a = snapshotAttempt();
      return a?.id === loadedId && a?.problemId === problemId ? a : null;
    },
    save: (a) =>
      saveAttempt(
        a,
        userId,
        () =>
          useAuth.getState().user?.id === userId && useAttemptStore.getState().meta?.id === a.id,
      ),
    // Timer ticks alone don't trigger saves; elapsed time rides along with the next save/flush.
    changeKey: ({ elapsedMs: _elapsed, ...rest }) => rest,
    subscribe: [useAttemptStore.subscribe, useWorkspaceStore.subscribe],
  });
}
