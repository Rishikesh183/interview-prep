"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DifficultyBadge } from "@/components/problems/DifficultyBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db/dexie";
import { hasSubmittedProblem } from "@/lib/db/attempts";
import { useAuth } from "@/components/auth/useAuth";
import { solutionAccess } from "@/lib/solutions/access";
import { unlockProblemSolutions } from "@/lib/solutions/unlock";
import type { Problem } from "@/lib/schema";
import { MySolutions } from "./MySolutions";
import { ApproachWalkthrough } from "./ApproachWalkthrough";
import { SolutionSignIn, SolutionLoading } from "./SolutionAccessNotice";
import { useSolutionContent } from "./useSolutionContent";

/** Unlocked once the problem was submitted, or after "Unlock anyway" (PHASE-2 §3, §5). */
function useUnlocked(problemId: string): boolean | undefined {
  return useLiveQuery(async () => {
    const d = db();
    const [submittedBefore, peek] = await Promise.all([
      hasSubmittedProblem(problemId),
      d.meta.get(`peek:${problemId}`),
    ]);
    return peek !== undefined || submittedBefore;
  }, [problemId]);
}

export function SolutionsView({ problem }: { problem: Problem }) {
  const auth = useAuth();
  const eligible = useUnlocked(problem.id);
  const unlocked = solutionAccess(auth.status, auth.user?.id, eligible);
  const content = useSolutionContent(problem.id, unlocked === true);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <Link
            href={`/problems/${problem.id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="size-3" /> Back to the problem
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground tabular-nums">#{problem.number}</span>
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{problem.title}: solutions</h1>
        </div>

        {auth.status !== "signed-in" || !auth.user ? (
          <SolutionSignIn status={auth.status} returnTo={`/problems/${problem.id}/solutions`} />
        ) : unlocked === undefined ? null : unlocked ? (
          content.problem ? (
            <Unlocked problem={content.problem} />
          ) : (
            <SolutionLoading error={content.error} retry={content.retry} />
          )
        ) : (
          <Locked problem={problem} />
        )}
      </main>
    </>
  );
}

function Locked({ problem }: { problem: Problem }) {
  const [unlocking, setUnlocking] = useState(false);
  const onUnlock = async () => {
    if (unlocking) return;
    const ok = window.confirm(
      "Unlock the solutions before submitting? Your attempt in progress (and any new attempt before your first submit) will score 0 points.",
    );
    if (!ok) return;
    setUnlocking(true);
    try {
      await unlockProblemSolutions(problem.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't unlock solutions.");
    } finally {
      setUnlocking(false);
    }
  };
  return (
    <section className="space-y-3 rounded-lg border border-dashed p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <Lock className="size-4" /> Solutions are locked
      </h2>
      <p className="text-muted-foreground text-sm">
        Submit an attempt at this problem first. Then you&apos;ll see reference approaches with
        diagrams, walkthroughs and the tests they pass.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/problems/${problem.id}`}>Attempt it</Link>
        </Button>
        <Button variant="outline" size="sm" disabled={unlocking} onClick={() => void onUnlock()}>
          {unlocking && <Loader2 className="animate-spin" />}{" "}
          {unlocking ? "Checking sign-in…" : "Unlock anyway (scores 0 until you submit)"}
        </Button>
      </div>
    </section>
  );
}

function Unlocked({ problem }: { problem: Problem }) {
  const first = problem.references[0]?.id ?? "mine";
  return (
    <Tabs defaultValue={first} className="space-y-4">
      <TabsList className="h-auto flex-wrap">
        {problem.references.map((r) => (
          <TabsTrigger key={r.id} value={r.id}>
            {r.name}
          </TabsTrigger>
        ))}
        <TabsTrigger value="mine">My solutions</TabsTrigger>
      </TabsList>
      {problem.references.map((r) => (
        <TabsContent key={r.id} value={r.id}>
          <ApproachWalkthrough problem={problem} approach={r} />
        </TabsContent>
      ))}
      <TabsContent value="mine">
        <MySolutions problem={problem} />
      </TabsContent>
    </Tabs>
  );
}
