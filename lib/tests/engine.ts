import { isAnnotation } from "@/lib/catalog/components";
import { expandTypes, type TypeRefs } from "@/lib/catalog/groups";
import { estimate } from "@/lib/estimation/calc";
import { indexGraph, type GraphIndex } from "@/lib/graph/analysis";
import type {
  ApiEndpoint,
  Check,
  Entity,
  EstimationInput,
  Graph,
  GraphEdge,
  GraphNode,
  Requirements,
  TestCase,
  TestResult,
  TextSource,
} from "@/lib/schema";

/** Everything a test can look at. */
export type DesignContext = {
  graph: Graph;
  apis: ApiEndpoint[];
  entities: Entity[];
  requirements?: Requirements;
  estimation?: EstimationInput & { notes?: string };
};

/**
 * Whether a check holds, plus the parts of the design it's about: what satisfied it when it
 * passes, or the closest relevant nodes when it fails, so the UI can highlight them.
 */
export type Evidence = { passed: boolean; nodeIds: string[]; edgeIds: string[] };

type Mode = GraphEdge["mode"];

type Index = GraphIndex & {
  ctx: DesignContext;
  text: Record<TextSource, string>;
};

const re = (src: string) => new RegExp(src, "i");
const asArray = <T>(v: T | readonly T[]): readonly T[] => (Array.isArray(v) ? v : [v as T]);

function configStrings(config: Record<string, unknown>): string[] {
  return Object.values(config)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v) => typeof v === "string" || typeof v === "number")
    .map(String);
}

function buildIndex(ctx: DesignContext): Index {
  const gi = indexGraph(ctx.graph);
  const all = ctx.graph.nodes;
  const r = ctx.requirements;
  const join = (parts: (string | undefined)[]) => parts.filter(Boolean).join("\n");
  return {
    ...gi,
    ctx,
    text: {
      notes: join([
        ...all.map((n) => n.data.note),
        ...ctx.graph.edges.map((e) => e.note),
        ctx.estimation?.notes,
      ]),
      // Labels include config values: they're what the node visibly says (e.g. "base62-counter").
      labels: join([
        ...all.flatMap((n) =>
          isAnnotation(n.type) ? [n.data.label] : [n.data.label, ...configStrings(n.data.config)],
        ),
        ...ctx.graph.edges.map((e) => e.label),
      ]),
      requirements: join(
        r ? [...r.functional, ...r.nonFunctional, ...r.outOfScope, ...r.questions] : [],
      ),
      apis: join(
        ctx.apis.map((a) =>
          [a.method, a.path, a.request, a.response, a.statusCodes, a.note]
            .filter(Boolean)
            .join(" "),
        ),
      ),
      entities: join(ctx.entities.map((e) => `${e.name} ${e.fields}`)),
    },
  };
}

function matcher(refs: TypeRefs): (type: string) => boolean {
  const set = expandTypes(refs);
  return set === null ? () => true : (t) => set.has(t);
}

function nodesOf(ix: Index, refs: TypeRefs): GraphNode[] {
  const ok = matcher(refs);
  return ix.nodes.filter((n) => ok(n.type));
}

const walkable = (ix: Index, mode?: Mode) =>
  mode ? ix.edges.filter((e) => e.mode === mode) : ix.edges;

/** Breadth-first reachability, optionally only over edges of one mode. */
function reachableVia(ix: Index, start: string, mode?: Mode): Set<string> {
  if (!mode) return ix.reachable(start);
  const edges = walkable(ix, mode);
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.source === cur && !seen.has(e.target)) {
        seen.add(e.target);
        queue.push(e.target);
      }
    }
  }
  seen.delete(start);
  return seen;
}

