"use client";

import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/problems/DifficultyBadge";
import type { Problem } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";

const SCALE_LABELS = { dau: "Users", qps: "Traffic", storage: "Storage", notes: "Notes" } as const;

/** Problem statement as the interviewer would give it: prompt, scale, and hints on request. */
export function ProblemPanel({ problem }: { problem: Problem }) {
  const revealed = useAttemptStore((s) => s.meta?.hintsRevealed ?? 0);
  const revealHint = useAttemptStore((s) => s.revealHint);
  const scale = (Object.keys(SCALE_LABELS) as (keyof typeof SCALE_LABELS)[]).filter(
    (k) => problem.scale[k],
  );
  const shown = Math.min(revealed, problem.hints.length);

  return (
    <div className="space-y-5 p-4 text-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground tabular-nums">#{problem.number}</span>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
        <h2 className="text-base font-semibold">{problem.title}</h2>
        <p className="leading-relaxed">{problem.prompt}</p>
      </div>

      {scale.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Scale
          </h3>
          <dl className="space-y-1">
            {scale.map((k) => (
              <div key={k}>
                <dt className="text-muted-foreground inline text-xs">{SCALE_LABELS[k]}: </dt>
                <dd className="inline">{problem.scale[k]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {problem.hints.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Hints
          </h3>
          <ol className="space-y-2">
            {problem.hints.slice(0, shown).map((h, i) => (
              <li key={i} className="flex gap-2 rounded-md bg-amber-500/10 p-2 text-xs">
                <Lightbulb className="size-3.5 shrink-0 text-amber-600" />
                {h}
              </li>
            ))}
          </ol>
          {shown < problem.hints.length && (
            <Button variant="outline" size="sm" onClick={revealHint}>
              <Lightbulb /> Show hint {shown + 1} of {problem.hints.length}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
