import type { Edge, Node } from "@xyflow/react";
import { isAnnotation, parseConfig } from "@/lib/catalog/components";
import type { EdgeData, Graph, GraphEdge, GraphNode, NodeData } from "@/lib/schema";

/** React Flow shapes used on the canvas. Derived from the zod types. */
export type AppNode = Node<NodeData>;
export type AppEdge = Edge<EdgeData>;

export const EDGE_TYPE = "protocol";

export function nodeToGraph(n: AppNode): GraphNode {
  const out: GraphNode = {
    id: n.id,
    type: n.type ?? "service",
    position: { x: n.position.x, y: n.position.y },
    data: { label: n.data.label, config: n.data.config },
  };
  if (n.data.note) out.data.note = n.data.note;
  if (n.width !== undefined) out.width = n.width;
  if (n.height !== undefined) out.height = n.height;
  return out;
}

export function edgeToGraph(e: AppEdge): GraphEdge {
  const d = e.data ?? { protocol: "HTTP", mode: "sync" };
  const out: GraphEdge = {
    id: e.id,
    source: e.source,
    target: e.target,
    protocol: d.protocol,
    mode: d.mode,
  };
  if (e.sourceHandle) out.sourceHandle = e.sourceHandle;
  if (e.targetHandle) out.targetHandle = e.targetHandle;
  if (d.op) out.op = d.op;
  if (d.apiId) out.apiId = d.apiId;
  if (d.label) out.label = d.label;
  if (d.note) out.note = d.note;
  return out;
}

export function toGraph(nodes: AppNode[], edges: AppEdge[]): Graph {
  return { nodes: nodes.map(nodeToGraph), edges: edges.map(edgeToGraph) };
}

export function nodeFromGraph(n: GraphNode): AppNode {
  const node: AppNode = {
    id: n.id,
    type: n.type,
    position: n.position,
    data: { ...n.data, config: parseConfig(n.type, n.data.config) },
  };
  if (n.width !== undefined) node.width = n.width;
  if (n.height !== undefined) node.height = n.height;
  if (n.type === "group") node.zIndex = -1;
  return node;
}

export function edgeFromGraph(e: GraphEdge): AppEdge {
  const { id, source, target, sourceHandle, targetHandle, ...data } = e;
  return { id, source, target, sourceHandle, targetHandle, type: EDGE_TYPE, data };
}

/** Drops edges whose endpoints no longer exist. */
export function fromGraph(graph: Graph): { nodes: AppNode[]; edges: AppEdge[] } {
  const nodes = graph.nodes.map(nodeFromGraph);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map(edgeFromGraph);
  return { nodes, edges };
}

/** Short sequential ids (n1, n2...) so humans and the AI reviewer can refer to them. */
export function nextId(prefix: string, existing: Iterable<string>): string {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of existing) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${max + 1}`;
}

export function isAnnotationNode(n: { type?: string }): boolean {
  return isAnnotation(n.type ?? "");
}
