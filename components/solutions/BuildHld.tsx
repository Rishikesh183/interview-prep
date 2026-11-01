"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GraphViewer } from "@/components/canvas/GraphViewer";
import { Button } from "@/components/ui/button";
import { CATALOG } from "@/lib/catalog/components";
import type { ReferenceApproach } from "@/lib/schema";
import { graphAtStep } from "@/lib/solutions/walkthrough";
import { cn } from "@/lib/utils";

export function BuildHld({ approach }: { approach: ReferenceApproach }) {
  const [index, setIndex] = useState(0);
  const w = approach.walkthrough!;
  const step = w.buildSteps[index];
  const graph = graphAtStep(approach, index);
  const node = (id: string) => approach.graph!.nodes.find((n) => n.id === id)!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {w.buildSteps.map((s, i) => (
          <button
            type="button"
            key={i}
            onClick={() => setIndex(i)}
            aria-pressed={i === index}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              i === index ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>
      <article className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">
            Step {index + 1}: {step.title}
          </h3>
          <span className="text-muted-foreground shrink-0 text-xs">
            {index + 1} / {w.buildSteps.length}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{step.explanation}</p>
        <ul className="space-y-2 text-sm">
          {step.nodeIds.map((id) => {
            const n = node(id);
            return (
              <li key={id} className="bg-muted/30 rounded-lg p-3">
                <strong>
                  Add {CATALOG[n.type]?.label}: {n.data.label}
                </strong>
                <p className="text-muted-foreground mt-1 text-xs">
                  {w.components.find((c) => c.nodeId === id)?.purpose}
                </p>
                {Object.keys(n.data.config).length > 0 && (
                  <p className="mt-2 font-mono text-xs break-words">
                    {Object.entries(n.data.config)
                      .map(
                        ([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`,
                      )
                      .join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {step.edgeIds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Connect</th>
                  <th className="p-2">Protocol / mode</th>
                  <th className="p-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {step.edgeIds.map((id) => {
                  const e = approach.graph!.edges.find((edge) => edge.id === id)!;
                  return (
                    <tr key={id} className="border-b">
                      <td className="p-2">
                        {node(e.source).data.label} → {node(e.target).data.label}
                      </td>
                      <td className="p-2">
                        {e.protocol} · {e.mode} · {e.op ?? "call"}
                      </td>
                      <td className="p-2">{e.label ?? e.note ?? "Dependency call"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {step.apiIds.length > 0 && (
          <p className="text-sm">
            Define APIs:{" "}
            {step.apiIds
              .map((id) => {
                const a = approach.apis.find((api) => api.id === id)!;
                return `${a.method} ${a.path} under ${node(a.ownerNodeId).data.label}`;
              })
              .join("; ")}
          </p>
        )}
        {step.entityNames.length > 0 && (
          <p className="text-sm">
            Add state/entities: {step.entityNames.join(", ")} (use the ownership assignments above).
          </p>
        )}
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ChevronLeft /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={index === w.buildSteps.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </article>
      <div className="h-[400px] overflow-hidden rounded-xl border">
        <GraphViewer
          key={index}
          graph={graph}
          apis={approach.apis}
          entities={approach.entities}
          walkthrough={w}
          highlight={{ nodeIds: step.nodeIds, edgeIds: step.edgeIds }}
        />
      </div>
    </div>
  );
}
