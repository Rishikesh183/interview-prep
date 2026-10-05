"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/problems/DifficultyBadge";
import { useAttempts } from "@/components/problems/useAttempts";
import { adjustedScore } from "@/lib/ai/client";
import { formatDuration, isSolved, testScore } from "@/lib/attempts/status";
import { deleteAttempt } from "@/lib/db/attempts";
import type { Attempt, ProblemSummary } from "@/lib/schema";
import { STAGES } from "@/lib/workspace/stages";
import { cn } from "@/lib/utils";

function StatusLabel({ attempt }: { attempt: Attempt }) {
  if (attempt.review) {
    const score = adjustedScore(attempt.review, attempt.followUps);
    return (
      <span className={isSolved(attempt) ? "text-emerald-600" : "text-amber-600"}>
        {isSolved(attempt) ? "Solved" : "Reviewed"} · AI {score}/100
      </span>
    );
  }
  if (isSolved(attempt)) return <span className="text-emerald-600">Solved</span>;
  if (attempt.status !== "in_progress") return <span className="text-amber-600">Submitted</span>;
  const stage = STAGES.find((s) => s.id === attempt.stage)?.label ?? attempt.stage;
  return <span className="text-muted-foreground">In progress · {stage}</span>;
}

export function HistoryTable({ problems }: { problems: ProblemSummary[] }) {
  const attempts = useAttempts();
  const byId = new Map(problems.map((p) => [p.id, p]));

  if (attempts === undefined) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }
  if (attempts.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        No attempts yet.{" "}
        <Link href="/" className="text-foreground underline">
          Pick a problem
        </Link>{" "}
        to start.
      </div>
    );
  }

  const onDelete = async (a: Attempt) => {
    const title = byId.get(a.problemId)?.title ?? a.problemId;
    if (window.confirm(`Delete this attempt at "${title}"? This cannot be undone.`)) {
      await deleteAttempt(a.id);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-3 py-2">Problem</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Tests</th>
            <th className="px-3 py-2 text-right">Time</th>
            <th className="hidden px-3 py-2 md:table-cell">Started</th>
            <th className="w-10 px-3 py-2" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => {
            const p = byId.get(a.problemId);
            const score = testScore(a);
            return (
              <tr key={a.id} className="hover:bg-muted/40 border-t">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/problems/${a.problemId}?attempt=${a.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    {p?.title ?? a.problemId}
                    {p && <DifficultyBadge difficulty={p.difficulty} />}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <StatusLabel attempt={a} />
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right tabular-nums",
                    score && score.passed === score.total && "text-emerald-600",
                  )}
                >
                  {score ? `${score.passed}/${score.total}` : "—"}
                </td>
                <td className="text-muted-foreground px-3 py-2.5 text-right tabular-nums">
                  {formatDuration(a.elapsedMs)}
                </td>
                <td className="text-muted-foreground hidden px-3 py-2.5 text-xs md:table-cell">
                  {new Date(a.startedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete attempt"
                    onClick={() => void onDelete(a)}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
