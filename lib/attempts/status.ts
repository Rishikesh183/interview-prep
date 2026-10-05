import type { Attempt } from "@/lib/schema";

export type ProblemStatus = "todo" | "attempted" | "solved";

export function testScore(
  attempt: Pick<Attempt, "testRun">,
): { passed: number; total: number } | null {
  if (!attempt.testRun) return null;
  const { results } = attempt.testRun;
  return { passed: results.filter((r) => r.passed).length, total: results.length };
}

/** LeetCode-style: solved = a submitted attempt that passed every test. */
export function isSolved(attempt: Pick<Attempt, "status" | "testRun">): boolean {
  if (attempt.status === "in_progress") return false;
  const score = testScore(attempt);
  return score !== null && score.total > 0 && score.passed === score.total;
}

export function statusByProblem(attempts: Attempt[]): Map<string, ProblemStatus> {
  const out = new Map<string, ProblemStatus>();
  for (const a of attempts) {
    if (isSolved(a)) out.set(a.problemId, "solved");
    else if (!out.has(a.problemId)) out.set(a.problemId, "attempted");
  }
  return out;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
