"use client";

import { BookOpen, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/problems/DifficultyBadge";
import type { Problem } from "@/lib/schema";
import { HINT_PENALTY } from "@/lib/points";
import { useAttemptStore } from "@/store/attempt";

const SCALE_LABELS = { dau: "Users", qps: "Traffic", storage: "Storage", notes: "Notes" } as const;

/** Problem statement as the interviewer would give it: prompt, scale, and hints on request. */
export function ProblemPanel({ problem }: { problem: Problem }) {
  const revealed = useAttemptStore((s) => s.meta?.hintsRevealed ?? 0);
  const revealHint = useAttemptStore((s) => s.revealHint);
  const inProgress = useAttemptStore((s) => s.meta?.status === "in_progress");

  // Hints cost 25% of this attempt's points each while it's in progress (PHASE-2 §3).
  const onReveal = () => {
    if (inProgress) {
      const left = Math.max(0, 100 - Math.round(HINT_PENALTY * 100) * (revealed + 1));
      const ok = window.confirm(
        `Reveal hint ${revealed + 1}? Each hint costs 25% of this attempt's points (you'd keep ${left}%).`,
      );
      if (!ok) return;
    }
    revealHint();
  };
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
        {problem.prerequisites.length > 0 && (
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
            <BookOpen className="size-3.5" /> Prerequisites:
            {problem.prerequisites.map((slug, i) => (
              <span key={slug}>
                <a
                  href={`/learn/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {slug.replace(/-/g, " ")}
                </a>
                {i < problem.prerequisites.length - 1 && ","}
              </span>
            ))}
          </p>
        )}
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
            <Button variant="outline" size="sm" onClick={onReveal}>
              <Lightbulb /> Show hint {shown + 1} of {problem.hints.length}
              {inProgress && <span className="text-muted-foreground">(−25% points)</span>}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
