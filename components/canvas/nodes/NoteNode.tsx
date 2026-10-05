"use client";

import { NodeResizer, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { AppNode } from "@/lib/graph/convert";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";

function NoteNodeImpl({ id, data, selected }: NodeProps<AppNode>) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={60} />
      <div
        className={cn(
          "flex h-full w-full rounded-md border border-yellow-300 bg-yellow-100 p-2 shadow-sm dark:border-yellow-700 dark:bg-yellow-950",
          selected && "ring-primary ring-2",
        )}
      >
        <textarea
          className="nodrag nowheel h-full w-full resize-none bg-transparent text-xs text-yellow-950 outline-none placeholder:text-yellow-700/60 dark:text-yellow-100"
          placeholder="Write a note..."
          value={data.note ?? ""}
          onChange={(e) => updateNodeData(id, { note: e.target.value })}
        />
      </div>
    </>
  );
}

export const NoteNode = memo(NoteNodeImpl);
