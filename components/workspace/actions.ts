import type { Problem } from "@/lib/schema";
import { runAttemptTests } from "@/lib/tests/context";
import { isReadOnly, snapshotAttempt, useAttemptStore } from "@/store/attempt";

/** Runs the problem's tests against the current attempt and stores the result. */
export function runTestsNow(problem: Problem, { force = false } = {}) {
  const store = useAttemptStore.getState();
  if (isReadOnly(store.meta) && !force) return;
  const attempt = snapshotAttempt();
  if (attempt) store.setTestRun(runAttemptTests(problem, attempt));
}
