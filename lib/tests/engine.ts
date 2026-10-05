import { isAnnotation } from "@/lib/catalog/components";
import type {
  ApiEndpoint,
  Entity,
  Graph,
  GraphNode,
  TestCase,
  TestCheck,
  TestResult,
  TypeList,
} from "@/lib/schema";
import { indexGraph, type GraphIndex } from "@/lib/graph/analysis";
import { expandTypes } from "./aliases";

/** Everything a test can look at. */
export type DesignContext = {
  graph: Graph;
  apis: ApiEndpoint[];
  entities: Entity[];
  /** Extra free text searched by `mentions` (requirements, estimation notes...). */
  extraText?: string[];
};

type Index = GraphIndex & { ctx: DesignContext; corpus: string };

const re = (src: string) => new RegExp(src, "i");
const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

function configText(config: Record<string, unknown>): string {
  return Object.values(config)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v) => typeof v === "string" || typeof v === "number")
    .join(" ");
}

function buildIndex(ctx: DesignContext): Index {
  const gi = indexGraph(ctx.graph);
  const annotations = ctx.graph.nodes.filter((n) => isAnnotation(n.type));
  const corpus = [
    ...gi.nodes.map((n) => `${n.data.label} ${n.data.note ?? ""} ${configText(n.data.config)}`),
    ...annotations.map((n) => `${n.data.label} ${n.data.note ?? ""}`),
    ...gi.edges.map((e) => `${e.label ?? ""} ${e.note ?? ""}`),
    ...ctx.entities.map((e) => `${e.name} ${e.fields}`),
    ...ctx.apis.map(
      (a) => `${a.method} ${a.path} ${a.request ?? ""} ${a.response ?? ""} ${a.note ?? ""}`,
    ),
    ...(ctx.extraText ?? []),
  ].join("\n");
  return { ...gi, ctx, corpus };
}

export function typeMatcher(list: TypeList | undefined): (type: string) => boolean {
  if (list === undefined) return () => true;
  const set = expandTypes(list);
  return set === null ? () => true : (t) => set.has(t);
}

function nodesOf(ix: Index, list: TypeList): GraphNode[] {
  const match = typeMatcher(list);
  return ix.nodes.filter((n) => match(n.type));
}

function configMatches(
  config: Record<string, unknown>,
  expected: Record<string, string | number | boolean | (string | number | boolean)[]>,
): boolean {
  return Object.entries(expected).every(([key, want]) => {
    const wanted = asArray(want);
    const actual = config[key];
    const actuals = Array.isArray(actual) ? actual : [actual];
    return actuals.some((a) => wanted.includes(a as string | number | boolean));
  });
}

function evaluate(check: TestCheck, ix: Index): boolean {
  if ("anyOf" in check) return check.anyOf.some((c) => evaluate(c, ix));
  if ("allOf" in check) return check.allOf.every((c) => evaluate(c, ix));
  if ("not" in check) return !evaluate(check.not, ix);

  if ("hasNode" in check) return nodesOf(ix, check.hasNode).length >= (check.min ?? 1);

  if ("nodeConfig" in check) {
    const { type, config, "text~": text } = check.nodeConfig;
    return nodesOf(ix, type).some(
      (n) =>
        (!config || configMatches(n.data.config, config)) &&
        (!text ||
          re(text).test(`${n.data.label} ${n.data.note ?? ""} ${configText(n.data.config)}`)),
    );
  }

  if ("edgeMatch" in check) {
    const { from, to, mode, protocol, op, "text~": text } = check.edgeMatch;
    const fromOk = typeMatcher(from);
    const toOk = typeMatcher(to);
    return ix.edges.some(
      (e) =>
        fromOk(ix.byId.get(e.source)!.type) &&
        toOk(ix.byId.get(e.target)!.type) &&
        (!mode || e.mode === mode) &&
        (!protocol || asArray(protocol).includes(e.protocol)) &&
        (!op || (e.op !== undefined && asArray(op).includes(e.op))) &&
        (!text || re(text).test(`${e.label ?? ""} ${e.note ?? ""}`)),
    );
  }

  if ("pathExists" in check) {
    const { from, via = [], to } = check.pathExists;
    const toOk = typeMatcher(to);
    const viaOk = via.map(typeMatcher);
    return nodesOf(ix, from).some((start) => {
      const types = [...ix.reachable(start.id)].map(ix.typeOf);
      return types.some(toOk) && viaOk.every((ok) => types.some(ok));
    });
  }

  if ("upstreamOf" in check) {
    const targets = nodesOf(ix, check.upstreamOf);
    const ok = typeMatcher(check.anyType);
    return (
      targets.length > 0 &&
      targets.every((t) => [...ix.ancestors(t.id)].some((id) => ok(ix.typeOf(id))))
    );
  }

  if ("apiMatch" in check) {
    const m = check.apiMatch;
    return ix.ctx.apis.some(
      (a) =>
        (!m.method || asArray(m.method).includes(a.method)) &&
        (!m["path~"] || re(m["path~"]).test(a.path)) &&
        (m.auth === undefined || a.auth === m.auth) &&
        (m.idempotent === undefined || (a.idempotent ?? false) === m.idempotent) &&
        (m.rateLimited === undefined || (a.rateLimited ?? false) === m.rateLimited) &&
        (!m.pagination || asArray(m.pagination).includes(a.pagination ?? "none")),
    );
  }

  if ("entityMatch" in check) {
    const { "name~": name, "fields~": fields } = check.entityMatch;
    return ix.ctx.entities.some(
      (e) => (!name || re(name).test(e.name)) && (!fields || re(fields).test(e.fields)),
    );
  }

  return re(check.mentions).test(ix.corpus);
}

export function runTests(tests: TestCase[], ctx: DesignContext): TestResult[] {
  const ix = buildIndex(ctx);
  return tests.map((t) => ({ id: t.id, passed: evaluate(t.check, ix) }));
}

export function evaluateCheck(check: TestCheck, ctx: DesignContext): boolean {
  return evaluate(check, buildIndex(ctx));
}
