import { describe, expect, it } from "vitest";
import { parseConfig } from "@/lib/catalog/components";
import {
  EstimationInputSchema,
  RequirementsSchema,
  type EdgeData,
  type Graph,
  type GraphEdge,
  type GraphNode,
} from "@/lib/schema";
import { countBySeverity, runLint, RULES, type LintContext } from "./index";

const n = (id: string, type: string, config: Record<string, unknown> = {}): GraphNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { label: id, config: parseConfig(type, config) },
});

const e = (source: string, target: string, data: Partial<EdgeData> = {}): GraphEdge => ({
  id: `${source}>${target}`,
  source,
  target,
  protocol: "HTTP",
  mode: "sync",
  ...data,
});

const graph = (nodes: GraphNode[], edges: GraphEdge[]): Graph => ({ nodes, edges });

/** Lint with only one rule's issues returned. */
function lint(rule: string, g: Graph, extra: Partial<LintContext> = {}) {
  return runLint({ graph: g, apis: [], ...extra }).filter((i) => i.rule === rule);
}

const reqs = (nonFunctional: string[], functional: string[] = []) =>
  RequirementsSchema.parse({ nonFunctional, functional });
const est = (o: Record<string, number | string>) => EstimationInputSchema.parse(o);

/** A tidy baseline: client → lb → service → (cache, db). */
const base = () =>
  graph(
    [
      n("c", "web_client"),
      n("lb", "load_balancer"),
      n("s", "service"),
      n("cache", "cache", { strategy: "cache-aside", ttl: "1h" }),
      n("db", "sql_db", { replicas: 3 }),
    ],
    [
      e("c", "lb"),
      e("lb", "s"),
      e("s", "cache", { protocol: "TCP" }),
      e("s", "db", { protocol: "SQL", op: "write" }),
    ],
  );

