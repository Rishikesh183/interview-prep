import { describe, expect, it } from "vitest";
import { loadProblems } from "@/lib/problems/load";
import { assembleProblem } from "@/lib/content/problemDir";
import { readProblemDirs } from "@/lib/problems/load";
import { graphAtStep, validateWalkthrough } from "./walkthrough";
import { runTests } from "@/lib/tests/engine";

const problems = loadProblems();
const reference = problems.find((p) => p.id === "url-shortener")!.references[0];
const clone = () => structuredClone(reference);

describe("reference walkthrough integrity", () => {
  it("covers every published approach with a complete graph and authored walkthrough", () => {
    const references = problems.flatMap((p) => p.references);
    expect(references).toHaveLength(76);
    for (const ref of references) {
      expect(ref.graph?.nodes.length, ref.id).toBeGreaterThan(0);
      expect(ref.walkthrough?.version, ref.id).toBe(1);
      expect(validateWalkthrough(ref), ref.id).toEqual([]);
    }
  });

  it("reveals a cumulative graph without connections to hidden components", () => {
    const steps = reference.walkthrough!.buildSteps;
    for (let i = 0; i < steps.length; i++) {
      const graph = graphAtStep(reference, i);
      const ids = new Set(graph.nodes.map((n) => n.id));
      expect(graph.nodes.map((n) => n.id)).toEqual(steps.slice(0, i + 1).flatMap((s) => s.nodeIds));
      expect(graph.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(true);
    }
    expect(graphAtStep(reference, steps.length - 1)).toEqual(reference.graph);
  });

  it("rejects incorrect entity storage and API-to-edge ownership", () => {
    const ref = clone();
    ref.entities[0].storeNodeId = "svc";
    ref.graph!.edges[0].apiId = ref.apis[0].id;
    const errors = validateWalkthrough(ref).join("\n");
    expect(errors).toMatch(/valid state\/storage owner/);
    expect(errors).toMatch(/not owned by its target/);
  });

  it("rejects missing explanations, duplicate identities, and unknown references", () => {
    const ref = clone();
    ref.walkthrough!.components.pop();
    ref.apis.push({ ...ref.apis[0] });
    ref.walkthrough!.apiDetails[0].apiId = "unknown-api";
    const errors = validateWalkthrough(ref).join("\n");
    expect(errors).toMatch(/duplicate API IDs/);
    expect(errors).toMatch(/unknown API/);
    expect(errors).toMatch(/needs an explanation/);
  });

  it("rejects premature and incomplete construction steps", () => {
    const ref = clone();
    ref.walkthrough!.buildSteps[0].edgeIds.push(ref.graph!.edges.at(-1)!.id);
    ref.walkthrough!.buildSteps.pop();
    const errors = validateWalkthrough(ref).join("\n");
    expect(errors).toMatch(/precedes its endpoints/);
    expect(errors).toMatch(/must cover the complete graph/);
  });

  it("rejects disconnected flow paths and edges outside the highlighted nodes", () => {
    const ref = clone();
    const step = ref.walkthrough!.flows[0].steps[0];
    step.edgeIds.reverse();
    expect(validateWalkthrough(ref).join("\n")).toMatch(/not a directed route/);
    step.nodeIds = [];
    expect(validateWalkthrough(ref).join("\n")).toMatch(/outside its step's nodes/);
  });

  it("keeps compatibility with legacy content until it is migrated", () => {
    const ref = clone();
    delete ref.walkthrough;
    expect(validateWalkthrough(ref)).toEqual([]);
    expect(graphAtStep(ref, 0)).toEqual(ref.graph);
  });

  it("explicitly documents alternatives that relax the question's constraints", () => {
    const uuid = problems
      .find((p) => p.id === "unique-id-generator")!
      .references.find((r) => r.id === "uuid")!;
    expect(uuid.walkthrough!.limitations.join(" ")).toMatch(/128-bit/);
    expect(uuid.walkthrough!.limitations.join(" ")).toMatch(/does not satisfy/i);
  });
});

describe("walkthrough content assembly", () => {
  const raw = readProblemDirs().find((r) => r.dir === "url-shortener")!;
  it("loads the sidecar as reference-only metadata", () => {
    const result = assembleProblem(raw);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.references[0].walkthrough?.buildSteps.length).toBeGreaterThan(0);
  });

  it("rejects malformed and orphaned sidecars", () => {
    const file = "solutions/counter-base62.walkthrough.json";
    const malformed = assembleProblem({
      ...raw,
      files: { ...raw.files, [file]: '{"version":99}' },
    });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.errors.join("\n")).toMatch(/walkthrough\.json/);
    const orphan = assembleProblem({
      ...raw,
      files: { ...raw.files, "solutions/missing.walkthrough.json": raw.files[file] },
    });
    expect(orphan.ok).toBe(false);
    if (!orphan.ok) expect(orphan.errors.join("\n")).toMatch(/walkthrough without a matching/);
  });
});

describe("architecture-independent core checks", () => {
  it.each([
    ["ad-click-aggregator", "micro-batch", "aggregation", ["batch_processor", "stream_processor"]],
    ["llm-chat-service", "direct-router", "gpu-queue", ["worker"]],
    ["online-judge", "serverless", "async", ["message_queue", "event_stream", "pub_sub"]],
  ])(
    "accepts %s/%s but rejects it without the required processing path",
    (problemId, slug, testId, removedTypes) => {
      const problem = problems.find((p) => p.id === problemId)!;
      const ref = problem.references.find((r) => r.id === slug)!;
      const tests = problem.tests.filter((t) => t.id === testId);
      expect(
        runTests(tests, { graph: ref.graph!, apis: ref.apis, entities: ref.entities })[0].passed,
      ).toBe(true);
      const nodes = ref.graph!.nodes.filter((n) => !removedTypes.includes(n.type));
      const ids = new Set(nodes.map((n) => n.id));
      const graph = {
        nodes,
        edges: ref.graph!.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
      };
      expect(runTests(tests, { graph, apis: ref.apis, entities: ref.entities })[0].passed).toBe(
        false,
      );
    },
  );
});
