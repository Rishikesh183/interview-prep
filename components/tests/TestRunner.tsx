"use client";

import { CheckCircle2, Crosshair, FlaskConical, Trophy, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { runTestsNow } from "@/components/workspace/actions";
import type { Problem } from "@/lib/schema";
import { designContext } from "@/lib/tests/context";
import { explainCheck } from "@/lib/tests/engine";
import { scoreTests } from "@/lib/tests/score";
import { cn } from "@/lib/utils";
import { snapshotAttempt, useAttemptStore } from "@/store/attempt";
import type { Highlight } from "@/store/workspace";

type Props = {
  problem: Problem;
  /** Called with the nodes/edges a test is about, to highlight them on the canvas. */
  onShow: (h: Highlight) => void;
  compact?: boolean;
};

/** Run tests, see core/bonus results with fail hints, and jump to the nodes each test is about. */
export function TestRunner({ problem, onShow, compact = false }: Props) {
  const testRun = useAttemptStore((s) => s.meta?.testRun);
  const submitted = useAttemptStore((s) => s.meta?.status !== "in_progress");
  const [showHints, setShowHints] = useState(true);
  const [active, setActive] = useState<string | null>(null);

  const results = new Map(testRun?.results.map((r) => [r.id, r.passed]));
  const score = testRun ? scoreTests(problem.tests, testRun.results) : null;

  const show = (testId: string) => {
    const attempt = snapshotAttempt();
    const test = problem.tests.find((t) => t.id === testId);
    if (!attempt || !test) return;
    // Evidence is computed against the current design, so it's never stale.
    const { nodeIds, edgeIds } = explainCheck(test.check, designContext(attempt));
    setActive(testId);
    if (!nodeIds.length && !edgeIds.length) {
      toast.info("This test is about your APIs, notes or estimation, not specific canvas nodes.");
      return;
    }
    onShow({ nodeIds, edgeIds });
  };

  return (
    <section className={cn("space-y-3", compact && "text-sm")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          size={compact ? "sm" : "default"}
          onClick={() => runTestsNow(problem)}
          disabled={submitted}
        >
          <FlaskConical /> Run tests
        </Button>
        {score && (
          <span className="flex items-center gap-2 text-sm tabular-nums">
            <span className={score.solved ? "font-medium text-emerald-600" : "text-amber-600"}>
              Core {score.corePassed}/{score.coreTotal}
            </span>
            {score.bonusTotal > 0 && (
              <span className="text-muted-foreground">
                · Bonus {score.bonusPassed}/{score.bonusTotal}
              </span>
            )}
            <span className="text-muted-foreground">· {Math.round(score.ratio * 100)}%</span>
            {score.solved && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Trophy className="size-3" /> Solved
              </span>
            )}
          </span>
        )}
        {!compact && testRun && (
          <span className="text-muted-foreground text-xs">
            last run {new Date(testRun.ranAt).toLocaleTimeString()}
          </span>
        )}
        <label className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
          <Switch checked={showHints} onCheckedChange={setShowHints} />
          Hints
        </label>
      </div>

      <ul className="divide-y rounded-lg border">
        {problem.tests.map((t) => {
          const passed = results.get(t.id);
          return (
            <li
              key={t.id}
              className={cn("flex gap-3 px-3 py-2.5", active === t.id && "bg-amber-500/10")}
            >
              {passed === undefined ? (
                <span className="border-muted-foreground/40 mt-0.5 size-4 shrink-0 rounded-full border" />
              ) : passed ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-label="Passed"
                />
              ) : (
                <XCircle className="text-destructive mt-0.5 size-4 shrink-0" aria-label="Failed" />
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  {t.title}
                  {t.kind === "bonus" && (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 text-[10px] uppercase">
                      bonus
                    </span>
                  )}
                </div>
                {passed === false && showHints && (
                  <div className="text-muted-foreground text-xs">{t.failHint}</div>
                )}
              </div>
              {passed !== undefined && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => show(t.id)}
                  aria-label={`Show "${t.title}" on the canvas`}
                  title={passed ? "Show what satisfies this" : "Show the related nodes"}
                >
                  <Crosshair />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
