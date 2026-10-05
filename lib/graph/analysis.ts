import { isAnnotation } from "@/lib/catalog/components";
import type { Graph, GraphEdge, GraphNode } from "@/lib/schema";

/** Read-only view of the infrastructure part of a graph (annotation nodes excluded). */
export type GraphIndex = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  byId: Map<string, GraphNode>;
  out: (id: string) => string[];
  in: (id: string) => string[];
  /** Nodes reachable from `id` following edges caller → callee (excluding itself). */
  reachable: (id: string) => Set<string>;
  /** Nodes that can reach `id` (excluding itself). */
  ancestors: (id: string) => Set<string>;
  typeOf: (id: string) => string;
};

function walk(start: string, next: (id: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...next(start)];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...next(cur));
  }
  seen.delete(start);
  return seen;
}

export function indexGraph(graph: Graph): GraphIndex {
  const nodes = graph.nodes.filter((n) => !isAnnotation(n.type));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = graph.edges.filter((e) => byId.has(e.source) && byId.has(e.target));
  const outMap = new Map<string, string[]>();
  const inMap = new Map<string, string[]>();
  for (const e of edges) {
    outMap.set(e.source, [...(outMap.get(e.source) ?? []), e.target]);
    inMap.set(e.target, [...(inMap.get(e.target) ?? []), e.source]);
  }
  const out = (id: string) => outMap.get(id) ?? [];
  const inc = (id: string) => inMap.get(id) ?? [];
  const reachCache = new Map<string, Set<string>>();
  const ancCache = new Map<string, Set<string>>();

  return {
    nodes,
    edges,
    byId,
    out,
    in: inc,
    reachable: (id) => {
      if (!reachCache.has(id)) reachCache.set(id, walk(id, out));
      return reachCache.get(id)!;
    },
    ancestors: (id) => {
      if (!ancCache.has(id)) ancCache.set(id, walk(id, inc));
      return ancCache.get(id)!;
    },
    typeOf: (id) => byId.get(id)?.type ?? "",
  };
}