describe("lint rules", () => {
  it("has the 14 rules from the spec", () => {
    expect(RULES).toHaveLength(14);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(14);
  });

  describe("1. client-direct-store", () => {
    it("passes when a service sits between client and DB", () => {
      expect(lint("client-direct-store", base())).toEqual([]);
    });
    it("flags client → database / cache edges with both node ids", () => {
      const g = graph(
        [n("c", "mobile_client"), n("db", "nosql_kv"), n("r", "cache")],
        [e("c", "db"), e("c", "r")],
      );
      const issues = lint("client-direct-store", g);
      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatchObject({
        severity: "error",
        nodeIds: ["c", "db"],
        edgeIds: ["c>db"],
      });
    });
    it("allows client → object storage (presigned uploads)", () => {
      expect(
        lint(
          "client-direct-store",
          graph([n("c", "web_client"), n("s3", "object_storage")], [e("c", "s3")]),
        ),
      ).toEqual([]);
    });
  });

  describe("2. lb-missing", () => {
    it("passes when the service is behind a load balancer", () => {
      expect(lint("lb-missing", base())).toEqual([]);
    });
    it("flags a multi-instance service with nothing in front", () => {
      const g = graph(
        [n("c", "web_client"), n("s", "service", { instancesMin: 3 })],
        [e("c", "s")],
      );
      expect(lint("lb-missing", g)).toMatchObject([{ severity: "warn", nodeIds: ["s"] }]);
    });
    it("ignores a single-instance service", () => {
      const g = graph(
        [n("s", "service", { instancesMin: 1, instancesMax: 1, autoscale: false })],
        [],
      );
      expect(lint("lb-missing", g)).toEqual([]);
    });
  });

  describe("3. single-db-ha", () => {
    const single = graph([n("s", "service"), n("db", "sql_db", { replicas: 1 })], [e("s", "db")]);
    it("passes with replicas, or when HA isn't required", () => {
      expect(lint("single-db-ha", base(), { requirements: reqs(["Highly available"]) })).toEqual(
        [],
      );
      expect(lint("single-db-ha", single, { requirements: reqs(["Low latency"]) })).toEqual([]);
    });
    it("flags a single-copy DB when requirements say highly available", () => {
      expect(
        lint("single-db-ha", single, { requirements: reqs(["Must be highly available"]) }),
      ).toMatchObject([{ nodeIds: ["db"] }]);
    });
    it("flags wide-column with replication factor 1", () => {
      const g = graph([n("w", "wide_column", { replicationFactor: 1, partitionKey: "id" })], []);
      expect(lint("single-db-ha", g, { requirements: reqs(["HA"]) })).toHaveLength(1);
    });
  });

  describe("4. read-heavy-no-cache", () => {
    const noCache = graph(
      [n("c", "web_client"), n("lb", "load_balancer"), n("s", "service"), n("db", "nosql_kv")],
      [e("c", "lb"), e("lb", "s"), e("s", "db")],
    );
    const heavy = { estimation: est({ dau: 1e6, writesPerUserPerDay: 1, readWriteRatio: 100 }) };
    it("passes with a cache on the read path", () => {
      expect(lint("read-heavy-no-cache", base(), heavy)).toEqual([]);
    });
    it("passes for balanced workloads or without an estimation", () => {
      expect(
        lint("read-heavy-no-cache", noCache, { estimation: est({ dau: 1e6, readWriteRatio: 2 }) }),
      ).toEqual([]);
      expect(lint("read-heavy-no-cache", noCache)).toEqual([]);
    });
    it("flags a read-heavy design with no cache or CDN, pointing at the DBs", () => {
      expect(lint("read-heavy-no-cache", noCache, heavy)).toMatchObject([
        { severity: "warn", nodeIds: ["db"] },
      ]);
    });
    it("accepts a CDN in front", () => {
      const g = graph([...noCache.nodes, n("cdn", "cdn")], [...noCache.edges, e("c", "cdn")]);
      expect(lint("read-heavy-no-cache", g, heavy)).toEqual([]);
    });
  });

  describe("5. queue-no-consumer", () => {
    it("passes when a worker consumes", () => {
      const g = graph(
        [n("s", "service"), n("q", "message_queue"), n("w", "worker")],
        [e("s", "q", { mode: "async" }), e("q", "w", { mode: "async" })],
      );
      expect(lint("queue-no-consumer", g)).toEqual([]);
    });
    it("flags a stream nobody reads", () => {
      const g = graph(
        [n("s", "service"), n("k", "event_stream")],
        [e("s", "k", { mode: "async" })],
      );
      expect(lint("queue-no-consumer", g)).toMatchObject([{ severity: "error", nodeIds: ["k"] }]);
    });
  });

  describe("6. async-mismatch", () => {
    it("passes for async edges into and out of queues", () => {
      const g = graph(
        [n("s", "service"), n("q", "message_queue"), n("w", "worker")],
        [e("s", "q", { mode: "async" }), e("q", "w", { mode: "async" })],
      );
      expect(lint("async-mismatch", g)).toEqual([]);
    });
    it("flags an async edge between two services", () => {
      const g = graph([n("a", "service"), n("b", "service")], [e("a", "b", { mode: "async" })]);
      expect(lint("async-mismatch", g)).toMatchObject([{ edgeIds: ["a>b"], nodeIds: ["a", "b"] }]);
    });
    it("flags a sync edge publishing into a queue", () => {
      const g = graph([n("a", "service"), n("q", "event_stream")], [e("a", "q", { mode: "sync" })]);
      expect(lint("async-mismatch", g)).toHaveLength(1);
    });
  });

  describe("7. orphan", () => {
    it("passes when everything is connected", () => {
      expect(lint("orphan", base())).toEqual([]);
    });
    it("flags unconnected nodes, softer for cross-cutting ones, never annotations", () => {
      const g = graph(
        [...base().nodes, n("x", "worker"), n("m", "monitoring"), n("note", "note")],
        base().edges,
      );
      const issues = lint("orphan", g);
      expect(issues.map((i) => [i.nodeIds[0], i.severity])).toEqual([
        ["x", "warn"],
        ["m", "info"],
      ]);
    });
  });

  describe("8. service-no-apis", () => {
    it("passes when the service owns an API", () => {
      const apis = [{ id: "a1", ownerNodeId: "s", method: "GET" as const, path: "/", auth: true }];
      expect(lint("service-no-apis", base(), { apis })).toEqual([]);
    });
    it("flags a service with no endpoints", () => {
      expect(lint("service-no-apis", base())).toMatchObject([{ severity: "info", nodeIds: ["s"] }]);
    });
  });

  describe("9. partition-key", () => {
    it("passes with keys set", () => {
      const g = graph(
        [
          n("db", "sql_db", { sharding: "hash", shardKey: "user_id" }),
          n("w", "wide_column", { partitionKey: "id" }),
        ],
        [],
      );
      expect(lint("partition-key", g)).toEqual([]);
    });
    it("flags a sharded SQL DB without a shard key and wide-column without a partition key", () => {
      const g = graph([n("db", "sql_db", { sharding: "range" }), n("w", "wide_column")], []);
      expect(lint("partition-key", g).map((i) => i.nodeIds[0])).toEqual(["db", "w"]);
    });
  });

  describe("10. cache-config", () => {
    it("passes with strategy and TTL", () => {
      expect(lint("cache-config", base())).toEqual([]);
    });
    it("flags a default cache (no strategy, no TTL)", () => {
      const issues = lint("cache-config", graph([n("r", "cache")], []));
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toMatch(/strategy and TTL/);
    });
  });

  describe("11. write-capacity", () => {
    const heavyWrites = { estimation: est({ dau: 1e9, writesPerUserPerDay: 1 }) }; // ~34.7K/s peak
    it("passes when peak writes fit", () => {
      expect(
        lint("write-capacity", base(), { estimation: est({ dau: 1e6, writesPerUserPerDay: 1 }) }),
      ).toEqual([]);
    });
    it("flags an unsharded SQL write path that can't keep up", () => {
      expect(lint("write-capacity", base(), heavyWrites)).toMatchObject([
        { severity: "error", nodeIds: ["db"] },
      ]);
    });
    it("passes when the store scales writes horizontally", () => {
      const g = graph(
        [n("s", "service"), n("db", "sql_db", { sharding: "hash", shardKey: "id" })],
        [e("s", "db", { op: "write" })],
      );
      expect(lint("write-capacity", g, heavyWrites)).toEqual([]);
    });
    it("downgrades to a warning when writes are buffered through a queue", () => {
      const g = graph(
        [n("s", "service"), n("q", "message_queue"), n("w", "worker"), n("db", "sql_db")],
        [
          e("s", "q", { mode: "async" }),
          e("q", "w", { mode: "async" }),
          e("w", "db", { op: "write" }),
        ],
      );
      // avg ~11.6K/s still above 5K/s → warn rather than error
      expect(lint("write-capacity", g, heavyWrites)).toMatchObject([{ severity: "warn" }]);
    });
  });

  describe("12. ws-no-pubsub", () => {
    it("passes when WebSocket nodes share a pub/sub", () => {
      const g = graph(
        [n("ws", "websocket_server", { instances: 4 }), n("ps", "pub_sub")],
        [e("ws", "ps", { mode: "async" }), e("ps", "ws", { mode: "async" })],
      );
      expect(lint("ws-no-pubsub", g)).toEqual([]);
    });
    it("passes for a single instance", () => {
      expect(
        lint("ws-no-pubsub", graph([n("ws", "websocket_server", { instances: 1 })], [])),
      ).toEqual([]);
    });
    it("passes when a consistent-hash load balancer pins rooms to one node", () => {
      const g = graph(
        [
          n("lb", "load_balancer", { algorithm: "consistent-hash" }),
          n("ws", "websocket_server", { instances: 3 }),
        ],
        [e("lb", "ws", { protocol: "WebSocket" })],
      );
      expect(lint("ws-no-pubsub", g)).toEqual([]);
    });
    it("flags multiple instances with no pub/sub", () => {
      expect(
        lint("ws-no-pubsub", graph([n("ws", "websocket_server", { instances: 3 })], [])),
      ).toMatchObject([{ nodeIds: ["ws"] }]);
    });
  });

  describe("13. media-no-object-storage", () => {
    it("passes with object storage, or when no media is mentioned", () => {
      const g = graph([n("s3", "object_storage")], []);
      expect(
        lint("media-no-object-storage", g, { requirements: reqs([], ["Upload photos"]) }),
      ).toEqual([]);
      expect(
        lint("media-no-object-storage", base(), { requirements: reqs([], ["Shorten URLs"]) }),
      ).toEqual([]);
    });
    it("flags media in requirements or the prompt with no object storage", () => {
      expect(
        lint("media-no-object-storage", base(), {
          requirements: reqs([], ["Users upload videos"]),
        }),
      ).toHaveLength(1);
      const problem = { prompt: "Design Instagram: share photos", keyComponents: [] };
      expect(lint("media-no-object-storage", base(), { problem })).toHaveLength(1);
    });
    it("doesn't match words like 'profile'", () => {
      expect(
        lint("media-no-object-storage", base(), { requirements: reqs([], ["Edit profile"]) }),
      ).toEqual([]);
    });
  });

  describe("14. key-components", () => {
    const problem = { prompt: "", keyComponents: ["cache", "id_generator"] };
    it("passes when all key components are present", () => {
      const g = graph([...base().nodes, n("id", "id_generator")], base().edges);
      expect(lint("key-components", g, { problem })).toEqual([]);
    });
    it("lists missing key components as an info hint", () => {
      expect(lint("key-components", base(), { problem })).toMatchObject([
        { severity: "info", message: expect.stringContaining("ID Generator") },
      ]);
    });
    it("can be turned off (no hints mode) and is silent without a problem", () => {
      expect(lint("key-components", base(), { problem, keyComponentHints: false })).toEqual([]);
      expect(lint("key-components", base())).toEqual([]);
    });
  });

  it("sorts by severity and counts", () => {
    const g = graph([n("c", "web_client"), n("db", "sql_db"), n("r", "cache")], [e("c", "db")]);
    const issues = runLint({ graph: g, apis: [] });
    const order = issues.map((i) => i.severity);
    expect(order).toEqual(
      [...order].sort(
        (a, b) => ["error", "warn", "info"].indexOf(a) - ["error", "warn", "info"].indexOf(b),
      ),
    );
    expect(countBySeverity(issues).error).toBe(1);
  });

  it("an empty canvas has no issues", () => {
    expect(runLint({ graph: graph([], []), apis: [] })).toEqual([]);
  });
});
