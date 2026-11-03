import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore, undoWorkspace, redoWorkspace, resetHistory } from "@/store/workspace";
import { planReplacement } from "./replacement";
import { runTests } from "@/lib/tests/engine";
import { runLint } from "@/lib/lint";
import { getProblem } from "@/lib/problems/load";
import { buildExport, parseImport } from "./importExport";

const store = () => useWorkspaceStore.getState();
beforeEach(() => {
  store().setDocument({ nodes: [], edges: [] }, [], []);
  resetHistory();
});

describe("safe canvas editing", () => {
  it("toolbar undo/redo ignore a React click event instead of treating it as a step count", () => {
    store().addNode("service", { x: 0, y: 0 });
    (undoWorkspace as (event: unknown) => void)({ nativeEvent: {}, preventDefault() {} });
    expect(store().nodes).toHaveLength(0);
    (redoWorkspace as (event: unknown) => void)({ nativeEvent: {} });
    expect(store().nodes).toHaveLength(1);
    expect(typeof store().addNode).toBe("function");
  });
  it("rapid structural commands each undo independently", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("cache", { x: 300, y: 0 });
    undoWorkspace();
    expect(store().nodes.map((n) => n.type)).toEqual(["service"]);
    undoWorkspace();
    expect(store().nodes).toHaveLength(0);
    redoWorkspace();
    redoWorkspace();
    expect(store().nodes).toHaveLength(2);
  });
  it("keeps four connections, identity, position, labels and notes when a limiter becomes a database", () => {
    const db = store().addNode("rate_limiter", { x: 400, y: 200 })!;
    store().updateNodeData(db, { label: "Orders data", note: "User-authored rationale" });
    for (let i = 0; i < 4; i++) {
      const client = store().addNode("microservice", { x: 0, y: i * 150 })!;
      store().onConnect({ source: client, target: db, sourceHandle: "r", targetHandle: "l" });
    }
    const before = store().nodes.find((n) => n.id === db)!;
    expect(store().replaceNode(db, "sql_db")).toBe(true);
    const after = store().nodes.find((n) => n.id === db)!;
    expect(after.position).toEqual(before.position);
    expect(after.data.label).toBe("Orders data");
    expect(after.data.note).toBe(before.data.note);
    expect(store().edges).toHaveLength(4);
    expect(
      store().edges.every(
        (e) => e.target === db && e.data?.protocol === "SQL" && e.targetHandle === "l",
      ),
    ).toBe(true);
    undoWorkspace();
    expect(store().nodes.find((n) => n.id === db)?.type).toBe("rate_limiter");
    expect(store().edges.every((e) => e.data?.protocol === "HTTP")).toBe(true);
  });
  it("requires explicit consent for incompatible APIs and restores them with undo", () => {
    const id = store().addNode("rate_limiter", { x: 0, y: 0 })!,
      caller = store().addNode("service", { x: -300, y: 0 })!;
    const api = store().addApi(id);
    store().onConnect({ source: caller, target: id, sourceHandle: "r", targetHandle: "l" });
    store().updateEdgeData("e1", { apiId: api });
    expect(store().replaceNode(id, "sql_db")).toBe(false);
    expect(store().apis).toHaveLength(1);
    expect(store().replaceNode(id, "sql_db", true)).toBe(true);
    expect(store().apis).toEqual([]);
    expect(store().edges[0].data?.apiId).toBeUndefined();
    undoWorkspace();
    expect(store().apis[0].id).toBe(api);
    expect(store().edges[0].data?.apiId).toBe(api);
  });
  it("preserves custom protocols and detaches invalid state owners without losing state definitions", () => {
    const db = store().addNode("sql_db", { x: 300, y: 0 })!,
      client = store().addNode("service", { x: 0, y: 0 })!;
    store().setEntities([{ name: "Order", fields: "id, total", storeNodeId: db }]);
    store().onConnect({ source: client, target: db, sourceHandle: "r", targetHandle: "l" });
    store().updateEdgeData("e1", { protocol: "gRPC" });
    expect(planReplacement(store(), db, "service")?.customProtocols).toBe(1);
    expect(store().replaceNode(db, "service")).toBe(true);
    expect(store().edges[0].data?.protocol).toBe("gRPC");
    expect(store().entities[0]).toMatchObject({ name: "Order", fields: "id, total" });
    expect(store().entities[0].storeNodeId).toBeUndefined();
    undoWorkspace();
    expect(store().entities[0].storeNodeId).toBe(db);
  });
  it("repairs typed component references when their target is replaced or deleted", () => {
    const queue = store().addNode("message_queue", { x: 0, y: 0 })!,
      worker = store().addNode("worker", { x: 300, y: 0 })!;
    store().updateNodeConfig(worker, "consumesFrom", queue);
    store().replaceNode(queue, "web_client");
    expect(store().nodes.find((n) => n.id === worker)?.data.config.consumesFrom).toBeUndefined();
    undoWorkspace();
    expect(store().nodes.find((n) => n.id === worker)?.data.config.consumesFrom).toBe(queue);
    expect(store().replaceNode(worker, "note")).toBe(false);
    expect(store().replaceNode(worker, "missing")).toBe(false);
  });
  it("adds presets atomically with collision-free IDs and one shared ingress", () => {
    const first = store().addPreset("api-entry");
    expect(first).toHaveLength(7);
    const gateway = store().nodes.find((n) => n.type === "edge_gateway")!;
    expect(store().edges.filter((e) => e.target === gateway.id)).toHaveLength(3);
    expect(store().edges.filter((e) => e.source === gateway.id)).toHaveLength(3);
    store().addPreset("api-entry");
    expect(new Set(store().nodes.map((n) => n.id)).size).toBe(14);
    undoWorkspace();
    expect(store().nodes).toHaveLength(7);
    expect(store().apis).toHaveLength(3);
    undoWorkspace();
    expect(store().nodes).toHaveLength(0);
    expect(store().apis).toHaveLength(0);
  });
  it("distributed preset uses shared atomic counters, no double gateway enforcement and passes rate-limiter core checks", () => {
    store().addPreset("distributed-limiter");
    const limiter = store().nodes.find((n) => n.type === "rate_limiter")!,
      gateway = store().nodes.find((n) => n.type === "edge_gateway")!;
    expect(limiter.data.config.scope).toBe("distributed");
    expect(gateway.data.config.rateLimiting).toBe(false);
    const issues = runLint({
      graph: store().getGraph(),
      apis: store().apis,
      problem: getProblem("rate-limiter"),
    });
    expect(issues.filter((i) => i.severity !== "info")).toEqual([]);
    const results = runTests(getProblem("rate-limiter")!.tests, {
      graph: store().getGraph(),
      apis: store().apis,
      entities: store().entities,
    });
    expect(results.filter((r) => r.core && !r.passed).map((r) => r.id)).toEqual([]);
    const exported = parseImport(
      JSON.stringify(buildExport(store().getGraph(), store().apis, store().entities)),
    );
    expect(exported.ok && exported.entities).toEqual(store().entities);
  });
});
