import { CATALOG, getComponent } from "@/lib/catalog/components";
import { estimate } from "@/lib/estimation/calc";
import type { GraphIndex } from "@/lib/graph/analysis";
import type {
  ApiEndpoint,
  EstimationInput,
  Graph,
  GraphNode,
  LintIssue,
  LintSeverity,
  Problem,
  Requirements,
} from "@/lib/schema";
import { TYPE_ALIASES } from "@/lib/tests/aliases";

export type LintContext = {
  graph: Graph;
  apis: ApiEndpoint[];
  /** Absent (or DAU 0) in the sandbox / before the estimation stage: capacity rules skip. */
  estimation?: EstimationInput;
  /** The user's own requirements. */
  requirements?: Requirements;
  problem?: Pick<Problem, "keyComponents" | "prompt">;
  /** Rule 14 can be turned off for "no hints" practice. */
  keyComponentHints?: boolean;
};

export type Rule = {
  id: string;
  title: string;
  check: (ix: GraphIndex, ctx: LintContext) => LintIssue[];
};

const set = (...lists: (readonly string[])[]) => new Set(lists.flat());
const CLIENTS = set(TYPE_ALIASES.client);
const QUEUES = set(TYPE_ALIASES.queue);
const DATABASES = set(TYPE_ALIASES.db);
const DIRECT_STORES = set(TYPE_ALIASES.db, ["cache", "search_index", "data_warehouse"]);
const CONSUMERS = set([
  "worker",
  "stream_processor",
  "service",
  "serverless_fn",
  "websocket_server",
  "batch_processor",
]);
const ENTRY = set(TYPE_ALIASES.entry);
const CROSS_CUTTING = set(["monitoring", "service_discovery"]);

const label = (n: GraphNode) => `${n.data.label || getComponent(n.type)?.label} (${n.id})`;
const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);

function issue(
  rule: string,
  subject: string,
  severity: LintSeverity,
  message: string,
  fix: string,
  nodeIds: string[] = [],
  edgeIds: string[] = [],
): LintIssue {
  return { id: `${rule}:${subject}`, rule, severity, message, fix, nodeIds, edgeIds };
}

function outputs(ctx: LintContext) {
  return ctx.estimation && ctx.estimation.dau > 0 ? estimate(ctx.estimation) : null;
}

/** Writes scale horizontally on these without extra design work. */
function scalesWrites(n: GraphNode): boolean {
  const c = n.data.config;
  switch (n.type) {
    case "wide_column":
    case "nosql_kv":
    case "time_series_db":
      return true;
    case "nosql_document":
      return Boolean(c.shardKey);
    case "sql_db":
      return c.sharding !== undefined && c.sharding !== "none";
    default:
      return false;
  }
}

