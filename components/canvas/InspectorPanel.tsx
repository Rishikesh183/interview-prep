"use client";

import { MousePointerClick } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { EdgeInspector } from "./EdgeInspector";
import { Inspector } from "./Inspector";

/** Right-hand panel: node inspector, edge inspector, or a hint. */
export function InspectorPanel() {
  const node = useWorkspaceStore((s) => s.nodes.find((n) => n.selected));
  const edge = useWorkspaceStore((s) => s.edges.find((e) => e.selected));
  const selectedCount = useWorkspaceStore(
    (s) => s.nodes.filter((n) => n.selected).length + s.edges.filter((e) => e.selected).length,
  );
  const counts = useWorkspaceStore((s) => `${s.nodes.length} nodes · ${s.edges.length} edges`);

  if (selectedCount === 1 && node) return <Inspector key={node.id} node={node} />;
  if (selectedCount === 1 && edge) return <EdgeInspector key={edge.id} edge={edge} />;

  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm">
      <MousePointerClick className="size-6" />
      {selectedCount > 1 ? (
        <p>{selectedCount} items selected. Duplicate with Ctrl+D or delete with Del.</p>
      ) : (
        <p>Select a node or connection to configure it.</p>
      )}
      <p className="text-xs">{counts}</p>
    </div>
  );
}
