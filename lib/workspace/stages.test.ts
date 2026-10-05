import { describe, expect, it } from "vitest";
import { AttemptSchema } from "@/lib/schema";
import { progressOf, STAGES, stageDone } from "./stages";

const base = AttemptSchema.parse({ id: "a", problemId: "p", startedAt: 0, updatedAt: 0 });

describe("stageDone", () => {
  it("is false for every stage of a fresh attempt", () => {
    expect(STAGES.map((s) => stageDone(s.id, progressOf(base)))).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("tracks content per stage", () => {
    const filled = {
      ...base,
      status: "submitted" as const,
      requirements: { ...base.requirements, functional: ["a"], nonFunctional: ["b"] },
      estimation: { ...base.estimation, dau: 10, objectSize: 1 },
      entities: [{ name: "Url", fields: "code" }],
      apis: [{ id: "a1", ownerNodeId: "n1", method: "GET" as const, path: "/", auth: true }],
      graph: {
        nodes: ["a", "b", "c"].map((id) => ({
          id,
          type: "service",
          position: { x: 0, y: 0 },
          data: { label: id, config: {} },
        })),
        edges: [
          { id: "e1", source: "a", target: "b", protocol: "HTTP" as const, mode: "sync" as const },
          { id: "e2", source: "b", target: "c", protocol: "HTTP" as const, mode: "sync" as const },
        ],
      },
    };
    expect(STAGES.every((s) => stageDone(s.id, progressOf(filled)))).toBe(true);
  });
});
