"use client";

import { Loader2, LogIn, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
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
  const auth = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const meta = useAttemptStore((s) => s.meta);
  if (!meta) return null;

  const submitted = meta.status !== "in_progress";

  const onSubmit = async () => {
    if (submitting || auth.status !== "signed-in" || !auth.user) return;
    const ok = window.confirm(
      "Submit this attempt? It becomes read-only, the tests run one last time and points are recorded. Start a new attempt to try again.",
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt(problem);
      if (result) toast.success(`Submitted: ${result.points} / ${result.base} points`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <StageIntro
        title="Review"
        text={
          problem.track === "frontend"
            ? "Checks inspect your diagram, contracts and written reasoning. They do not run a UI or measure performance and accessibility; explain and validate those separately."
            : "Tests check what your design achieves, not its exact shape. Any valid alternative passes."
        }
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
          {auth.status === "signed-in" && auth.user ? (
            <Button disabled={submitting} onClick={() => void onSubmit()}>
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}{" "}
              {submitting ? "Submitting…" : "Submit attempt"}
            </Button>
          ) : auth.status === "loading" ? (
            <Button disabled>
              <Loader2 className="animate-spin" /> Checking sign-in…
            </Button>
          ) : auth.status === "disabled" ? (
            <p className="text-muted-foreground text-sm">
              Sign-in is not configured for this deployment. You can practise and run tests, but
              submitting requires an account.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Sign in to submit and record your best progress. Your draft stays saved in this
                browser.
              </p>
              <Button asChild>
                <Link
                  href={`/login?next=${encodeURIComponent(`/problems/${problem.id}?attempt=${meta.id}`)}`}
                >
                  <LogIn /> Sign in to submit
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {submitted && <AiReviewPanel problem={problem} />}

      <SolutionsGate problem={problem}>
        <References problem={problem} />
      </SolutionsGate>
    </div>
  );
}
