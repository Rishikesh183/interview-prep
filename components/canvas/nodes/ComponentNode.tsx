"use client";

import type { NodeProps } from "@xyflow/react";
import { MessageSquareText } from "lucide-react";
import { memo } from "react";
import { configBadges, getComponent } from "@/lib/catalog/components";
import type { AppNode } from "@/lib/graph/convert";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";
import { CATEGORY_STYLES } from "./categoryStyles";
import { NodeHandles } from "./NodeHandles";

const MAX_BADGES = 4;

function ComponentNodeImpl({ id, type, data, selected }: NodeProps<AppNode>) {
  const highlighted = useWorkspaceStore((s) => s.highlight.nodeIds.includes(id));
  const def = getComponent(type);
  if (!def) return null;
  const Icon = def.icon;
  const styles = CATEGORY_STYLES[def.category];
  const badges = configBadges(type, data.config);

  return (
    <div
      className={cn(
        "group bg-card text-card-foreground w-48 rounded-lg border border-l-4 shadow-sm transition-shadow",
        styles.accent,
        selected && "ring-primary ring-2",
        highlighted && "ring-offset-background ring-2 ring-amber-500 ring-offset-2",
      )}
    >
      <NodeHandles />
      <div className="flex items-center gap-2 p-2">
        <div
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", styles.icon)}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm leading-tight font-medium" title={data.label}>
            {data.label || def.label}
          </div>
          <div className="text-muted-foreground truncate text-[10px]">
            {def.label} · {id}
          </div>
        </div>
        {data.note && (
          <MessageSquareText
            className="text-muted-foreground size-3.5 shrink-0"
            aria-label="Has note"
          />
        )}
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {badges.slice(0, MAX_BADGES).map((b) => (
            <span
              key={b}
              className="bg-muted text-muted-foreground max-w-full truncate rounded px-1.5 py-0.5 text-[10px] leading-none"
            >
              {b}
            </span>
          ))}
          {badges.length > MAX_BADGES && (
            <span className="text-muted-foreground text-[10px]">+{badges.length - MAX_BADGES}</span>
          )}
        </div>
      )}
    </div>
  );
}

export const ComponentNode = memo(ComponentNodeImpl);
