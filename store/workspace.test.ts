import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetHistory, useWorkspaceStore } from "./workspace";

const store = () => useWorkspaceStore.getState();
const history = () => useWorkspaceStore.temporal.getState();

/** Moves past the undo-coalescing window so the next change is its own step. */
const nextStep = () => vi.advanceTimersByTime(1000);

beforeEach(() => {
  vi.useFakeTimers();
  store().setGraph({ nodes: [], edges: [] });
  store().setApis([]);
  resetHistory();
  nextStep();
});

afterEach(() => vi.useRealTimers());

describe("workspace store", () => {
  it("adds nodes with sequential ids and catalog defaults", () => {
    const a = store().addNode("service", { x: 0, y: 0 });
    const b = store().addNode("cache", { x: 0, y: 100 });
    expect([a, b]).toEqual(["n1", "n2"]);
    expect(store().nodes[1].data.config).toMatchObject({ engine: "Redis" });
    expect(
      store()
        .nodes.filter((n) => n.selected)
        .map((n) => n.id),
    ).toEqual(["n2"]);
  });

  it("ignores unknown component types", () => {
    expect(store().addNode("teleporter", { x: 0, y: 0 })).toBeNull();
    expect(store().nodes).toHaveLength(0);
  });

  it("connects nodes with inferred protocol and rejects self-loops", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("sql_db", { x: 0, y: 100 });
    store().onConnect({ source: "n1", target: "n2", sourceHandle: "b", targetHandle: "t" });
    store().onConnect({ source: "n1", target: "n1", sourceHandle: null, targetHandle: null });
    expect(store().edges).toHaveLength(1);
    expect(store().edges[0]).toMatchObject({ id: "e1", data: { protocol: "SQL", mode: "sync" } });
  });

  it("duplicates selected nodes and the edges between them", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("cache", { x: 0, y: 100 });
    store().onConnect({ source: "n1", target: "n2", sourceHandle: null, targetHandle: null });
    useWorkspaceStore.setState({ nodes: store().nodes.map((n) => ({ ...n, selected: true })) });

    store().duplicateSelected();
    expect(store().nodes.map((n) => n.id)).toEqual(["n1", "n2", "n3", "n4"]);
    expect(store().nodes[2].position).toEqual({ x: 40, y: 40 });
    expect(store().edges.map((e) => [e.source, e.target])).toEqual([
      ["n1", "n2"],
      ["n3", "n4"],
    ]);
  });

  it("selects a single edge and clears other selection", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("cache", { x: 0, y: 100 });
    store().onConnect({ source: "n1", target: "n2", sourceHandle: null, targetHandle: null });
    store().selectEdge("e1");
    expect(store().nodes.some((n) => n.selected)).toBe(false);
    expect(store().edges[0].selected).toBe(true);
  });

  it("deletes selected nodes together with their edges", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("cache", { x: 0, y: 100 });
    store().onConnect({ source: "n1", target: "n2", sourceHandle: null, targetHandle: null });
    store().deleteSelected(); // n2 is selected after being added
    expect(store().nodes.map((n) => n.id)).toEqual(["n1"]);
    expect(store().edges).toHaveLength(0);
  });

  it("updates config and undoes it", () => {
    store().addNode("cache", { x: 0, y: 0 });
    nextStep();
    store().updateNodeConfig("n1", "strategy", "cache-aside");
    expect(store().nodes[0].data.config.strategy).toBe("cache-aside");
    history().undo();
    expect(store().nodes[0].data.config.strategy).toBeUndefined();
    history().redo();
    expect(store().nodes[0].data.config.strategy).toBe("cache-aside");
  });

  it("coalesces rapid edits (typing, dragging) into one undo step", () => {
    store().addNode("service", { x: 0, y: 0 });
    nextStep();
    for (const label of ["A", "Ap", "API"]) {
      store().updateNodeData("n1", { label });
      vi.advanceTimersByTime(100);
    }
    history().undo();
    expect(store().nodes[0].data.label).toBe("Service");
  });

  it("does not record selection-only changes", () => {
    store().addNode("service", { x: 0, y: 0 });
    nextStep();
    const before = history().pastStates.length;
    store().onNodesChange([{ type: "select", id: "n1", selected: false }]);
    expect(history().pastStates.length).toBe(before);
  });

  it("adds, edits and removes APIs, unlinking edges", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("service", { x: 300, y: 0 });
    store().onConnect({ source: "n1", target: "n2", sourceHandle: null, targetHandle: null });
    const id = store().addApi("n2");
    store().updateApi(id, { method: "POST", path: "/v1/urls" });
    store().updateEdgeData("e1", { apiId: id });
    expect(store().apis[0]).toMatchObject({ id: "a1", ownerNodeId: "n2", method: "POST" });

    store().removeApi(id);
    expect(store().apis).toHaveLength(0);
    expect(store().edges[0].data?.apiId).toBeUndefined();
  });

  it("drops a node's APIs when the node is deleted (store or React Flow path)", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("api_gateway", { x: 300, y: 0 });
    store().addApi("n1");
    store().addApi("n2");
    store().selectNodes(["n1"]);
    store().deleteSelected();
    expect(store().apis.map((a) => a.ownerNodeId)).toEqual(["n2"]);

    store().onNodesChange([{ type: "remove", id: "n2" }]);
    expect(store().apis).toHaveLength(0);
  });

  it("selects exactly the given nodes", () => {
    store().addNode("service", { x: 0, y: 0 });
    store().addNode("cache", { x: 0, y: 100 });
    store().selectNodes(["n1"]);
    expect(store().nodes.map((n) => Boolean(n.selected))).toEqual([true, false]);
  });
});
