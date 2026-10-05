"use client";

import { adjustedScore } from "@/lib/ai/client";
import { LEVEL_LABEL, levelFor, RUBRIC } from "@/lib/ai/rubric";
import type { AiReview, FollowUp } from "@/lib/schema";
import { cn } from "@/lib/utils";

const barColor = (score: number) =>
  score >= 8
    ? "bg-emerald-500"
    : score >= 6
      ? "bg-sky-500"
      : score >= 4
        ? "bg-amber-500"
        : "bg-rose-500";

export function ScoreCard({ review, followUps }: { review: AiReview; followUps: FollowUp[] }) {
  const score = adjustedScore(review, followUps);
  const delta = score - review.overall;
  const byDim = new Map(review.scores.map((s) => [s.dimension, s]));

  return (
    <div className="space-y-5 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="text-4xl font-semibold tabular-nums">{score}</div>
          <div className="text-muted-foreground text-xs">
            out of 100
            {delta !== 0 && (
              <span className={delta > 0 ? "text-emerald-600" : "text-destructive"}>
                {" "}
                ({delta > 0 ? "+" : ""}
                {delta} from follow-ups)
              </span>
            )}
          </div>
        </div>
        <span className="bg-muted rounded-full px-2.5 py-1 text-sm font-medium">
          {LEVEL_LABEL[levelFor(score)]}
        </span>
        <span className="text-muted-foreground ml-auto text-xs">
          {review.model} · {new Date(review.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="space-y-3">
        {RUBRIC.map((r) => {
          const s = byDim.get(r.dimension);
          const value = s?.score ?? 0;
          return (
            <div key={r.dimension} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>
                  {r.label}{" "}
                  <span className="text-muted-foreground text-xs">· weight {r.weight}</span>
                </span>
                <span className="font-mono text-xs tabular-nums">{value}/10</span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full", barColor(value))}
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              {s?.comment && <p className="text-muted-foreground text-xs">{s.comment}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <List title="Strengths" items={review.strengths} />
        <List title="Not addressed" items={review.missing} />
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {title}
      </h4>
      <ul className="list-disc space-y-0.5 pl-4 text-sm">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
