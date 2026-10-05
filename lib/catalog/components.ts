import {
  Activity,
  Archive,
  Bell,
  Boxes,
  Cable,
  CalendarClock,
  ChartLine,
  Cog,
  Columns3,
  Compass,
  Database,
  DoorOpen,
  Earth,
  FileJson,
  Gauge,
  Globe,
  Hash,
  Inbox,
  KeyRound,
  Layers,
  Lock,
  MapPin,
  MemoryStick,
  Monitor,
  PlugZap,
  RadioTower,
  Scale,
  Search,
  Server,
  Share2,
  ShieldAlert,
  Smartphone,
  SquareDashed,
  StickyNote,
  Vote,
  Warehouse,
  Waves,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Capacity, Category } from "@/lib/schema";
import { capacityOf } from "./capacity";
import { f, fieldBadge, fieldsToSchema, type Fields } from "./fields";

export type ComponentDef = {
  type: string;
  category: Category;
  label: string;
  description: string;
  icon: LucideIcon;
  fields: Fields;
  configSchema: ReturnType<typeof fieldsToSchema>;
  defaultConfig: Record<string, unknown>;
  capacity: Capacity;
};

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "clients", label: "Clients & external" },
  { id: "edge", label: "Edge / networking" },
  { id: "compute", label: "Compute" },
  { id: "storage", label: "Storage" },
  { id: "messaging", label: "Messaging" },
  { id: "infra", label: "Infra & cross-cutting" },
  { id: "annotation", label: "Annotations" },
];

type Spec = Omit<ComponentDef, "configSchema" | "defaultConfig" | "capacity" | "fields"> & {
  fields?: Fields;
};

function define(spec: Spec): ComponentDef {
  const fields = spec.fields ?? {};
  const configSchema = fieldsToSchema(fields);
  return {
    ...spec,
    fields,
    configSchema,
    defaultConfig: configSchema.parse({}),
    capacity: capacityOf(spec.type),
  };
}

const QUEUE_TYPES = ["message_queue", "event_stream", "pub_sub"] as const;

/** Instance count badge, e.g. "x3" or "x2-10". */
const instancesBadge = (_: unknown, c: Record<string, unknown>) => {
  const min = Number(c.instancesMin ?? c.instances ?? 1);
  const max = Number(c.instancesMax ?? min);
  if (max > min) return `x${min}-${max}`;
  return min > 1 ? `x${min}` : undefined;
};

