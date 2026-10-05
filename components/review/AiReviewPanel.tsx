"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestReview } from "@/lib/ai/client";
import { designHash } from "@/lib/ai/serialize";
import type { Problem } from "@/lib/schema";
import { snapshotAttempt, useAttemptStore } from "@/store/attempt";
import { FollowUpChat } from "./FollowUpChat";
import { IssueList } from "./IssueList";
import { ScoreCard } from "./ScoreCard";

/** AI interviewer review (after submit): scores, issues, follow-up questions. */
export function AiReviewPanel({ problem }: { problem: Problem }) {
  const review = useAttemptStore((s) => s.meta?.review);
  const followUps = useAttemptStore((s) => s.meta?.followUps);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const attempt = snapshotAttempt();
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      useAttemptStore.getState().setReview(await requestReview(problem.id, attempt));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  };

  const attempt = snapshotAttempt();
  // Submitted designs are frozen, so a saved review normally stays current. This is a safety net.
  const stale = review && attempt && review.designHash !== designHash(attempt);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold">AI interviewer review</h3>
        <Button
          onClick={() => void run()}
          disabled={busy}
          variant={review ? "outline" : "default"}
          size="sm"
        >
          {busy ? <Loader2 className="animate-spin" /> : review ? <RefreshCw /> : <Sparkles />}
          {review ? "Re-run review" : "Get AI review"}
        </Button>
        {busy && (
          <span className="text-muted-foreground text-xs">
            Free models can take 30–90 seconds...
          </span>
        )}
        {stale && !busy && (
          <span className="text-xs text-amber-600">Design changed since this review.</span>
        )}
      </div>
      {error && (
        <p className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
          {error}
        </p>
      )}

      {review && (
        <>
          <ScoreCard review={review} followUps={followUps ?? []} />
          <div className="space-y-2">
            <h4 className="font-medium">Issues</h4>
            <IssueList issues={review.issues} />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Follow-up questions</h4>
            <FollowUpChat problemId={problem.id} review={review} />
          </div>
        </>
      )}
    </section>
  );
}
