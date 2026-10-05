"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAttempts } from "@/components/problems/useAttempts";
import type { Problem } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";

/**
 * Solutions stay locked until the user has submitted this problem at least once
 * (PHASE-2 §3). "Unlock anyway" opens them now, and this attempt then scores 0.
 */
/** `undefined` while the attempt history is still loading (so the gate doesn't flash "locked"). */
export function useSolutionsUnlocked(problemId: string): boolean | undefined {
  const meta = useAttemptStore((s) => s.meta);
  const attempts = useAttempts();
  if (!meta) return false;
  if (meta.status !== "in_progress" || meta.solutionViewedBeforeSubmit) return true;
  if (attempts === undefined) return undefined;
  return attempts.some((a) => a.problemId === problemId && a.status !== "in_progress");
}

export function SolutionsGate({
  problem,
  children,
}: {
  problem: Problem;
  children: React.ReactNode;
}) {
  const unlocked = useSolutionsUnlocked(problem.id);
  const unlock = useAttemptStore((s) => s.unlockSolutions);
  if (unlocked === undefined) return null;
  if (unlocked) return <>{children}</>;

  const onUnlock = () => {
    const ok = window.confirm(
      "Unlock the solutions before submitting? This attempt will score 0 points. You can still practise it.",
    );
    if (ok) unlock();
  };

  return (
    <section className="space-y-2 rounded-lg border border-dashed p-4">
      <h3 className="flex items-center gap-2 font-medium">
        <Lock className="size-4" /> Solutions are locked
      </h3>
      <p className="text-muted-foreground text-sm">
        Submit this attempt to unlock the reference requirements, {problem.references.length}{" "}
        approaches and their diagrams.
      </p>
      <Button variant="outline" size="sm" onClick={onUnlock}>
        Unlock anyway (this attempt scores 0)
      </Button>
    </section>
  );
}
