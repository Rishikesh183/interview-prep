"use client";

import { CheckCircle2, FlaskConical, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { testScore } from "@/lib/attempts/status";
import type { Problem } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useAttemptStore } from "@/store/attempt";
import { AiReviewPanel } from "@/components/review/AiReviewPanel";
import { runTestsNow } from "../actions";
import { References } from "./References";
import { StageIntro } from "./StageIntro";

export function Review({ problem }: { problem: Problem }) {
  const meta = useAttemptStore((s) => s.meta);
  const submit = useAttemptStore((s) => s.submit);
  const [showHints, setShowHints] = useState(true);
  if (!meta) return null;

  const submitted = meta.status !== "in_progress";
  const results = new Map(meta.testRun?.results.map((r) => [r.id, r.passed]));
  const score = testScore(meta);

  const onSubmit = () => {
    const ok = window.confirm(
      "Submit this attempt? It becomes read-only and the reference material unlocks. Start a new attempt to try again.",
    );
    if (!ok) return;
    runTestsNow(problem);
    submit();
  };

  return (
    <div className="space-y-8">
      <StageIntro
        title="Review"
        text="Tests check what your design achieves, not its exact shape. Any valid alternative passes."
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => runTestsNow(problem)} disabled={submitted}>
            <FlaskConical /> Run tests
          </Button>
          {score && (
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                score.passed === score.total ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {score.passed}/{score.total} passed
            </span>
          )}
          {meta.testRun && (
            <span className="text-muted-foreground text-xs">
              last run {new Date(meta.testRun.ranAt).toLocaleTimeString()}
            </span>
          )}
          <label className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
            <Switch checked={showHints} onCheckedChange={setShowHints} />
            Hints for failed tests
          </label>
        </div>

        <ul className="divide-y rounded-lg border">
          {problem.tests.map((t) => {
            const passed = results.get(t.id);
            return (
              <li key={t.id} className="flex gap-3 px-3 py-2.5 text-sm">
                {passed === undefined ? (
                  <span className="border-muted-foreground/40 mt-0.5 size-4 shrink-0 rounded-full border" />
                ) : passed ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    aria-label="Passed"
                  />
                ) : (
                  <XCircle
                    className="text-destructive mt-0.5 size-4 shrink-0"
                    aria-label="Failed"
                  />
                )}
                <div className="space-y-0.5">
                  <div>{t.desc}</div>
                  {passed === false && showHints && t.hint && (
                    <div className="text-muted-foreground text-xs">{t.hint}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {!submitted ? (
        <section className="space-y-2 rounded-lg border border-dashed p-4">
          <h3 className="font-medium">Ready?</h3>
          <p className="text-muted-foreground text-sm">
            Submitting runs the tests one last time, stops the timer and unlocks the reference
            requirements and approaches.
          </p>
          <Button onClick={onSubmit}>
            <Send /> Submit attempt
          </Button>
        </section>
      ) : (
        <>
          <AiReviewPanel problem={problem} />
          <References problem={problem} />
        </>
      )}
    </div>
  );
}
