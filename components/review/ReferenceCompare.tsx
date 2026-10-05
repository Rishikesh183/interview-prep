"use client";

import { useMemo, useState } from "react";
import { GraphViewer } from "@/components/canvas/GraphViewer";
import { toGraph } from "@/lib/graph/convert";
import type { Problem } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";

/** Your design above a reference approach, both read-only. Stacked so each gets full width. */
export function ReferenceCompare({ problem }: { problem: Problem }) {
  const withGraphs = problem.references.filter((r) => r.graph);
  const [selected, setSelected] = useState(withGraphs[0]?.id);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const mine = useMemo(() => toGraph(nodes, edges), [nodes, edges]);
  const ref = withGraphs.find((r) => r.id === selected);
  if (!ref?.graph) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">Compare diagrams</h3>
        <div className="ml-auto flex gap-1">
          {withGraphs.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                r.id === selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-accent",
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <Pane title="Your design">
          <GraphViewer graph={mine} />
        </Pane>
        <Pane title={`Reference: ${ref.name}`}>
          <GraphViewer key={ref.id} graph={ref.graph} />
        </Pane>
      </div>
    </section>
  );
}

function Pane({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="bg-muted/50 border-b px-3 py-1.5 text-xs font-medium">{title}</div>
      <div className="h-[380px]">{children}</div>
    </div>
  );
}
