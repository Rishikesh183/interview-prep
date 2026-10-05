import type { Attempt, Problem, TestRun } from "@/lib/schema";
import { runTests, type DesignContext } from "./engine";

/** What the tests see from an attempt: the design plus the user's written reasoning. */
export function designContext(attempt: Attempt): DesignContext {
  const r = attempt.requirements;
  return {
    graph: attempt.graph,
    apis: attempt.apis,
    entities: attempt.entities,
    extraText: [
      ...r.functional,
      ...r.nonFunctional,
      ...r.outOfScope,
      ...r.questions,
      attempt.estimation.notes,
    ],
  };
}

export function runAttemptTests(problem: Problem, attempt: Attempt, now = Date.now()): TestRun {
  return { ranAt: now, results: runTests(problem.tests, designContext(attempt)) };
}
