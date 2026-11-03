import { getComponent } from "@/lib/catalog/components";
import { inferEdgeDefaults } from "@/lib/catalog/edges";
import type { Graph, GraphNode, GraphEdge, Entity, ApiEndpoint } from "@/lib/schema";
import { nextId, toGraph } from "./convert";
import type { EditorDocument } from "./replacement";

export const PRESETS = [
  {
    id: "api-entry",
    label: "3 clients + gateway/LB + microservices",
    description: "One shared L7 ingress; all callers and service routes already connected.",
  },
  {
    id: "distributed-limiter",
    label: "Distributed rate limiter",
    description:
      "Replicated limiter, one atomic shared Redis bucket store and downstream microservices.",
  },
] as const;

export function insertPreset(
  document: EditorDocument,
  presetId: string,
): { graph: Graph; apis: ApiEndpoint[]; entities: Entity[]; addedIds: string[] } | null {
  if (!PRESETS.some((p) => p.id === presetId)) return null;
  const graph = toGraph(document.nodes, document.edges);
  const nodeIds = graph.nodes.map((n) => n.id),
    edgeIds = graph.edges.map((e) => e.id),
    apiIds = document.apis.map((a) => a.id);
  const baseX = graph.nodes.length
    ? Math.max(...graph.nodes.map((n) => n.position.x + (n.width ?? 240))) + 180
    : 0;
  const added: GraphNode[] = [],
    edges: GraphEdge[] = [],
    apis: ApiEndpoint[] = [];
  const node = (
    type: string,
    label: string,
    x: number,
    y: number,
    config: Record<string, unknown> = {},
    note?: string,
  ) => {
    const id = nextId("n", nodeIds);
    nodeIds.push(id);
    added.push({
      id,
      type,
      position: { x: baseX + x, y },
      data: { label, config: { ...getComponent(type)!.defaultConfig, ...config }, note },
    });
    return id;
  };
  const edge = (from: string, to: string, label?: string) => {
    const id = nextId("e", edgeIds);
    edgeIds.push(id);
    edges.push({
      id,
      source: from,
      target: to,
      sourceHandle: "r",
      targetHandle: "l",
      ...inferEdgeDefaults(
        added.find((n) => n.id === from)!.type,
        added.find((n) => n.id === to)!.type,
      ),
      label,
    });
  };
  const api = (owner: string, path: string) => {
    const id = nextId("a", apiIds);
    apiIds.push(id);
    apis.push({
      id,
      ownerNodeId: owner,
      method: "POST",
      path,
      auth: true,
      request: "Authenticated request; stable request ID",
      response: "Success or a domain-specific error",
      statusCodes: "200, 400, 401, 429, 503",
    });
  };
  const gateway = node("edge_gateway", "Shared API ingress", 360, 160, {
    rateLimiting: presetId !== "distributed-limiter",
  });
  for (let i = 0; i < 3; i++)
    edge(node("web_client", `Frontend ${i + 1}`, 0, i * 180), gateway, "HTTPS");
  let upstream = gateway;
  const entities = [...document.entities];
  if (presetId === "distributed-limiter") {
    const counters = node(
      "cache",
      "Shared rate-limit buckets",
      720,
      460,
      {
        engine: "Redis",
        purpose: "counter-store",
        cluster: true,
        ttl: "Policy-specific bucket expiry",
      },
      "Atomic Lua script refills, checks and consumes a bucket and sets expiry. Redis Cluster keys for one script must share a hash slot; cluster mode alone does not make cross-region limits strongly consistent.",
    );
    upstream = node(
      "rate_limiter",
      "Distributed limiter pool",
      720,
      160,
      {
        instances: 2,
        scope: "distributed",
        sharedStore: counters,
        atomicity: "Atomic per-key Redis Lua: refill, consume, expire; use a defined time source",
        failureMode: "fail-closed",
      },
      "Deploy multiple stateless limiter instances. Key by tenant/user/route; bound hot-key traffic. Return 429 plus Retry-After. Define fail-open vs fail-closed by endpoint; retries must not accidentally consume the same logical request twice.",
    );
    edge(gateway, upstream, "One enforcement point");
    edge(upstream, counters, "Atomic refill + consume");
    let name = "RateLimitBucket",
      suffix = 2;
    while (entities.some((e) => e.name === name)) name = `RateLimitBucket ${suffix++}`;
    entities.push({
      name,
      storeNodeId: counters,
      fields:
        "key: tenant:user:route:policyVersion\ntokens: number\nlastRefill: server timestamp\nAtomic refill + consume + expiry; bounded TTL and explicit fail-open/closed policy",
    });
    api(upstream, "/limits/check");
  }
  for (let i = 0; i < 3; i++) {
    const service = node(
      "microservice",
      ["Orders", "Catalog", "Accounts"][i] + " microservice",
      presetId === "distributed-limiter" ? 1100 : 740,
      i * 180,
      { domain: ["Orders", "Catalog", "Accounts"][i] },
    );
    edge(upstream, service, "Allowed request");
    api(service, ["/orders", "/catalog", "/accounts"][i]);
  }
  return {
    graph: { nodes: [...graph.nodes, ...added], edges: [...graph.edges, ...edges] },
    apis: [...document.apis, ...apis],
    entities,
    addedIds: added.map((n) => n.id),
  };
}
