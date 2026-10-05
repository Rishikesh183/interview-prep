import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/schema";
import { fromGraph, nextId, toGraph } from "./convert";

const graph: Graph = {
  nodes: [
    { id: "n1", type: "web_client", position: { x: 0, y: 0 }, data: { label: "Web", config: {} } },
    {
      id: "n2",
      type: "service",
      position: { x: 200, y: 0 },
      data: {
        label: "URL Service",
        note: "stateless",
        config: {
          stateless: true,
          instancesMin: 3,
          instancesMax: 6,
          autoscale: true,
          language: "",
        },
      },
    },
    {
      id: "n3",
      type: "group",
      position: { x: -50, y: -50 },
      width: 500,
      height: 300,
      data: { label: "us-east-1", config: {} },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "n1",
      target: "n2",
      sourceHandle: "r",
      targetHandle: "l",
      protocol: "HTTP",
      mode: "sync",
      op: "read",
      label: "redirect",
    },
  ],
};

describe("graph conversion", () => {
  it("round-trips a graph through React Flow shapes", () => {
    const { nodes, edges } = fromGraph(graph);
    expect(toGraph(nodes, edges)).toEqual(graph);
  });

  it("puts groups behind other nodes", () => {
    const { nodes } = fromGraph(graph);
    expect(nodes.find((n) => n.id === "n3")?.zIndex).toBe(-1);
  });

  it("drops edges that point at missing nodes", () => {
    const broken: Graph = {
      nodes: graph.nodes,
      edges: [
        ...graph.edges,
        { id: "e2", source: "n1", target: "n99", protocol: "HTTP", mode: "sync" },
      ],
    };
    expect(fromGraph(broken).edges.map((e) => e.id)).toEqual(["e1"]);
  });

  it("normalises node config against the catalog", () => {
    const { nodes } = fromGraph({
      nodes: [
        { id: "n1", type: "cache", position: { x: 0, y: 0 }, data: { label: "c", config: {} } },
      ],
      edges: [],
    });
    expect(nodes[0].data.config).toMatchObject({
      engine: "Redis",
      eviction: "LRU",
      cluster: false,
    });
  });
});

describe("nextId", () => {
  it("continues after the highest numeric id", () => {
    expect(nextId("n", ["n1", "n7", "n3", "custom"])).toBe("n8");
  });

  it("starts at 1", () => {
    expect(nextId("e", [])).toBe("e1");
  });
});
