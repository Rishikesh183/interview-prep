import { saveAttempt } from "@/lib/db/attempts";
import { forfeitsPoints } from "@/lib/db/mySolutions";
import { recordResult } from "@/lib/db/progress";
import { computePoints, type PointsBreakdown } from "@/lib/points";
import type { Problem } from "@/lib/schema";
import { runAttemptTests } from "@/lib/tests/context";
import { scoreTests } from "@/lib/tests/score";
import { isReadOnly, snapshotAttempt, useAttemptStore } from "@/store/attempt";

/** Runs the problem's tests against the current attempt and stores the result. */
export function runTestsNow(problem: Problem, { force = false } = {}) {
  const store = useAttemptStore.getState();
  if (isReadOnly(store.meta) && !force) return;
  const attempt = snapshotAttempt();
  if (attempt) store.setTestRun(runAttemptTests(problem, attempt));
}

/** Points the current attempt would earn if submitted now (from the last test run). */
export function pointsIfSubmitted(problem: Problem): PointsBreakdown | null {
  const meta = useAttemptStore.getState().meta;
  if (!meta?.testRun) return null;
  return computePoints({
    difficulty: problem.difficulty,
    ratio: scoreTests(problem.tests, meta.testRun.results).ratio,
    hintsUsed: meta.hintsRevealed,
    solutionViewedBeforeSubmit: meta.solutionViewedBeforeSubmit,
  });
}

/** Final test run → points → lock the attempt → fold into the best-so-far progress. */
export async function submitAttempt(problem: Problem): Promise<PointsBreakdown | null> {
  runTestsNow(problem);
  const attempt = snapshotAttempt();
  if (!attempt?.testRun || attempt.status !== "in_progress") return null;
  // The solutions page may have been opened (in another tab) since this attempt was loaded.
  const forfeit = await forfeitsPoints(attempt);
  const meta = useAttemptStore.getState().meta;
  if (!meta?.testRun || meta.status !== "in_progress" || meta.id !== attempt.id) return null;
  if (forfeit && !meta.solutionViewedBeforeSubmit) useAttemptStore.getState().unlockSolutions();
  const score = scoreTests(problem.tests, meta.testRun.results);
  const breakdown = pointsIfSubmitted(problem)!;
  useAttemptStore.getState().submit(breakdown.points);
  // Written now rather than by the debounced autosave: a submit must survive leaving the page.
  const submitted = snapshotAttempt();
  if (submitted) await saveAttempt(submitted);
  await recordResult({
    problemId: problem.id,
    points: breakdown.points,
    ratio: score.ratio,
    solved: score.solved,
    at: Date.now(),
  });
  return breakdown;
}
