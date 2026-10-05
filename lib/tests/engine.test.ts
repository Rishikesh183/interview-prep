import { describe, expect, it } from "vitest";
import type { ApiEndpoint, Graph, GraphEdge, GraphNode, TestCheck } from "@/lib/schema";
import { evaluateCheck, runTests, type DesignContext } from "./engine";

const node = (
  id: string,
  type: string,
  config: Record<string, unknown> = {},
  note?: string,
): GraphNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { label: id, config, ...(note ? { note } : {}) },
});

const edge = (source: string, target: string, extra: Partial<GraphEdge> = {}): GraphEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  protocol: "HTTP",
  mode: "sync",
  ...extra,
});

// client -> lb -> svc -> cache, svc -> db, svc -> queue -> worker
const graph: Graph = {
  nodes: [
    node("client", "web_client"),
    node("lb", "load_balancer"),
    node("svc", "service", { instancesMin: 3 }, "Base62-encodes a counter"),
    node("cache", "cache", { strategy: "cache-aside", engine: "Redis" }),
    node("db", "sql_db", { replicas: 3 }),
    node("q", "message_queue", { dlq: true }),
    node("worker", "worker"),
    node("orphanDb", "nosql_kv"),
    { ...node("sticky", "note"), data: { label: "", config: {}, note: "We pick 302 redirects" } },
  ],
  edges: [
    edge("client", "lb"),
    edge("lb", "svc"),
    edge("svc", "cache", { protocol: "TCP", op: "read" }),
    edge("svc", "db", { protocol: "SQL", op: "write", label: "insert mapping" }),
    edge("svc", "q", { protocol: "AMQP", mode: "async" }),
    edge("q", "worker", { protocol: "AMQP", mode: "async" }),
  ],
};

const apis: ApiEndpoint[] = [
  { id: "a1", ownerNodeId: "svc", method: "POST", path: "/v1/urls", auth: true, idempotent: true },
  { id: "a2", ownerNodeId: "svc", method: "GET", path: "/{code}", auth: false, pagination: "none" },
];

const ctx: DesignContext = {
  graph,
  apis,
  entities: [{ name: "UrlMapping", fields: "code PK, long_url, created_at" }],
  extraText: ["Must be highly available"],
};

const cases: [string, TestCheck, boolean][] = [
  ["hasNode: present", { hasNode: "cache" }, true],
  ["hasNode: absent", { hasNode: "id_generator" }, false],
  ["hasNode: alias", { hasNode: "queue" }, true],
  ["hasNode: min count", { hasNode: "db", min: 3 }, false],
  ["hasNode: min count met", { hasNode: "db", min: 2 }, true],
  ["nodeConfig: config match", { nodeConfig: { type: "cache", config: { strategy: "cache-aside" } } }, true],
  ["nodeConfig: config one-of", { nodeConfig: { type: "cache", config: { strategy: ["write-through", "write-back"] } } }, false],
  ["nodeConfig: text regex", { nodeConfig: { type: "*", "text~": "base62|counter" } }, true],
  ["nodeConfig: text miss", { nodeConfig: { type: "cache", "text~": "counter" } }, false],
  ["edgeMatch: async into queue", { edgeMatch: { to: "queue", mode: "async" } }, true],
  ["edgeMatch: protocol miss", { edgeMatch: { to: "db", protocol: "gRPC" } }, false],
  ["edgeMatch: op + text", { edgeMatch: { to: "db", op: "write", "text~": "insert" } }, true],
  ["pathExists: client reaches db via cache", { pathExists: { from: "client", via: ["cache"], to: "db" } }, true],
  ["pathExists: orphan target is unreachable", { pathExists: { from: "client", to: "nosql_kv" } }, false],
  ["pathExists: no path", { pathExists: { from: "worker", to: "sql_db" } }, false],
  ["pathExists: missing via", { pathExists: { from: "client", via: ["cdn"], to: "db" } }, false],
  ["upstreamOf: service behind lb", { upstreamOf: "service", anyType: "entry" }, true],
  ["upstreamOf: worker not behind lb directly but transitively", { upstreamOf: "worker", anyType: "load_balancer" }, true],
  ["upstreamOf: fails when any target lacks it", { upstreamOf: "db", anyType: "service" }, false],
  ["upstreamOf: fails with no targets", { upstreamOf: "cdn", anyType: "client" }, false],
  ["apiMatch: redirect", { apiMatch: { method: "GET", "path~": "\\{code\\}" } }, true],
  ["apiMatch: idempotent POST", { apiMatch: { method: "POST", idempotent: true } }, true],
  ["apiMatch: pagination miss", { apiMatch: { method: "GET", pagination: "cursor" } }, false],
  ["entityMatch", { entityMatch: { "name~": "url", "fields~": "long_url" } }, true],
  ["entityMatch: miss", { entityMatch: { "name~": "user" } }, false],
  ["mentions: note node", { mentions: "30[12]" }, true],
  ["mentions: extra text", { mentions: "highly available" }, true],
  ["mentions: miss", { mentions: "bloom filter" }, false],
  ["anyOf", { anyOf: [{ hasNode: "id_generator" }, { mentions: "base62" }] }, true],
  ["allOf", { allOf: [{ hasNode: "cache" }, { hasNode: "cdn" }] }, false],
  ["not", { not: { hasNode: "cdn" } }, true],
]; // prettier-ignore

describe("test engine", () => {
  it.each(cases)("%s", (_name, check, expected) => {
    expect(evaluateCheck(check, ctx)).toBe(expected);
  });

  it("ignores annotation nodes for structural checks", () => {
    expect(evaluateCheck({ hasNode: "*", min: 9 }, ctx)).toBe(false);
  });

  it("runs a list of test cases", () => {
    const results = runTests(
      [
        { id: "a", desc: "has cache", check: { hasNode: "cache" } },
        { id: "b", desc: "has cdn", check: { hasNode: "cdn" } },
      ],
      ctx,
    );
    expect(results).toEqual([
      { id: "a", passed: true },
      { id: "b", passed: false },
    ]);
  });
});
