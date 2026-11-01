"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  type NodeProps,
} from "@xyflow/react";
import { createContext, useContext } from "react";
import { configBadges, getComponent } from "@/lib/catalog/components";
import type { AppEdge, AppNode } from "@/lib/graph/convert";
import type { ApiEndpoint } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { NodeHandles } from "./nodes/NodeHandles";
import { CATEGORY_STYLES } from "./nodes/categoryStyles";

/** Reference diagrams never subscribe to or mutate the practice workspace. */
export const ReferenceDisplay = createContext<{
  apis: ApiEndpoint[];
  nodeIds: string[];
  edgeIds: string[];
  selectEdge: (id: string) => void;
}>({ apis: [], nodeIds: [], edgeIds: [], selectEdge: () => {} });

export function ReferenceNode({ id, type, data, selected }: NodeProps<AppNode>) {
  const display = useContext(ReferenceDisplay);
  const def = getComponent(type);
  if (!def) return null;
  if (type === "note")
    return (
      <div className="h-full w-full rounded border border-amber-300 bg-amber-50 p-3 text-xs whitespace-pre-wrap text-amber-950">
        {data.note}
      </div>
    );
  if (type === "group")
    return (
      <div className="bg-muted/20 text-muted-foreground h-full w-full rounded-xl border-2 border-dashed p-3 text-xs">
        {data.label}
      </div>
    );
  const Icon = def.icon;
  return (
    <div
      className={cn(
        "bg-card w-48 rounded-lg border border-l-4 shadow-sm",
        CATEGORY_STYLES[def.category].accent,
        selected && "ring-primary ring-2",
        display.nodeIds.includes(id) && "ring-2 ring-amber-500",
      )}
    >
      <NodeHandles />
      <div className="flex items-center gap-2 p-3">
        <Icon className="size-5 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium">{data.label || def.label}</div>
          <div className="text-muted-foreground text-[10px]">{def.label}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 px-3 pb-2">
        {configBadges(type, data.config)
          .slice(0, 3)
          .map((b) => (
            <span key={b} className="bg-muted max-w-full truncate rounded px-1.5 py-1 text-[10px]">
              {b}
            </span>
          ))}
      </div>
    </div>
  );
}

export function ReferenceEdge({
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
  const display = useContext(ReferenceDisplay);
  const api = display.apis.find((a) => a.id === data?.apiId);
  const [path, x, y] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });
  const active = selected || display.edgeIds.includes(id);
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          strokeWidth: active ? 3 : 1.5,
          stroke: active ? "#d97706" : "var(--muted-foreground)",
          strokeDasharray: data?.mode === "async" ? "6 4" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          onClick={() => display.selectEdge(id)}
          className="nodrag nopan bg-background pointer-events-auto absolute max-w-48 truncate rounded border px-2 py-1 text-[10px] shadow-xs"
          style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
        >
          {api ? `${api.method} ${api.path}` : data?.label || data?.protocol}
          {data?.mode === "async" ? " · async" : ""}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
