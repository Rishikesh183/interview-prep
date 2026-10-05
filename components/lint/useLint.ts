"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { toGraph } from "@/lib/graph/convert";
import { runLint } from "@/lib/lint";
import { lintContext } from "@/lib/lint/context";
import type { LintIssue } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";
import { usePreferences } from "@/store/preferences";
import { useWorkspaceStore } from "@/store/workspace";

/** Lint results for whatever is loaded (sandbox canvas or an attempt), recomputed on change. */
export function useLint(): LintIssue[] {
  const { nodes, edges, apis } = useWorkspaceStore(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges, apis: s.apis })),
  );
  const { estimation, requirements, problem } = useAttemptStore(
    useShallow((s) => ({
      estimation: s.meta?.estimation,
      requirements: s.meta?.requirements,
      problem: s.problem,
    })),
  );
  const keyComponentHints = usePreferences((s) => s.keyComponentHints);

  return useMemo(
    () =>
      runLint(
        lintContext({
          graph: toGraph(nodes, edges),
          apis,
          estimation,
          requirements,
          problem,
          keyComponentHints,
        }),
      ),
    [nodes, edges, apis, estimation, requirements, problem, keyComponentHints],
  );
}
