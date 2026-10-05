"use client";

import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { AppNode } from "@/lib/graph/convert";
import { cn } from "@/lib/utils";

function GroupNodeImpl({ data, selected }: NodeProps<AppNode>) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={160} minHeight={100} />
      <div
        className={cn(
          "border-muted-foreground/40 bg-muted/20 h-full w-full rounded-xl border-2 border-dashed",
          selected && "border-primary",
        )}
      >
        <div className="text-muted-foreground px-3 py-1.5 text-xs font-medium tracking-wide uppercase">
          {data.label}
        </div>
      </div>
    </>
  );
}

export const GroupNode = memo(GroupNodeImpl);
