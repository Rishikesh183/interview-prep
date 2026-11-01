"use client";
import { useState } from "react";
import { GraphViewer } from "@/components/canvas/GraphViewer";
import type { Graph, ReferenceApproach } from "@/lib/schema";
import { cn } from "@/lib/utils";

export function RequestFlows({ approach }: { approach: ReferenceApproach }) {
  const [flowIndex, setFlow] = useState(0);
  const [stepIndex, setStep] = useState<number | null>(null);
  const flows = approach.walkthrough!.flows;
  const flow = flows[flowIndex];
  const api = approach.apis.find((a) => a.id === flow.apiId);
  const active = stepIndex === null ? flow.steps : [flow.steps[stepIndex]];
  const highlight = {
    nodeIds: [...new Set(active.flatMap((s) => s.nodeIds))],
    edgeIds: [...new Set(active.flatMap((s) => s.edgeIds))],
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {flows.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={i === flowIndex}
            onClick={() => {
              setFlow(i);
              setStep(null);
            }}
            className={cn(
              "rounded-full border px-3 py-2 text-xs",
              i === flowIndex ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {f.title}
          </button>
        ))}
      </div>
      {api && (
        <p className="bg-muted/30 rounded-lg border px-3 py-2 text-xs">
          Contract:{" "}
          <code>
            {api.method} {api.path}
          </code>{" "}
          · Owner: {approach.graph!.nodes.find((n) => n.id === api.ownerNodeId)?.data.label}
        </p>
      )}
      <ol className="space-y-2">
        {flow.steps.map((step, i) => (
          <li key={i}>
            <button
              type="button"
              aria-pressed={stepIndex === i}
              onClick={() => setStep(stepIndex === i ? null : i)}
              className={cn(
                "w-full space-y-1 rounded-xl border p-4 text-left",
                stepIndex === i && "border-amber-500 bg-amber-500/5",
              )}
            >
              <span className="text-sm font-semibold">
                {i + 1}. {step.title}
              </span>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.explanation}</p>
            </button>
          </li>
        ))}
      </ol>
      <div className="h-[420px] overflow-hidden rounded-xl border">
        <GraphViewer
          graph={approach.graph as Graph}
          apis={approach.apis}
          entities={approach.entities}
          walkthrough={approach.walkthrough}
          highlight={highlight}
        />
      </div>
    </div>
  );
}
