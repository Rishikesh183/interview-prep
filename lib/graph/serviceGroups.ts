import { getComponent, isAnnotation } from "@/lib/catalog/components";
import { inferEdgeDefaults } from "@/lib/catalog/edges";
import { nextId, EDGE_TYPE, type AppNode } from "./convert";
import { findFreePosition } from "./placement";
import { repairOwnership, type EditorDocument } from "./replacement";

export const MAX_SERVICE_COUNT = 20;
export const SERVICE_UPSTREAM_TYPES = [
  "service",
  "microservice",
  "api_gateway",
  "edge_gateway",
  "load_balancer",
  "rate_limiter",
  "auth_service",
];

/** The graph itself defines the group, so hand-built and imported designs work too. */
export function connectedMicroservices(document: EditorDocument, upstreamId: string) {
  const targets = new Set(
    document.edges.filter((e) => e.source === upstreamId).map((e) => e.target),
  );
  return document.nodes.filter((n) => n.type === "microservice" && targets.has(n.id));
}

export function planServiceCount(document: EditorDocument, upstreamId: string, count: number) {
  const upstream = document.nodes.find((n) => n.id === upstreamId);
  if (
    !upstream ||
    !SERVICE_UPSTREAM_TYPES.includes(upstream.type ?? "") ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > MAX_SERVICE_COUNT
  )
    return null;
  const current = connectedMicroservices(document, upstreamId);
  if (count === current.length) return null;

  // Removing the last nodes in document order is deterministic; the UI previews their names.
  const removed = current.slice(count);
  const removedIds = new Set(removed.map((n) => n.id));
  const removedEdges = document.edges.filter(
    (e) => removedIds.has(e.source) || removedIds.has(e.target),
  );
  const removedApis = document.apis.filter((a) => removedIds.has(a.ownerNodeId));
  const next = repairOwnership({
    ...document,
    nodes: document.nodes.filter((n) => !removedIds.has(n.id)),
    edges: document.edges.filter((e) => !removedEdges.includes(e)),
  });
  const addedIds: string[] = [];
  const nodeIds = next.nodes.map((n) => n.id);
  const edgeIds = next.edges.map((e) => e.id);
  const apiIds = next.apis.map((a) => a.id);
  const labels = new Set(next.nodes.map((n) => n.data.label));
  const paths = new Set(next.apis.map((a) => a.path));
  const occupied = next.nodes
    .filter((n) => !isAnnotation(n.type ?? ""))
    .map((n) => ({
      ...n.position,
      width: n.measured?.width ?? n.width ?? 192,
      height: n.measured?.height ?? n.height ?? 120,
    }));
  const x = current[0]?.position.x ?? upstream.position.x + 360;
  let y = current.length
    ? Math.max(...current.map((n) => n.position.y + (n.measured?.height ?? n.height ?? 120))) + 60
    : upstream.position.y;
  for (let i = current.length; i < count; i++) {
    let suffix = i + 1;
    while (labels.has(`Microservice ${suffix}`) || paths.has(`/v1/service-${suffix}`)) suffix++;
    const id = nextId("n", nodeIds);
    nodeIds.push(id);
    const position = findFreePosition({ x, y }, occupied, { width: 192, height: 120 });
    occupied.push({ ...position, width: 192, height: 120 });
    y = Math.max(y, position.y) + 180;
    const node: AppNode = {
      id,
      type: "microservice",
      position,
      data: {
        label: `Microservice ${suffix}`,
        config: { ...getComponent("microservice")!.defaultConfig },
      },
    };
    next.nodes.push(node);
    labels.add(node.data.label);
    addedIds.push(id);
    const apiId = nextId("a", apiIds);
    apiIds.push(apiId);
    const path = `/v1/service-${suffix}`;
    paths.add(path);
    next.apis.push({ id: apiId, ownerNodeId: id, method: "GET", path, auth: true });
    const edgeId = nextId("e", edgeIds);
    edgeIds.push(edgeId);
    next.edges.push({
      id: edgeId,
      source: upstreamId,
      target: id,
      sourceHandle: "r",
      targetHandle: "l",
      type: EDGE_TYPE,
      data: { ...inferEdgeDefaults(upstream.type ?? "", "microservice"), apiId },
    });
  }
  return {
    document: next,
    addedIds,
    removed,
    removedEdges,
    removedApis,
    detachedEntities: document.entities.filter(
      (e) => e.storeNodeId && removedIds.has(e.storeNodeId),
    ),
  };
}
