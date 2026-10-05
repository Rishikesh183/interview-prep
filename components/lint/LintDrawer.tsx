"use client";

import { useReactFlow } from "@xyflow/react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { countBySeverity } from "@/lib/lint";
import type { LintIssue, LintSeverity } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/store/preferences";
import { useWorkspaceStore } from "@/store/workspace";
import { useShortcuts } from "@/components/useShortcuts";
import { useLint } from "./useLint";

const SEVERITY: Record<LintSeverity, { icon: typeof Info; className: string; label: string }> = {
  error: { icon: AlertCircle, className: "text-destructive", label: "errors" },
  warn: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-500", label: "warnings" },
  info: { icon: Info, className: "text-sky-600 dark:text-sky-400", label: "info" },
};

/** Bottom drawer under the canvas. Clicking an issue highlights, selects and zooms to its nodes. */
export function LintDrawer({ showHintToggle = false }: { showHintToggle?: boolean }) {
  const issues = useLint();
  const counts = countBySeverity(issues);
  const open = usePreferences((s) => s.lintDrawerOpen);
  const hints = usePreferences((s) => s.keyComponentHints);
  const setPrefs = usePreferences((s) => s.set);
  const highlight = useWorkspaceStore((s) => s.highlight);
  const { fitView } = useReactFlow();
  useShortcuts({
    lint: () => setPrefs({ lintDrawerOpen: !usePreferences.getState().lintDrawerOpen }),
  });

  const focus = (issue: LintIssue) => {
    const ws = useWorkspaceStore.getState();
    const same =
      ws.highlight.nodeIds.join() === issue.nodeIds.join() &&
      ws.highlight.edgeIds.join() === issue.edgeIds.join();
    if (same) {
      ws.setHighlight({ nodeIds: [], edgeIds: [] });
      return;
    }
    ws.setHighlight({ nodeIds: issue.nodeIds, edgeIds: issue.edgeIds });
    if (issue.nodeIds.length) {
      ws.selectNodes(issue.nodeIds);
      void fitView({
        nodes: issue.nodeIds.map((id) => ({ id })),
        padding: 0.6,
        maxZoom: 1.2,
        duration: 300,
      });
    }
  };
  const isActive = (i: LintIssue) =>
    i.nodeIds.join() === highlight.nodeIds.join() &&
    i.edgeIds.join() === highlight.edgeIds.join() &&
    (i.nodeIds.length > 0 || i.edgeIds.length > 0);

  return (
    <section className="bg-background shrink-0 border-t" aria-label="Lint">
      <div className="flex h-9 items-center gap-3 px-3 text-xs">
        <button
          type="button"
          className="hover:text-foreground flex items-center gap-1.5 font-medium"
          onClick={() => setPrefs({ lintDrawerOpen: !open })}
          aria-expanded={open}
        >
          {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          Lint
        </button>
        {issues.length === 0 ? (
          <span className="flex items-center gap-1 text-emerald-600">
            <CircleCheck className="size-3.5" /> No issues
          </span>
        ) : (
          (Object.keys(SEVERITY) as LintSeverity[])
            .filter((s) => counts[s] > 0)
            .map((s) => {
              const { icon: Icon, className, label } = SEVERITY[s];
              return (
                <span key={s} className={cn("flex items-center gap-1 tabular-nums", className)}>
                  <Icon className="size-3.5" /> {counts[s]} {label}
                </span>
              );
            })
        )}
        {showHintToggle && (
          <label className="text-muted-foreground ml-auto flex items-center gap-2">
            <Switch checked={hints} onCheckedChange={(v) => setPrefs({ keyComponentHints: v })} />
            Component hints
          </label>
        )}
      </div>

      {open && issues.length > 0 && (
        <ul className="max-h-48 overflow-y-auto border-t">
          {issues.map((issue) => {
            const { icon: Icon, className } = SEVERITY[issue.severity];
            const clickable = issue.nodeIds.length > 0 || issue.edgeIds.length > 0;
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => focus(issue)}
                  className={cn(
                    "flex w-full gap-2 px-3 py-1.5 text-left text-xs disabled:cursor-default",
                    clickable && "hover:bg-accent",
                    isActive(issue) && "bg-amber-500/10",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", className)} />
                  <span className="min-w-0">
                    <span>{issue.message}</span>
                    {issue.fix && <span className="text-muted-foreground"> {issue.fix}</span>}
                  </span>
                  {clickable && (
                    <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
                      {[...issue.nodeIds, ...issue.edgeIds].slice(0, 3).join(", ")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
