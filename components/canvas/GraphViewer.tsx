"use client";

import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { fromGraph, type AppEdge, type AppNode } from "@/lib/graph/convert";
import { GRID } from "@/lib/graph/placement";
import type { Graph } from "@/lib/schema";
import { edgeTypes } from "./edges/ProtocolEdge";
import { nodeTypes } from "./nodes";

/** Read-only diagram for any graph (e.g. a reference solution), independent of the editor. */
export function GraphViewer({ graph }: { graph: Graph }) {
  const { nodes, edges } = useMemo(() => fromGraph(graph), [graph]);
  const { resolvedTheme } = useTheme();
  return (
    <ReactFlowProvider>
      {/* Disables the inline note editor inside sticky notes. */}
      <fieldset disabled className="contents">
        <ReactFlow<AppNode, AppEdge>
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} />
          {nodes.length === 0 && (
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
              Empty canvas
            </div>
          )}
        </ReactFlow>
      </fieldset>
    </ReactFlowProvider>
  );
}
