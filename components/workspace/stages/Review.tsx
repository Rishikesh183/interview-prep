"use client";

import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { highlightLater } from "@/components/canvas/useFocusOnCanvas";
import { AiReviewPanel } from "@/components/review/AiReviewPanel";
import { TestRunner } from "@/components/tests/TestRunner";
import type { Problem } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";
import { submitAttempt } from "../actions";
import { PointsCard } from "../PointsCard";
import { SolutionsGate } from "../SolutionsGate";
import { References } from "./References";
import { StageIntro } from "./StageIntro";

export function Review({ problem }: { problem: Problem }) {
  const meta = useAttemptStore((s) => s.meta);
  if (!meta) return null;

  const submitted = meta.status !== "in_progress";

  const onSubmit = async () => {
    const ok = window.confirm(
      "Submit this attempt? It becomes read-only, the tests run one last time and points are recorded. Start a new attempt to try again.",
    );
    if (!ok) return;
    const result = await submitAttempt(problem);
    if (result) toast.success(`Submitted: ${result.points} / ${result.base} points`);
  };

  return (
    <div className="space-y-8">
      <StageIntro
        title="Review"
        text="Tests check what your design achieves, not its exact shape. Any valid alternative passes."
      />

      <TestRunner
        problem={problem}
        onShow={(h) => {
          highlightLater(h);
          useAttemptStore.getState().setStage("design");
        }}
      />

      <PointsCard problem={problem} />

      {!submitted && (
        <section className="space-y-2 rounded-lg border border-dashed p-4">
          <h3 className="font-medium">Ready?</h3>
          <p className="text-muted-foreground text-sm">
            Submitting runs the tests one last time, records your points (only your best attempt
            counts), stops the timer and unlocks the solutions.
          </p>
          <Button onClick={() => void onSubmit()}>
            <Send /> Submit attempt
          </Button>
        </section>
      )}

      {submitted && <AiReviewPanel problem={problem} />}

      <SolutionsGate problem={problem}>
        <References problem={problem} />
      </SolutionsGate>
    </div>
  );
}