/** Shortest route from `start` to the first node accepted by `isGoal`, as edges (null if none). */
function route(
  ix: Index,
  start: string,
  isGoal: (id: string) => boolean,
  mode?: Mode,
): GraphEdge[] | null {
  const edges = walkable(ix, mode);
  const cameFrom = new Map<string, GraphEdge>();
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur !== start && isGoal(cur)) {
      const path: GraphEdge[] = [];
      for (let at = cur; at !== start; at = cameFrom.get(at)!.source)
        path.unshift(cameFrom.get(at)!);
      return path;
    }
    for (const e of edges) {
      if (e.source === cur && !seen.has(e.target)) {
        seen.add(e.target);
        cameFrom.set(e.target, e);
        queue.push(e.target);
      }
    }
  }
  return null;
}

function matchesWhere(value: unknown, want: string | number | boolean): boolean {
  const values = Array.isArray(value) ? value : [value];
  return values.some((v) =>
    typeof want === "string"
      ? v !== undefined && v !== null && re(want).test(String(v))
      : v === want,
  );
}

function verdict(
  passed: boolean,
  nodeIds: Iterable<string> = [],
  edges: GraphEdge[] = [],
): Evidence {
  const nodes = new Set(nodeIds);
  for (const e of edges) nodes.add(e.source).add(e.target);
  return { passed, nodeIds: [...nodes], edgeIds: [...new Set(edges.map((e) => e.id))] };
}

const merge = (passed: boolean, parts: Evidence[]): Evidence => ({
  passed,
  nodeIds: [...new Set(parts.flatMap((p) => p.nodeIds))],
  edgeIds: [...new Set(parts.flatMap((p) => p.edgeIds))],
});

function pathExists(
  ix: Index,
  check: Extract<Check, { pathExists: unknown }>["pathExists"],
): Evidence {
  const { from, to, via, mode } = check;
  const isTo = (id: string) => matcher(to)(ix.typeOf(id));
  const isVia = via ? (id: string) => matcher(via)(ix.typeOf(id)) : null;
  const starts = nodesOf(ix, from);

  for (const start of starts) {
    const fromStart = reachableVia(ix, start.id, mode);
    const targets = [...fromStart].filter(isTo);
    if (!targets.length) continue;
    if (!isVia) return verdict(true, [start.id], route(ix, start.id, isTo, mode) ?? []);

    // Nodes on some route start → target: the start itself, or reachable nodes that reach a target.
    const onRoute = [
      start.id,
      ...[...fromStart].filter((id) => targets.some((t) => reachableVia(ix, id, mode).has(t))),
    ];
    for (const p of onRoute) {
      // The via node is on the route, or called from a node on it (cache-aside).
      const side = isVia(p) ? [] : route(ix, p, isVia, mode);
      if (side === null) continue;
      const toP = p === start.id ? [] : (route(ix, start.id, (id) => id === p, mode) ?? []);
      const pToTarget = route(ix, p, isTo, mode) ?? [];
      return verdict(true, [start.id], [...toP, ...pToTarget, ...side]);
    }
  }
  // Point at what should be connected: the starts, the targets and any via nodes.
  return verdict(false, [
    ...starts.map((n) => n.id),
    ...nodesOf(ix, to).map((n) => n.id),
    ...(via ? nodesOf(ix, via).map((n) => n.id) : []),
  ]);
}

