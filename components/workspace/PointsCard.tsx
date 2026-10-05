"use client";

import { Award, Lightbulb, LockOpen } from "lucide-react";
import { useProgress } from "@/components/problems/useProgress";
import { computePoints, HINT_PENALTY } from "@/lib/points";
import type { Problem } from "@/lib/schema";
import { scoreTests } from "@/lib/tests/score";
import { cn } from "@/lib/utils";
import { useAttemptStore } from "@/store/attempt";

/**
 * Before submit: what you'd earn now. After: what you earned and your best for this problem.
 * points = base × weighted tests × hint multiplier (0 if a solution was unlocked first).
 */
export function PointsCard({ problem }: { problem: Problem }) {
  const meta = useAttemptStore((s) => s.meta);
  const best = useProgress()?.get(problem.id);
  if (!meta) return null;

  const submitted = meta.status !== "in_progress";
  const ratio = meta.testRun ? scoreTests(problem.tests, meta.testRun.results).ratio : 0;
  const b = computePoints({
    difficulty: problem.difficulty,
    ratio,
    hintsUsed: meta.hintsRevealed,
    solutionViewedBeforeSubmit: meta.solutionViewedBeforeSubmit,
  });
  const points = submitted ? (meta.points ?? b.points) : b.points;

  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Award className={cn("size-8", submitted ? "text-amber-500" : "text-muted-foreground")} />
        <div>
          <div className="text-2xl font-semibold tabular-nums">
            {points}
            <span className="text-muted-foreground text-sm font-normal"> / {b.base} points</span>
          </div>
          <div className="text-muted-foreground text-xs">
            {submitted
              ? "Earned by this attempt"
              : meta.testRun
                ? "If you submit now"
                : "Run tests to see your points"}
          </div>
        </div>
      </div>

      <div className="text-muted-foreground space-y-0.5 text-xs">
        <div>
          {b.base} base ({problem.difficulty}) × {Math.round(ratio * 100)}% tests
          {meta.hintsRevealed > 0 && ` × ${Math.round(b.hintMultiplier * 100)}% hints`}
        </div>
        {meta.hintsRevealed > 0 && (
          <div className="flex items-center gap-1">
            <Lightbulb className="size-3" /> {meta.hintsRevealed} hint
            {meta.hintsRevealed === 1 ? "" : "s"} used (−{Math.round(HINT_PENALTY * 100)}% each)
          </div>
        )}
        {b.forfeited && (
          <div className="text-destructive flex items-center gap-1">
            <LockOpen className="size-3" /> Solutions were unlocked before submitting: this attempt
            scores 0.
          </div>
        )}
      </div>

      <div className="ml-auto text-right text-xs">
        <div className="text-muted-foreground">Your best on this problem</div>
        <div className="text-base font-medium tabular-nums">
          {best?.bestPoints ?? 0} / {b.base}
        </div>
      </div>
    </section>
  );
}
