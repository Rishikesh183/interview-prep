"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MousePointerClick } from "lucide-react";
import { useTheme } from "next-themes";
import { useShallow } from "zustand/react/shallow";
import { getComponent } from "@/lib/catalog/components";
import type { AppEdge, AppNode } from "@/lib/graph/convert";
import { GRID } from "@/lib/graph/placement";
import { useWorkspaceStore } from "@/store/workspace";
import { edgeTypes } from "./edges/ProtocolEdge";
import { nodeTypes } from "./nodes";
import { DRAG_MIME } from "./Palette";
import { useAddNode } from "./useAddNode";
import { useCanvasShortcuts } from "./useCanvasShortcuts";

const defaultEdgeOptions: DefaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
};

const MINIMAP_COLORS: Record<string, string> = {
  clients: "#64748b",
  edge: "#0ea5e9",
  compute: "#8b5cf6",
  storage: "#10b981",
  messaging: "#f59e0b",
  infra: "#f43f5e",
  annotation: "#eab308",
};

function minimapColor(node: AppNode): string {
  return MINIMAP_COLORS[getComponent(node.type ?? "")?.category ?? ""] ?? "#94a3b8";
}

/** Read-only canvases still allow selecting (to inspect) and measuring, nothing else. */
function viewOnly<C extends { type: string }>(changes: C[]): C[] {
  return changes.filter(
    (c) => c.type === "select" || (c.type === "dimensions" && !("resizing" in c && c.resizing)),
  );
}

export function Canvas({ readOnly = false }: { readOnly?: boolean }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useWorkspaceStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
    })),
  );
  const { addAtScreen } = useAddNode();
  const { resolvedTheme } = useTheme();
  useCanvasShortcuts(!readOnly);

  return (
    <ReactFlow<AppNode, AppEdge>
      colorMode={resolvedTheme === "dark" ? "dark" : "light"}
      nodes={nodes}
      edges={edges}
      onNodesChange={readOnly ? (c) => onNodesChange(viewOnly(c)) : onNodesChange}
      onEdgesChange={readOnly ? (c) => onEdgesChange(viewOnly(c)) : onEdgesChange}
      onConnect={readOnly ? undefined : onConnect}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionMode={ConnectionMode.Loose}
      snapToGrid
      snapGrid={[GRID, GRID]}
      deleteKeyCode={readOnly ? null : ["Delete", "Backspace"]}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      onInit={(instance) => {
        // Arriving from "show on canvas" (review / lint): zoom to the called-out nodes.
        const { nodeIds } = useWorkspaceStore.getState().highlight;
        if (nodeIds.length) {
          setTimeout(() => {
            void instance.fitView({
              nodes: nodeIds.map((id) => ({ id })),
              padding: 0.6,
              maxZoom: 1.2,
            });
          }, 50);
        }
      }}
      minZoom={0.1}
      proOptions={{ hideAttribution: true }}
      onPaneClick={() => {
        const { highlight, setHighlight } = useWorkspaceStore.getState();
        if (highlight.nodeIds.length || highlight.edgeIds.length) {
          setHighlight({ nodeIds: [], edgeIds: [] });
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(e) => {
        const type = e.dataTransfer.getData(DRAG_MIME);
        if (!type || readOnly) return;
        e.preventDefault();
        addAtScreen(type, e.clientX, e.clientY);
      }}
    >
      <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} />
      {nodes.length === 0 && <EmptyCanvas readOnly={readOnly} />}
      <Controls showInteractive={false} />
      <MiniMap<AppNode> pannable zoomable nodeColor={minimapColor} className="bg-background!" />
    </ReactFlow>
  );
}

function EmptyCanvas({ readOnly }: { readOnly: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="text-muted-foreground max-w-xs space-y-2 text-center text-sm">
        <MousePointerClick className="mx-auto size-6" />
        {readOnly ? (
          <p>Nothing was drawn in this attempt.</p>
        ) : (
          <>
            <p className="text-foreground font-medium">Start your design</p>
            <p>
              Drag components from the palette (or click one). Connect them by dragging from the dot
              on a node&apos;s edge. Press{" "}
              <kbd className="bg-muted rounded border px-1 font-mono text-xs">?</kbd> for shortcuts.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
