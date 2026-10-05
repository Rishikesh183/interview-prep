import { parseConfig } from "@/lib/catalog/components";
import {
  AttemptSchema,
  type Attempt,
  type EdgeData,
  type GraphEdge,
  type GraphNode,
} from "@/lib/schema";

export const node = (
  id: string,
  type: string,
  label: string,
  config: Record<string, unknown> = {},
  note?: string,
): GraphNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { label, config: parseConfig(type, config), ...(note ? { note } : {}) },
});

export const edge = (source: string, target: string, data: Partial<EdgeData> = {}): GraphEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  protocol: "HTTP",
  mode: "sync",
  ...data,
});

/** A deliberately weak URL-shortener attempt: no cache, a single unreplicated DB. */
export function weakUrlShortener(): Attempt {
  return AttemptSchema.parse({
    id: "weak",
    problemId: "url-shortener",
    startedAt: 0,
    updatedAt: 0,
    status: "submitted",
    requirements: {
      functional: ["Shorten URLs", "Redirect"],
      nonFunctional: ["Highly available", "Low latency"],
    },
    estimation: { dau: 3_300_000, writesPerUserPerDay: 1, readWriteRatio: 100, objectSize: 500, objectSizeUnit: "B" },
    entities: [{ name: "Url", fields: "code PK\nlong_url" }],
    apis: [
      { id: "a1", ownerNodeId: "n3", method: "POST", path: "/v1/urls", auth: true },
      { id: "a2", ownerNodeId: "n3", method: "GET", path: "/{code}", auth: false },
    ],
    graph: {
      nodes: [
        node("n1", "web_client", "Browser"),
        node("n2", "load_balancer", "LB"),
        node("n3", "service", "URL Service", { instancesMin: 3 }, "Base62 of an auto-increment id"),
        node("n4", "sql_db", "Postgres", { replicas: 1 }),
      ],
      edges: [edge("n1", "n2"), edge("n2", "n3"), edge("n3", "n4", { protocol: "SQL", op: "read_write", label: "insert / lookup" })],
    },
  });
} // prettier-ignore
