"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import type { AppEdge } from "@/lib/graph/convert";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";

const OP_LABEL = { read: "R", write: "W", read_write: "R/W" } as const;

function ProtocolEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<AppEdge>) {
  const api = useWorkspaceStore((s) =>
    data?.apiId ? s.apis.find((a) => a.id === data.apiId) : undefined,
  );
  const apiPath = api ? `${api.method} ${api.path}` : undefined;
  const highlighted = useWorkspaceStore((s) => s.highlight.edgeIds.includes(id));
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });
  const isAsync = data?.mode === "async";
  const text = apiPath ?? data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          strokeWidth: selected || highlighted ? 2.5 : 1.5,
          strokeDasharray: isAsync ? "6 4" : undefined,
          stroke: highlighted
            ? "#f59e0b" /* amber-500 */
            : selected
              ? "var(--primary)"
              : "var(--muted-foreground)",
        }}
      />
      {data && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan bg-background pointer-events-auto absolute flex max-w-48 cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-none shadow-xs",
              selected && "border-primary",
              highlighted && "border-amber-500",
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onClick={() => useWorkspaceStore.getState().selectEdge(id)}
          >
            <span className="font-medium">{data.protocol}</span>
            {isAsync && <span className="text-amber-600 dark:text-amber-400">async</span>}
            {data.op && <span className="text-muted-foreground">{OP_LABEL[data.op]}</span>}
            {text && <span className="text-muted-foreground truncate">{text}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ProtocolEdge = memo(ProtocolEdgeImpl);

export const edgeTypes = { protocol: ProtocolEdge };
