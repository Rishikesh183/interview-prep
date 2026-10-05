"use client";

import { Check } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { STAGES, stageDone } from "@/lib/workspace/stages";
import { cn } from "@/lib/utils";
import { useAttemptStore } from "@/store/attempt";
import { useWorkspaceStore } from "@/store/workspace";

export function StageStepper() {
  const meta = useAttemptStore((s) => s.meta);
  const setStage = useAttemptStore((s) => s.setStage);
  const counts = useWorkspaceStore(
    useShallow((s) => ({
      nodeCount: s.nodes.length,
      edgeCount: s.edges.length,
      apiCount: s.apis.length,
    })),
  );
  if (!meta) return null;
  const progress = { ...meta, ...counts };

  return (
    <ol className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const active = meta.stage === stage.id;
        const done = stageDone(stage.id, progress);
        return (
          <li key={stage.id} className="flex items-center gap-1">
            {i > 0 && <span className="bg-border h-px w-3" aria-hidden />}
            <button
              type="button"
              onClick={() => setStage(stage.id)}
              title={stage.hint}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border text-[10px]",
                  active ? "border-primary-foreground/50" : "border-current",
                  done && !active && "border-emerald-600 bg-emerald-600 text-white",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden lg:inline">{stage.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
