"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { CATALOG } from "@/lib/catalog/components";
import { fromGraph, type AppEdge, type AppNode } from "@/lib/graph/convert";
import { GRID } from "@/lib/graph/placement";
import type { ApiEndpoint, Entity, Graph, Walkthrough } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReferenceDisplay, ReferenceEdge, ReferenceNode } from "./ReferenceElements";

const nodeTypes = Object.fromEntries(Object.keys(CATALOG).map((type) => [type, ReferenceNode]));
const edgeTypes = { protocol: ReferenceEdge };
type Props = {
  graph: Graph;
  apis?: ApiEndpoint[];
  entities?: Entity[];
  walkthrough?: Walkthrough;
  highlight?: { nodeIds: string[]; edgeIds: string[] };
  enlarged?: boolean;
};

export function GraphViewer(props: Props) {
  return (
    <ReactFlowProvider>
      <Viewer {...props} />
    </ReactFlowProvider>
  );
}

function Viewer({
  graph,
  apis = [],
  entities = [],
  walkthrough,
  highlight,
  enlarged = false,
}: Props) {
  const [selection, select] = useState<{ kind: "node" | "edge"; id: string }>();
  const converted = useMemo(() => fromGraph(graph), [graph]);
  const nodes = converted.nodes.map((n) => ({
    ...n,
    selected: selection?.kind === "node" && selection.id === n.id,
  }));
  const edges = converted.edges.map((e) => ({
    ...e,
    selected: selection?.kind === "edge" && selection.id === e.id,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
  const { resolvedTheme } = useTheme();
  const node =
    selection?.kind === "node" ? graph.nodes.find((n) => n.id === selection.id) : undefined;
  const edge =
    selection?.kind === "edge" ? graph.edges.find((e) => e.id === selection.id) : undefined;
  const component = walkthrough?.components.find((c) => c.nodeId === node?.id);
  const name = (id: string) => graph.nodes.find((n) => n.id === id)?.data.label ?? id;
  return (
    <ReferenceDisplay.Provider
      value={{
        apis,
        nodeIds: highlight?.nodeIds ?? [],
        edgeIds: highlight?.edgeIds ?? [],
        selectEdge: (id) => select({ kind: "edge", id }),
      }}
    >
      <div className="relative flex h-full min-h-72 flex-col overflow-hidden">
        <div className="bg-muted/30 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 text-xs">
          <span>Click a component or connection to inspect it</span>
          {!enlarged && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Enlarge diagram">
                  <Maximize2 />
                </Button>
              </DialogTrigger>
              <DialogContent className="h-[90vh] w-[95vw] max-w-none grid-rows-[auto_auto_1fr] sm:max-w-none">
                <DialogTitle>High-level design</DialogTitle>
                <DialogDescription>
                  Inspect components, API ownership, storage and connection details.
                </DialogDescription>
                <div className="min-h-0">
                  <GraphViewer
                    graph={graph}
                    apis={apis}
                    entities={entities}
                    walkthrough={walkthrough}
                    highlight={highlight}
                    enlarged
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="relative min-h-0 flex-1">
          <ReactFlow<AppNode, AppEdge>
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={null}
            onNodeClick={(_, n) => select({ kind: "node", id: n.id })}
            onEdgeClick={(_, e) => select({ kind: "edge", id: e.id })}
            onPaneClick={() => select(undefined)}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.1}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
          {(node || edge) && (
            <aside
              aria-label="Diagram details"
              className="bg-card absolute top-2 right-2 bottom-2 z-10 w-64 max-w-[80%] space-y-3 overflow-y-auto rounded-lg border p-3 shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold">
                  {node?.data.label ?? (edge ? `${name(edge.source)} → ${name(edge.target)}` : "")}
                </h4>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close diagram details"
                  onClick={() => select(undefined)}
                >
                  <X />
                </Button>
              </div>
              {node && (
                <>
                  <p className="text-muted-foreground text-xs">{CATALOG[node.type]?.label}</p>
                  {component && (
                    <>
                      <p className="text-xs">{component.purpose}</p>
                      <p className="text-muted-foreground text-xs">{component.rationale}</p>
                    </>
                  )}
                  {node.data.note && node.data.note !== component?.purpose && (
                    <p className="text-xs">{node.data.note}</p>
                  )}
                  <dl className="space-y-2 text-xs">
                    {Object.entries(node.data.config).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-muted-foreground break-words">{key}</dt>
                        <dd className="font-mono break-words">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {apis
                    .filter((a) => a.ownerNodeId === node.id)
                    .map((a) => (
                      <div key={a.id} className="rounded border p-2 text-xs">
                        <code>
                          {a.method} {a.path}
                        </code>
                        <p className="mt-1 whitespace-pre-wrap">{a.request}</p>
                        <p className="mt-1 whitespace-pre-wrap">{a.response}</p>
                      </div>
                    ))}
                  {entities
                    .filter((e) => e.storeNodeId === node.id)
                    .map((e) => (
                      <div key={e.name} className="rounded border p-2 text-xs">
                        <strong>{e.name}</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{e.fields}</pre>
                      </div>
                    ))}
                </>
              )}
              {edge && (
                <>
                  <p className="text-xs">
                    {edge.protocol} · {edge.mode} · {edge.op ?? "operation unspecified"}
                  </p>
                  <p className="text-xs">{edge.label}</p>
                  <p className="text-xs">{edge.note}</p>
                  {edge.apiId && (
                    <p className="text-xs">
                      Contract: {apis.find((a) => a.id === edge.apiId)?.path ?? edge.apiId}
                    </p>
                  )}
                </>
              )}
            </aside>
          )}
        </div>
        <p className="text-muted-foreground bg-muted/20 border-t px-3 py-1.5 text-[10px]">
          Arrows: caller → dependency · Solid: synchronous · Dashed: asynchronous · Amber: selected
          flow
        </p>
      </div>
    </ReferenceDisplay.Provider>
  );
}
