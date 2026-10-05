import type { ApiEndpoint, Estimation, Graph, Problem, Requirements } from "@/lib/schema";
import type { LintContext } from "./rules";

export type LintProblem = Pick<Problem, "keyComponents" | "prompt">;

type Inputs = {
  graph: Graph;
  apis: ApiEndpoint[];
  /** Attempt parts, absent in the sandbox. */
  estimation?: Estimation;
  requirements?: Requirements;
  problem?: LintProblem | null;
  keyComponentHints?: boolean;
};

/** One place that decides what the linter sees, shared by the live drawer and saved attempts. */
export function lintContext(i: Inputs): LintContext {
  return {
    graph: i.graph,
    apis: i.apis,
    estimation: i.estimation,
    requirements: i.requirements,
    problem: i.problem ?? undefined,
    keyComponentHints: i.keyComponentHints ?? true,
  };
}
