import type { TestCase, TestResult } from "@/lib/schema";

export type TestScore = {
  corePassed: number;
  coreTotal: number;
  bonusPassed: number;
  bonusTotal: number;
  /** Weighted core + bonus passed ÷ total weight (PHASE-2 §3), 0–1. */
  ratio: number;
  /** All core tests pass. */
  solved: boolean;
};

/** Summarises a test run against the problem's tests (weights and kinds come from the content). */
export function scoreTests(tests: TestCase[], results: TestResult[]): TestScore {
  const passed = new Map(results.map((r) => [r.id, r.passed]));
  const core = tests.filter((t) => t.kind === "core");
  const bonus = tests.filter((t) => t.kind === "bonus");
  const count = (xs: TestCase[]) => xs.filter((t) => passed.get(t.id)).length;
  const totalWeight = tests.reduce((s, t) => s + t.weight, 0);
  const passedWeight = tests.reduce((s, t) => s + (passed.get(t.id) ? t.weight : 0), 0);
  const corePassed = count(core);
  return {
    corePassed,
    coreTotal: core.length,
    bonusPassed: count(bonus),
    bonusTotal: bonus.length,
    ratio: totalWeight ? passedWeight / totalWeight : 0,
    solved: core.length > 0 && corePassed === core.length,
  };
}