function evaluate(check: Check, ix: Index): Evidence {
  if ("anyOf" in check) {
    const parts = check.anyOf.map((c) => evaluate(c, ix));
    return parts.find((p) => p.passed) ?? merge(false, parts);
  }
  if ("allOf" in check) {
    const parts = check.allOf.map((c) => evaluate(c, ix));
    const passed = parts.every((p) => p.passed);
    return merge(passed, passed ? parts : parts.filter((p) => !p.passed));
  }
  if ("not" in check) {
    // A passing "not" has nothing to point at; a failing one points at what shouldn't be there.
    const inner = evaluate(check.not, ix);
    return inner.passed ? { ...inner, passed: false } : verdict(true);
  }

  if ("hasNode" in check) {
    const found = nodesOf(ix, check.hasNode);
    return verdict(
      found.length >= (check.min ?? 1),
      found.map((n) => n.id),
    );
  }

  if ("nodeConfig" in check) {
    const { type, where } = check.nodeConfig;
    const candidates = nodesOf(ix, type);
    const hit = candidates.find((n) =>
      Object.entries(where).every(([key, want]) => matchesWhere(n.data.config[key], want)),
    );
    // Failing: the nodes of that type whose config needs changing.
    return hit
      ? verdict(true, [hit.id])
      : verdict(
          false,
          candidates.map((n) => n.id),
        );
  }

  if ("pathExists" in check) return pathExists(ix, check.pathExists);

  if ("edgeExists" in check) {
    const { from, to, mode } = check.edgeExists;
    const isFrom = matcher(from);
    const isTo = matcher(to);
    const hit = ix.edges.find(
      (e) => isFrom(ix.typeOf(e.source)) && isTo(ix.typeOf(e.target)) && (!mode || e.mode === mode),
    );
    if (hit) return verdict(true, [], [hit]);
    return verdict(
      false,
      [...nodesOf(ix, from), ...nodesOf(ix, to)].map((n) => n.id),
    );
  }

  if ("upstreamOf" in check) {
    const { target, anyType } = check.upstreamOf;
    const ok = matcher(anyType);
    const targets = nodesOf(ix, target);
    const feeding = (id: string) =>
      ix.edges.filter((e) => e.target === id && ok(ix.typeOf(e.source)));
    const missing = targets.filter((t) => feeding(t.id).length === 0);
    if (targets.length && !missing.length)
      return verdict(
        true,
        [],
        targets.flatMap((t) => feeding(t.id)),
      );
    return verdict(
      false,
      missing.map((t) => t.id),
    );
  }

  if ("apiMatch" in check) {
    const m = check.apiMatch;
    const hit = ix.ctx.apis.find(
      (a) =>
        re(m.path).test(a.path) &&
        (!m.method || asArray(m.method).includes(a.method)) &&
        (m.auth === undefined || a.auth === m.auth) &&
        (m.idempotent === undefined || (a.idempotent ?? false) === m.idempotent) &&
        (m.rateLimited === undefined || (a.rateLimited ?? false) === m.rateLimited) &&
        (!m.pagination || asArray(m.pagination).includes(a.pagination ?? "none")),
    );
    return verdict(Boolean(hit), hit && ix.byId.has(hit.ownerNodeId) ? [hit.ownerNodeId] : []);
  }

  if ("textMentions" in check) {
    const { pattern, in: sources } = check.textMentions;
    const keys = sources ?? (Object.keys(ix.text) as TextSource[]);
    if (!keys.some((k) => re(pattern).test(ix.text[k]))) return verdict(false);
    // Point at the nodes whose own text (label, note, config) matched.
    const own = ix.ctx.graph.nodes.filter((n) =>
      re(pattern).test(
        [n.data.label, n.data.note ?? "", ...configStrings(n.data.config)].join(" "),
      ),
    );
    return verdict(
      true,
      own.map((n) => n.id),
    );
  }

  const { field, min, max } = check.estimation;
  const input = ix.ctx.estimation;
  if (!input) return verdict(false);
  const values: Record<string, unknown> = { ...input, ...estimate(input) };
  const value = values[field];
  return verdict(
    typeof value === "number" &&
      (min === undefined || value >= min) &&
      (max === undefined || value <= max),
  );
}

export function runTests(tests: TestCase[], ctx: DesignContext): TestResult[] {
  const ix = buildIndex(ctx);
  return tests.map((t) => ({
    id: t.id,
    passed: evaluate(t.check, ix).passed,
    core: t.kind === "core",
  }));
}

/** Pass/fail plus the nodes and edges to highlight, for one check. */
export function explainCheck(check: Check, ctx: DesignContext): Evidence {
  return evaluate(check, buildIndex(ctx));
}

export function evaluateCheck(check: Check, ctx: DesignContext): boolean {
  return explainCheck(check, ctx).passed;
}
