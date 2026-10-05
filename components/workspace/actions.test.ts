import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getProgress } from "@/lib/db/progress";
import { db } from "@/lib/db/dexie";
import { getProblem } from "@/lib/problems/load";
import { AttemptSchema, type Graph } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";
import { submitAttempt } from "./actions";

const problem = getProblem("url-shortener")!; // easy: 10 base points
const reference = problem.references.find((r) => r.graph)!;

/** Loads an attempt into the stores, as the workspace does. */
function startAttempt(design: {
  graph: Graph;
  apis: typeof reference.apis;
  entities: typeof reference.entities;
}) {
  useAttemptStore.getState().load(
    AttemptSchema.parse({
      id: crypto.randomUUID(),
      problemId: problem.id,
      startedAt: 0,
      updatedAt: 0,
      ...design,
      // The reference's notes mention 301/302, so even the bonus test passes.
    }),
  );
}

const full = () => ({
  graph: reference.graph!,
  apis: reference.apis,
  entities: reference.entities,
});
const weak = () => ({
  graph: { nodes: reference.graph!.nodes.slice(0, 2), edges: [] },
  apis: [],
  entities: [],
});

beforeEach(async () => {
  await db().progress.clear();
});

describe("points & gating (step 2.5 acceptance)", () => {
  it("a full-marks design earns the base points and counts as solved", async () => {
    startAttempt(full());
    const result = await submitAttempt(problem);
    expect(result).toMatchObject({ points: 10, base: 10, forfeited: false });
    expect(useAttemptStore.getState().meta).toMatchObject({ status: "submitted", points: 10 });
    expect(await getProgress(problem.id)).toMatchObject({ bestPoints: 10, bestRatio: 1 });
  });

  it("viewing a solution before submitting scores 0", async () => {
    startAttempt(full());
    useAttemptStore.getState().unlockSolutions();
    const result = await submitAttempt(problem);
    expect(result).toMatchObject({ points: 0, forfeited: true });
    expect((await getProgress(problem.id))?.bestPoints).toBe(0);
  });

  it("hints cost 25% each", async () => {
    startAttempt(full());
    useAttemptStore.getState().revealHint();
    expect((await submitAttempt(problem))?.points).toBe(8); // round(10 × 1 × 0.75)
  });

  it("a lower re-submit never reduces best_points", async () => {
    startAttempt(full());
    await submitAttempt(problem);
    startAttempt(weak());
    const worse = await submitAttempt(problem);
    expect(worse!.points).toBeLessThan(10);
    expect(await getProgress(problem.id)).toMatchObject({ bestPoints: 10, bestRatio: 1 });
  });

  it("can't submit twice", async () => {
    startAttempt(full());
    await submitAttempt(problem);
    expect(await submitAttempt(problem)).toBeNull();
  });
});