const DEFS: ComponentDef[] = [
  // Clients & external
  define({
    type: "web_client",
    category: "clients",
    label: "Web Client",
    description: "Browser / SPA",
    icon: Monitor,
  }),
  define({
    type: "mobile_client",
    category: "clients",
    label: "Mobile Client",
    description: "iOS / Android app",
    icon: Smartphone,
  }),
  define({
    type: "external_service",
    category: "clients",
    label: "External Service",
    description: "Third-party API (Stripe, APNs, FCM...)",
    icon: PlugZap,
    fields: { provider: f.text("Provider", { placeholder: "Stripe", badge: true }) },
  }),

  // Edge / networking
  define({
    type: "dns",
    category: "edge",
    label: "DNS",
    description: "Name resolution, optional geo-routing",
    icon: Globe,
    fields: { geoRouting: f.bool("Geo-routing", false, { badge: true, short: "geo" }) },
  }),
  define({
    type: "cdn",
    category: "edge",
    label: "CDN",
    description: "Edge cache for static, media or API responses",
    icon: Earth,
    fields: {
      content: f.multi("Cached content", ["static", "media", "api"], ["static"], { badge: true }),
      ttl: f.text("TTL", { default: "1d", placeholder: "1d", badge: (v) => (v ? `ttl ${v}` : "") }),
    },
  }),
  define({
    type: "api_gateway",
    category: "edge",
    label: "API Gateway",
    description: "Auth, rate limiting, request routing",
    icon: DoorOpen,
    fields: {
      auth: f.bool("Auth", true, { badge: true, short: "auth" }),
      rateLimiting: f.bool("Rate limiting", true, { badge: true, short: "rate-limit" }),
      routing: f.bool("Request routing", true),
    },
  }),
  define({
    type: "load_balancer",
    category: "edge",
    label: "Load Balancer",
    description: "Distributes traffic across instances",
    icon: Scale,
    fields: {
      layer: f.select("Layer", ["L4", "L7"], { default: "L7", badge: true }),
      algorithm: f.select("Algorithm", ["round-robin", "least-conn", "consistent-hash"], {
        default: "round-robin",
        badge: true,
      }),
      healthChecks: f.bool("Health checks", true),
    },
  }),
  define({
    type: "rate_limiter",
    category: "edge",
    label: "Rate Limiter",
    description: "Throttles requests per key",
    icon: Gauge,
    fields: {
      algorithm: f.select("Algorithm", ["token-bucket", "sliding-window", "fixed-window"], {
        default: "token-bucket",
        badge: true,
      }),
      limit: f.text("Limit", { default: "100/min", badge: true }),
      key: f.select("Key", ["user", "ip", "api-key"], {
        default: "user",
        badge: (v) => (v ? `per ${v}` : ""),
      }),
    },
  }),
  define({
    type: "waf",
    category: "edge",
    label: "WAF",
    description: "Web application firewall",
    icon: ShieldAlert,
  }),

  // Compute
  define({
    type: "service",
    category: "compute",
    label: "Service",
    description: "Application service (owns APIs)",
    icon: Server,
    fields: {
      stateless: f.bool("Stateless", true, { badge: true, short: "stateless" }),
      instancesMin: f.number("Min instances", 2, { min: 1, badge: instancesBadge }),
      instancesMax: f.number("Max instances", 10, { min: 1 }),
      autoscale: f.bool("Autoscale", true, { badge: true, short: "autoscale" }),
      language: f.text("Language", { placeholder: "Go, Java, Node..." }),
    },
  }),
  define({
    type: "websocket_server",
    category: "compute",
    label: "WebSocket Server",
    description: "Long-lived bidirectional connections",
    icon: Cable,
    fields: {
      instances: f.number("Instances", 2, { min: 1, badge: instancesBadge }),
      stickySessions: f.bool("Sticky sessions", true, { badge: true, short: "sticky" }),
      connectionsPerNode: f.number("Connections / node", 50_000, { min: 1 }),
    },
  }),
  define({
    type: "worker",
    category: "compute",
    label: "Worker",
    description: "Background consumer",
    icon: Cog,
    fields: {
      consumesFrom: f.nodeRef("Consumes from", QUEUE_TYPES),
      instances: f.number("Instances", 2, { min: 1, badge: instancesBadge }),
      concurrency: f.number("Concurrency", 10, { min: 1 }),
    },
  }),
  define({
    type: "serverless_fn",
    category: "compute",
    label: "Serverless Function",
    description: "Event-triggered function (Lambda)",
    icon: Zap,
    fields: { trigger: f.text("Trigger", { placeholder: "S3 upload, HTTP...", badge: true }) },
  }),
  define({
    type: "scheduler",
    category: "compute",
    label: "Scheduler",
    description: "Cron / periodic jobs",
    icon: CalendarClock,
    fields: {
      cron: f.text("Cron", { placeholder: "0 * * * *", badge: true }),
      purpose: f.text("Purpose", { placeholder: "Expire old links" }),
    },
  }),
  define({
    type: "stream_processor",
    category: "compute",
    label: "Stream Processor",
    description: "Continuous processing (Flink)",
    icon: Waves,
    fields: {
      engine: f.text("Engine", { default: "Flink", badge: true }),
      windowing: f.select("Windowing", ["none", "tumbling", "sliding", "session"], {
        default: "none",
        badge: (v) => (v && v !== "none" ? `${v} window` : ""),
      }),
    },
  }),
  define({
    type: "batch_processor",
    category: "compute",
    label: "Batch Processor",
    description: "Periodic bulk jobs (Spark)",
    icon: Layers,
    fields: {
      engine: f.text("Engine", { default: "Spark", badge: true }),
      schedule: f.text("Schedule", { default: "daily", badge: true }),
    },
  }),

  // Storage
  define({
    type: "sql_db",
    category: "storage",
    label: "SQL Database",
    description: "Relational, transactional",
    icon: Database,
    fields: {
      engine: f.select("Engine", ["PostgreSQL", "MySQL", "Aurora", "Spanner", "CockroachDB"], {
        default: "PostgreSQL",
        badge: true,
      }),
      replicas: f.number("Replicas", 1, {
        min: 1,
        badge: (v) => (Number(v) > 1 ? `${String(v)} replicas` : ""),
      }),
      readReplicas: f.bool("Read replicas", false, { badge: true, short: "read replicas" }),
      sharding: f.select("Sharding", ["none", "range", "hash"], {
        default: "none",
        badge: (v) => (v && v !== "none" ? `${v}-sharded` : ""),
      }),
      shardKey: f.text("Shard key", { badge: (v) => (v ? `key: ${v}` : "") }),
      isolation: f.select("Isolation level", ["read-committed", "repeatable-read", "serializable"]),
    },
  }),
  define({
    type: "nosql_kv",
    category: "storage",
    label: "Key-Value Store",
    description: "DynamoDB-style KV",
    icon: KeyRound,
    fields: {
      engine: f.text("Engine", { default: "DynamoDB", badge: true }),
      partitionKey: f.text("Partition key", { badge: (v) => (v ? `pk: ${v}` : "") }),
      sortKey: f.text("Sort key", { badge: (v) => (v ? `sk: ${v}` : "") }),
      consistency: f.select("Consistency", ["strong", "eventual"], {
        default: "eventual",
        badge: true,
      }),
    },
  }),
  define({
    type: "nosql_document",
    category: "storage",
    label: "Document DB",
    description: "MongoDB-style documents",
    icon: FileJson,
    fields: {
      engine: f.text("Engine", { default: "MongoDB", badge: true }),
      shardKey: f.text("Shard key", { badge: (v) => (v ? `key: ${v}` : "") }),
    },
  }),
  define({
    type: "wide_column",
    category: "storage",
    label: "Wide-Column DB",
    description: "Cassandra-style, write-heavy",
    icon: Columns3,
    fields: {
      engine: f.text("Engine", { default: "Cassandra", badge: true }),
      partitionKey: f.text("Partition key", { badge: (v) => (v ? `pk: ${v}` : "") }),
      clusteringKey: f.text("Clustering key", { badge: (v) => (v ? `ck: ${v}` : "") }),
      replicationFactor: f.number("Replication factor", 3, {
        min: 1,
        badge: (v) => `RF${String(v)}`,
      }),
      consistencyLevel: f.select("Consistency level", ["ONE", "QUORUM", "LOCAL_QUORUM", "ALL"], {
        default: "QUORUM",
        badge: true,
      }),
    },
  }),
  define({
    type: "cache",
    category: "storage",
    label: "Cache",
    description: "In-memory cache (Redis / Memcached)",
    icon: MemoryStick,
    fields: {
      engine: f.select("Engine", ["Redis", "Memcached"], { default: "Redis", badge: true }),
      strategy: f.select("Strategy", ["cache-aside", "write-through", "write-back"], {
        badge: true,
      }),
      eviction: f.select("Eviction", ["LRU", "LFU", "TTL"], { default: "LRU" }),
      ttl: f.text("TTL", { placeholder: "24h", badge: (v) => (v ? `ttl ${v}` : "") }),
      cluster: f.bool("Cluster mode", false, { badge: true, short: "cluster" }),
    },
  }),
  define({
    type: "object_storage",
    category: "storage",
    label: "Object Storage",
    description: "Blobs / media (S3)",
    icon: Archive,
    fields: {
      engine: f.text("Engine", { default: "S3", badge: true }),
      lifecycle: f.text("Lifecycle / tiering", { placeholder: "Glacier after 90d" }),
    },
  }),
  define({
    type: "search_index",
    category: "storage",
    label: "Search Index",
    description: "Full-text search (Elasticsearch)",
    icon: Search,
    fields: {
      engine: f.text("Engine", { default: "Elasticsearch", badge: true }),
      indexedFields: f.text("Indexed fields", { placeholder: "title, body, tags" }),
    },
  }),
  define({
    type: "time_series_db",
    category: "storage",
    label: "Time-Series DB",
    description: "Metrics / events over time",
    icon: ChartLine,
    fields: {
      engine: f.text("Engine", { default: "InfluxDB", badge: true }),
      retention: f.text("Retention", { default: "30d", badge: (v) => (v ? `keep ${v}` : "") }),
    },
  }),
  define({
    type: "graph_db",
    category: "storage",
    label: "Graph DB",
    description: "Relationship-heavy data (Neo4j)",
    icon: Share2,
  }),
  define({
    type: "vector_db",
    category: "storage",
    label: "Vector DB",
    description: "Embedding similarity search",
    icon: Boxes,
    fields: {
      dimensions: f.number("Dimensions", 1536, { min: 1, badge: (v) => `${String(v)}d` }),
      indexType: f.select("Index type", ["HNSW", "IVF", "flat"], { default: "HNSW", badge: true }),
    },
  }),
  define({
    type: "data_warehouse",
    category: "storage",
    label: "Data Warehouse",
    description: "Analytics (BigQuery / Snowflake)",
    icon: Warehouse,
  }),

  // Messaging
  define({
    type: "message_queue",
    category: "messaging",
    label: "Message Queue",
    description: "Point-to-point queue (SQS / RabbitMQ)",
    icon: Inbox,
    fields: {
      engine: f.text("Engine", { default: "SQS", badge: true }),
      delivery: f.select("Delivery", ["at-least-once", "at-most-once", "exactly-once"], {
        default: "at-least-once",
        badge: true,
      }),
      dlq: f.bool("Dead-letter queue", true, { badge: true, short: "DLQ" }),
      fifo: f.bool("FIFO", false, { badge: true, short: "FIFO" }),
    },
  }),
  define({
    type: "event_stream",
    category: "messaging",
    label: "Event Stream",
    description: "Partitioned log (Kafka)",
    icon: Workflow,
    fields: {
      engine: f.text("Engine", { default: "Kafka", badge: true }),
      topic: f.text("Topic", { placeholder: "tweets", badge: (v) => (v ? `topic: ${v}` : "") }),
      partitions: f.number("Partitions", 12, { min: 1, badge: (v) => `${String(v)}p` }),
      partitionKey: f.text("Partition key", { badge: (v) => (v ? `key: ${v}` : "") }),
      retention: f.text("Retention", { default: "7d" }),
    },
  }),
  define({
    type: "pub_sub",
    category: "messaging",
    label: "Pub/Sub",
    description: "Fan-out to many subscribers",
    icon: RadioTower,
    fields: {
      engine: f.text("Engine", { default: "Redis Pub/Sub", badge: true }),
      fanOut: f.bool("Fan-out", true, { badge: true, short: "fan-out" }),
    },
  }),

  // Infra & cross-cutting
  define({
    type: "auth_service",
    category: "infra",
    label: "Auth Service",
    description: "Identity, tokens, sessions",
    icon: Lock,
    fields: {
      method: f.select("Method", ["JWT", "session", "OAuth"], { default: "JWT", badge: true }),
    },
  }),
  define({
    type: "id_generator",
    category: "infra",
    label: "ID Generator",
    description: "Unique ID allocation",
    icon: Hash,
    fields: {
      strategy: f.select("Strategy", ["snowflake", "uuid", "ticket-server", "base62-counter"], {
        default: "snowflake",
        badge: true,
      }),
    },
  }),
  define({
    type: "coordination",
    category: "infra",
    label: "Coordination",
    description: "ZooKeeper / etcd",
    icon: Vote,
    fields: {
      engine: f.text("Engine", { default: "ZooKeeper", badge: true }),
      purpose: f.select("Purpose", ["leader-election", "locks", "config"], {
        default: "leader-election",
        badge: true,
      }),
    },
  }),
  define({
    type: "service_discovery",
    category: "infra",
    label: "Service Discovery",
    description: "Registry of live instances",
    icon: Compass,
  }),
  define({
    type: "monitoring",
    category: "infra",
    label: "Monitoring",
    description: "Metrics, logs, traces",
    icon: Activity,
    fields: {
      signals: f.multi("Signals", ["metrics", "logs", "traces"], ["metrics", "logs"], {
        badge: true,
      }),
    },
  }),
  define({
    type: "notification_service",
    category: "infra",
    label: "Notification Service",
    description: "Push / email / SMS delivery",
    icon: Bell,
    fields: {
      channels: f.multi("Channels", ["push", "email", "sms"], ["push"], { badge: true }),
    },
  }),
  define({
    type: "geo_index",
    category: "infra",
    label: "Geo Index",
    description: "Spatial lookup",
    icon: MapPin,
    fields: {
      strategy: f.select("Strategy", ["geohash", "quadtree", "S2"], {
        default: "geohash",
        badge: true,
      }),
    },
  }),

  // Annotations
  define({
    type: "note",
    category: "annotation",
    label: "Note",
    description: "Sticky note",
    icon: StickyNote,
  }),
  define({
    type: "group",
    category: "annotation",
    label: "Group",
    description: "Box for a region, AZ or path",
    icon: SquareDashed,
  }),
];

