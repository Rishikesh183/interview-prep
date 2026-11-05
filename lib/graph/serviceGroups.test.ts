import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore, undoWorkspace, redoWorkspace, resetHistory } from "@/store/workspace";
import { connectedMicroservices, MAX_SERVICE_COUNT, planServiceCount } from "./serviceGroups";
import { fromGraph } from "./convert";
import { buildExport, parseImport } from "./importExport";
import { toStored, fromStored } from "./codec";

const store = () => useWorkspaceStore.getState();
beforeEach(() => {
  store().setDocument({ nodes: [], edges: [] }, []);
  resetHistory();
});
const start = () => {
  store().addPreset("api-entry");
  return store().nodes.find((n) => n.type === "edge_gateway")!.id;
};

describe("editable microservice groups", () => {
  it("grows an existing group while preserving authored services, APIs and connections", () => {
    const upstream = start();
    const first = connectedMicroservices(store(), upstream)[0];
    store().updateNodeData(first.id, { label: "Payments", note: "Custom rationale" });
    store().updateNodeConfig(first.id, "domain", "Payments");
    store().updateEdgeData(store().edges.find((e) => e.target === first.id)!.id, {
      protocol: "gRPC",
    });
    const before = structuredClone({
      nodes: store().nodes,
      edges: store().edges,
      apis: store().apis,
    });
    expect(store().setServiceCount(upstream, 6)).toBe(true);
    expect(connectedMicroservices(store(), upstream)).toHaveLength(6);
    for (const n of before.nodes) expect(store().nodes.find((x) => x.id === n.id)).toEqual(n);
    for (const e of before.edges) expect(store().edges.find((x) => x.id === e.id)).toEqual(e);
    for (const a of before.apis) expect(store().apis.find((x) => x.id === a.id)).toEqual(a);
    const added = store().nodes.filter((n) => !before.nodes.some((b) => b.id === n.id));
    for (const n of added) {
      const edge = store().edges.find((e) => e.source === upstream && e.target === n.id)!;
      expect(store().apis.find((a) => a.id === edge.data?.apiId)?.ownerNodeId).toBe(n.id);
      expect(n.data.note).toBeUndefined();
      expect(n.data.config.domain).not.toBe("Payments");
    }
    expect(new Set(store().nodes.map((n) => n.id)).size).toBe(store().nodes.length);
    undoWorkspace();
    expect(connectedMicroservices(store(), upstream)).toHaveLength(3);
    expect(store().apis).toEqual(before.apis);
    redoWorkspace();
    expect(connectedMicroservices(store(), upstream)).toHaveLength(6);
  });

  it("works on hand-built graphs and counts a service once even with multiple handles", () => {
    const upstream = store().addNode("api_gateway", { x: 0, y: 0 })!;
    const service = store().addNode("microservice", { x: 400, y: 0 })!;
    for (const sourceHandle of ["r", "b"])
      store().onConnect({ source: upstream, target: service, sourceHandle, targetHandle: "l" });
    const blocker = store().addNode("sql_db", { x: 400, y: 180 })!;
    expect(connectedMicroservices(store(), upstream)).toHaveLength(1);
    expect(store().setServiceCount(upstream, 3)).toBe(true);
    const occupied = store().nodes.find((n) => n.id === blocker)!.position;
    for (const n of connectedMicroservices(store(), upstream).slice(1)) {
      expect(
        n.position.x >= occupied.x + 192 ||
          n.position.x + 192 <= occupied.x ||
          n.position.y >= occupied.y + 120 ||
          n.position.y + 120 <= occupied.y,
      ).toBe(true);
    }
    expect(store().edges.filter((e) => e.target === blocker)).toHaveLength(0);
  });

  it("requires explicit removal, previews cross-group connections, and repairs ownership atomically", () => {
    const upstream = start();
    const removed = connectedMicroservices(store(), upstream).slice(1);
    const other = store().addNode("api_gateway", { x: -500, y: 0 })!;
    store().onConnect({
      source: other,
      target: removed[0].id,
      sourceHandle: "r",
      targetHandle: "l",
    });
    const worker = store().addNode("worker", { x: 1400, y: 0 })!;
    // Invalid legacy bindings must still be detached if their target is removed.
    store().updateNodeConfig(worker, "consumesFrom", removed[0].id);
    store().setEntities([{ name: "ServiceState", storeNodeId: removed[0].id, fields: "id" }]);
    const before = store().getGraph();
    const plan = planServiceCount(store(), upstream, 1)!;
    expect(plan.removed.map((n) => n.id)).toEqual(removed.map((n) => n.id));
    expect(plan.removedEdges).toHaveLength(3);
    expect(plan.removedApis).toHaveLength(2);
    expect(store().setServiceCount(upstream, 1)).toBe(false);
    expect(store().getGraph()).toEqual(before);
    expect(store().setServiceCount(upstream, 1, true)).toBe(true);
    expect(connectedMicroservices(store(), upstream)).toHaveLength(1);
    expect(store().entities).toEqual([
      { name: "ServiceState", fields: "id", storeNodeId: undefined },
    ]);
    expect(store().nodes.find((n) => n.id === worker)?.data.config.consumesFrom).toBeUndefined();
    expect(store().nodes.some((n) => n.id === other)).toBe(true);
    expect(
      store().edges.some((e) => removed.some((n) => n.id === e.source || n.id === e.target)),
    ).toBe(false);
    undoWorkspace();
    expect(store().getGraph()).toEqual(before);
    expect(store().apis).toHaveLength(3);
    expect(store().entities[0].storeNodeId).toBe(removed[0].id);
  });

  it("keeps shared counters and ingress unchanged when expanding a distributed limiter", () => {
    store().addPreset("distributed-limiter", 5);
    const limiter = store().nodes.find((n) => n.type === "rate_limiter")!;
    const ingress = store().nodes.find((n) => n.type === "edge_gateway")!;
    const counters = store().nodes.find((n) => n.type === "cache")!;
    expect(connectedMicroservices(store(), limiter.id)).toHaveLength(5);
    expect(store().setServiceCount(limiter.id, 8)).toBe(true);
    expect(connectedMicroservices(store(), limiter.id)).toHaveLength(8);
    expect(store().nodes.find((n) => n.id === ingress.id)).toEqual(ingress);
    expect(store().nodes.find((n) => n.id === counters.id)).toEqual(counters);
    expect(store().nodes.find((n) => n.id === limiter.id)?.data.config.sharedStore).toBe(
      counters.id,
    );
    expect(store().edges.filter((e) => e.target === counters.id)).toHaveLength(1);
    expect(store().nodes.filter((n) => n.type === "cache")).toHaveLength(1);
    expect(store().entities).toHaveLength(1);
  });

  it("survives export/import and compact cloud draft encoding without hidden membership", () => {
    const upstream = start();
    store().setServiceCount(upstream, 5);
    const result = parseImport(JSON.stringify(buildExport(store().getGraph(), store().apis)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const document = {
      ...fromGraph(fromStored(toStored(result.graph))),
      apis: result.apis,
      entities: [],
    };
    expect(connectedMicroservices(document, upstream)).toHaveLength(5);
    expect(planServiceCount(document, upstream, 7)?.addedIds).toHaveLength(2);
  });

  it("rejects invalid counts and unsupported upstreams without history or document changes", () => {
    const upstream = start();
    resetHistory();
    const before = store().getGraph();
    for (const count of [-1, 1.5, NaN, Infinity, MAX_SERVICE_COUNT + 1, 3])
      expect(store().setServiceCount(upstream, count)).toBe(false);
    const service = connectedMicroservices(store(), upstream)[0];
    expect(store().setServiceCount("missing", 3)).toBe(false);
    expect(store().addPreset("api-entry", 0)).toEqual([]);
    expect(store().addPreset("api-entry", MAX_SERVICE_COUNT + 1)).toEqual([]);
    expect(store().getGraph()).toEqual(before);
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(0);
    store().replaceNode(service.id, "web_client", true);
    expect(store().setServiceCount(service.id, 3)).toBe(false);
  });

  it("supports removing all services and repeated growth without duplicate names or routes", () => {
    const upstream = start();
    expect(store().setServiceCount(upstream, 0, true)).toBe(true);
    expect(connectedMicroservices(store(), upstream)).toHaveLength(0);
    expect(store().nodes).toHaveLength(4); // Clients and ingress survive.
    expect(store().apis).toHaveLength(0);
    expect(store().setServiceCount(upstream, 4)).toBe(true);
    expect(store().setServiceCount(upstream, 6)).toBe(true);
    expect(new Set(connectedMicroservices(store(), upstream).map((n) => n.data.label)).size).toBe(
      6,
    );
    expect(new Set(store().apis.map((a) => a.path)).size).toBe(6);
    expect(store().edges.filter((e) => e.source === upstream)).toHaveLength(6);
  });
});
