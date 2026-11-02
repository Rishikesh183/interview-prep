"use client";

import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHasSubmittedProblem } from "@/components/problems/useAttempts";
import { useAuth } from "@/components/auth/useAuth";
import { SolutionSignIn, SolutionLoading } from "@/components/solutions/SolutionAccessNotice";
import { useSolutionContent } from "@/components/solutions/useSolutionContent";
import { solutionAccess } from "@/lib/solutions/access";
import { unlockAttemptSolutions } from "@/lib/solutions/unlock";
import type { Problem } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";

/**
 * Solutions stay locked until the user has submitted this problem at least once
 * (PHASE-2 §3). "Unlock anyway" opens them now, and this attempt then scores 0.
 */
/** `undefined` while the attempt history is still loading (so the gate doesn't flash "locked"). */
export function useSolutionsUnlocked(problemId: string): boolean | undefined {
  const { status, user } = useAuth();
  const meta = useAttemptStore((s) => s.meta);
  const submittedBefore = useHasSubmittedProblem(problemId);
  const eligible =
    !meta || meta.problemId !== problemId
      ? false
      : meta.status !== "in_progress" || meta.solutionViewedBeforeSubmit
        ? true
        : submittedBefore;
  return solutionAccess(status, user?.id, eligible);
}

export function SolutionsGate({
  problem,
  children,
}: {
  problem: Problem;
  children: (problem: Problem) => React.ReactNode;
}) {
  const auth = useAuth();
  const unlocked = useSolutionsUnlocked(problem.id);
  const meta = useAttemptStore((s) => s.meta);
  const content = useSolutionContent(problem.id, unlocked === true);
  const [unlocking, setUnlocking] = useState(false);
  if (auth.status !== "signed-in" || !auth.user)
    return (
      <SolutionSignIn
        status={auth.status}
        returnTo={`/problems/${problem.id}${meta?.id ? `?attempt=${meta.id}` : ""}`}
      />
    );
  if (unlocked === undefined) return null;
  if (unlocked)
    return content.problem ? (
      <>{children(content.problem)}</>
    ) : (
      <SolutionLoading error={content.error} retry={content.retry} />
    );

  const onUnlock = async () => {
    if (unlocking || !meta || auth.status !== "signed-in" || !auth.user) return;
    const ok = window.confirm(
      "Unlock the solutions before submitting? This attempt will score 0 points. You can still practise it.",
    );
    if (!ok) return;
    setUnlocking(true);
    try {
      if (!(await unlockAttemptSolutions(problem.id, meta.id)))
        toast.error("The active attempt changed. Try unlocking again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't unlock solutions.");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <section className="space-y-2 rounded-lg border border-dashed p-4">
      <h3 className="flex items-center gap-2 font-medium">
        <Lock className="size-4" /> Solutions are locked
      </h3>
      <p className="text-muted-foreground text-sm">
        Submit this attempt to unlock the reference requirements, approaches and their diagrams.
      </p>
      <Button variant="outline" size="sm" disabled={unlocking} onClick={() => void onUnlock()}>
        {unlocking && <Loader2 className="animate-spin" />}{" "}
        {unlocking ? "Checking sign-in…" : "Unlock anyway (this attempt scores 0)"}
      </Button>
    </section>
  );
}
