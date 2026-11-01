import { describe, expect, it } from "vitest";
import { loadProblems, problemSummaries } from "./load";
import { AttemptSchema } from "@/lib/schema";
import { runTests } from "@/lib/tests/engine";
import { runLint } from "@/lib/lint";
import { buildReviewPrompt, buildFollowUpPrompt } from "@/lib/ai/prompt";
import { serializeAttempt } from "@/lib/ai/serialize";
import { rubricFor } from "@/lib/ai/rubric";
import { progressOf, stageDone, stagesFor } from "@/lib/workspace/stages";

const frontend = loadProblems().filter((p) => p.track === "frontend");
const autocomplete = frontend.find((p) => p.id === "frontend-autocomplete")!;

describe("frontend interview track", () => {
  it("publishes 15 separate exercises and six recommended starting points", () => {
    expect(frontend).toHaveLength(15);
    expect(frontend.filter((p) => p.priority)).toHaveLength(6);
    expect(problemSummaries().filter((p) => p.track === "frontend")).toHaveLength(15);
    expect(loadProblems().find((p) => p.id === "url-shortener")?.track).toBe("backend");
  });

  it.each(frontend)("$id has a complete reference that passes all design checks", (p) => {
    const ref = p.references[0];
    expect(p.tests.filter((t) => t.kind === "core")).toHaveLength(6);
    expect(ref.entities.length).toBeGreaterThanOrEqual(2);
    expect(ref.apis.some((a) => a.method === "RPC")).toBe(true);
    expect(ref.walkthrough!.flows.length).toBeGreaterThanOrEqual(2);
    expect(
      runTests(p.tests, { graph: ref.graph!, apis: ref.apis, entities: ref.entities }).every(
        (r) => r.passed,
      ),
    ).toBe(true);
    const nodeById = new Map(ref.graph!.nodes.map((n) => [n.id, n]));
    for (const api of ref.apis.filter((a) => a.method !== "RPC")) {
      expect(nodeById.get(api.ownerNodeId)?.type).toBe("external_service");
    }
  });

  it("rejects an empty design instead of giving credit for the question's wording", () => {
    const results = runTests(autocomplete.tests, {
      graph: { nodes: [], edges: [] },
      apis: [],
      entities: [],
    });
    expect(results.every((r) => !r.passed)).toBe(true);
  });

  it("uses browser budgets without requiring DAU or server storage estimates", () => {
    const a = AttemptSchema.parse({
      id: "a",
      problemId: autocomplete.id,
      startedAt: 0,
      updatedAt: 0,
      estimation: { notes: "30 mounted rows; profile input on a mid-range phone" },
    });
    const restored = AttemptSchema.parse(JSON.parse(JSON.stringify(a)));
    expect(stageDone("estimation", progressOf(restored), "frontend")).toBe(true);
    expect(stageDone("estimation", progressOf(restored), "backend")).toBe(false);
    expect(serializeAttempt(restored, "frontend")).toContain(
      "BROWSER PERFORMANCE PLAN: 30 mounted rows",
    );
    expect(serializeAttempt(restored, "frontend")).not.toContain("write QPS");
    expect(stagesFor("frontend").map((s) => s.id)).toEqual(stagesFor("backend").map((s) => s.id));
    expect(stagesFor("frontend")[2].label).toBe("State Model");
  });

  it("reviews frontend scope with the correct rubric and preserves backend grading", () => {
    const a = AttemptSchema.parse({
      id: "a",
      problemId: autocomplete.id,
      startedAt: 0,
      updatedAt: 0,
    });
    const prompt = buildReviewPrompt(autocomplete, a, [], []);
    expect(prompt.system).toContain("State model & ownership");
    expect(prompt.system).toContain("Accessibility & recovery");
    expect(prompt.system).not.toContain("single unreplicated DB");
    expect(prompt.context).toContain("TRACK: frontend");
    expect(
      buildFollowUpPrompt(
        autocomplete,
        a,
        undefined,
        "How do you handle stale requests?",
        "Use request identity",
      ).context,
    ).toContain("TRACK: frontend");
    expect(rubricFor("frontend").map((r) => [r.dimension, r.weight])).toEqual(
      rubricFor("backend").map((r) => [r.dimension, r.weight]),
    );
    const backend = loadProblems().find((p) => p.id === "url-shortener")!;
    expect(buildReviewPrompt(backend, a, [], []).system).toContain("QPS, storage, bandwidth");
  });

  it("does not treat asynchronous browser HTTP calls as missing server queues", () => {
    const ref = autocomplete.references[0];
    expect(ref.graph!.edges.some((e) => e.mode === "async")).toBe(true);
    expect(runLint({ graph: ref.graph!, apis: ref.apis, problem: autocomplete })).toEqual([]);
  });
});
