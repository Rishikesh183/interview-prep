"use client";

import { Crosshair } from "lucide-react";
import type { AiReview } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useAttemptStore } from "@/store/attempt";
import { useWorkspaceStore } from "@/store/workspace";
import { highlightLater } from "@/components/canvas/useFocusOnCanvas";

const SEVERITY = {
  high: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  low: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
} as const;

/** Jumps to the canvas with the issue's nodes highlighted (the canvas zooms to them on mount). */
function showOnCanvas(nodeIds: string[]) {
  highlightLater({ nodeIds, edgeIds: [] });
  useAttemptStore.getState().setStage("design");
}

export function IssueList({ issues }: { issues: AiReview["issues"] }) {
  const labels = useWorkspaceStore((s) => s.nodes);
  const labelOf = (id: string) => labels.find((n) => n.id === id)?.data.label ?? id;

  if (!issues.length) return <p className="text-muted-foreground text-sm">No issues raised.</p>;

  return (
    <ul className="divide-y rounded-lg border">
      {issues.map((issue, i) => (
        <li key={i} className="space-y-1.5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                SEVERITY[issue.severity],
              )}
            >
              {issue.severity}
            </span>
            <span className="flex-1">{issue.text}</span>
          </div>
          <p className="text-muted-foreground pl-1 text-xs">Fix: {issue.fix}</p>
          {issue.nodeIds.length > 0 && (
            <button
              type="button"
              onClick={() => showOnCanvas(issue.nodeIds)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
              <Crosshair className="size-3" />
              Show on canvas: {issue.nodeIds.map((id) => `${labelOf(id)} (${id})`).join(", ")}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