export const RULES: Rule[] = [
  {
    id: "client-direct-store",
    title: "Client talks to a database or cache directly",
    check: (ix) =>
      ix.edges
        .filter((e) => CLIENTS.has(ix.typeOf(e.source)) && DIRECT_STORES.has(ix.typeOf(e.target)))
        .map((e) =>
          issue(
            "client-direct-store",
            e.id,
            "error",
            `${label(ix.byId.get(e.source)!)} connects straight to ${label(ix.byId.get(e.target)!)}.`,
            "Put a service in between for auth, validation and to keep the schema private.",
            [e.source, e.target],
            [e.id],
          ),
        ),
  },
  {
    id: "lb-missing",
    title: "Scaled-out service without a load balancer or gateway",
    check: (ix) =>
      ix.nodes
        .filter((n) => n.type === "service")
        .filter((n) => {
          const min = num(n.data.config.instancesMin, 1);
          const max = num(n.data.config.instancesMax, min);
          return min > 1 || (n.data.config.autoscale === true && max > 1);
        })
        .filter((n) => ![...ix.ancestors(n.id)].some((id) => ENTRY.has(ix.typeOf(id))))
        .map((n) =>
          issue(
            "lb-missing",
            n.id,
            "warn",
            `${label(n)} runs multiple instances but nothing distributes traffic to it.`,
            "Add a load balancer or API gateway in front of it.",
            [n.id],
          ),
        ),
  },
  {
    id: "single-db-ha",
    title: "Highly available requirement with an unreplicated database",
    check: (ix, ctx) => {
      const nfr = (ctx.requirements?.nonFunctional ?? []).join(" ");
      if (!/high(ly)?[ -]?availab|\bHA\b|availability|fault[ -]?toleran/i.test(nfr)) return [];
      return ix.nodes
        .filter(
          (n) =>
            (n.type === "sql_db" && num(n.data.config.replicas, 1) < 2) ||
            (n.type === "wide_column" && num(n.data.config.replicationFactor, 3) < 2),
        )
        .map((n) =>
          issue(
            "single-db-ha",
            n.id,
            "warn",
            `Your requirements ask for high availability but ${label(n)} has a single copy.`,
            "Set replicas ≥ 2 (primary + standby / replicas) and describe failover.",
            [n.id],
          ),
        );
    },
  },
  {
    id: "read-heavy-no-cache",
    title: "Read-heavy workload with no cache or CDN on the read path",
    check: (ix, ctx) => {
      if (!ctx.estimation || ctx.estimation.dau <= 0 || ctx.estimation.readWriteRatio <= 10) {
        return [];
      }
      const isCache = (t: string) => t === "cache" || t === "cdn";
      const clients = ix.nodes.filter((n) => CLIENTS.has(n.type));
      const covered = clients.length
        ? clients.some((c) => [...ix.reachable(c.id)].some((id) => isCache(ix.typeOf(id))))
        : ix.nodes.some((n) => isCache(n.type));
      if (covered) return [];
      return [
        issue(
          "read-heavy-no-cache",
          "graph",
          "warn",
          `Read:write is ${ctx.estimation.readWriteRatio}:1 but no cache or CDN is on the read path.`,
          "Add a cache (cache-aside from the service) or a CDN in front of hot reads.",
          ix.nodes.filter((n) => DATABASES.has(n.type)).map((n) => n.id),
        ),
      ];
    },
  },
  {
    id: "queue-no-consumer",
    title: "Queue or stream with no consumer",
    check: (ix) =>
      ix.nodes
        .filter((n) => n.type === "message_queue" || n.type === "event_stream")
        .filter((n) => ![...ix.reachable(n.id)].some((id) => CONSUMERS.has(ix.typeOf(id))))
        .map((n) =>
          issue(
            "queue-no-consumer",
            n.id,
            "error",
            `Nothing consumes from ${label(n)}; messages pile up forever.`,
            "Connect it to a worker, stream processor or service.",
            [n.id],
          ),
        ),
  },
  {
    id: "async-mismatch",
    title: "Async edge without a queue (or sync edge into a queue)",
    check: (ix) =>
      ix.edges.flatMap((e) => {
        const touchesQueue = QUEUES.has(ix.typeOf(e.source)) || QUEUES.has(ix.typeOf(e.target));
        const ends = [e.source, e.target];
        if (e.mode === "async" && !touchesQueue) {
          return [
            issue(
              "async-mismatch",
              e.id,
              "warn",
              `Edge ${e.id} is async but neither end is a queue, stream or pub/sub.`,
              "Route it through a queue (what buffers and retries it?) or mark it sync.",
              ends,
              [e.id],
            ),
          ];
        }
        if (e.mode === "sync" && QUEUES.has(ix.typeOf(e.target))) {
          return [
            issue(
              "async-mismatch",
              e.id,
              "warn",
              `Edge ${e.id} publishes to ${label(ix.byId.get(e.target)!)} synchronously.`,
              "Publishing to a queue is usually async; mark the edge async.",
              ends,
              [e.id],
            ),
          ];
        }
        return [];
      }),
  },
  {
    id: "orphan",
    title: "Component with no connections",
    check: (ix) =>
      ix.nodes
        .filter((n) => ix.out(n.id).length === 0 && ix.in(n.id).length === 0)
        .map((n) =>
          issue(
            "orphan",
            n.id,
            CROSS_CUTTING.has(n.type) ? "info" : "warn",
            `${label(n)} isn't connected to anything.`,
            "Connect it to the components that use it, or remove it.",
            [n.id],
          ),
        ),
  },
  {
    id: "service-no-apis",
    title: "Service without APIs",
    check: (ix, ctx) => {
      const owners = new Set(ctx.apis.map((a) => a.ownerNodeId));
      return ix.nodes
        .filter((n) => n.type === "service" && !owners.has(n.id))
        .map((n) =>
          issue(
            "service-no-apis",
            n.id,
            "info",
            `${label(n)} has no API endpoints defined.`,
            "Define its endpoints in the APIs stage (or the APIs tab in the inspector).",
            [n.id],
          ),
        );
    },
  },
  {
    id: "partition-key",
    title: "Sharded store without a shard / partition key",
    check: (ix) =>
      ix.nodes.flatMap((n) => {
        const c = n.data.config;
        if (n.type === "sql_db" && c.sharding && c.sharding !== "none" && !c.shardKey) {
          return [
            issue(
              "partition-key",
              n.id,
              "error",
              `${label(n)} is ${String(c.sharding)}-sharded but has no shard key.`,
              "Choose a shard key that spreads load and keeps common queries on one shard.",
              [n.id],
            ),
          ];
        }
        if (n.type === "wide_column" && !c.partitionKey) {
          return [
            issue(
              "partition-key",
              n.id,
              "error",
              `${label(n)} has no partition key.`,
              "Pick the partition key from your main query (e.g. conversation_id).",
              [n.id],
            ),
          ];
        }
        return [];
      }),
  },
  {
    id: "cache-config",
    title: "Cache without a strategy or TTL",
    check: (ix) =>
      ix.nodes
        .filter((n) => n.type === "cache" && (!n.data.config.strategy || !n.data.config.ttl))
        .map((n) => {
          const missing = [!n.data.config.strategy && "strategy", !n.data.config.ttl && "TTL"]
            .filter(Boolean)
            .join(" and ");
          return issue(
            "cache-config",
            n.id,
            "warn",
            `${label(n)} has no ${missing}.`,
            "Decide cache-aside / write-through / write-back and how long entries live.",
            [n.id],
          );
        }),
  },
  {
    id: "write-capacity",
    title: "Peak writes exceed database capacity",
    check: (ix, ctx) => {
      const out = outputs(ctx);
      if (!out || out.writeQpsPeak <= 0) return [];
      const dbs = ix.nodes.filter((n) => DATABASES.has(n.type));
      const written = dbs.filter((n) =>
        ix.edges.some((e) => e.target === n.id && (e.op === "write" || e.op === "read_write")),
      );
      const writePath = (written.length ? written : dbs).filter((n) => !scalesWrites(n));
      if (!writePath.length) return [];

      const capacity = writePath.reduce(
        (sum, n) => sum + (CATALOG[n.type]?.capacity.writesPerSec ?? 0),
        0,
      );
      if (capacity <= 0 || out.writeQpsPeak <= capacity) return [];
      const buffered = writePath.every((n) =>
        [...ix.ancestors(n.id)].some((id) => QUEUES.has(ix.typeOf(id))),
      );
      if (buffered && out.writeQpsAvg <= capacity) return [];

      const peak = Math.round(out.writeQpsPeak).toLocaleString("en-US");
      return [
        issue(
          "write-capacity",
          "graph",
          buffered ? "warn" : "error",
          `Peak writes (~${peak}/s) exceed the ~${capacity.toLocaleString("en-US")}/s the write-path database(s) can take.`,
          "Needs sharding / partitioning, a write-scalable store, or queue buffering.",
          writePath.map((n) => n.id),
        ),
      ];
    },
  },
  {
    id: "ws-no-pubsub",
    title: "Multiple WebSocket nodes with no pub/sub between them",
    check: (ix) =>
      ix.nodes
        .filter((n) => n.type === "websocket_server" && num(n.data.config.instances, 1) > 1)
        .filter((n) => {
          const linked = [...ix.reachable(n.id), ...ix.ancestors(n.id)];
          if (linked.some((id) => ["pub_sub", "event_stream"].includes(ix.typeOf(id))))
            return false;
          // Consistent-hash routing (e.g. by room/document id) keeps the parties on one node.
          const sticky = [...ix.ancestors(n.id)].some((id) => {
            const lb = ix.byId.get(id)!;
            return lb.type === "load_balancer" && lb.data.config.algorithm === "consistent-hash";
          });
          return !sticky;
        })
        .map((n) =>
          issue(
            "ws-no-pubsub",
            n.id,
            "warn",
            `${label(n)} runs ${String(n.data.config.instances)} instances, but a message for a user on another node can't get there.`,
            "Connect the WebSocket tier through pub/sub or an event stream, or route by room/document with a consistent-hash load balancer.",
            [n.id],
          ),
        ),
  },
  {
    id: "media-no-object-storage",
    title: "Media or files in requirements but no object storage",
    check: (ix, ctx) => {
      const text = [
        ctx.problem?.prompt ?? "",
        ...(ctx.requirements?.functional ?? []),
        ...(ctx.requirements?.nonFunctional ?? []),
      ].join(" ");
      const media =
        /\b(media|images?|photos?|videos?|files?|blobs?|uploads?|attachments?|thumbnails?)\b/i;
      if (!media.test(text) || ix.nodes.some((n) => n.type === "object_storage")) return [];
      return [
        issue(
          "media-no-object-storage",
          "graph",
          "warn",
          "Requirements mention media or files, but there's no object storage.",
          "Store blobs in object storage (S3) and keep only metadata in the database.",
        ),
      ];
    },
  },
  {
    id: "key-components",
    title: "Likely components missing (hint)",
    check: (ix, ctx) => {
      if (!ctx.problem || ctx.keyComponentHints === false) return [];
      const present = new Set(ix.nodes.map((n) => n.type));
      const missing = ctx.problem.keyComponents.filter((t) => !present.has(t));
      if (!missing.length) return [];
      const names = missing.map((t) => getComponent(t)?.label ?? t).join(", ");
      return [
        issue(
          "key-components",
          "graph",
          "info",
          `Strong designs for this problem usually include: ${names}.`,
          "Not mandatory: alternatives are fine if you can justify them.",
        ),
      ];
    },
  },
];
