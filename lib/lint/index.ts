import { indexGraph } from "@/lib/graph/analysis";
import type { LintIssue, LintSeverity } from "@/lib/schema";
import { RULES, type LintContext } from "./rules";

export type { LintContext };
export { RULES };

const ORDER: Record<LintSeverity, number> = { error: 0, warn: 1, info: 2 };

/** Runs every rule; issues sorted by severity. Pure and cheap enough to run on every change. */
export function runLint(ctx: LintContext): LintIssue[] {
  const ix = indexGraph(ctx.graph);
  return RULES.flatMap((rule) => rule.check(ix, ctx)).sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity],
  );
}

export function countBySeverity(issues: LintIssue[]): Record<LintSeverity, number> {
  const counts = { error: 0, warn: 0, info: 0 };
  for (const i of issues) counts[i.severity]++;
  return counts;
}