export const CATALOG: Readonly<Record<string, ComponentDef>> = Object.fromEntries(
  DEFS.map((d) => [d.type, d]),
);

export const COMPONENT_TYPES = DEFS.map((d) => d.type);

export function getComponent(type: string): ComponentDef | undefined {
  return CATALOG[type];
}

export function isAnnotation(type: string): boolean {
  return CATALOG[type]?.category === "annotation";
}

/** Parse a raw config against the component's schema; invalid values fall back to defaults. */
export function parseConfig(type: string, raw: unknown): Record<string, unknown> {
  const def = CATALOG[type];
  if (!def) return {};
  const res = def.configSchema.safeParse(raw ?? {});
  return res.success ? res.data : { ...def.defaultConfig };
}

export function configBadges(type: string, config: Record<string, unknown>): string[] {
  const def = CATALOG[type];
  if (!def) return [];
  const out: string[] = [];
  for (const [key, field] of Object.entries(def.fields)) {
    const badge = fieldBadge(field, config[key], config);
    if (badge) out.push(badge);
  }
  return out;
}

export function componentsByCategory(): {
  category: (typeof CATEGORIES)[number];
  items: ComponentDef[];
}[] {
  return CATEGORIES.map((category) => ({
    category,
    items: DEFS.filter((d) => d.category === category.id),
  }));
}
