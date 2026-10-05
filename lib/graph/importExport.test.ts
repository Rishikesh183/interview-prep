import { describe, expect, it } from "vitest";
import type { Graph } from "@/lib/schema";
import { buildExport, parseImport } from "./importExport";

const graph: Graph = {
  nodes: [
    { id: "n1", type: "service", position: { x: 0, y: 0 }, data: { label: "S", config: {} } },
  ],
  edges: [],
};

describe("parseImport", () => {
  it("accepts our export envelope", () => {
    const res = parseImport(JSON.stringify(buildExport(graph, [])));
    expect(res).toEqual({ ok: true, graph, apis: [] });
  });

  it("accepts a bare graph", () => {
    expect(parseImport(JSON.stringify(graph))).toEqual({ ok: true, graph, apis: [] });
  });

  it("rejects invalid JSON", () => {
    expect(parseImport("{nope")).toEqual({ ok: false, error: "File is not valid JSON." });
  });

  it("rejects JSON with the wrong shape", () => {
    const res = parseImport(JSON.stringify({ nodes: [{ id: 1 }] }));
    expect(res.ok).toBe(false);
  });
});
