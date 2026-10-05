import { describe, expect, it } from "vitest";
import {
  EstimationInputSchema,
  RequirementsSchema,
  type ApiEndpoint,
  type Check,
  type Graph,
} from "@/lib/schema";
import { edge, node } from "@/test/fixtures";
import { evaluateCheck, explainCheck, runTests, type DesignContext } from "./engine";

// client -> lb -> svc -> cache (cache-aside), svc -> db, svc -> queue -> worker; orphan KV store
const graph: Graph = {
  nodes: [
    node("client", "web_client", "Browser"),
    node("lb", "load_balancer", "LB"),
    node("svc", "service", "URL Service", { instancesMin: 3 }, "Base62-encodes a counter"),
    node("cache", "cache", "Redis", { strategy: "cache-aside", ttl: "24h" }),
    node("db", "sql_db", "Postgres", { replicas: 3 }),
    node("q", "message_queue", "Clicks", { dlq: true }),
    node("worker", "worker", "Click counter"),
    node("orphan", "nosql_kv", "Unused KV"),
    {
      ...node("sticky", "note", ""),
      data: { label: "", config: {}, note: "We pick 302 redirects" },
    },
  ],
  edges: [
    edge("client", "lb"),
    edge("lb", "svc"),
    edge("svc", "cache", { protocol: "TCP" }),
    edge("svc", "db", { protocol: "SQL", label: "insert mapping" }),
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
  requirements: RequirementsSchema.parse({ nonFunctional: ["Must be highly available"] }),
  estimation: {
    ...EstimationInputSchema.parse({
      dau: 3_300_000,
      writesPerUserPerDay: 1,
      readWriteRatio: 100,
      objectSize: 500,
      objectSizeUnit: "B",
    }),
    notes: "100M URLs a month",
  },
};

/** [name, check, expected] — every check type has at least one passing and one failing case. */
const cases: [string, Check, boolean][] = [
  ["hasNode: present", { hasNode: "cache" }, true],
  ["hasNode: absent", { hasNode: "id_generator" }, false],
  ["hasNode: @queue group", { hasNode: "@queue" }, true],
  ["hasNode: @database counts sql + kv", { hasNode: "@database", min: 2 }, true],
  ["hasNode: min not met", { hasNode: "@database", min: 3 }, false],
  ["hasNode: annotations never count", { hasNode: "*", min: 9 }, false],

  ["nodeConfig: regex match", { nodeConfig: { type: "cache", where: { strategy: "cache-aside|write-through" } } }, true],
  ["nodeConfig: regex miss", { nodeConfig: { type: "cache", where: { strategy: "^write-back$" } } }, false],
  ["nodeConfig: number equality", { nodeConfig: { type: "@database", where: { replicas: 3 } } }, true],
  ["nodeConfig: boolean miss", { nodeConfig: { type: "message_queue", where: { dlq: false } } }, false],

  ["pathExists: client reaches DB", { pathExists: { from: "@client", to: "@database" } }, true],
  ["pathExists: via cache (cache-aside counts)", { pathExists: { from: "@client", via: "cache", to: "@database" } }, true],
  ["pathExists: via LB", { pathExists: { from: "@client", via: "@entry", to: "service" } }, true],
  ["pathExists: via missing", { pathExists: { from: "@client", via: "cdn", to: "@database" } }, false],
  ["pathExists: unreachable target", { pathExists: { from: "@client", to: "nosql_kv" } }, false],
  ["pathExists: async-only path to worker", { pathExists: { from: "service", to: "worker", mode: "async" } }, true],
  ["pathExists: sync-only path to worker fails", { pathExists: { from: "@client", to: "worker", mode: "sync" } }, false],

  ["edgeExists: async edge into queue", { edgeExists: { from: "service", to: "@queue", mode: "async" } }, true],
  ["edgeExists: no direct client→db edge", { edgeExists: { from: "@client", to: "@database" } }, false],

  ["upstreamOf: service directly behind LB", { upstreamOf: { target: "service", anyType: "@entry" } }, true],
  ["upstreamOf: DB not directly behind LB", { upstreamOf: { target: "sql_db", anyType: "@entry" } }, false],
  ["upstreamOf: fails with no targets", { upstreamOf: { target: "cdn", anyType: "@client" } }, false],

  ["apiMatch: redirect path param", { apiMatch: { method: "GET", path: "\\{[^}]+\\}" } }, true],
  ["apiMatch: idempotent POST", { apiMatch: { method: ["POST", "PUT"], path: "url", idempotent: true } }, true],
  ["apiMatch: cursor pagination missing", { apiMatch: { method: "GET", path: ".", pagination: "cursor" } }, false],

  ["textMentions: sticky note", { textMentions: { pattern: "30[12]" } }, true],
  ["textMentions: config value counts as label", { textMentions: { pattern: "cache-aside", in: ["labels"] } }, true],
  ["textMentions: restricted source", { textMentions: { pattern: "highly available", in: ["notes"] } }, false],
  ["textMentions: requirements", { textMentions: { pattern: "highly available", in: ["requirements"] } }, true],
  ["textMentions: entities", { textMentions: { pattern: "long_url", in: ["entities"] } }, true],
  ["textMentions: estimation notes are notes", { textMentions: { pattern: "100M", in: ["notes"] } }, true],
  ["textMentions: miss", { textMentions: { pattern: "bloom filter" } }, false],

  ["estimation: input in range", { estimation: { field: "readWriteRatio", min: 10 } }, true],
  ["estimation: computed output", { estimation: { field: "readQpsPeak", min: 10_000, max: 15_000 } }, true],
  ["estimation: out of range", { estimation: { field: "writeQpsAvg", min: 1_000 } }, false],

  ["anyOf", { anyOf: [{ hasNode: "id_generator" }, { textMentions: { pattern: "base62" } }] }, true],
  ["allOf", { allOf: [{ hasNode: "cache" }, { hasNode: "cdn" }] }, false],
  ["not", { not: { hasNode: "cdn" } }, true],
]; // prettier-ignore

describe("test engine", () => {
  it.each(cases)("%s", (_name, check, expected) => {
    expect(evaluateCheck(check, ctx)).toBe(expected);
  });

  it("estimation checks fail without an estimation", () => {
    expect(
      evaluateCheck({ estimation: { field: "dau", min: 0 } }, { ...ctx, estimation: undefined }),
    ).toBe(false);
  });

  it("reports pass/fail and whether each test is core", () => {
    const results = runTests(
      [
        {
          id: "a",
          title: "has cache",
          kind: "core",
          weight: 1,
          check: { hasNode: "cache" },
          failHint: "?",
        },
        {
          id: "b",
          title: "has cdn",
          kind: "bonus",
          weight: 1,
          check: { hasNode: "cdn" },
          failHint: "?",
        },
      ],
      ctx,
    );
    expect(results).toEqual([
      { id: "a", passed: true, core: true },
      { id: "b", passed: false, core: false },
    ]);
  });
});

describe("evidence (what the UI highlights)", () => {
  const ev = (check: Check) => explainCheck(check, ctx);
  const sorted = (xs: string[]) => [...xs].sort();

  it("hasNode: the matching nodes", () => {
    expect(ev({ hasNode: "@database" }).nodeIds.sort()).toEqual(["db", "orphan"]);
  });

  it("pathExists: the route actually taken, including the cache-aside side call", () => {
    const e = ev({ pathExists: { from: "@client", via: "cache", to: "@database" } });
    expect(sorted(e.nodeIds)).toEqual(["cache", "client", "db", "lb", "svc"]);
    expect(sorted(e.edgeIds)).toEqual(["client-lb", "lb-svc", "svc-cache", "svc-db"]);
  });

  it("pathExists failing: the ends that should be connected", () => {
    const e = ev({ pathExists: { from: "@client", to: "nosql_kv" } });
    expect(e.passed).toBe(false);
    expect(sorted(e.nodeIds)).toEqual(["client", "orphan"]);
  });

  it("nodeConfig failing: the nodes whose config needs changing", () => {
    const e = ev({ nodeConfig: { type: "cache", where: { strategy: "write-back" } } });
    expect(e).toEqual({ passed: false, nodeIds: ["cache"], edgeIds: [] });
  });

  it("edgeExists: the edge and its ends", () => {
    expect(ev({ edgeExists: { from: "service", to: "@queue", mode: "async" } })).toEqual({
      passed: true,
      nodeIds: ["svc", "q"],
      edgeIds: ["svc-q"],
    });
  });

  it("upstreamOf failing: only the targets missing an upstream", () => {
    expect(ev({ upstreamOf: { target: "@database", anyType: "service" } }).nodeIds).toEqual([
      "orphan",
    ]);
  });

  it("apiMatch: the API's owner node; textMentions: nodes whose own text matched", () => {
    expect(ev({ apiMatch: { method: "GET", path: "code" } }).nodeIds).toEqual(["svc"]);
    expect(ev({ textMentions: { pattern: "302" } }).nodeIds).toEqual(["sticky"]);
  });

  it("anyOf/allOf/not combine evidence sensibly", () => {
    expect(ev({ anyOf: [{ hasNode: "cdn" }, { hasNode: "cache" }] }).nodeIds).toEqual(["cache"]);
    expect(
      ev({
        allOf: [{ hasNode: "cache" }, { nodeConfig: { type: "@queue", where: { fifo: true } } }],
      }),
    ).toEqual({
      passed: false,
      nodeIds: ["q"],
      edgeIds: [],
    });
    expect(ev({ not: { hasNode: "cache" } })).toEqual({
      passed: false,
      nodeIds: ["cache"],
      edgeIds: [],
    });
  });
});
