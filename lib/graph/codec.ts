import { getComponent, isAnnotation, parseConfig } from "@/lib/catalog/components";
import { inferEdgeDefaults } from "@/lib/catalog/edges";
import type {
  ApiEndpoint,
  EdgeOp,
  Graph,
  GraphEdge,
  GraphNode,
  StoredEdge,
  StoredGraph,
  StoredNode,
} from "@/lib/schema";

const OP_TO: Record<EdgeOp, StoredEdge["o"]> = { read: "r", write: "w", read_write: "rw" };
const OP_FROM: Record<NonNullable<StoredEdge["o"]>, EdgeOp> = {
  r: "read",
  w: "write",
  rw: "read_write",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function defaultLabel(type: string): string {
  return type === "note" ? "" : (getComponent(type)?.label ?? type);
}

function storeNode(n: GraphNode): StoredNode {
  const out: StoredNode = {
    i: n.id,
    t: n.type,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
  };
  if (n.data.label !== defaultLabel(n.type)) out.l = n.data.label;

  const defaults = getComponent(n.type)?.defaultConfig ?? {};
  const changed = Object.entries(n.data.config).filter(
    ([k, v]) => v !== undefined && !same(v, defaults[k]),
  );
  if (changed.length) out.c = Object.fromEntries(changed);
  if (n.data.note) out.no = n.data.note;
  if (isAnnotation(n.type)) {
    if (n.width !== undefined) out.w = Math.round(n.width);
    if (n.height !== undefined) out.h = Math.round(n.height);
  }
  return out;
}

function storeEdge(e: GraphEdge, typeOf: Map<string, string>): StoredEdge {
  const inferred = inferEdgeDefaults(typeOf.get(e.source) ?? "", typeOf.get(e.target) ?? "");
  const out: StoredEdge = { i: e.id, s: e.source, d: e.target };
  if (e.protocol !== inferred.protocol) out.p = e.protocol;
  if (e.mode === "async") out.m = "a";
  if (e.op) out.o = OP_TO[e.op];
  if (e.apiId) out.a = e.apiId;
  if (e.label) out.l = e.label;
  if (e.note) out.no = e.note;
  if (e.sourceHandle || e.targetHandle) out.h = `${e.sourceHandle ?? ""}>${e.targetHandle ?? ""}`;
  return out;
}

/** App graph → compact stored form. Selection/measurement never reach here (they're not in Graph). */
export function toStored(graph: Graph): StoredGraph {
  const typeOf = new Map(graph.nodes.map((n) => [n.id, n.type]));
  return { v: 1, n: graph.nodes.map(storeNode), e: graph.edges.map((e) => storeEdge(e, typeOf)) };
}

/** Compact stored form → app graph, restoring defaults from the catalog. */
export function fromStored(stored: StoredGraph): Graph {
  const typeOf = new Map(stored.n.map((n) => [n.i, n.t]));
  return {
    nodes: stored.n.map((n): GraphNode => {
      const node: GraphNode = {
        id: n.i,
        type: n.t,
        position: { x: n.x, y: n.y },
        data: { label: n.l ?? defaultLabel(n.t), config: parseConfig(n.t, n.c ?? {}) },
      };
      if (n.no) node.data.note = n.no;
      if (n.w !== undefined) node.width = n.w;
      if (n.h !== undefined) node.height = n.h;
      return node;
    }),
    edges: stored.e.map((e): GraphEdge => {
      const inferred = inferEdgeDefaults(typeOf.get(e.s) ?? "", typeOf.get(e.d) ?? "");
      const edge: GraphEdge = {
        id: e.i,
        source: e.s,
        target: e.d,
        protocol: e.p ?? inferred.protocol,
        mode: e.m === "a" ? "async" : "sync",
      };
      if (e.o) edge.op = OP_FROM[e.o];
      if (e.a) edge.apiId = e.a;
      if (e.l) edge.label = e.l;
      if (e.no) edge.note = e.no;
      if (e.h) {
        const [sh, th] = e.h.split(">");
        if (sh) edge.sourceHandle = sh;
        if (th) edge.targetHandle = th;
      }
      return edge;
    }),
  };
}

/** JSON with object keys sorted, so equal data always serializes identically. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const byId = <T extends { i?: string; id?: string }>(a: T, b: T) =>
  String(a.i ?? a.id).localeCompare(String(b.i ?? b.id));

/**
 * sha256 of the stored graph WITHOUT positions, plus the APIs. Moving boxes around (or
 * reordering) doesn't count as a change, so it can key the AI review cache.
 */
export async function graphHash(graph: Graph, apis: ApiEndpoint[]): Promise<string> {
  const stored = toStored(graph);
  const canonical = stableStringify({
    n: stored.n.map(({ x: _x, y: _y, ...rest }) => rest).sort(byId),
    e: [...stored.e].sort(byId),
    apis: [...apis].sort(byId),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
