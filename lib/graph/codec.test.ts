import { describe, expect, it } from "vitest";
import { loadProblems } from "@/lib/problems/load";
import { StoredGraphSchema, type Graph } from "@/lib/schema";
import { edge, node, weakUrlShortener } from "@/test/fixtures";
import { fromStored, graphHash, stableStringify, toStored } from "./codec";

const references = loadProblems().flatMap((p) =>
  p.references.filter((r) => r.graph).map((r) => ({ name: `${p.id}/${r.id}`, graph: r.graph! })),
);

/** Positions are rounded on store; everything else must survive exactly. */
const rounded = (g: Graph): Graph => ({
  ...g,
  nodes: g.nodes.map((n) => ({
    ...n,
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
  })),
});

describe("codec round-trip", () => {
  it.each(references)("$name survives toStored → fromStored unchanged", ({ graph }) => {
    const stored = toStored(graph);
    expect(StoredGraphSchema.safeParse(stored).success).toBe(true);
    expect(fromStored(JSON.parse(JSON.stringify(stored)))).toEqual(rounded(graph));
  });

  it("is much smaller than the app shape", () => {
    const full = references.reduce((s, r) => s + JSON.stringify(r.graph).length, 0);
    const compact = references.reduce((s, r) => s + JSON.stringify(toStored(r.graph)).length, 0);
    expect(compact / full).toBeLessThan(0.6);
  });
});

describe("toStored", () => {
  const g: Graph = {
    nodes: [
      node("n1", "service", "Service"),
      node("n2", "cache", "Redis", { strategy: "cache-aside" }, "hot keys"),
      {
        ...node("n3", "note", ""),
        width: 200.4,
        height: 120,
        data: { label: "", config: {}, note: "todo" },
      },
    ],
    edges: [
      edge("n1", "n2", { protocol: "TCP" }),
      edge("n1", "n3", {
        protocol: "gRPC",
        mode: "async",
        op: "write",
        label: "x",
        sourceHandle: "r",
        targetHandle: "l",
      }),
    ],
  };
  const s = toStored(g);

  it("omits default labels, default config and inferred protocols", () => {
    expect(s.n[0]).toEqual({ i: "n1", t: "service", x: 0, y: 0 });
    expect(s.n[1]).toEqual({
      i: "n2",
      t: "cache",
      x: 0,
      y: 0,
      l: "Redis",
      c: { strategy: "cache-aside" },
      no: "hot keys",
    });
    // service -> cache infers TCP, so it isn't stored
    expect(s.e[0]).toEqual({ i: "n1-n2", s: "n1", d: "n2" });
  });

  it("keeps non-default edge data compactly", () => {
    expect(s.e[1]).toEqual({
      i: "n1-n3",
      s: "n1",
      d: "n3",
      p: "gRPC",
      m: "a",
      o: "w",
      l: "x",
      h: "r>l",
    });
  });

  it("keeps size only for resizable annotation nodes", () => {
    expect(s.n[2]).toMatchObject({ w: 200, h: 120, no: "todo" });
  });
});

describe("graphHash", () => {
  const { graph, apis } = weakUrlShortener();
  const moved: Graph = {
    ...graph,
    nodes: [...graph.nodes]
      .reverse()
      .map((n) => ({ ...n, position: { x: n.position.x + 500, y: -300 } })),
  };

  it("ignores moving nodes and node order", async () => {
    expect(await graphHash(moved, apis)).toBe(await graphHash(graph, apis));
  });

  it("changes when config, edges or APIs change", async () => {
    const base = await graphHash(graph, apis);
    const configChanged: Graph = {
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === "n4"
          ? { ...n, data: { ...n.data, config: { ...n.data.config, replicas: 3 } } }
          : n,
      ),
    };
    expect(await graphHash(configChanged, apis)).not.toBe(base);
    expect(await graphHash({ ...graph, edges: graph.edges.slice(1) }, apis)).not.toBe(base);
    expect(await graphHash(graph, apis.slice(1))).not.toBe(base);
  });

  it("is a sha256 hex digest", async () => {
    expect(await graphHash(graph, apis)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("stableStringify", () => {
  it("sorts keys and drops undefined", () => {
    expect(stableStringify({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: undefined } })).toBe(
      '{"a":{"d":[1,{"y":2,"z":1}]},"b":1}',
    );
  });
});
