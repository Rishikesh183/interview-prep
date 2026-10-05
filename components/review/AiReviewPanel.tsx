"use client";

import { Brain, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestReview, type ReviewTier } from "@/lib/ai/client";
import { designHash } from "@/lib/ai/serialize";
import { refreshAiUsage, useAiUsage } from "@/lib/ai/useAiUsage";
import type { Problem } from "@/lib/schema";
import { snapshotAttempt, useAttemptStore } from "@/store/attempt";
import { FollowUpChat } from "./FollowUpChat";
import { IssueList } from "./IssueList";
import { ScoreCard } from "./ScoreCard";

/** AI interviewer review (after submit): scores, issues, follow-up questions. A badge only: never points. */
export function AiReviewPanel({ problem }: { problem: Problem }) {
  const review = useAttemptStore((s) => s.meta?.review);
  const followUps = useAttemptStore((s) => s.meta?.followUps);
  const usage = useAiUsage();
  const [busy, setBusy] = useState<ReviewTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attempt = snapshotAttempt();
  // Submitted designs are frozen, so a saved review normally stays current. This is a safety net.
  const current = review && attempt && review.designHash === designHash(attempt);
  const has = (tier: ReviewTier) => Boolean(current && review?.tier === tier);

  const run = async (tier: ReviewTier) => {
    const snapshot = snapshotAttempt();
    if (!snapshot) return;
    // Already reviewed this exact design at this tier: nothing to ask the server.
    if (has(tier)) return;
    setBusy(tier);
    setError(null);
    try {
      useAttemptStore.getState().setReview(await requestReview(problem.id, snapshot, tier));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setBusy(null);
      void refreshAiUsage();
    }
  };

  const needsSignIn = usage?.signInRequired && !usage.signedIn;
  const outOfCalls = usage?.enforced && usage.signedIn && usage.remaining <= 0;
  const deepModel = usage?.models.deep;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold">AI interviewer review</h3>
        {!has("standard") && !has("deep") && (
          <Button
            onClick={() => void run("standard")}
            disabled={busy !== null || needsSignIn}
            variant={review ? "outline" : "default"}
            size="sm"
          >
            {busy === "standard" ? (
              <Loader2 className="animate-spin" />
            ) : review ? (
              <RefreshCw />
            ) : (
              <Sparkles />
            )}
            {review ? "Re-run review" : "Get AI review"}
          </Button>
        )}
        {deepModel && !has("deep") && (
          <Button
            onClick={() => void run("deep")}
            disabled={busy !== null || needsSignIn}
            variant="outline"
            size="sm"
            title={`Uses ${deepModel}`}
          >
            {busy === "deep" ? <Loader2 className="animate-spin" /> : <Brain />}
            Deep review
          </Button>
        )}
        {busy && (
          <span className="text-muted-foreground text-xs">
            Free models can take 30–90 seconds...
          </span>
        )}
        {review && !current && !busy && (
          <span className="text-xs text-amber-600">Design changed since this review.</span>
        )}
        <UsageLine usage={usage} />
      </div>

      {needsSignIn && (
        <p className="text-muted-foreground text-sm">
          <Link
            href={`/login?next=${encodeURIComponent(`/problems/${problem.id}`)}`}
            className="text-primary hover:underline"
          >
            Sign in
          </Link>{" "}
          to use the AI review (it has a daily budget per account).
        </p>
      )}
      {outOfCalls && !error && (
        <p className="text-muted-foreground text-sm">
          No AI calls left today; the budget resets at midnight IST. Reviews already saved still
          show here.
        </p>
      )}
      {error && (
        <p className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
          {error}
        </p>
      )}

      {review && (
        <>
          <ScoreCard review={review} followUps={followUps ?? []} />
          <p className="text-muted-foreground text-xs">
            {review.tier === "deep" ? "Deep review" : "Review"} by {review.model}
            {review.cached ? " · from cache (no AI call)" : ""} · a quality badge only; it never
            changes your points.
          </p>
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

function UsageLine({ usage }: { usage: ReturnType<typeof useAiUsage> }) {
  if (!usage?.enforced || !usage.signedIn) return null;
  return (
    <span className="text-muted-foreground ml-auto text-xs tabular-nums">
      {usage.remaining} of {usage.limit} AI calls left today
    </span>
  );
}
